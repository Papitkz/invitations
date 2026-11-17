// Falling petals + bubbles + confetti on one canvas
const COLORS = ['#5fa0f2', '#8fb4f7', '#a58cf2', '#c3a6f2', '#7a6fe0', '#ffffff']
const PAIRS = [['#5fa0f2', '#a58cf2'], ['#7db3f6', '#b79ff4'], ['#4f86e0', '#8f78e8'], ['#ffffff', '#c9b8f7']]
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
let cv, ctx, W = innerWidth, H = innerHeight, dpr = 1, parts = [], burst = [], raf = 0

const rnd = (a, b) => a + Math.random() * (b - a)

function petal(top) {
  const size = rnd(6, 15), pr = PAIRS[(Math.random() * PAIRS.length) | 0]
  const g = ctx.createLinearGradient(0, -size, 0, size) // blue tip -> violet base
  g.addColorStop(0, pr[0]); g.addColorStop(1, pr[1])
  return {
    x: rnd(0, W), y: top ? -20 : rnd(0, H), s: size,
    vy: rnd(.3, .9), vx: rnd(-.25, .25), r: rnd(0, 6.28), vr: rnd(-.02, .02),
    sw: rnd(0, 6.28), c: g,
    bubble: Math.random() < .3, a: rnd(.45, .9)
  }
}
function init() {
  dpr = Math.min(devicePixelRatio || 1, 2)
  W = innerWidth; H = innerHeight
  cv.width = W * dpr; cv.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const n = reduce ? 0 : Math.round(Math.min(46, W / 22))
  parts = Array.from({ length: n }, () => petal(false))
}
function drawPetal(p) {
  ctx.save(); ctx.globalAlpha = p.a; ctx.translate(p.x, p.y)
  if (p.bubble) {
    ctx.beginPath(); ctx.arc(0, 0, p.s * .6, 0, 6.28)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill()
  } else {
    ctx.rotate(p.r); ctx.fillStyle = p.c
    ctx.beginPath(); ctx.ellipse(0, 0, p.s * .45, p.s, 0, 0, 6.28); ctx.fill()
  }
  ctx.restore()
}
function frame() {
  ctx.clearRect(0, 0, W, H)
  for (const p of parts) {
    p.y += p.vy; p.sw += .015; p.x += p.vx + Math.sin(p.sw) * .5; p.r += p.vr
    if (p.y > H + 20) Object.assign(p, petal(true))
    drawPetal(p)
  }
  for (let i = burst.length - 1; i >= 0; i--) {
    const b = burst[i]
    b.vy += .12; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life--
    if (b.life <= 0) { burst.splice(i, 1); continue }
    ctx.save(); ctx.globalAlpha = Math.min(1, b.life / 30)
    ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c
    ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore()
  }
  raf = requestAnimationFrame(frame)
}

export function startFx(canvas) {
  cv = canvas; ctx = cv.getContext('2d')
  init(); addEventListener('resize', init); frame()
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', init) }
}

export function confetti(x = W / 2, y = H / 3, n = 90) {
  if (reduce) return
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.28), v = rnd(3, 11)
    burst.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, s: rnd(6, 12),
      r: rnd(0, 6), vr: rnd(-.3, .3), life: rnd(70, 120), c: COLORS[(Math.random() * 5) | 0]
    })
  }
}
