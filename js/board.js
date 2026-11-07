import { randId } from './util.js'

// Logical drawing space. Top half: y < SEAM, bottom half: y > SEAM.
export const W = 600
export const H = 800
export const SEAM = 400
export const PEEK = 30 // how far you can see past the seam into your partner's half
export const REACH = 10 // how far you may draw past the seam
export const DOTS = [210, 390] // shared connection marks on the seam
export const COLORS = { me: '#FF5A4E', them: '#2E5BFF', paper: '#FBF7F0', ink: '#1D1B19' }
const PEN = 7
const TINY = 3
const EYE_R = 20
const MAX_EYES = 12
const MAX_MY_POINTS = 8000
const MAX_ITEMS = 1500
const TAU = Math.PI * 2

export const other = (role) => (role === 'top' ? 'bottom' : 'top')
const rangeFor = (role) => (role === 'top' ? [0, SEAM + REACH] : [SEAM - REACH, H])
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ident = (x, y) => [x, y]

/** Jelly wobble + bounce used when the creature "comes alive". */
function jelly(t) {
  const s = Math.sin(t * 7)
  const bounce = -Math.abs(Math.sin(t * 3.4)) * 18
  return (x, y) => [300 + (x - 300) * (1 + 0.035 * s) + Math.sin(y * 0.03 + t * 6) * 4, 400 + (y - 400) * (1 - 0.035 * s) + bounce]
}

/**
 * Paint items onto a context already scaled to the W×H logical space.
 * items: Map of {type:'s', who, pts, w} strokes and {type:'e', who, x, y, r, a} googly eyes.
 */
export function paint(ctx, items, { peek = null, guides = true, background = true, t = 0, alive = false, colors = COLORS, penScale = 1 } = {}) {
  const xf = alive ? jelly(t) : ident
  if (background) {
    ctx.fillStyle = colors.paper
    ctx.fillRect(0, 0, W, H)
  }
  if (guides) {
    ctx.save()
    ctx.strokeStyle = 'rgba(29,27,25,.22)'
    ctx.lineWidth = 2
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.moveTo(0, SEAM)
    ctx.lineTo(W, SEAM)
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = 'rgba(29,27,25,.4)'
    for (const x of DOTS) {
      ctx.beginPath()
      ctx.arc(x, SEAM, 6, 0, TAU)
      ctx.fill()
    }
  }
  const clipped = (it, draw) => {
    if (peek && it.who === 'them') {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, peek[0], W, peek[1] - peek[0])
      ctx.clip()
      draw()
      ctx.restore()
    } else draw()
  }
  ctx.save()
  ctx.globalCompositeOperation = background ? 'multiply' : 'source-over'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const it of items.values()) {
    if (it.type !== 's') continue
    ctx.strokeStyle = ctx.fillStyle = it.who === 'me' ? colors.me : colors.them
    ctx.lineWidth = (it.w || PEN) * penScale
    clipped(it, () => line(ctx, it.pts, xf, (it.w || PEN) * penScale))
  }
  ctx.restore()
  for (const it of items.values()) {
    if (it.type !== 'e') continue
    clipped(it, () => eye(ctx, it, xf, alive ? it.a + Math.sin(t * 4 + it.a * 3) * 2.4 : it.a))
  }
}

function line(ctx, pts, xf, w) {
  if (!pts.length) return
  if (pts.length === 1) {
    const [x, y] = xf(pts[0][0], pts[0][1])
    ctx.beginPath()
    ctx.arc(x, y, w / 2, 0, TAU)
    ctx.fill()
    return
  }
  const p = pts.map(([x, y]) => xf(x, y))
  ctx.beginPath()
  ctx.moveTo(p[0][0], p[0][1])
  for (let i = 1; i < p.length - 1; i++) {
    ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2)
  }
  const l = p[p.length - 1]
  ctx.lineTo(l[0], l[1])
  ctx.stroke()
}

function eye(ctx, it, xf, a) {
  const [x, y] = xf(it.x, it.y)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = COLORS.ink
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, it.r, 0, TAU)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = COLORS.ink
  ctx.beginPath()
  ctx.arc(x + Math.cos(a) * it.r * 0.4, y + Math.sin(a) * it.r * 0.4, it.r * 0.42, 0, TAU)
  ctx.fill()
}

/** Transparent PNG of just the creature, cropped to its ink — used for the zoo. */
export function inkSprite(items, maxH = 180) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const it of items.values()) {
    const pts = it.type === 's' ? it.pts : [[it.x - it.r, it.y - it.r], [it.x + it.r, it.y + it.r]]
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
    }
  }
  if (!Number.isFinite(x0)) return null
  const pad = 8
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
  const k = Math.min(1, maxH / (y1 - y0))
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round((x1 - x0) * k))
  cv.height = Math.max(1, Math.round((y1 - y0) * k))
  const ctx = cv.getContext('2d')
  ctx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k)
  paint(ctx, items, { guides: false, background: false, penScale: 2 })
  return cv.toDataURL('image/png')
}

export class Board {
  constructor(canvas) {
    this.cv = canvas
    this.ctx = canvas.getContext('2d')
    this.role = 'top'
    this.items = new Map()
    this.mine = []
    this.myPoints = 0
    this.myEyes = 0
    this.theirEyes = 0
    this.cur = null
    this.buf = []
    this.enabled = false
    this.revealed = false
    this.alive = false
    this.tool = 'pen' // 'pen' | 'eye'
    this.fx = {} // { shaky, mirror, tiny }
    this.onPoints = null // (id, flat, ended, width)
    this.onSticker = null // (id, x, y, r)
    this.onUndo = null // (id)
    this.onRemoteInk = null // (x, y) — where the partner is drawing right now
    this.onEyeLimit = null
    this._raf = 0
    canvas.addEventListener('pointerdown', (e) => this._down(e))
    canvas.addEventListener('pointermove', (e) => this._move(e))
    canvas.addEventListener('pointerup', (e) => this._up(e))
    canvas.addEventListener('pointercancel', (e) => this._up(e))
    new ResizeObserver(() => this.resize()).observe(canvas)
  }

  reset(role) {
    this.stop()
    this.alive = false
    this.role = role
    this.items = new Map()
    this.mine = []
    this.myPoints = this.myEyes = this.theirEyes = 0
    this.revealed = false
    this.tool = 'pen'
    this.fx = {}
    this.resize()
  }

  resize() {
    const r = this.cv.getBoundingClientRect()
    if (!r.width) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    this.cv.width = Math.round(r.width * dpr)
    this.cv.height = Math.round(r.height * dpr)
    this.render()
  }

  schedule() {
    if (this._raf || this.alive) return
    this._raf = requestAnimationFrame(() => {
      this._raf = 0
      this.render()
    })
  }

  render(t = 0) {
    const k = this.cv.width / W
    if (!k) return
    this.ctx.setTransform(k, 0, 0, k, 0, 0)
    paint(this.ctx, this.items, { peek: this.revealed ? null : [SEAM - PEEK, SEAM + PEEK], guides: !this.alive, t, alive: this.alive })
  }

  /** Make the creature wobble, bounce and roll its eyes until stopAlive(). */
  startAlive() {
    this.alive = true
    const t0 = performance.now()
    const frame = () => {
      if (!this.alive) return this.render()
      this.render((performance.now() - t0) / 1000)
      requestAnimationFrame(frame)
    }
    frame()
  }

  stopAlive() {
    this.alive = false
  }

  _pt(e, effects = true) {
    const r = this.cv.getBoundingClientRect()
    const [y0, y1] = rangeFor(this.role)
    let x = ((e.clientX - r.left) / r.width) * W
    let y = ((e.clientY - r.top) / r.height) * H
    if (effects && this.fx.mirror) x = W - x
    if (effects && this.fx.shaky) {
      x += (Math.random() - 0.5) * 16
      y += (Math.random() - 0.5) * 16
    }
    return [Math.round(clamp(x, 0, W) * 10) / 10, Math.round(clamp(y, y0, y1) * 10) / 10]
  }

  _down(e) {
    if (!this.enabled || this.cur) return
    e.preventDefault()
    if (this.tool === 'eye') return this._placeEye(e)
    if (this.myPoints > MAX_MY_POINTS) return
    try {
      this.cv.setPointerCapture(e.pointerId)
    } catch {}
    const id = randId(6)
    const p = this._pt(e)
    const w = this.fx.tiny ? TINY : PEN
    this.cur = { id, pointerId: e.pointerId, w }
    this.items.set(id, { type: 's', who: 'me', pts: [p], w })
    this.mine.push(id)
    this.buf = [p]
    this.myPoints++
    this._flushTimer = setInterval(() => this._flush(false), 60)
    this.schedule()
  }

  _placeEye(e) {
    if (this.myEyes >= MAX_EYES) return this.onEyeLimit?.()
    const [x, y] = this._pt(e, false)
    const id = randId(6)
    const it = { type: 'e', who: 'me', x, y, r: EYE_R, a: Math.random() * TAU }
    this.items.set(id, it)
    this.mine.push(id)
    this.myEyes++
    this.onSticker?.(id, x, y, EYE_R)
    this.schedule()
  }

  _move(e) {
    if (!this.cur || e.pointerId !== this.cur.pointerId) return
    const s = this.items.get(this.cur.id)
    if (!s) return
    const evs = e.getCoalescedEvents?.() || []
    for (const ev of evs.length ? evs : [e]) {
      const p = this._pt(ev)
      const last = s.pts[s.pts.length - 1]
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 2.5) continue
      if (this.myPoints++ > MAX_MY_POINTS) break
      s.pts.push(p)
      this.buf.push(p)
    }
    this.schedule()
  }

  _up(e) {
    if (!this.cur || (e && e.pointerId !== this.cur.pointerId)) return
    clearInterval(this._flushTimer)
    this._flush(true)
    this.cur = null
  }

  /** End any in-progress stroke and stop accepting input. */
  stop() {
    if (this.cur) this._up(null)
    this.enabled = false
  }

  _flush(end) {
    if (!this.cur || (!this.buf.length && !end)) return
    const flat = []
    for (const [x, y] of this.buf) flat.push(x, y)
    this.buf = []
    this.onPoints?.(this.cur.id, flat, end, this.cur.w)
  }

  undo() {
    if (!this.enabled) return
    if (this.cur) this._up(null)
    const id = this.mine.pop()
    if (!id) return
    if (this.items.get(id)?.type === 'e') this.myEyes--
    this.items.delete(id)
    this.onUndo?.(id)
    this.schedule()
  }

  /** Partner points (network or ghost) as a flat [x,y,x,y,…] array, clamped to their half. */
  addRemote(id, flat, w) {
    if (typeof id !== 'string' || !Array.isArray(flat)) return
    let s = this.items.get(id)
    if (!s) {
      if (this.items.size >= MAX_ITEMS) return
      s = { type: 's', who: 'them', pts: [], w: w === TINY ? TINY : PEN }
      this.items.set(id, s)
    }
    if (s.who !== 'them' || s.type !== 's') return
    const [y0, y1] = rangeFor(other(this.role))
    let last = null
    for (let i = 0; i + 1 < flat.length && s.pts.length < 4000; i += 2) {
      const x = +flat[i], y = +flat[i + 1]
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      last = [clamp(x, 0, W), clamp(y, y0, y1)]
      s.pts.push(last)
    }
    if (last) this.onRemoteInk?.(last[0], last[1])
    this.schedule()
  }

  addRemoteEye(id, x, y, r) {
    if (typeof id !== 'string' || this.items.has(id) || this.theirEyes >= 20) return
    x = +x; y = +y; r = +r
    if (![x, y, r].every(Number.isFinite)) return
    const [y0, y1] = rangeFor(other(this.role))
    this.items.set(id, { type: 'e', who: 'them', x: clamp(x, 0, W), y: clamp(y, y0, y1), r: clamp(r, 8, 30), a: Math.random() * TAU })
    this.theirEyes++
    this.onRemoteInk?.(x, y)
    this.schedule()
  }

  removeRemote(id) {
    const s = this.items.get(id)
    if (s && s.who === 'them') {
      if (s.type === 'e') this.theirEyes--
      this.items.delete(id)
      this.schedule()
    }
  }
}
