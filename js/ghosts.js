// Ghost partners: pre-drawn creature halves, replayed stroke by stroke so they
// feel hand-drawn. Used when nobody else is online. Every half connects to the
// two shared seam dots so it lines up with whatever the player draws.
import { SEAM, DOTS, W } from './board.js'

const [L, R] = DOTS
const Y = SEAM
const TAU = Math.PI * 2

// --- path primitives (u ∈ [0,1] → [x,y]) ---
const arc = (cx, cy, rx, ry, a0 = 0, a1 = TAU) => (u) => [cx + rx * Math.cos(a0 + (a1 - a0) * u), cy + ry * Math.sin(a0 + (a1 - a0) * u)]
const seg = (x1, y1, x2, y2) => (u) => [x1 + (x2 - x1) * u, y1 + (y2 - y1) * u]
const quad = (x1, y1, cx, cy, x2, y2) => (u) => {
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u
  return [a * x1 + b * cx + c * x2, a * y1 + b * cy + c * y2]
}
const poly = (pts, closed = false) => {
  const p = closed ? [...pts, pts[0]] : pts
  const lens = []
  let total = 0
  for (let i = 1; i < p.length; i++) {
    const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
    lens.push(l)
    total += l
  }
  return (u) => {
    let d = u * total
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        const t = lens[i] ? Math.min(1, d / lens[i]) : 0
        return [p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t]
      }
      d -= lens[i]
    }
    return p[p.length - 1]
  }
}
const dot = (x, y) => () => [x, y]

function sample(fn, rng) {
  let len = 0
  let prev = fn(0)
  for (let i = 1; i <= 24; i++) {
    const p = fn(i / 24)
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1])
    prev = p
  }
  if (len < 1) return [fn(0)]
  const n = Math.max(2, Math.round(len / 5))
  const ph = rng() * TAU
  const out = []
  for (let i = 0; i <= n; i++) {
    const [x, y] = fn(i / n)
    const wob = Math.sin(i * 0.18 + ph) * 1.4
    out.push([x + wob + (rng() - 0.5), y + wob * 0.6 + (rng() - 0.5)])
  }
  return out
}

const j = (rng, n) => (rng() - 0.5) * 2 * n // jitter ±n

// ---------------- top halves (heads) ----------------
const TOPS = [
  function cat(r) {
    const cx = 300 + j(r, 10), cy = 215 + j(r, 10), rad = 100 + j(r, 8)
    const head = arc(cx, cy, rad, rad * 0.92)
    return [
      head,
      poly([[cx - 78, cy - 58], [cx - 72, cy - 150 + j(r, 10)], [cx - 22, cy - 92]]),
      poly([[cx + 78, cy - 58], [cx + 72, cy - 150 + j(r, 10)], [cx + 22, cy - 92]]),
      arc(cx - 38, cy - 15, 13, 15), dot(cx - 36, cy - 12),
      arc(cx + 38, cy - 15, 13, 15), dot(cx + 40, cy - 12),
      poly([[cx - 9, cy + 14], [cx + 9, cy + 14], [cx, cy + 25]], true),
      arc(cx - 11, cy + 28, 11, 10, 0, Math.PI), arc(cx + 11, cy + 28, 11, 10, 0, Math.PI),
      seg(cx - 30, cy + 18, cx - 95, cy + 4), seg(cx - 30, cy + 26, cx - 98, cy + 30),
      seg(cx + 30, cy + 18, cx + 95, cy + 4), seg(cx + 30, cy + 26, cx + 98, cy + 30),
      seg(...head(2.12 / TAU), L, Y + 6), seg(...head(1.02 / TAU), R, Y + 6),
    ]
  },
  function robot(r) {
    const t = 105 + j(r, 10), b = 300
    return [
      poly([[185, t], [415, t], [415, b], [185, b]], true),
      seg(300, t, 300, t - 50), arc(300, t - 64, 14, 14),
      poly([[220, t + 50], [270, t + 50], [270, t + 95], [220, t + 95]], true),
      poly([[330, t + 50], [380, t + 50], [380, t + 95], [330, t + 95]], true),
      dot(245, t + 72), dot(355, t + 72),
      poly([[235, b - 55], [365, b - 55], [365, b - 25], [235, b - 25]], true),
      seg(262, b - 55, 262, b - 25), seg(290, b - 55, 290, b - 25), seg(318, b - 55, 318, b - 25), seg(346, b - 55, 346, b - 25),
      arc(170, (t + b) / 2, 15, 22), arc(430, (t + b) / 2, 15, 22),
      seg(245, b, L, Y + 6), seg(355, b, R, Y + 6),
    ]
  },
  function bird(r) {
    const cx = 290 + j(r, 8), cy = 220 + j(r, 8), rad = 92
    const head = arc(cx, cy, rad, rad)
    return [
      head,
      poly([[cx + 78, cy - 10], [cx + 175 + j(r, 15), cy + 18], [cx + 80, cy + 38]], true),
      seg(cx + 82, cy + 14, cx + 150, cy + 20),
      arc(cx + 30, cy - 20, 18, 18), dot(cx + 36, cy - 18),
      quad(cx - 10, cy - 90, cx - 40, cy - 170, cx - 70, cy - 150),
      quad(cx + 5, cy - 92, cx + 5, cy - 185, cx - 20, cy - 175),
      quad(cx + 20, cy - 88, cx + 55, cy - 160, cx + 35, cy - 165),
      arc(cx - 35, cy + 30, 16, 10),
      seg(...head(2.2 / TAU), L, Y + 6), seg(...head(0.95 / TAU), R, Y + 6),
    ]
  },
  function alien(r) {
    const cx = 300, cy = 235 + j(r, 8)
    const head = arc(cx, cy, 125, 92)
    const stalk = (x0, x1, top) => [quad(x0, cy - 80, (x0 + x1) / 2 + j(r, 15), top + 40, x1, top), arc(x1, top - 16, 17, 17), dot(x1 + 2, top - 14)]
    return [
      head,
      ...stalk(255, 215 + j(r, 10), 85),
      ...stalk(300, 300 + j(r, 10), 60),
      ...stalk(345, 385 + j(r, 10), 85),
      arc(cx, cy + 5, 62, 42, 0.25, Math.PI - 0.25),
      seg(cx - 20, cy + 40, cx - 20, cy + 52), seg(cx + 20, cy + 40, cx + 20, cy + 52),
      arc(cx - 70, cy + 10, 12, 8), arc(cx + 70, cy + 10, 12, 8),
      seg(...head(2.05 / TAU), L, Y + 6), seg(...head(1.1 / TAU), R, Y + 6),
    ]
  },
  function king(r) {
    const cx = 300, cy = 230 + j(r, 6)
    const head = arc(cx, cy, 112, 95)
    return [
      poly([[215, 150], [232, 80], [266, 125], [300, 60 + j(r, 10)], [334, 125], [368, 80], [385, 150]], true),
      dot(300, 95), dot(232, 100), dot(368, 100),
      head,
      arc(cx - 40, cy - 5, 18, 12, Math.PI + 0.3, TAU - 0.3),
      arc(cx + 40, cy - 5, 18, 12, Math.PI + 0.3, TAU - 0.3),
      quad(cx, cy + 25, cx - 40, cy + 15, cx - 70, cy + 40),
      quad(cx, cy + 25, cx + 40, cy + 15, cx + 70, cy + 40),
      arc(cx - 72, cy + 8, 14, 9), arc(cx + 72, cy + 8, 14, 9),
      seg(...head(2.15 / TAU), L, Y + 6), seg(...head(1.0 / TAU), R, Y + 6),
    ]
  },
]

// ---------------- bottom halves (bodies) ----------------
const BOTTOMS = [
  function legs(r) {
    const by = 640 + j(r, 10)
    return [
      quad(L, Y - 6, 120 + j(r, 15), 520, 240, by),
      quad(R, Y - 6, 480 + j(r, 15), 520, 360, by),
      seg(240, by, 360, by),
      dot(300, 530),
      seg(250, by, 240, 745), seg(240, 745, 195, 750),
      seg(350, by, 360, 745), seg(360, 745, 405, 750),
      quad(165, 480, 100, 440, 80, 500), quad(435, 480, 500, 440, 520, 500),
    ]
  },
  function tentacles(r) {
    const out = [quad(L, Y - 6, 165, 500, 195, 585), quad(R, Y - 6, 435, 500, 405, 585)]
    for (let i = 0; i < 5; i++) {
      const x0 = 195 + i * 52.5, ph = r() * TAU, len = 140 + j(r, 25)
      out.push((u) => [x0 + Math.sin(u * Math.PI * 2.2 + ph) * 24 * u, 585 + u * len])
      out.push(dot(x0 + Math.sin(Math.PI * 1.1 + ph) * 12, 585 + len * 0.5))
    }
    return out
  },
  function wheels(r) {
    const by = 630
    return [
      poly([[L, Y - 6], [170, 450], [170, by], [430, by], [430, 450], [R, Y - 6]]),
      arc(240, 520, 22, 22), arc(300, 520, 14, 14), arc(360, 520, 22, 22),
      seg(220, 585, 380, 585),
      arc(230, 690 + j(r, 5), 45, 45), dot(230, 690), arc(370, 690 + j(r, 5), 45, 45), dot(370, 690),
      seg(230, by, 230, 645), seg(370, by, 370, 645),
    ]
  },
  function mermaid(r) {
    const tx = 300 + j(r, 15)
    return [
      quad(L, Y - 6, 150, 530, tx - 20, 700),
      quad(R, Y - 6, 450, 530, tx + 20, 700),
      poly([[tx - 20, 700], [tx - 115, 775], [tx, 740], [tx + 115, 775], [tx + 20, 700]]),
      arc(255, 470, 18, 12, 0, Math.PI), arc(300, 470, 18, 12, 0, Math.PI), arc(345, 470, 18, 12, 0, Math.PI),
      arc(275, 530, 18, 12, 0, Math.PI), arc(320, 530, 18, 12, 0, Math.PI),
      arc(297, 590, 18, 12, 0, Math.PI),
    ]
  },
  function chicken(r) {
    const cy = 505
    return [
      seg(L, Y - 6, 214, 426), seg(R, Y - 6, 386, 426),
      arc(300, cy, 130 + j(r, 8), 100),
      quad(430, 480, 500, 420, 520, 460), quad(430, 500, 515, 470, 525, 515),
      seg(265, 602, 255, 720), seg(255, 720, 215, 745), seg(255, 720, 250, 755), seg(255, 720, 285, 748),
      seg(335, 602, 345, 720), seg(345, 720, 315, 748), seg(345, 720, 350, 755), seg(345, 720, 385, 745),
      quad(220, 500, 260, 540, 300, 520),
    ]
  },
]

/**
 * Build a ghost recording for one half.
 * Returns { strokes: [{ pts: [[x, y, tMs], …] }], duration }.
 */
export function makeGhost(half, rng) {
  const pool = half === 'top' ? TOPS : BOTTOMS
  const builder = pool[Math.floor(rng() * pool.length)]
  const flip = rng() < 0.5
  let t = 1500 + rng() * 1500
  const speed = 0.22 + rng() * 0.08 // px per ms
  const strokes = []
  const paths = builder(rng)
  // Heads draw their neck first, so the player sees where to connect early on.
  if (half === 'top') paths.unshift(...paths.splice(-2))
  for (const fn of paths) {
    const pts = sample(fn, rng)
    const timed = []
    let prev = pts[0]
    for (const [x0, y] of pts) {
      t += Math.hypot(x0 - prev[0], y - prev[1]) / speed
      prev = [x0, y]
      const x = flip ? W - x0 : x0
      timed.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10, t])
    }
    strokes.push({ pts: timed })
    t += 350 + rng() * 700
  }
  // Squeeze long drawings so the ghost always finishes with time to spare.
  const limit = 48000
  if (t > limit) {
    const k = limit / t
    for (const s of strokes) for (const p of s.pts) p[2] *= k
    t = limit
  }
  return { strokes, duration: t }
}
