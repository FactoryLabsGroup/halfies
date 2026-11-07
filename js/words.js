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
