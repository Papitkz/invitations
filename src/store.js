import { ref } from 'vue'

export const items = ref([])

export const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm'
])

export async function load() {
  const r = await fetch('/api/media', { cache: 'no-store' })
  if (!r.ok) throw new Error('load failed')
  items.value = await r.json()
}

/* ---------- thumbnails (made in the browser, so the grid stays fast) ---------- */
const THUMB = 480

function toJpeg(src, w, h) {
  const s = Math.min(1, THUMB / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * s))
  c.height = Math.max(1, Math.round(h * s))
  const g = c.getContext('2d')
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
  g.drawImage(src, 0, 0, c.width, c.height)
  return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.8))
}

function videoThumb(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.muted = true; v.playsInline = true; v.preload = 'metadata'
    let t
    const end = b => { clearTimeout(t); URL.revokeObjectURL(url); v.removeAttribute('src'); v.load(); resolve(b) }
    t = setTimeout(() => end(null), 6000)
    v.onerror = () => end(null)
    v.onloadeddata = () => { v.currentTime = Math.min(0.1, (v.duration || 1) / 2) }
    v.onseeked = async () => end(await toJpeg(v, v.videoWidth, v.videoHeight).catch(() => null))
    v.src = url
  })
}

async function makeThumb(file) {
  try {
    if (file.type.startsWith('image/')) {
      const bmp = await createImageBitmap(file)
      const b = await toJpeg(bmp, bmp.width, bmp.height)
      bmp.close?.()
      return b
    }
    return await videoThumb(file)
  } catch { return null } // no thumbnail? the grid falls back to the original
}

/* ---------- direct-to-R2 upload ---------- */
async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Request failed.')
  return j
}

function put(url, blob, type, onLoaded) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest()
    x.open('PUT', url)
    x.setRequestHeader('Content-Type', type)
    x.upload.onprogress = e => e.lengthComputable && onLoaded(e.loaded)
    x.onload = () => (x.status < 300 ? resolve() : reject(new Error(`Upload failed (${x.status}).`)))
    x.onerror = () => reject(new Error('Network error. Check your connection.'))
    x.send(blob)
  })
}

async function putRetry(url, blob, type, onLoaded, tries = 3) {
  for (let t = 1; ; t++) {
    try { onLoaded(0); return await put(url, blob, type, onLoaded) }
    catch (e) {
      if (t >= tries) throw e
      await new Promise(r => setTimeout(r, 800 * t))
    }
  }
}

/**
 * Uploads many files: 25 at a time get permission slips, 4 upload in parallel,
 * then each batch is confirmed with the server.
 * onProgress({ done, total, pct })  ->  returns { ok, fail, lastErr }
 */
export async function uploadFiles(files, name, onProgress, { chunk = 25, parallel = 4 } = {}) {
  const totalBytes = files.reduce((s, f) => s + f.size, 0) || 1
  const loaded = new Array(files.length).fill(0)
  let done = 0, ok = 0, fail = 0, lastErr = ''
  const report = () =>
    onProgress({ done, total: files.length, pct: Math.min(100, Math.round(100 * loaded.reduce((a, b) => a + b, 0) / totalBytes)) })

  for (let start = 0; start < files.length; start += chunk) {
    const batch = files.slice(start, start + chunk)
    let slots
    try {
      slots = await post('/api/media/presign', { files: batch.map(f => ({ type: f.type, size: f.size })) })
    } catch (e) {
      fail += batch.length; done += batch.length; lastErr = e.message
      batch.forEach((f, j) => (loaded[start + j] = f.size)); report()
      continue
    }

    const okIds = []
    let next = 0
    const worker = async () => {
      while (next < batch.length) {
        const j = next++
        const f = batch[j], s = slots[j], gi = start + j
        try {
          const thumb = await makeThumb(f)
          await putRetry(s.uploadUrl, f, f.type, n => { loaded[gi] = n; report() })
          if (thumb) { try { await putRetry(s.thumbUrl, thumb, 'image/jpeg', () => {}) } catch { /* fallback */ } }
          okIds.push(s.id); ok++
        } catch (e) { fail++; lastErr = e.message }
        loaded[gi] = f.size; done++; report()
      }
    }
    await Promise.all(Array.from({ length: Math.min(parallel, batch.length) }, worker))

    if (okIds.length) {
      try { await post('/api/media/commit', { name, ids: okIds }) }
      catch (e) { fail += okIds.length; ok -= okIds.length; lastErr = e.message }
    }
  }
  return { ok, fail, lastErr }
}

export async function addView(id) {
  const r = await fetch(`/api/media/${id}/view`, { method: 'POST' })
  const d = await r.json()
  const m = items.value.find(i => i.id === id)
  if (m && typeof d.views === 'number') m.views = d.views
}

export async function remove(id, key) {
  const r = await fetch('/api/media/' + id, { method: 'DELETE', headers: { 'x-admin-key': key } })
  if (!r.ok) throw new Error('Delete failed.')
  items.value = items.value.filter(i => i.id !== id)
}
