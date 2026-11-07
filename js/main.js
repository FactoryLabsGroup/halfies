import { $, mulberry32, pick, randSeed, myCity, cleanCity, toast, confetti, vibrate } from './util.js'
import { createNet } from './net.js'
import { isValidName } from './words.js'
import { sharePostcard } from './postcard.js'
import { sfx } from './sfx.js'
import { EMOJIS, PHRASES, reactsMarkup, floatReaction } from './react.js'
import * as passport from './passport.js'
import { renderZoo, pauseZoo } from './zoo.js'
import { creature } from './act-creature.js'
import { meld } from './act-meld.js'
import { grid } from './act-grid.js'

const GHOST_AFTER = 7000
const FIVE_MS = 8000
const CITY = myCity()
const SCREENS = ['home', 'finding', 'card', 'play', 'meld', 'grid', 'reveal']
const PLAY_SCREENS = new Set(['play', 'meld', 'grid'])

let screen = 'home'
let G = null // the current game
let findTimers = []
let online = 1
let connected = false

const net = createNet({ onCount, onMatch, onGame, onPartnerLeft, onNews })

/** What activities get to use. */
const api = {
  show,
  cur: (g) => G === g,
  send: (d) => {
    if (G && !G.ghost && !G.gone) net.send(d)
  },
  finish: (g) => finish(g),
}

function show(id) {
  screen = id
  document.body.dataset.screen = id
  for (const s of SCREENS) $('#' + s).classList.toggle('active', s === id)
  if (id !== 'home') pauseZoo()
  hidePhrases()
}

const forcedAct = new URLSearchParams(location.search).get('act') // testing aid: ?act=meld|grid|creature

function pickActivity(rng, ghost) {
  const r = rng()
  const forced = { creature, meld, grid }[forcedAct]
  if (forced && !(ghost && forced === meld)) return forced
  if (ghost) return r < 0.7 ? creature : grid // Mind Meld needs a real person
  return r < 0.5 ? creature : r < 0.75 ? meld : grid
}

/* ---------------- home ---------------- */

function onCount(n) {
  online = n
  connected = true
  renderOnline()
}
function renderOnline() {
  const el = $('#online')
  if (!connected) el.textContent = 'connecting…'
  else if (online > 1) el.innerHTML = `<b>${online}</b> halves online right now`
  else el.textContent = 'Just you right now, but ghosts are standing by 👻'
}
setTimeout(() => {
  connected = true
  renderOnline()
}, 2500)

function renderHome() {
  const p = passport.load()
  $('#passStats').textContent = p.n
    ? `🧩 ${p.n} round${p.n === 1 ? '' : 's'} · 🌍 ${p.cities.length} ${p.cities.length === 1 ? 'city' : 'cities'} · ✨ ${p.gold} golden`
    : ''
  $('#stamps').replaceChildren(
    ...passport.STAMPS.map((s) => {
      const b = document.createElement('button')
      const got = p.stamps.includes(s.id)
      b.className = 'stamp' + (got ? '' : ' locked')
      b.textContent = s.icon
      b.setAttribute('aria-label', s.name)
      b.onclick = () => toast(`${s.icon} ${s.name} — ${s.desc}${got ? ' ✓' : ''}`)
      return b
    }),
  )
  if (screen === 'home') renderZoo($('#zoo'), passport.loadZoo())
}

function announceStamps(list) {
  list.forEach((s, i) =>
    setTimeout(() => {
      toast(`New stamp! ${s.icon} ${s.name}`)
      sfx.rare()
    }, 900 + i * 3400),
  )
}

/* ---------------- live ticker ---------------- */

const tickerQueue = []
let tickerBusy = false
function onNews(d) {
  if (!d || typeof d !== 'object') return
  const city = cleanCity(d.c)
  let text = null
  if (d.k === 'creature' && isValidName(d.name)) {
    text = d.r === 'legendary' ? `✨ A LEGENDARY creature was just born in ${city}!` : `🐣 ${d.name} was just born in ${city}`
  } else if (d.k === 'meld') {
    text = d.win ? `🧠 Two strangers just mind-melded (${city})` : `🫠 Two strangers almost mind-melded (${city})`
  } else if (d.k === 'grid' && Number.isInteger(d.score) && d.score >= 0 && d.score <= 100) {
    text = `📡 A ${d.score}% sync just happened in ${city}`
  }
  if (!text) return
  if (tickerQueue.length < 5) tickerQueue.push(text)
  pumpTicker()
}
function pumpTicker() {
  if (tickerBusy || !tickerQueue.length) return
  tickerBusy = true
  const text = tickerQueue.shift()
  document.querySelectorAll('.ticker').forEach((el) => {
    el.textContent = text
    el.classList.add('show')
  })
  setTimeout(() => {
    document.querySelectorAll('.ticker').forEach((el) => el.classList.remove('show'))
    setTimeout(() => {
      tickerBusy = false
      pumpTicker()
    }, 500)
  }, 4500)
}

/* ---------------- finding ---------------- */

function clearFind() {
  findTimers.forEach(clearTimeout)
  findTimers = []
}

function stopGame() {
  if (!G) return
  G.act.stop(G)
  clearTimeout(G.fiveTimer)
  G.timers?.forEach(clearTimeout)
  G = null
}

function goFind() {
  stopGame()
  clearFind()
  $('.dots').classList.remove('found')
  $('#findText').textContent = 'Looking for your other half…'
  show('finding')
  net.startWaiting()
  findTimers.push(setTimeout(() => ($('#findText').textContent = 'Checking under the couch…'), 3000))
  findTimers.push(setTimeout(() => ($('#findText').textContent = 'Summoning a ghost… 👻'), 5500))
  findTimers.push(setTimeout(tryGhost, GHOST_AFTER))
}

function tryGhost() {
  if (screen !== 'finding' || G) return
  if (net.isPending()) {
    findTimers.push(setTimeout(tryGhost, 1500))
    return
  }
  net.stopWaiting()
  clearFind()
  startGame({ ghost: true, seed: randSeed() })
}

function goHome() {
  clearFind()
  net.stopWaiting()
  net.endMatch()
  stopGame()
  show('home')
  renderHome()
}

function onMatch({ seed, initiator }) {
  if (screen !== 'finding' || G) {
    net.endMatch()
    return
  }
  clearFind()
  sfx.pop()
  vibrate(30)
  $('.dots').classList.add('found')
  $('#findText').textContent = 'Found someone! 🎉'
  startGame({ ghost: false, seed, initiator }, 800)
  net.send({ t: 'hi', city: CITY })
}

/* ---------------- game ---------------- */

function startGame({ ghost, seed, initiator = false }, delay = 0) {
  const rng = mulberry32(seed)
  const act = pickActivity(rng, ghost)
  const g = (G = {
    id: seed.toString(36) + Date.now().toString(36),
    act,
    ghost,
    seed,
    myCity: CITY,
    partnerCity: 'Somewhere',
    gone: false,
    myFive: false,
    theirFive: false,
    gold: false,
    fiveOpen: false,
    adoptMe: null,
    adoptThem: null,
    timers: [],
  })
  act.setup(g, rng, initiator)
  g.timers.push(setTimeout(() => G === g && showCard(g), delay))
}

function partnerLine(g) {
  if (g.ghost) return 'Nobody else is around, so a ghost 👻 will play with you.'
  if (g.gone) return 'Your other half vanished 💨'
  return `Your other half is in ${g.partnerCity} 👋`
}

function showCard(g) {
  const c = g.act.card(g)
  $('#cardTitle').textContent = c.title
  $('#cardIcon').innerHTML = c.icon // static SVG from our own code
  $('#cardRule').textContent = c.rule
  $('#cardStrong').textContent = c.strong
  const [pre, strong, post] = c.note
  $('#cardNote').replaceChildren(pre, Object.assign(document.createElement('b'), { textContent: strong }), post)
  $('#cardPartner').textContent = partnerLine(g)
  $('#flip').classList.remove('open')
  show('card')
  // slot-machine shuffle on the card back, then flip
  const back = $('#cardBack')
  const icons = ['🎨', '🧠', '🟦', '✏️', '💭', '🧩']
  let k = 0
  const spin = setInterval(() => (back.textContent = icons[k++ % icons.length]), 90)
  g.timers.push(
    setTimeout(() => {
      clearInterval(spin)
      back.textContent = '?'
      if (G !== g) return
      $('#flip').classList.add('open')
      sfx.flip()
    }, 1000),
  )
  g.timers.push(setTimeout(() => clearInterval(spin), 1100))
  g.timers.push(setTimeout(() => G === g && startPlay(g), g.act === creature ? 4600 : 5600))
}

function startPlay(g) {
  g.act.start(g, api)
  if (g.ghost) {
    // ghosts react now and then, like a person would
    for (let i = 0; i < 2; i++) {
      g.timers.push(
        setTimeout(() => {
          if (G === g && PLAY_SCREENS.has(screen)) {
            floatReaction(pick(Math.random, EMOJIS), false)
            sfx.react()
          }
        }, 6000 + Math.random() * 26000),
      )
    }
  }
}

async function finish(g) {
  if (G !== g || g.finished) return
  g.finished = true
  const cv = await g.act.renderCard(g)
  if (G !== g) return
  g.canvas = cv
  $('#postcard').src = cv.toDataURL('image/png')
  const earned = passport.update(
    (p) => {
      p.n++
      if (g.ghost) p.ghosts++
      else if (g.partnerCity !== 'Somewhere' && !p.cities.includes(g.partnerCity)) p.cities.push(g.partnerCity)
      g.act.record(p, g)
    },
    { countRound: true },
  )
  show('reveal')
  setupFive(g)
  setupAdopt(g)
  announceStamps(earned)
  net.news({ ...g.act.news(g), c: CITY })
}

/* ---------------- high-five ---------------- */

function setupFive(g) {
  const box = $('#five'), btn = $('#fiveBtn'), txt = $('#fiveText')
  btn.className = 'five-btn'
  box.classList.remove('closed')
  btn.disabled = false
  if (g.gone && !g.theirFive) {
    box.classList.add('closed')
    btn.disabled = true
    txt.textContent = 'Your other half already left 💨'
    return
  }
  g.fiveOpen = true
  txt.textContent = g.theirFive ? 'They high-fived you! ✋ Quick, high-five back!' : g.ghost ? 'High-five the ghost!' : 'High-five your other half!'
  if (g.ghost && Math.random() < 0.8) g.timers.push(setTimeout(() => onTheirFive(g), 700 + Math.random() * 1800))
  g.fiveTimer = setTimeout(() => {
    if (G !== g || g.gold) return
    g.fiveOpen = false
    box.classList.add('closed')
    btn.disabled = true
    txt.textContent = g.myFive ? 'Left hanging… 🫠' : g.theirFive ? 'You left them hanging 🫠' : 'No high-five this time'
  }, FIVE_MS)
}

function onTheirFive(g) {
  if (G !== g || g.theirFive) return
  g.theirFive = true
  if (screen === 'reveal' && g.fiveOpen && !checkGold(g)) $('#fiveText').textContent = 'They high-fived you! ✋ Quick, high-five back!'
}

function checkGold(g) {
  if (g.gold || !g.myFive || !g.theirFive) return false
  g.gold = true
  clearTimeout(g.fiveTimer)
  $('#fiveBtn').className = 'five-btn gold'
  $('#fiveText').textContent = 'Golden Halfie! ✨'
  sfx.gold()
  vibrate([30, 50, 30])
  confetti()
  g.act.renderCard(g).then((cv) => {
    if (G !== g) return
    g.canvas = cv
    $('#postcard').src = cv.toDataURL('image/png')
    announceStamps(passport.update((p) => p.gold++))
  })
  return true
}

/* ---------------- adopt (creatures) ---------------- */

function setupAdopt(g) {
  const box = $('#adopt')
  box.hidden = !g.act.adoptable || !g.sprite
  if (box.hidden) return
  box.querySelectorAll('button').forEach((b) => {
    b.disabled = false
    b.classList.remove('chosen')
  })
  adoptText(g)
  if (g.ghost) g.timers.push(setTimeout(() => onTheirAdopt(g, Math.random() < 0.6), 1500 + Math.random() * 2000))
}

function myAdopt(v) {
  const g = G
  if (!g || g.adoptMe !== null || screen !== 'reveal') return
  g.adoptMe = v
  $('#adopt').querySelectorAll('button').forEach((b) => {
    b.disabled = true
    b.classList.toggle('chosen', b.dataset.adopt === (v ? '1' : '0'))
  })
  api.send({ t: 'a', v: v ? 1 : 0 })
  if (v) {
    passport.addToZoo({ id: g.id, img: g.sprite, name: g.name, rarity: g.rarity })
    announceStamps(passport.update((p) => p.adopted++))
    sfx.pop()
  }
  adoptText(g)
}

function onTheirAdopt(g, v) {
  if (G !== g || g.adoptThem !== null) return
  g.adoptThem = !!v
  if (screen === 'reveal') adoptText(g)
}

function adoptText(g) {
  const me = g.adoptMe, them = g.adoptThem
  let t
  if (me === null) t = them ? 'They want to adopt it! 🏠 You?' : them === false ? 'They waved goodbye 👋 Will you adopt it?' : 'Adopt it? It’ll live in your zoo.'
  else if (them === null) t = me ? 'It moved into your zoo! 🦕' : 'Bye bye, little one 👋'
  else if (me && them) t = 'You both adopted it 💕 It lives in two zoos now!'
  else if (me) t = 'It moved into your zoo! (They waved goodbye 👋)'
  else if (them) t = 'They adopted it. It’s in good hands 🏠'
  else t = 'It wandered off into the sunset 🌅'
  $('#adoptText').textContent = t
}

/* ---------------- reactions ---------------- */

let lastReact = 0
let lastTheirReact = 0

function sendReact(e) {
  const g = G
  if (!g) return
  const now = Date.now()
  if (now - lastReact < 450) return
  lastReact = now
  floatReaction(e, true)
  sfx.react()
  if (!g.ghost) api.send({ t: 'r', e })
  else if (Math.random() < 0.5) g.timers.push(setTimeout(() => G === g && floatReaction(pick(Math.random, EMOJIS), false), 600 + Math.random() * 900))
}

function togglePhrases(anchor) {
  const pop = $('#phrases')
  if (!pop.hidden) return hidePhrases()
  const r = anchor.getBoundingClientRect()
  pop.hidden = false
  pop.style.top = Math.min(innerHeight - pop.offsetHeight - 12, r.bottom + 8) + 'px'
  pop.style.left = Math.max(12, Math.min(innerWidth - pop.offsetWidth - 12, r.left + r.width / 2 - pop.offsetWidth / 2)) + 'px'
}
function hidePhrases() {
  $('#phrases').hidden = true
}

/* ---------------- network events ---------------- */

function onGame(d) {
  const g = G
  if (!g || g.ghost || !d || typeof d !== 'object') return
  switch (d.t) {
    case 'hi':
      g.partnerCity = cleanCity(d.city)
      if (screen === 'card') $('#cardPartner').textContent = partnerLine(g)
      break
    case 'f':
      onTheirFive(g)
      break
    case 'a':
      onTheirAdopt(g, d.v === 1)
      break
    case 'r': {
      const now = Date.now()
      if ((EMOJIS.includes(d.e) || PHRASES.includes(d.e)) && now - lastTheirReact > 300) {
        lastTheirReact = now
        floatReaction(d.e, false)
        sfx.react()
      }
      break
    }
    default:
      g.act.onMsg(g, d)
  }
}

function onPartnerLeft() {
  const g = G
  if (!g || g.ghost || g.gone) return
  g.gone = true
  if (screen === 'card') $('#cardPartner').textContent = partnerLine(g)
  if (screen === 'reveal') {
    if (!g.gold && !g.theirFive) {
      g.fiveOpen = false
      clearTimeout(g.fiveTimer)
      $('#five').classList.add('closed')
      $('#fiveBtn').disabled = true
      $('#fiveText').textContent = 'Your other half left 💨'
    }
    return
  }
  toast('Your other half vanished 💨 Finish anyway!')
  g.act.onPartnerLeft(g)
}

/* ---------------- wiring ---------------- */

document.querySelectorAll('.reacts').forEach((el) => (el.innerHTML = reactsMarkup(el.dataset.phrases !== undefined)))
$('#phrases').replaceChildren(
  ...PHRASES.map((p) => {
    const b = document.createElement('button')
    b.dataset.phrase = p
    b.textContent = p
    return b
  }),
)

document.addEventListener('click', (e) => {
  const t = e.target
  if (!(t instanceof Element)) return
  const react = t.closest('[data-react]')
  if (react) return sendReact(react.dataset.react)
  const more = t.closest('[data-phrases]')
  if (more) return togglePhrases(more)
  const phrase = t.closest('[data-phrase]')
  if (phrase) {
    sendReact(phrase.dataset.phrase)
    return hidePhrases()
  }
  if (!t.closest('#phrases')) hidePhrases()
  if (t.closest('.skip') && G) {
    if (!G.ghost) {
      net.endMatch({ block: true })
      toast('Skipped. Finding someone new…')
    }
    goFind()
  }
})

$('#go').onclick = () => {
  sfx.unlock()
  goFind()
}
$('#cancel').onclick = goHome
$('#homeBtn').onclick = goHome
$('#again').onclick = goFind
$('#fiveBtn').onclick = () => {
  const g = G
  if (!g || !g.fiveOpen || g.myFive) return
  g.myFive = true
  sfx.five()
  $('#fiveBtn').classList.add('sent')
  api.send({ t: 'f' })
  if (!checkGold(g)) $('#fiveText').textContent = 'Waiting for their hand…'
}
$('#adopt').addEventListener('click', (e) => {
  const b = e.target.closest('[data-adopt]')
  if (b) myAdopt(b.dataset.adopt === '1')
})
$('#share').onclick = () => G?.canvas && sharePostcard(G.canvas, G.act.share(G))
$('#mute').textContent = sfx.muted ? '🔇' : '🔊'
$('#mute').onclick = () => ($('#mute').textContent = sfx.toggle() ? '🔇' : '🔊')

passport.update(() => {}) // award stamps already earned before stamps existed
show('home')
renderHome()
renderOnline()

if (new URLSearchParams(location.search).has('debug')) window.halfies = { net, game: () => G, startGame }
