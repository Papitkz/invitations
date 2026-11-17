
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { confetti } from '../fx'

const EVENT = new Date('2026-11-21T17:00:00+08:00').getTime() // 5 PM Philippine time
const now = ref(Date.now())
const isHovered = ref(false)
let t1, t2

onMounted(() => {
  t1 = setInterval(() => (now.value = Date.now()), 1000)
  t2 = setTimeout(() => confetti(innerWidth / 2, innerHeight * 0.32, 120), 700)
})
onBeforeUnmount(() => { clearInterval(t1); clearInterval(t2) })

const left = computed(() => Math.max(0, Math.floor((EVENT - now.value) / 1000)))
const units = computed(() => [
  ['days', Math.floor(left.value / 86400)],
  ['hours', Math.floor((left.value % 86400) / 3600)],
  ['mins', Math.floor((left.value % 3600) / 60)],
  ['secs', left.value % 60]
])
const pad = n => String(n).padStart(2, '0')

// Interactive celebration pop with multi-layer feedback
const pop = e => { 
  if (!e.target.closest('a,button')) {
    confetti(e.clientX, e.clientY, 42)
  }
}

const maps = 'https://www.google.com/maps/search/?api=1&query=Salonga+Hall+Parang+Bagac+Bataan'
</script>

<template>
  <section class="hero" @pointerdown="pop">
    <!-- Immersive Background Bloom & Floating Orbs -->
    <div class="bloom" aria-hidden="true"><svg class="spin"><use href="#flower" /></svg></div>
    <svg v-for="n in 6" :key="n" :class="['fl', 'f' + n]" aria-hidden="true"><use href="#flower" /></svg>
    <div class="ambient-glow" aria-hidden="true"></div>

    <div class="stage">
      <!-- Dynamic Sparkles -->
      <svg v-for="n in 8" :key="'s' + n" :class="['spark', 's' + n]" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
      </svg>

      <p class="small fade-in" style="--d:0.1s">You are cordially invited to the</p>
      <h1 class="script font-script fade-in" style="--d:0.3s">birthday</h1>
      <p class="celebration track fade-in" style="--d:0.5s">Celebration</p>
      <p class="small fade-in" style="--d:0.7s">of</p>

      <!-- Spectacular Zoom-in Names Wrapper -->
      <div class="names-wrapper zoom-in-group">
        <div class="who a" style="--d:0.9s" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
          <p class="name n-blue font-script" aria-label="Alexandra, 18">Alexandra <b>@18</b></p>
        </div>
        <p class="amp font-script zoom-amp" style="--d:1.05s" aria-hidden="true">&amp;</p>
        <div class="who b" style="--d:1.2s">
          <p class="name n-violet font-script" aria-label="Althea, 14">Althea <b>@14</b></p>
        </div>
      </div>

      <div class="when font-caps text-deep fade-in" style="--d:1.4s">
        <span class="edge text-right">November</span>
        <span class="mid">
          <span class="dow">Saturday</span>
          <span class="num">21</span>
        </span>
        <span class="edge text-left">at 5 PM</span>
      </div>

      <div class="venue-card fade-in" style="--d:1.6s">
        <p class="venue"><strong>Salonga Hall</strong><br>Parang, Bagac, Bataan</p>
      </div>

      <div class="count fade-in" style="--d:1.8s" role="timer" aria-live="off">
        <template v-if="left > 0">
          <div v-for="[label, v] in units" :key="label" class="unit">
            <b :key="v" class="font-caps bump">{{ pad(v) }}</b>
            <i>{{ label }}</i>
          </div>
        </template>
        <span v-else class="font-script text-azure done">The celebration is here!</span>
      </div>

      <div class="cta fade-in" style="--d:2s">
        <v-btn to="/album" color="primary" size="x-large" class="go" elevation="6" prepend-icon="mdi-image-multiple-outline">
          Open Album
        </v-btn>
        <v-btn :href="maps" target="_blank" rel="noopener" variant="outlined" color="primary" size="x-large" class="out"
               prepend-icon="mdi-map-marker-outline">
          Get Directions
        </v-btn>
      </div>
    </div>

    <router-link to="/album" class="hint fade-in" style="--d:2.2s" aria-label="Go to album">
      <v-icon icon="mdi-chevron-down" size="40" />
    </router-link>
  </section>
</template>

<style scoped>
/* Ensure smooth document flow and smooth scrolling globally */
:global(html) {
  scroll-behavior: smooth;
  overflow-x: hidden;
}

.hero {
  position: relative; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  min-height: 100svh; 
  width: 100%;
  overflow: hidden; /* Contains background blur safely inside */
  padding: calc(90px + env(safe-area-inset-top, 0px)) 24px calc(80px + env(safe-area-inset-bottom, 0px));
  background: radial-gradient(circle at 50% 30%, rgba(240, 244, 255, 0.8) 0%, rgba(245, 240, 255, 0.5) 50%, rgba(255, 255, 255, 1) 100%);
}

.stage { 
  position: relative; 
  z-index: 2; 
  width: min(660px, 100%); 
  text-align: center; 
}

/* Ambient glow backdrop */
.ambient-glow {
  position: absolute;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(120, 90, 240, 0.15) 0%, transparent 70%);
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
  filter: blur(30px);
  animation: pulseGlow 6s ease-in-out infinite alternate;
}

/* ---------- Typography & Sizing Adjustments ---------- */
.small { 
  font-family: 'Cinzel', serif; 
  font-size: 13px; 
  letter-spacing: .35em; 
  text-transform: uppercase; 
  margin: 0; 
  text-indent: .35em; 
  color: #4a5578;
}

h1.script {
  width: fit-content; 
  margin: 4px auto -8px; 
  font-weight: 400; 
  line-height: 1.05;
  font-size: clamp(84px, min(26vw, 19svh), 146px);
  background: linear-gradient(100deg, #174284 10%, #4f46e5 45%, #2355a8 55%, #6355f2 90%);
  background-size: 220% 100%; 
  -webkit-background-clip: text; 
  background-clip: text; 
  color: transparent;
  animation: float 7s ease-in-out 1.5s infinite alternate, shine 7s linear infinite;
  filter: drop-shadow(0 4px 12px rgba(79, 70, 229, 0.15));
}

.celebration {
  font-family: 'Cinzel', serif; 
  font-size: clamp(21px, 6vw, 31px); 
  letter-spacing: .25em; 
  text-indent: .25em;
  text-transform: uppercase; 
  color: #24338c; 
  margin: 0 0 12px;
  font-weight: 600;
}

.names-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 8px 0;
}

.who { 
  position: relative; 
  isolation: isolate; 
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.who:hover {
  transform: scale(1.04);
}

.who::before { 
  content: ''; 
  position: absolute; 
  inset: -18% -8%; 
  z-index: -1; 
  pointer-events: none; 
  filter: blur(12px);
  animation: halo 1.4s ease var(--d) backwards;
}
.who.a::before { background: radial-gradient(closest-side, rgba(190, 220, 255, .85), transparent 80%); }
.who.b::before { background: radial-gradient(closest-side, rgba(224, 205, 255, .85), transparent 80%); }

/* ---------- Zoom-in Name Animation ---------- */
.name {
  position: relative; 
  z-index: 1; 
  width: fit-content; 
  margin: 4px auto;
  font-size: clamp(50px, min(15vw, 10.5svh), 84px);
  line-height: 1.1;
  text-shadow: 0 4px 20px rgba(255, 255, 255, 0.8);
  animation: zoomInNames 1.2s cubic-bezier(0.2, 1.2, 0.3, 1) var(--d) backwards;
}
.name b { font-weight: 500; font-size: .82em; }

.n-blue {
  color: #1542c0;
}
.n-violet {
  color: #631bcb;
}

.amp {
  width: fit-content; 
  margin: -4px auto; 
  font-size: clamp(42px, 11vw, 58px); 
  line-height: 1; 
  padding: 0 .1em; 
  color: #5b46d8;
  text-shadow: 0 2px 14px rgba(255, 255, 255, .8);
  animation: zoomInNames 1.2s cubic-bezier(0.2, 1.2, 0.3, 1) 1.05s backwards, beat 3.2s ease-in-out 2s infinite;
}

/* ---------- Date Header ---------- */
.when { 
  display: grid; 
  grid-template-columns: 1fr auto 1fr; 
  align-items: center; 
  gap: clamp(12px, 3.5vw, 20px); 
  margin: 28px auto 14px; 
  max-width: 480px; 
}
.edge { 
  position: relative; 
  padding: 10px 0; 
  font-size: clamp(13px, 3.6vw, 17px); 
  letter-spacing: .22em; 
  text-transform: uppercase; 
  font-weight: 600;
}
.edge:first-child { color: #194bc4; }
.edge:last-child { color: #5f32cb; }
.edge::before, .edge::after {
  content: ''; position: absolute; left: 0; right: 0; height: 2px; background: #1f4a8a;
  animation: draw 1s cubic-bezier(.6, .1, .2, 1) 1.4s backwards;
}
.edge:first-child::before, .edge:first-child::after { background: #255ad9; }
.edge:last-child::before, .edge:last-child::after { background: #733cd9; }
.edge::before { top: 0; transform-origin: right; }
.edge::after { bottom: 0; transform-origin: left; }
.mid { display: flex; flex-direction: column; align-items: center; }
.dow { font-size: 13px; letter-spacing: .3em; text-indent: .3em; text-transform: uppercase; font-weight: 600; color: #43507d; }

.num {
  background: linear-gradient(160deg, #1852c4 10%, #733cd9 90%); 
  -webkit-background-clip: text; 
  background-clip: text; 
  color: transparent;
  font-size: clamp(62px, min(17vw, 11svh), 88px);
  font-weight: 800; 
  line-height: 1;
  animation: beat 3.2s ease-in-out 2.2s infinite;
  filter: drop-shadow(0 4px 10px rgba(115, 60, 217, 0.2));
}

/* ---------- Venue Card ---------- */
.venue-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(115, 60, 217, 0.12);
  border-radius: 16px;
  padding: 12px 20px;
  max-width: 400px;
  margin: 0 auto 18px;
  box-shadow: 0 10px 30px -10px rgba(79, 70, 229, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.venue-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 35px -10px rgba(79, 70, 229, 0.15);
}
.venue { font-size: clamp(18px, 4.8vw, 22px); line-height: 1.4; margin: 0; color: #2d3748; }
.venue strong { font-family: 'Cinzel', serif; font-size: 16px; letter-spacing: .24em; text-transform: uppercase; color: #1e293b; }

/* ---------- Countdown ---------- */
.count { display: flex; justify-content: center; align-items: center; min-height: 76px; margin-bottom: 24px; }
.unit { padding: 0 clamp(10px, 3.6vw, 22px); min-width: 66px; }
.unit + .unit { border-left: 1px solid rgba(31, 74, 138, .2); }
.unit:nth-child(1) b { color: #174fc2; }
.unit:nth-child(2) b { color: #3250d0; }
.unit:nth-child(3) b { color: #5044d6; }
.unit:nth-child(4) b { color: #7038d1; }
.unit b { display: block; font-size: clamp(32px, 9.5vw, 50px); font-weight: 600; line-height: 1.1; font-variant-numeric: tabular-nums; }
.unit i { display: block; font-style: normal; font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: .24em; text-indent: .24em; text-transform: uppercase; opacity: .8; color: #4a5568; }
.done { font-size: 40px; }
.bump { animation: bump .45s cubic-bezier(.3, 1.6, .5, 1); }

/* ---------- Call to Action Buttons ---------- */
.cta { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
.cta :deep(.v-btn) { 
  min-width: 210px; 
  font-weight: 600;
  letter-spacing: 0.08em;
  border-radius: 14px !important;
  transition: transform .3s cubic-bezier(.2, .7, .2, 1), box-shadow .3s; 
}
.cta :deep(.v-btn:hover) { 
  transform: translateY(-3px) scale(1.02); 
}
.cta :deep(.go) { 
  background: linear-gradient(135deg, #2563eb, #7c3aed) !important; 
  color: #fff !important; 
  box-shadow: 0 16px 30px -10px rgba(124, 58, 237, 0.6) !important; 
}
.cta :deep(.out) { 
  color: #5b21b6 !important; 
  border-color: rgba(124, 58, 237, 0.4) !important; 
  background: rgba(255, 255, 255, 0.6); 
  backdrop-filter: blur(4px);
}

.hint { 
  position: absolute; 
  bottom: calc(16px + env(safe-area-inset-bottom, 0px)); 
  left: 50%; 
  transform: translateX(-50%); 
  color: #2563eb; 
  animation: bob 2s ease-in-out infinite; 
  z-index: 2; 
}

/* ---------- Sparkles ---------- */
.spark { 
  position: absolute; 
  width: 18px; 
  height: 18px; 
  fill: #6366f1; 
  pointer-events: none; 
  z-index: 2;
  filter: drop-shadow(0 0 8px rgba(124, 58, 237, 0.8)); 
  animation: twinkle 3s ease-in-out infinite; 
}
.s1 { left: 6%;  top: 4%;  width: 16px; height: 16px; animation-delay: .2s; }
.s2 { right: 5%; top: 12%; width: 22px; height: 22px; animation-delay: 1.1s; }
.s3 { left: 3%;  top: 40%; width: 14px; height: 14px; animation-delay: 1.9s; }
.s4 { right: 4%; top: 48%; width: 18px; height: 18px; animation-delay: .7s; }
.s5 { left: 10%; top: 74%; width: 20px; height: 20px; animation-delay: 2.4s; }
.s6 { right: 12%; top: 84%; width: 14px; height: 14px; animation-delay: 1.5s; }
.s7 { left: 24%; top: 18%; width: 12px; height: 12px; animation-delay: 2.1s; }
.s8 { right: 26%; top: 70%; width: 15px; height: 15px; animation-delay: 0.9s; }

/* ---------- Background Flowers ---------- */
.bloom {
  position: absolute; left: 50%; top: 46%; width: min(140vw, 840px); aspect-ratio: 1; translate: -50% -50%;
  pointer-events: none; color: #3b82f6; animation: bloom 2.8s cubic-bezier(.2, .8, .2, 1) backwards;
}
.spin { width: 100%; height: 100%; opacity: .12; animation: spin 140s linear infinite; }
.fl { position: absolute; opacity: .45; pointer-events: none; animation: sway 7s ease-in-out infinite alternate; }
.f1 { width: 160px; height: 160px; left: -30px; top: 60px; }
.f2 { width: 100px; height: 100px; left: 40px; top: 200px; animation-delay: -2s; }
.f3 { width: 140px; height: 140px; right: -26px; top: 90px; animation-delay: -4s; }
.f4 { width: 90px; height: 90px; right: 50px; top: 230px; animation-delay: -1s; }
.f5 { width: 150px; height: 150px; left: -34px; bottom: 90px; animation-delay: -3s; }
.f6 { width: 130px; height: 130px; right: -28px; bottom: 110px; animation-delay: -5s; }

/* ---------- Keyframes ---------- */
.fade-in { animation: fadeIn 1s cubic-bezier(.2, .8, .2, 1) var(--d, 0s) backwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

@keyframes zoomInNames {
  0% {
    opacity: 0;
    transform: scale(0.6) translateY(20px);
    filter: blur(8px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

@keyframes float { to { translate: 0 -8px; } }
@keyframes shine { to { background-position: -220% 0; } }
@keyframes track { from { letter-spacing: .6em; opacity: 0; } to { opacity: 1; } }
@keyframes beat { 50% { scale: 1.06; } }
@keyframes bump { from { transform: scale(1.2); } }
@keyframes draw { from { transform: scaleX(0); } }
@keyframes halo { from { opacity: 0; scale: 0.8; } }
@keyframes twinkle { 0%, 100% { opacity: .15; scale: .6; rotate: 0deg; } 50% { opacity: 1; scale: 1.2; rotate: 45deg; } }
@keyframes bob { 50% { transform: translate(-50%, 10px); } }
@keyframes bloom { from { opacity: 0; scale: .2; rotate: -70deg; } }
@keyframes spin { to { rotate: 360deg; } }
@keyframes sway { from { transform: rotate(-12deg) translateY(0); } to { transform: rotate(14deg) translateY(16px); } }
@keyframes pulseGlow { from { opacity: 0.6; scale: 0.9; } to { opacity: 1; scale: 1.1; } }

/* ---------- Responsiveness ---------- */
@media (max-width: 520px) {
  .hero { padding-left: 16px; padding-right: 16px; }
  .fl { opacity: .35; }
  .f1, .f5 { width: 120px; height: 120px; }
  .f3, .f6 { width: 104px; height: 104px; }
  .f2, .f4 { display: none; }
  .cta { flex-direction: column; align-items: center; }
  .cta :deep(.v-btn) { width: min(300px, 100%); }
  .s3, .s4 { display: none; }
}
@media (max-height: 760px) {
  h1.script { font-size: clamp(70px, min(24vw, 13svh), 120px); }
  .name { font-size: clamp(42px, min(14vw, 8svh), 66px); margin: 2px auto; }
  .amp { font-size: 38px; }
  .celebration { margin-bottom: 6px; }
  .num { font-size: clamp(52px, min(15vw, 8svh), 70px); }
  .venue-card { margin-bottom: 12px; padding: 10px 16px; }
}
</style>
