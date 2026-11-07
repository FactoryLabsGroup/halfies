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
const MAX_MY_POINTS = 8000
const MAX_STROKES = 1500

export const other = (role) => (role === 'top' ? 'bottom' : 'top')
const rangeFor = (role) => (role === 'top' ? [0, SEAM + REACH] : [SEAM - REACH, H])
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/** Paint strokes onto a context already scaled to the W×H logical space. */
export function paint(ctx, strokes, { peek = null, guides = true, colors = COLORS } = {}) {
  ctx.fillStyle = colors.paper
  ctx.fillRect(0, 0, W, H)
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
      ctx.arc(x, SEAM, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = PEN
  for (const s of strokes.values()) {
    ctx.strokeStyle = ctx.fillStyle = s.who === 'me' ? colors.me : colors.them
    if (peek && s.who === 'them') {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, peek[0], W, peek[1] - peek[0])
      ctx.clip()
      line(ctx, s.pts)
      ctx.restore()
    } else line(ctx, s.pts)
  }
  ctx.restore()
}

function line(ctx, pts) {
  if (!pts.length) return
  if (pts.length === 1) {
    ctx.beginPath()
    ctx.arc(pts[0][0], pts[0][1], PEN / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
  }
  const l = pts[pts.length - 1]
  ctx.lineTo(l[0], l[1])
  ctx.stroke()
}

export class Board {
  constructor(canvas) {
    this.cv = canvas
    this.ctx = canvas.getContext('2d')
    this.role = 'top'
    this.strokes = new Map() // id -> {who: 'me'|'them', pts: [[x,y]...]}
    this.mine = []
    this.myPoints = 0
    this.cur = null
    this.buf = []
    this.enabled = false
    this.revealed = false
    this.onPoints = null // (strokeId, flatPoints, ended) => void
    this.onUndo = null // (strokeId) => void
    this._raf = 0
    canvas.addEventListener('pointerdown', (e) => this._down(e))
    canvas.addEventListener('pointermove', (e) => this._move(e))
    canvas.addEventListener('pointerup', (e) => this._up(e))
    canvas.addEventListener('pointercancel', (e) => this._up(e))
    new ResizeObserver(() => this.resize()).observe(canvas)
  }

  reset(role) {
    this.stop()
    this.role = role
    this.strokes = new Map()
    this.mine = []
    this.myPoints = 0
    this.revealed = false
    this.enabled = false
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
    if (this._raf) return
    this._raf = requestAnimationFrame(() => {
      this._raf = 0
      this.render()
    })
  }

  render() {
    const k = this.cv.width / W
    if (!k) return
    this.ctx.setTransform(k, 0, 0, k, 0, 0)
    paint(this.ctx, this.strokes, { peek: this.revealed ? null : [SEAM - PEEK, SEAM + PEEK] })
  }

  _pt(e) {
    const r = this.cv.getBoundingClientRect()
    const [y0, y1] = rangeFor(this.role)
    const x = clamp(((e.clientX - r.left) / r.width) * W, 0, W)
    const y = clamp(((e.clientY - r.top) / r.height) * H, y0, y1)
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
  }

  _down(e) {
    if (!this.enabled || this.cur || this.myPoints > MAX_MY_POINTS) return
    e.preventDefault()
    try {
      this.cv.setPointerCapture(e.pointerId)
    } catch {}
    const id = randId(6)
    const p = this._pt(e)
    this.cur = { id, pointerId: e.pointerId }
    this.strokes.set(id, { who: 'me', pts: [p] })
    this.mine.push(id)
    this.buf = [p]
    this.myPoints++
    this._flushTimer = setInterval(() => this._flush(false), 60)
    this.schedule()
  }

  _move(e) {
    if (!this.cur || e.pointerId !== this.cur.pointerId) return
    const s = this.strokes.get(this.cur.id)
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

  /** End any in-progress stroke (e.g. when time runs out). */
  stop() {
    if (this.cur) this._up(null)
    this.enabled = false
  }

  _flush(end) {
    if (!this.cur || (!this.buf.length && !end)) return
    const flat = []
    for (const [x, y] of this.buf) flat.push(x, y)
    this.buf = []
    this.onPoints?.(this.cur.id, flat, end)
  }

  undo() {
    if (!this.enabled) return
    if (this.cur) this._up(null)
    const id = this.mine.pop()
    if (!id) return
    this.strokes.delete(id)
    this.onUndo?.(id)
    this.schedule()
  }

  /** Points from the partner (network or ghost), as a flat [x,y,x,y,…] array. Clamped to their half. */
  addRemote(id, flat) {
    if (typeof id !== 'string' || !Array.isArray(flat)) return
    let s = this.strokes.get(id)
    if (!s) {
      if (this.strokes.size >= MAX_STROKES) return
      s = { who: 'them', pts: [] }
      this.strokes.set(id, s)
    }
    if (s.who !== 'them') return
    const [y0, y1] = rangeFor(other(this.role))
    for (let i = 0; i + 1 < flat.length && s.pts.length < 4000; i += 2) {
      const x = +flat[i], y = +flat[i + 1]
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      s.pts.push([clamp(x, 0, W), clamp(y, y0, y1)])
    }
    this.schedule()
  }

  removeRemote(id) {
    const s = this.strokes.get(id)
    if (s && s.who === 'them') {
      this.strokes.delete(id)
      this.schedule()
    }
  }

  get hasTheirInk() {
    for (const s of this.strokes.values()) if (s.who === 'them' && s.pts.length) return true
    return false
  }
}
