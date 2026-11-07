import { $, mulberry32, pick, randSeed, myCity, cleanCity, store, toast, confetti } from './util.js'
import { Board, other } from './board.js'
import { createNet } from './net.js'
import { makeGhost } from './ghosts.js'
import { THEMES, makeName } from './words.js'
import { renderPostcard, thumbnail, sharePostcard } from './postcard.js'
import { sfx } from './sfx.js'

const PLAY_MS = 60_000
const GHOST_AFTER = 7000
const FIVE_MS = 8000
const PASS_KEY = 'halfies:passport:v1'
const CITY = myCity()
const SCREENS = ['home', 'finding', 'card', 'play', 'reveal']

let screen = 'home'
let G = null // the current game
let findTimers = []
let online = 1
let connected = false

const board = new Board($('#cv'))
const net = createNet({ onCount, onMatch, onGame, onPartnerLeft })

function show(id) {
  screen = id
  document.body.dataset.screen = id
  for (const s of SCREENS) $('#' + s).classList.toggle('active', s === id)
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

const loadPass = () => store.get(PASS_KEY, { n: 0, gold: 0, cities: [], cards: [] })

function renderPassport() {
  const p = loadPass()
  const box = $('#passport')
  if (!p.n) {
    box.hidden = true
    return
  }
  box.hidden = false
  const c = p.cities.length
  $('#passStats').textContent =
    `🧩 ${p.n} creature${p.n === 1 ? '' : 's'} · 🌍 ${c} ${c === 1 ? 'city' : 'cities'} · ✨ ${p.gold} golden`
  $('#passCards').replaceChildren(
    ...p.cards
      .slice()
      .reverse()
      .map((cd, i) => {
        const im = new Image()
        im.src = cd.img
        im.alt = im.title = cd.name
        if (cd.gold) im.className = 'gold'
        im.style.setProperty('--r', ((i * 37) % 7) - 3 + 'deg')
        return im
      }),
  )
}

function saveCard(g, canvas) {
  const p = loadPass()
  p.n++
  if (!g.ghost && g.partnerCity !== 'Somewhere' && !p.cities.includes(g.partnerCity)) p.cities.push(g.partnerCity)
  p.cards.push({ id: g.id, img: thumbnail(canvas), name: g.name, gold: false })
  while (p.cards.length > 24) p.cards.shift()
  if (!store.set(PASS_KEY, p)) {
    p.cards.splice(0, Math.max(0, p.cards.length - 6))
    store.set(PASS_KEY, p)
  }
}

function markGold(g, canvas) {
  const p = loadPass()
  const cd = p.cards.find((c) => c.id === g.id)
  if (!cd || cd.gold) return
  cd.gold = true
  cd.img = thumbnail(canvas)
  p.gold++
  store.set(PASS_KEY, p)
}

/* ---------------- finding ---------------- */

function clearFind() {
  findTimers.forEach(clearTimeout)
  findTimers = []
}

function stopGame() {
  if (!G) return
  cancelAnimationFrame(G.raf)
  clearTimeout(G.endTimer)
  clearTimeout(G.fiveTimer)
  board.stop()
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
  renderPassport()
  show('home')
}

function onMatch({ seed, initiator }) {
  if (screen !== 'finding' || G) {
    net.endMatch()
    return
  }
  clearFind()
  sfx.pop()
  $('.dots').classList.add('found')
  $('#findText').textContent = 'Found someone! 🎉'
  startGame({ ghost: false, seed, initiator }, 800)
  net.send({ t: 'hi', city: CITY })
}

/* ---------------- game ---------------- */

function startGame({ ghost, seed, initiator = false }, delay = 0) {
  const rng = mulberry32(seed)
  const firstTop = rng() < 0.5
  const role = (ghost ? firstTop : initiator ? firstTop : !firstTop) ? 'top' : 'bottom'
  const g = (G = {
    id: seed.toString(36) + Date.now().toString(36),
    ghost,
    role,
    theme: pick(rng, THEMES),
    name: makeName(rng),
    partnerCity: 'Somewhere',
    ghostRec: ghost ? makeGhost(other(role), mulberry32(seed ^ 0x9e3779b9)) : null,
    myDone: false,
    theirDone: false,
    ended: false,
    gone: false,
    myFive: false,
    theirFive: false,
    gold: false,
    fiveOpen: false,
  })
  board.reset(role)
  setTimeout(() => G === g && showCard(g), delay)
}

function partnerLine(g) {
  if (g.ghost) return 'Nobody else is around, so a ghost 👻 will draw the other half.'
  if (g.gone) return 'Your other half vanished 💨'
  return `Your other half is in ${g.partnerCity} 👋`
}

function showCard(g) {
  $('#cardTheme').textContent = g.theme
  $('#cardRole').textContent = g.role.toUpperCase()
  $('#cardPartner').textContent = partnerLine(g)
  $('#flip').classList.remove('open')
  show('card')
  setTimeout(() => {
    if (G !== g) return
    $('#flip').classList.add('open')
    sfx.flip()
  }, 350)
  setTimeout(() => G === g && startPlay(g), 4300)
}

function startPlay(g) {
  show('play')
  $('#hudRole').textContent = g.role.toUpperCase() + ' half'
  $('#playTheme').textContent = g.theme
  $('#flap').className = 'flap ' + (g.role === 'top' ? 'cover-bottom' : 'cover-top')
  $('#banner').hidden = true
  $('#done').disabled = $('#undo').disabled = false
  $('#done').textContent = 'I’m done ✓'
  $('#timer').classList.remove('hurry')
  setFlapStatus(g)
  board.resize()
  board.enabled = true
  g.start = g.lastNow = performance.now()
  g.end = g.start + PLAY_MS
  g.vt = 0
  g.lastTick = 61
  if (g.ghostRec) g.ghostIdx = g.ghostRec.strokes.map(() => 0)
  g.endTimer = setTimeout(() => endPlay(g), PLAY_MS + 100) // keeps time even if the tab is in the background
  loop(g)
}

function loop(g) {
  if (G !== g || g.ended) return
  const now = performance.now()
  const left = Math.max(0, g.end - now)
  const secs = Math.ceil(left / 1000)
  $('#timerNum').textContent = secs
  $('#timerBar').style.strokeDashoffset = (125.66 * (1 - left / PLAY_MS)).toFixed(2)
  $('#timer').classList.toggle('hurry', secs <= 10)
  if (secs !== g.lastTick) {
    g.lastTick = secs
    if (secs <= 5 && secs > 0) sfx.tick()
  }
  if (g.ghostRec) {
    g.vt += (now - g.lastNow) * (g.myDone ? 6 : 1) // ghost hurries up once you're done
    replayGhost(g, g.vt)
  }
  g.lastNow = now
  if (left <= 0) return endPlay(g)
  g.raf = requestAnimationFrame(() => loop(g))
}

function replayGhost(g, t) {
  const rec = g.ghostRec
  let drew = false
  rec.strokes.forEach((s, i) => {
    let k = g.ghostIdx[i]
    const flat = []
    while (k < s.pts.length && s.pts[k][2] <= t) {
      flat.push(s.pts[k][0], s.pts[k][1])
      k++
    }
    g.ghostIdx[i] = k
    if (flat.length) {
      board.addRemote('g' + i, flat)
      drew = true
    }
  })
  if (drew && !g.ended) activity(g)
  if (!g.theirDone && t >= rec.duration) {
    g.theirDone = true
    setFlapStatus(g)
    if (g.myDone) endPlay(g)
  }
}

function activity(g) {
  g.lastActivity = performance.now()
  setFlapStatus(g)
  clearTimeout(g.actTimer)
  g.actTimer = setTimeout(() => G === g && setFlapStatus(g), 750)
}

function setFlapStatus(g) {
  const el = $('#flapStatus')
  const live = performance.now() - (g.lastActivity || 0) < 700
  el.textContent = g.gone
    ? 'they left 💨'
    : g.theirDone
      ? 'they’re done ✓'
      : live
        ? 'drawing…'
        : g.ghost
          ? 'a ghost is thinking…'
          : 'thinking…'
  el.classList.toggle('live', live && !g.theirDone && !g.gone)
}

function endPlay(g) {
  if (G !== g || g.ended) return
  g.ended = true
  cancelAnimationFrame(g.raf)
  clearTimeout(g.endTimer)
  board.stop()
  $('#done').disabled = $('#undo').disabled = true
  g.seconds = Math.min(60, Math.max(1, Math.round((performance.now() - g.start) / 1000)))
  if (g.ghostRec) replayGhost(g, Infinity)
  if (!g.ghost && !g.myDone) net.send({ t: 'd' })
  setTimeout(() => {
    if (G !== g) return
    board.revealed = true
    board.render()
    $('#flap').classList.add('gone')
    sfx.tada()
  }, 400)
  setTimeout(() => {
    if (G !== g) return
    $('#banner').textContent = `Meet ${g.name}!`
    $('#banner').hidden = false
  }, 1400)
  setTimeout(() => G === g && showReveal(g), 3400)
}

const cardInfo = (g) => ({
  name: g.name,
  theme: g.theme,
  role: g.role,
  myCity: CITY,
  partnerCity: g.partnerCity,
  ghost: g.ghost,
  gold: g.gold,
  seconds: g.seconds,
  date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
})

async function showReveal(g) {
  const cv = await renderPostcard(board.strokes, cardInfo(g))
  if (G !== g) return
  g.canvas = cv
  $('#postcard').src = cv.toDataURL('image/png')
  saveCard(g, cv)
  show('reveal')
  setupFive(g)
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
  txt.textContent = g.theirFive
    ? 'They high-fived you! ✋ Quick, high-five back!'
    : g.ghost
      ? 'High-five the ghost!'
      : 'High-five your other half!'
  if (g.ghost && Math.random() < 0.8) setTimeout(() => onTheirFive(g), 700 + Math.random() * 1800)
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
  confetti()
  renderPostcard(board.strokes, cardInfo(g)).then((cv) => {
    if (G !== g) return
    g.canvas = cv
    $('#postcard').src = cv.toDataURL('image/png')
    markGold(g, cv)
  })
  return true
}

/* ---------------- network events ---------------- */

function onGame(d) {
  const g = G
  if (!g || g.ghost) return
  switch (d.t) {
    case 'hi':
      g.partnerCity = cleanCity(d.city)
      if (screen === 'card') $('#cardPartner').textContent = partnerLine(g)
      break
    case 'p':
      if (typeof d.s === 'string' && Array.isArray(d.p) && d.p.length <= 4000) {
        board.addRemote('t' + d.s.slice(0, 12), d.p)
        if (!g.ended) activity(g)
      }
      break
    case 'u':
      if (typeof d.s === 'string') board.removeRemote('t' + d.s.slice(0, 12))
      break
    case 'd':
      g.theirDone = true
      setFlapStatus(g)
      if (g.myDone) endPlay(g)
      break
    case 'f':
      onTheirFive(g)
      break
  }
}

function onPartnerLeft() {
  const g = G
  if (!g || g.ghost || g.gone) return
  g.gone = true
  g.theirDone = true
  if (screen === 'card') $('#cardPartner').textContent = partnerLine(g)
  if (screen === 'card' || screen === 'play') {
    toast('Your other half vanished 💨 Finish yours anyway!')
    setFlapStatus(g)
    if (g.myDone) endPlay(g)
  }
  if (screen === 'reveal' && !g.gold && !g.theirFive) {
    g.fiveOpen = false
    clearTimeout(g.fiveTimer)
    $('#five').classList.add('closed')
    $('#fiveBtn').disabled = true
    $('#fiveText').textContent = 'Your other half left 💨'
  }
}

/* ---------------- wiring ---------------- */

board.onPoints = (id, flat, end) => {
  if (G && !G.ghost) net.send({ t: 'p', s: id, p: flat, e: end ? 1 : 0 })
}
board.onUndo = (id) => {
  if (G && !G.ghost) net.send({ t: 'u', s: id })
}

$('#go').onclick = () => {
  sfx.unlock()
  goFind()
}
$('#cancel').onclick = goHome
$('#homeBtn').onclick = goHome
$('#again').onclick = goFind
$('#undo').onclick = () => board.undo()
$('#done').onclick = () => {
  const g = G
  if (!g || g.ended || g.myDone) return
  g.myDone = true
  board.stop()
  $('#done').disabled = $('#undo').disabled = true
  if (!g.ghost) net.send({ t: 'd' })
  if (g.theirDone) endPlay(g)
  else $('#done').textContent = 'Waiting for them…'
}
$('#skip').onclick = () => {
  if (!G) return
  if (!G.ghost) {
    net.endMatch({ block: true })
    toast('Skipped. Finding someone new…')
  }
  goFind()
}
$('#fiveBtn').onclick = () => {
  const g = G
  if (!g || !g.fiveOpen || g.myFive) return
  g.myFive = true
  sfx.five()
  $('#fiveBtn').classList.add('sent')
  if (!g.ghost) net.send({ t: 'f' })
  if (!checkGold(g)) $('#fiveText').textContent = 'Waiting for their hand…'
}
$('#share').onclick = () => G?.canvas && sharePostcard(G.canvas, G.name)
$('#mute').textContent = sfx.muted ? '🔇' : '🔊'
$('#mute').onclick = () => ($('#mute').textContent = sfx.toggle() ? '🔇' : '🔊')

addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'z' && screen === 'play') {
    e.preventDefault()
    board.undo()
  }
})

show('home')
renderPassport()
renderOnline()

if (new URLSearchParams(location.search).has('debug')) window.halfies = { net, board, game: () => G }
