import { pick } from './util.js'

/** "Draw a creature that …" */
export const THEMES = [
  'lives in a volcano',
  'works at a bank',
  'is afraid of soup',
  'guards a tiny treasure',
  'just woke up',
  'is a famous DJ',
  'lives in your fridge',
  'won a dance contest',
  'only eats socks',
  'is from the year 3000',
  'runs a haunted bakery',
  'is late for a wedding',
  'can only whisper',
  'lives at the bottom of a pool',
  'is a retired pirate',
  'sells umbrellas in the desert',
  'is allergic to Mondays',
  'teaches yoga to clouds',
  'collects lost keys',
  'is very proud of its hat',
  'lives inside a cactus',
  'is the mayor of a tiny town',
  'just saw a ghost',
  'plays bass in a band',
  'is secretly a spy',
  'loves karaoke way too much',
  'lives on the moon',
  'is trying to be cool',
  'babysits dragons',
  'has never seen the sea',
  'delivers pizza by air',
  'is the world’s worst magician',
]

const TITLES = ['Sir', 'Lady', 'Lil’', 'Captain', 'Professor', 'Duke', 'Auntie', 'Dr.', 'Baron', 'Grand', 'Uncle', 'Señor', 'Madame', 'Big']
const STARTS = ['Flob', 'Zig', 'Mup', 'Snor', 'Wib', 'Glo', 'Taco', 'Bonk', 'Pim', 'Quaz', 'Noodle', 'Fizz', 'Gub', 'Sprock', 'Tumble', 'Waffle', 'Blorp', 'Crumb', 'Doodle', 'Jelly']
const ENDS = ['bert', 'zilla', 'wump', 'ington', 'ella', 'o', 'snout', 'paws', 'toes', 'nugget', 'bottom', 'whisk', 'kins', 'saurus', 'muffin', 'flap']

export function makeName(rng) {
  return `${pick(rng, TITLES)} ${pick(rng, STARTS)}${pick(rng, ENDS)}`
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const NAME_RE = new RegExp(`^(${TITLES.map(esc).join('|')}) (${STARTS.join('|')})(${ENDS.join('|')})$`)
/** True only for names our own generator can produce — used to validate names other players broadcast. */
export const isValidName = (s) => typeof s === 'string' && NAME_RE.test(s)

/** Mid-round surprises. `both` applies to either half; otherwise there is a line per half. */
export const TWISTS = [
  { top: 'Give it a fancy hat 🎩', bottom: 'Give it fancy shoes 👟' },
  { top: 'It’s eating an ice cream 🍦', bottom: 'It’s riding a skateboard 🛹' },
  { top: 'It just saw something scary 😱', bottom: 'It really needs to pee 🚽' },
  { top: 'Give it a mustache 🥸', bottom: 'Give it a tail 🐒' },
  { both: 'Add googly eyes 👀 somewhere weird' },
  { both: 'Shaky pen for 10 seconds 🫨', effect: 'shaky', ms: 10000 },
  { both: 'Mirror pen for 8 seconds 🪞', effect: 'mirror', ms: 8000 },
  { both: 'Tiny pen for 10 seconds ✏️', effect: 'tiny', ms: 10000 },
]

const STATS = ['Speed', 'Weirdness', 'Cuteness', 'Chaos', 'Snack level', 'Charm', 'Smell', 'Courage', 'Dance skill', 'Sneakiness']

/** Three trading-card stats; one of them is always maxed out for comedy. */
export function makeStats(rng) {
  const names = [...STATS]
  const out = []
  for (let i = 0; i < 3; i++) {
    const name = names.splice(Math.floor(rng() * names.length), 1)[0]
    out.push({ name, value: 1 + Math.floor(rng() * 89) })
  }
  out[Math.floor(rng() * 3)].value = 90 + Math.floor(rng() * 10)
  return out
}

export function rollRarity(rng) {
  const r = rng()
  return r < 0.03 ? 'legendary' : r < 0.2 ? 'rare' : 'common'
}

// ---- tiny word filter for Mind Meld (the only place strangers type) ----
const ROOTS = ['fuck', 'shit', 'cunt', 'nigg', 'fagg', 'whore', 'slut', 'bitch', 'pussy', 'retard', 'porn', 'dildo', 'jizz', 'hitler', 'nazi', 'wank', 'twat', 'rapist', 'molest']
const EXACT = new Set(['dick', 'cock', 'cum', 'sex', 'sexy', 'anal', 'anus', 'boob', 'boobs', 'tits', 'penis', 'vagina', 'nude', 'naked', 'kill', 'rape', 'fag', 'kike', 'spic', 'chink', 'coon', 'paki', 'tranny', 'dyke', 'ass', 'arse', 'piss', 'horny', 'suicide', 'bastard', 'asshole'])

export function isBadWord(w) {
  const s = w.toLowerCase()
  return EXACT.has(s) || ROOTS.some((r) => s.includes(r))
}

/** One word: letters only (any language), max 16 chars, lowercase. Returns '' if it isn't a word. */
export function normalizeWord(input) {
  if (typeof input !== 'string' || /\s/.test(input.trim())) return ''
  const w = input.normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{M}'-]/gu, '').replace(/^['-]+|['-]+$/g, '')
  return w.length >= 1 && w.length <= 16 ? w : ''
}
