import { store } from './util.js'

const KEY = 'halfies:muted'
let ac = null
let muted = store.get(KEY, false)

function ctx() {
  if (muted) return null
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)()
    if (ac.state === 'suspended') ac.resume()
    return ac
  } catch {
    return null
  }
}

function tone(freq, dur, { type = 'triangle', vol = 0.1, slide = 0, delay = 0 } = {}) {
  const a = ctx()
  if (!a) return
  const t = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export const sfx = {
  get muted() {
    return muted
  },
  toggle() {
    muted = !muted
    store.set(KEY, muted)
    return muted
  },
  unlock: () => ctx(),
  pop: () => tone(420, 0.14, { slide: 380 }),
  flip: () => tone(260, 0.09, { type: 'square', vol: 0.04, slide: 600 }),
  tick: () => tone(1100, 0.04, { vol: 0.05, type: 'sine' }),
  tada: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { delay: i * 0.09 })),
  five: () => tone(700, 0.08, { type: 'square', vol: 0.05 }),
  gold: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.35, { delay: i * 0.07, vol: 0.08 })),
  sad: () => tone(330, 0.3, { slide: -120, vol: 0.06 }),
  react: () => tone(880, 0.07, { type: 'sine', vol: 0.05, slide: 200 }),
  whoosh: () => tone(200, 0.35, { type: 'sawtooth', vol: 0.03, slide: 900 }),
  legend: () => [523, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.5, { delay: i * 0.06, vol: 0.07, type: 'sine' })),
  rare: () => [659, 988, 1319].forEach((f, i) => tone(f, 0.3, { delay: i * 0.08, vol: 0.07 })),
  /** Creature "speech": one blip per syllable-ish chunk of the text. */
  babble(text, pitch = 1) {
    const n = Math.min(14, Math.max(3, Math.round(text.replace(/[^a-z]/gi, '').length / 2.4)))
    for (let i = 0; i < n; i++) {
      const f = (260 + Math.random() * 260) * pitch
      tone(f, 0.07, { type: 'square', vol: 0.035, slide: (Math.random() - 0.5) * 200, delay: i * 0.085 })
    }
  },
}
