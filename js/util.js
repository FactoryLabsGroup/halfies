export const $ = (s) => document.querySelector(s)

export function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

export function randId(n = 8) {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (const x of crypto.getRandomValues(new Uint8Array(n))) s += a[x % a.length]
  return s
}

export const randSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] >>> 1

/** Coarse location from the browser's time zone — no network lookup, never more precise than a region's main city. */
export function myCity() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (!tz.includes('/') || /^Etc\//.test(tz)) return 'Somewhere'
    return tz.split('/').pop().replace(/_/g, ' ')
  } catch {
    return 'Somewhere'
  }
}

export function cleanCity(s) {
  if (typeof s !== 'string') return 'Somewhere'
  const c = s.replace(/[^\p{L}\p{M} .'-]/gu, '').trim().slice(0, 24)
  return c || 'Somewhere'
}

export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k)
      return v ? JSON.parse(v) : d
    } catch {
      return d
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v))
      return true
    } catch {
      return false
    }
  },
}

let toastTimer = 0
export function toast(msg, ms = 3200) {
  const el = $('#toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), ms)
}

export function confetti(colors = ['#FF5A4E', '#2E5BFF', '#F2B705']) {
  const box = $('#confetti')
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i')
    p.style.left = Math.random() * 100 + 'vw'
    p.style.background = colors[i % colors.length]
    p.style.setProperty('--x', (Math.random() - 0.5) * 200 + 'px')
    p.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg')
    p.style.setProperty('--d', 1.4 + Math.random() * 1.4 + 's')
    p.style.animationDelay = Math.random() * 0.3 + 's'
    box.appendChild(p)
    setTimeout(() => p.remove(), 3500)
  }
}

export const TIMER_SVG = '<div class="timer"><svg viewBox="0 0 48 48"><circle class="track" cx="24" cy="24" r="20"/><circle class="bar tbar" cx="24" cy="24" r="20"/></svg><span class="tnum"></span></div>'

/** Drives a `.timer` ring inside `root`. Keeps time with setTimeout too, so background tabs still end on time. */
export function countdown(root, ms, { onEnd, onSecond } = {}) {
  const num = root.querySelector('.tnum')
  const bar = root.querySelector('.tbar')
  const box = root.querySelector('.timer')
  const start = performance.now()
  const end = start + ms
  let raf = 0
  let last = -1
  let done = false
  const stop = () => {
    done = true
    cancelAnimationFrame(raf)
    clearTimeout(to)
  }
  const finish = () => {
    if (done) return
    stop()
    num.textContent = '0'
    onEnd?.()
  }
  const tick = () => {
    if (done) return
    const left = Math.max(0, end - performance.now())
    const s = Math.ceil(left / 1000)
    num.textContent = s
    bar.style.strokeDashoffset = (125.66 * (1 - left / ms)).toFixed(2)
    box.classList.toggle('hurry', s <= Math.min(10, ms / 6000))
    if (s !== last) {
      last = s
      onSecond?.(s)
    }
    if (left <= 0) return finish()
    raf = requestAnimationFrame(tick)
  }
  const to = setTimeout(finish, ms + 120)
  tick()
  return { stop, elapsed: () => performance.now() - start, left: () => Math.max(0, end - performance.now()) }
}

export const vibrate = (ms) => {
  try {
    navigator.vibrate?.(ms)
  } catch {}
}
