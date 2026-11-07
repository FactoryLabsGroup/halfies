// Everything a player collects lives in their own browser (localStorage).
import { store } from './util.js'

const KEY = 'halfies:passport:v2'
const OLD_KEY = 'halfies:passport:v1'
const ZOO_KEY = 'halfies:zoo:v1'
const ZOO_MAX = 14

const blank = () => ({
  n: 0,
  gold: 0,
  cities: [],
  ghosts: 0,
  legendary: 0,
  melds: 0,
  telepath: 0,
  adopted: 0,
  kinds: { creature: 0, meld: 0, grid: 0 },
  stamps: [],
})

export const STAMPS = [
  { id: 'first', icon: '🐣', name: 'First Creature', desc: 'Make your first creature', test: (p) => p.kinds.creature >= 1 },
  { id: 'globe', icon: '🌍', name: 'Globetrotter', desc: 'Play with strangers in 5 cities', test: (p) => p.cities.length >= 5 },
  { id: 'five', icon: '✋', name: 'High-Five Hero', desc: 'Get 5 golden postcards', test: (p) => p.gold >= 5 },
  { id: 'legend', icon: '✨', name: 'Legend Finder', desc: 'Find a legendary creature', test: (p) => p.legendary >= 1 },
  { id: 'meld', icon: '🧠', name: 'Mind Melder', desc: 'Say the same word as a stranger', test: (p) => p.melds >= 1 },
  { id: 'sync', icon: '📡', name: 'Telepath', desc: 'Score 80%+ in Sync Grid', test: (p) => p.telepath >= 1 },
  { id: 'ghost', icon: '👻', name: 'Ghost Whisperer', desc: 'Play 10 rounds with ghosts', test: (p) => p.ghosts >= 10 },
  { id: 'zoo', icon: '🦕', name: 'Zookeeper', desc: 'Adopt 10 creatures', test: (p) => p.adopted >= 10 },
  { id: 'roll', icon: '🔥', name: 'On a Roll', desc: 'Play 5 rounds in one sitting', test: (p, session) => session >= 5 },
]

let session = 0

export function load() {
  let p = store.get(KEY, null)
  if (!p) {
    const old = store.get(OLD_KEY, null)
    p = blank()
    if (old) {
      p.n = p.kinds.creature = old.n || 0
      p.gold = old.gold || 0
      p.cities = Array.isArray(old.cities) ? old.cities : []
    }
  }
  return { ...blank(), ...p, kinds: { ...blank().kinds, ...(p.kinds || {}) } }
}

/** Apply a change, award any newly earned stamps, save. Returns the new stamps. */
export function update(fn, { countRound = false } = {}) {
  const p = load()
  fn(p)
  if (countRound) session++
  const earned = STAMPS.filter((s) => !p.stamps.includes(s.id) && s.test(p, session))
  p.stamps.push(...earned.map((s) => s.id))
  store.set(KEY, p)
  return earned
}

export const loadZoo = () => store.get(ZOO_KEY, [])

export function addToZoo(entry) {
  const zoo = loadZoo().filter((z) => z.id !== entry.id)
  zoo.push(entry)
  while (zoo.length > ZOO_MAX) zoo.shift()
  // Sprites are small PNGs, but storage can still fill up — drop the oldest until it fits.
  while (zoo.length && !store.set(ZOO_KEY, zoo)) zoo.shift()
}
