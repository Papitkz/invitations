
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { items, load, uploadFiles, ALLOWED_TYPES, addView, remove } from '../store'
import { confetti } from '../fx'

/* ---------- state ---------- */
const sort = ref('new')
const filter = ref('all')
const now = ref(Date.now())
const name = ref(localStorage.getItem('uname') || '')
watch(name, v => localStorage.setItem('uname', v.trim()))

const adminKey = (() => {
  const q = new URLSearchParams(location.search).get('admin')
  if (q) sessionStorage.setItem('adm', q)
  return sessionStorage.getItem('adm') || ''
})()

const shown = computed(() =>
  items.value
    .filter(i => filter.value === 'all' || i.type === filter.value)
    .sort((a, b) => (sort.value === 'new' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt))
)
const photos = computed(() => items.value.filter(i => i.type === 'image').length)
const videos = computed(() => items.value.length - photos.value)
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`

const fmt = ts => {
  const d = now.value - ts
  if (d < 60e3) return 'just now'
  if (d < 3600e3) return Math.floor(d / 60e3) + ' min ago'
  if (d < 86400e3) return Math.floor(d / 3600e3) + ' h ago'
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
const full = ts => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/* ---------- snackbar ---------- */
const snack = ref({ show: false, text: '', color: 'primary' })
const toast = (text, err = false) => (snack.value = { show: true, text, color: err ? 'error' : 'primary' })

/* ---------- loading + polling ---------- */
let poll, tick
onMounted(async () => {
  try { await load() } catch { toast('Could not load the album.', true) }
  poll = setInterval(() => { if (!document.hidden && !busy.value) load().catch(() => {}) }, 30000)
  tick = setInterval(() => (now.value = Date.now()), 30000)
})
onBeforeUnmount(() => { clearInterval(poll); clearInterval(tick); window.removeEventListener('keydown', onKey) })

/* ---------- upload ---------- */
const MAX = 100 * 1024 * 1024
const fileInput = ref(null)
const over = ref(false)
const busy = ref(false)
const pct = ref(0)
const label = ref('')

const warnLeave = e => { e.preventDefault(); e.returnValue = '' }

async function uploadAll(files) {
  const good = files.filter(f => ALLOWED_TYPES.has(f.type) && f.size <= MAX)
  const skipped = files.length - good.length
  if (!good.length) return toast(files.length ? 'Those files are unsupported or over 100 MB.' : 'Choose photos or videos.', true)
  if (busy.value) return toast('Upload in progress…', true)
  busy.value = true; pct.value = 0; label.value = 'Preparing…'
  addEventListener('beforeunload', warnLeave)
  const { ok, fail, lastErr } = await uploadFiles(good, name.value.trim(), p => {
    pct.value = p.pct
    label.value = `${p.done} of ${p.total} uploaded · ${p.pct}%`
  })
  removeEventListener('beforeunload', warnLeave)
  busy.value = false; pct.value = 0
  if (ok) { confetti(innerWidth / 2, innerHeight * 0.5, 80); await load().catch(() => {}) }
  const bad = fail + skipped
  bad
    ? toast(`${ok} added, ${plural(bad, 'file')} skipped or failed. ${lastErr}`, true)
    : toast(`${plural(ok, 'file')} added. Thank you!`)
}
const onPick = e => { uploadAll([...e.target.files]); e.target.value = '' }
const onDrop = e => { over.value = false; uploadAll([...e.dataTransfer.files]) }

/* ---------- lightbox (Book Page Turn Mode) ---------- */
const curId = ref(null)
const dir = ref('next')
const open = computed({ get: () => curId.value !== null, set: v => { if (!v) curId.value = null } })
const idx = computed(() => shown.value.findIndex(i => i.id === curId.value))
const cur = computed(() => shown.value[idx.value] || null)
const seen = new Set(JSON.parse(sessionStorage.getItem('seen') || '[]'))

function countView(id) {
  if (seen.has(id)) return
  seen.add(id)
  sessionStorage.setItem('seen', JSON.stringify([...seen]))
  addView(id).catch(() => {})
}
function openItem(id) { dir.value = 'next'; curId.value = id; countView(id) }
function go(step) {
  const n = shown.value.length
  if (!n || idx.value < 0) return
  dir.value = step > 0 ? 'next' : 'prev'
  curId.value = shown.value[(idx.value + step + n) % n].id
  countView(curId.value)
}
function onKey(e) {
  if (e.key === 'ArrowLeft') go(-1)
  if (e.key === 'ArrowRight') go(1)
}
watch(open, v => (v ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)))

let sx = 0
const touchStart = e => (sx = e.touches[0].clientX)
const touchEnd = e => {
  const dx = e.changedTouches[0].clientX - sx
  if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
}

async function del() {
  if (!cur.value || !confirm('Delete this item for everyone?')) return
  const id = cur.value.id
  try {
    if (shown.value.length > 1) go(1)
    else curId.value = null
    await remove(id, adminKey)
    toast('Deleted.')
  } catch (e) { toast(e.message, true) }
}
</script>

<template>
  <section class="album mx-auto px-4 pt-28 pb-20">
    <header class="text-center mb-8">
      <h2 class="font-script text-azure leading-none m-0 title">Our Photobook</h2>
      <p class="mt-2 text-xl opacity-85 font-medium tracking-wide">
        {{ items.length ? `${plural(photos, 'photo')} · ${plural(videos, 'video')}` : 'Memories from our celebration' }}
      </p>
    </header>

    <!-- Upload Box -->
    <div class="drop mx-auto flex items-center justify-center gap-4 p-6 cursor-pointer"
         :class="{ over }" tabindex="0" role="button" aria-label="Add photos or videos"
         @click="fileInput.click()" @keydown.enter.prevent="fileInput.click()" @keydown.space.prevent="fileInput.click()"
         @dragenter.prevent="over = true" @dragover.prevent="over = true" @dragleave.prevent="over = false" @drop.prevent="onDrop">
      <input ref="fileInput" type="file" accept="image/*,video/*" multiple hidden @change="onPick">
      <v-avatar color="primary" size="60" class="elevation-4 upload-avatar">
        <v-icon icon="mdi-plus" size="34" color="white" />
      </v-avatar>
      <div class="text-left">
        <div class="font-caps font-bold tracking-wider text-[16px] text-indigo-900">Add photos &amp; videos</div>
        <div class="text-[15px] opacity-75 mt-0.5">Tap here or drop files · up to 100 MB each</div>
      </div>
    </div>

    <div class="flex items-center justify-center gap-3 mt-4">
      <label for="uname" class="font-caps text-xs tracking-widest text-indigo-900 font-semibold">Your name</label>
      <v-text-field id="uname" v-model="name" maxlength="40" placeholder="Optional" class="max-w-[240px]" bg-color="white" variant="outlined" density="compact" hide-details rounded="pill" />
    </div>

    <transition name="fold">
      <div v-if="busy" class="mx-auto max-w-[560px] mt-4 text-center">
        <v-progress-linear :model-value="pct" color="primary" bg-color="white" height="12" rounded class="elevation-2" />
        <div class="mt-2 text-[16px] font-semibold text-indigo-900">{{ label }}</div>
      </div>
    </transition>

    <!-- Tools & Filters -->
    <div class="flex flex-wrap justify-between items-center gap-3 mt-8 mb-6">
      <v-btn-toggle v-model="sort" mandatory rounded="pill" color="primary" density="comfortable" class="seg elevation-1">
        <v-btn value="new" size="small" class="px-4">Newest</v-btn>
        <v-btn value="old" size="small" class="px-4">Oldest</v-btn>
      </v-btn-toggle>
      <v-btn-toggle v-model="filter" mandatory rounded="pill" color="primary" density="comfortable" class="seg elevation-1">
        <v-btn value="all" size="small" class="px-4">All</v-btn>
        <v-btn value="image" size="small" class="px-4">Photos</v-btn>
        <v-btn value="video" size="small" class="px-4">Videos</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Grid -->
    <transition-group name="tile" tag="div" class="grid">
      <v-card v-for="(m, i) in shown" :key="m.id" class="tile book-page-card" rounded="lg" elevation="2"
              :style="{ '--i': Math.min(i, 14) }" :aria-label="m.type === 'video' ? 'Open video' : 'Open photo'"
              @click="openItem(m.id)">
        <v-img v-if="m.type === 'image'" :src="m.thumb || m.url" cover aspect-ratio="1" class="media" />
        <v-img v-else-if="m.thumb" :src="m.thumb" cover aspect-ratio="1" class="media" />
        <video v-else :src="m.url + '#t=0.1'" preload="metadata" muted playsinline class="media" />
        
        <div class="media-overlay-effects"></div>
        <v-icon v-if="m.type === 'video'" icon="mdi-play-circle" size="42" color="white" class="play" />
        
        <div class="tag">
          <span class="font-medium">{{ fmt(m.createdAt) }}</span>
          <span class="flex items-center gap-1 font-semibold"><v-icon icon="mdi-eye-outline" size="16" />{{ m.views }}</span>
        </div>
      </v-card>
    </transition-group>

    <transition name="fold">
      <p v-if="!shown.length" class="text-center text-[20px] mt-12 opacity-75 font-medium">No photos yet. Be the first to turn a page!</p>
    </transition>

    <p class="text-center font-script text-azure text-[44px] mt-16 tracking-wide">Alexandra &amp; Althea</p>

    <!-- Lightbox (Book Page Turn Viewer) -->
    <v-dialog v-model="open" fullscreen scrim="#08142c" class="lb-overlay" transition="fade-transition" :scrollable="false">
      <div class="lb book-spread" @touchstart.passive="touchStart" @touchend="touchEnd" @click.self="open = false">
        <v-btn icon="mdi-close" variant="flat" color="white" class="lb-x elevation-4" aria-label="Close" @click="open = false" />
        <v-btn icon="mdi-chevron-left" variant="flat" color="white" class="lb-n prev elevation-4" aria-label="Previous Page" @click="go(-1)" />
        <v-btn icon="mdi-chevron-right" variant="flat" color="white" class="lb-n next elevation-4" aria-label="Next Page" @click="go(1)" />

        <div class="stage" @click.self="open = false">
          <transition :name="'page-' + dir" mode="out-in">
            <div v-if="cur" :key="cur.id" class="slide book-page" @click.self="open = false">
              <div class="photo-frame">
                <img v-if="cur.type === 'image'" :src="cur.url" alt="">
                <video v-else :src="cur.url" controls autoplay playsinline />
              </div>
            </div>
          </transition>
        </div>

        <div v-if="cur" class="meta elevation-6">
          <span v-if="cur.uploader" class="font-semibold text-white">by {{ cur.uploader }}</span>
          <span class="opacity-80">{{ full(cur.createdAt) }}</span>
          <v-chip color="white" variant="flat" class="views font-semibold" prepend-icon="mdi-eye-outline">
            <transition name="num" mode="out-in"><span :key="cur.views">{{ plural(cur.views, 'view') }}</span></transition>
          </v-chip>
          <v-btn v-if="adminKey" size="small" variant="flat" color="error" class="font-weight-bold" prepend-icon="mdi-delete-outline" @click="del">Delete</v-btn>
        </div>
      </div>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="pill" timeout="3200" location="bottom" class="elevation-6">{{ snack.text }}</v-snackbar>
  </section>
</template>

<style scoped>
.album { max-width: 1140px; }
.title { font-size: clamp(68px, 19vw, 98px); filter: drop-shadow(0 2px 10px rgba(31, 74, 138, 0.15)); }

/* Dropzone */
.drop {
  max-width: 580px; 
  border-radius: 28px; 
  border: 2px dashed #7a92e6; 
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 32px -12px rgba(31, 74, 138, 0.12);
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.drop:hover, .drop.over { 
  background: #fff; 
  border-color: #2563eb; 
  transform: translateY(-2px); 
  box-shadow: 0 18px 40px -12px rgba(37, 99, 235, 0.2);
}
.upload-avatar {
  background: linear-gradient(135deg, #2563eb, #7c3aed) !important;
  transition: transform 0.3s ease;
}
.drop:hover .upload-avatar {
  transform: scale(1.08);
}

.seg { 
  background: rgba(255, 255, 255, 0.85); 
  backdrop-filter: blur(8px);
  box-shadow: inset 0 0 0 1px #d6e4fd, 0 8px 20px -8px rgba(31, 74, 138, 0.1); 
  height: 46px !important; 
  padding: 4px; 
}
.seg :deep(.v-btn) { border: 0 !important; font-weight: 600; letter-spacing: 0.05em; }

/* Grid */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
@media (min-width: 700px) { .grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; } }

/* Book-style photo card */
.book-page-card { 
  position: relative; 
  aspect-ratio: 1; 
  overflow: hidden; 
  cursor: pointer; 
  background: #fff !important;
  border: 4px solid #fff;
  box-shadow: 0 10px 25px -10px rgba(31, 74, 138, 0.3), inset 0 0 0 1px rgba(0,0,0,0.06) !important; 
  transition: transform 0.4s cubic-bezier(.22, .8, .2, 1), box-shadow 0.4s, rotate 0.4s; 
}
.book-page-card:hover { 
  transform: translateY(-6px) scale(1.02); 
  box-shadow: 0 22px 45px -14px rgba(31, 74, 138, 0.5) !important; 
}
.media { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.5s ease; }
.book-page-card:hover .media { transform: scale(1.04); }

.media-overlay-effects {
  position: absolute; 
  inset: auto 0 0 0; 
  height: 64px; 
  background: linear-gradient(0deg, rgba(14, 34, 74, 0.75), transparent); 
  pointer-events: none;
  z-index: 1;
}
.tag { 
  position: absolute; 
  z-index: 2; 
  left: 12px; 
  right: 12px; 
  bottom: 10px; 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  color: #fff; 
  font-size: 14px; 
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6); 
  pointer-events: none; 
}
.play { 
  position: absolute; 
  top: 10px; 
  right: 10px; 
  z-index: 2; 
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
  transition: transform 0.3s ease;
}
.book-page-card:hover .play { transform: scale(1.12); }

.tile-enter-active { transition: opacity .6s ease, transform .7s cubic-bezier(.22, .8, .2, 1); transition-delay: calc(var(--i) * 45ms); }
.tile-leave-active { transition: opacity .35s ease, transform .35s ease; position: absolute; }
.tile-move { transition: transform .6s cubic-bezier(.22, .8, .2, 1); }
.tile-enter-from { opacity: 0; transform: translateY(28px) scale(.92); }
.tile-leave-to { opacity: 0; transform: scale(.85); }

.fold-enter-active, .fold-leave-active { transition: opacity .35s ease, transform .35s ease; }
.fold-enter-from, .fold-leave-to { opacity: 0; transform: translateY(-10px); }

/* ---------- Book Opening Lightbox Viewer ---------- */
.lb { 
  position: relative; 
  width: 100%; 
  height: 100%; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  perspective: 1500px; /* Essential for 3D page turn effect */
}
.stage { 
  flex: 1; 
  min-height: 0; 
  width: 100%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: 70px 60px 12px; 
}
.slide { 
  max-width: 100%; 
  max-height: 100%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  transform-style: preserve-3d;
}

/* Polarized Photo Frame representing a physical book page spread */
.photo-frame {
  background: #ffffff;
  padding: 16px 16px 44px 16px;
  border-radius: 4px;
  box-shadow: 0 35px 90px rgba(0, 0, 0, 0.7), 0 5px 15px rgba(0,0,0,0.3);
  transform: rotate(0.5deg);
  transition: transform 0.3s ease;
}
.photo-frame img, .photo-frame video { 
  max-width: 100%; 
  max-height: calc(100vh - 230px); 
  display: block; 
  border-radius: 2px;
}

.lb-x { 
  position: absolute !important; 
  top: calc(16px + env(safe-area-inset-top, 0px)); 
  right: 16px; 
  z-index: 3; 
  background: rgba(255, 255, 255, 0.2) !important; 
  backdrop-filter: blur(6px);
  color: #fff !important; 
  transition: transform 0.2s ease, background 0.2s ease;
}
.lb-x:hover { transform: scale(1.08); background: rgba(255, 255, 255, 0.35) !important; }

.lb-n { 
  position: absolute !important; 
  top: 50%; 
  margin-top: -26px; 
  z-index: 3; 
  background: rgba(255, 255, 255, 0.2) !important; 
  backdrop-filter: blur(6px);
  color: #fff !important; 
  width: 52px; height: 52px;
  transition: transform 0.2s ease, background 0.2s ease;
}
.lb-n:hover { transform: scale(1.1); background: rgba(255, 255, 255, 0.35) !important; }
.prev { left: 16px; } .next { right: 16px; }

.meta { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 8px 20px; 
  align-items: center; 
  justify-content: center; 
  padding: 14px 20px calc(18px + env(safe-area-inset-bottom, 0px)); 
  color: #e6efff; 
  font-size: 16px; 
  background: rgba(14, 32, 66, 0.85);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  z-index: 3;
}
.views { background: rgba(255, 255, 255, 0.2) !important; color: #fff !important; font-weight: 600; }

/* ---------- 3D Book Page-Turn Animations ---------- */
.page-next-enter-active, .page-next-leave-active, .page-prev-enter-active, .page-prev-leave-active { 
  transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease;
  transform-origin: center center;
}
.page-next-enter-from { 
  opacity: 0; 
  transform: rotateY(90deg) scale(0.9); 
}
.page-next-leave-to { 
  opacity: 0; 
  transform: rotateY(-90deg) scale(0.9); 
}
.page-prev-enter-from { 
  opacity: 0; 
  transform: rotateY(-90deg) scale(0.9); 
}
.page-prev-leave-to { 
  opacity: 0; 
  transform: rotateY(90deg) scale(0.9); 
}

.num-enter-active, .num-leave-active { transition: opacity .2s, transform .2s; display: inline-block; }
.num-enter-from { opacity: 0; transform: translateY(8px); }
.num-leave-to { opacity: 0; transform: translateY(-8px); }

@media (max-width: 520px) {
  .stage { padding: 70px 10px 10px; }
  .lb-n { top: auto; bottom: 84px; margin-top: 0; width: 44px; height: 44px; }
}
</style>

<style>
.lb-overlay > .v-overlay__scrim { opacity: .98 !important; backdrop-filter: blur(10px); }
</style>
