import express from 'express'
import compression from 'compression'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PORT = process.env.PORT || 3000
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads') // legacy local files (old uploads still work)
const DB_FILE = path.join(DATA_DIR, 'db.json')
const DIST = path.join(ROOT, 'dist')
const ADMIN_KEY = process.env.ADMIN_KEY || ''
const MAX_MB = Number(process.env.MAX_MB || 100)
const HOURLY_LIMIT = Number(process.env.HOURLY_LIMIT || 3000) // files per IP per hour

// ---------- Cloudflare R2 ----------
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')
const r2Ready = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL)
if (!r2Ready) console.warn('! R2 env vars missing - uploads are disabled until you set them (see README).')

const s3 = r2Ready
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      // R2 does not understand the SDK's newer default checksums
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED'
    })
  : null

const deleteKeys = keys =>
  s3.send(new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: keys.map(Key => ({ Key })) } }))
    .catch(e => console.error('R2 delete failed', e.message))

// ---------- tiny JSON database ----------
fs.mkdirSync(UPLOAD_DIR, { recursive: true })
let db = []
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) } catch { db = [] }
let timer
function saveNow() {
  clearTimeout(timer)
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db))
  fs.renameSync(tmp, DB_FILE)
}
const saveSoon = () => { clearTimeout(timer); timer = setTimeout(saveNow, 400) } // for view counters
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { saveNow(); process.exit(0) })

// ---------- allowed types ----------
const TYPES = {
  'image/jpeg': ['.jpg', 'image'], 'image/png': ['.png', 'image'],
  'image/webp': ['.webp', 'image'], 'image/gif': ['.gif', 'image'],
  'image/avif': ['.avif', 'image'],
  'video/mp4': ['.mp4', 'video'], 'video/quicktime': ['.mov', 'video'],
  'video/webm': ['.webm', 'video']
}

// per-IP rate limit (counts files)
const hits = new Map()
function limited(ip, n) {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter(t => now - t < 3600e3)
  if (arr.length + n > HOURLY_LIMIT) return true
  for (let i = 0; i < n; i++) arr.push(now)
  hits.set(ip, arr)
  return false
}

// slots we handed out but the browser has not confirmed yet
const pending = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [id, p] of pending) if (p.exp < now) pending.delete(id)
}, 600e3).unref()

const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(compression())
app.use(express.json({ limit: '200kb' }))

// legacy local uploads
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '7d', immutable: true,
  setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff')
}))

const r2url = k => `${R2_PUBLIC_URL}/${k}`
const publicItem = m => ({
  id: m.id,
  url: m.key ? r2url(m.key) : '/uploads/' + m.file,
  thumb: m.thumbKey ? r2url(m.thumbKey) : null,
  type: m.type, uploader: m.uploader, createdAt: m.createdAt, views: m.views
})

app.get('/api/media', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json([...db].sort((a, b) => b.createdAt - a.createdAt).map(publicItem))
})

// Step 1: browser asks for upload permission slips (presigned URLs)
app.post('/api/media/presign', async (req, res) => {
  if (!r2Ready) return res.status(503).json({ error: 'Uploads are not configured yet.' })
  const files = Array.isArray(req.body?.files) ? req.body.files : []
  if (!files.length || files.length > 50) return res.status(400).json({ error: 'Send 1-50 files per request.' })
  for (const f of files) {
    if (!TYPES[f?.type]) return res.status(400).json({ error: 'Only photos and videos are allowed.' })
    if (!(f.size > 0) || f.size > MAX_MB * 1024 * 1024) return res.status(400).json({ error: `File too large (max ${MAX_MB} MB).` })
  }
  if (limited(req.ip, files.length)) return res.status(429).json({ error: 'Too many uploads. Try again later.' })
  try {
    const slots = await Promise.all(files.map(async f => {
      const id = crypto.randomBytes(8).toString('hex')
      const key = `media/${id}${TYPES[f.type][0]}`
      const thumbKey = `thumbs/${id}.jpg`
      pending.set(id, { key, thumbKey, kind: TYPES[f.type][1], exp: Date.now() + 6 * 3600e3 })
      const sign = (Key, ContentType) =>
        getSignedUrl(s3, new PutObjectCommand({ Bucket: R2_BUCKET, Key, ContentType }), { expiresIn: 7200 })
      return { id, uploadUrl: await sign(key, f.type), thumbUrl: await sign(thumbKey, 'image/jpeg') }
    }))
    res.json(slots)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not prepare upload.' })
  }
})

// Step 3: browser says "done" - we verify the files really exist, then add them to the album
app.post('/api/media/commit', async (req, res) => {
  if (!r2Ready) return res.status(503).json({ error: 'Uploads are not configured yet.' })
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 50).map(String) : []
  const uploader = String(req.body?.name || '').replace(/[<>]/g, '').trim().slice(0, 40)
  const base = Date.now()
  const results = await Promise.all(ids.map(async (id, i) => {
    const p = pending.get(id)
    if (!p) return null
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: p.key }))
      if (head.ContentLength > MAX_MB * 1024 * 1024) { await deleteKeys([p.key, p.thumbKey]); pending.delete(id); return null }
      let hasThumb = true
      try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: p.thumbKey })) } catch { hasThumb = false }
      pending.delete(id)
      return { id, key: p.key, thumbKey: hasThumb ? p.thumbKey : null, type: p.kind, uploader, createdAt: base + i, views: 0 }
    } catch { return null } // object never arrived
  }))
  const added = results.filter(Boolean)
  db.push(...added)
  if (added.length) saveNow()
  res.json(added.map(publicItem))
})

app.post('/api/media/:id/view', (req, res) => {
  const m = db.find(x => x.id === req.params.id)
  if (!m) return res.status(404).json({ error: 'Not found' })
  m.views++
  saveSoon()
  res.json({ views: m.views })
})

app.delete('/api/media/:id', async (req, res) => {
  const key = String(req.get('x-admin-key') || '')
  const ok = ADMIN_KEY && key.length === ADMIN_KEY.length &&
    crypto.timingSafeEqual(Buffer.from(key), Buffer.from(ADMIN_KEY))
  if (!ok) return res.status(403).json({ error: 'Forbidden' })
  const i = db.findIndex(x => x.id === req.params.id)
  if (i < 0) return res.status(404).json({ error: 'Not found' })
  const [m] = db.splice(i, 1)
  saveNow()
  if (m.key && s3) await deleteKeys([m.key, m.thumbKey].filter(Boolean))
  else if (m.file) fs.unlink(path.join(UPLOAD_DIR, m.file), () => {})
  res.json({ ok: true })
})

// ---------- built Vue app ----------
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h' }))
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html'))) // SPA fallback
} else {
  app.get('/', (req, res) => res.send('Run "npm run build" first (or use "npm run dev").'))
}

app.listen(PORT, () => console.log(`Invitation site on http://localhost:${PORT}`))
