// Activity: Split Creature — each player draws one half of a creature.
import { $, mulberry32, pick, countdown, vibrate, toast, confetti } from './util.js'
import { Board, other, W, H, paint, inkSprite, COLORS } from './board.js'
import { makeGhost } from './ghosts.js'
import { THEMES, TWISTS, makeName, makeStats, rollRarity } from './words.js'
import { newCard, panel, goldSeal, rarityRibbon, headline, paragraph, address, TX, FONT } from './postcard.js'
import { sfx } from './sfx.js'

const PLAY_MS = 60_000
const TWIST_AT = 28_000

const ICON = `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M20 60a40 40 0 0 1 80 0z" fill="#FF5A4E" style="mix-blend-mode:multiply"/><path d="M20 60h80c0 22-18 40-40 40S20 82 20 60z" fill="#2E5BFF" style="mix-blend-mode:multiply"/><circle cx="46" cy="44" r="9" fill="#fff" stroke="#1D1B19" stroke-width="3"/><circle cx="49" cy="46" r="4" fill="#1D1B19"/><circle cx="74" cy="44" r="9" fill="#fff" stroke="#1D1B19" stroke-width="3"/><circle cx="77" cy="46" r="4" fill="#1D1B19"/></svg>`

const board = new Board($('#cv'))
let ctx = null // api from main.js
let cur = null // current creature game

board.onPoints = (id, p, end, w) => ctx?.send({ t: 'p', s: id, p, e: end ? 1 : 0, w })
board.onSticker = (id, x, y, r) => ctx?.send({ t: 'k', s: id, x, y, r })
board.onUndo = (id) => ctx?.send({ t: 'u', s: id })
board.onEyeLimit = () => toast('That’s plenty of eyes 👀')
board.onRemoteInk = (x) => {
  if (!cur || cur.ended) return
  const p = $('#pencil')
  p.style.left = (x / W) * 100 + '%'
  p.classList.add('on')
  clearTimeout(cur.pencilTimer)
  cur.pencilTimer = setTimeout(() => p.classList.remove('on'), 900)
  activity(cur)
}

const live = (g) => ctx?.cur(g) && cur === g

function setTool(t) {
  board.tool = t
  $('#toolPen').setAttribute('aria-pressed', t === 'pen')
  $('#toolEye').setAttribute('aria-pressed', t === 'eye')
}

function activity(g) {
  g.lastActivity = performance.now()
  flapStatus(g)
  clearTimeout(g.actTimer)
  g.actTimer = setTimeout(() => live(g) && flapStatus(g), 750)
}

function flapStatus(g) {
  const el = $('#flapStatus')
  const busy = performance.now() - (g.lastActivity || 0) < 700
  el.textContent = g.gone ? 'they left 💨' : g.theirDone ? 'they’re done ✓' : busy ? 'drawing…' : g.ghost ? 'a ghost is thinking…' : 'thinking…'
  el.classList.toggle('live', busy && !g.theirDone && !g.gone)
}

function replayGhost(g, t) {
  const rec = g.ghostRec
  rec.strokes.forEach((s, i) => {
    let k = g.ghostIdx[i]
    const flat = []
    while (k < s.pts.length && s.pts[k][2] <= t) {
      flat.push(s.pts[k][0], s.pts[k][1])
      k++
    }
    g.ghostIdx[i] = k
    if (flat.length) board.addRemote('g' + i, flat)
  })
  if (!g.theirDone && t >= rec.duration) {
    g.theirDone = true
    flapStatus(g)
    if (g.myDone) end(g)
  }
}

function loop(g) {
  if (!live(g) || g.ended) return
  const now = performance.now()
  if (g.ghostRec) {
    g.vt += (now - g.lastNow) * (g.myDone ? 6 : 1) // the ghost hurries once you're done
    replayGhost(g, g.vt)
  }
  g.lastNow = now
  if (!g.twisted && g.timer.elapsed() >= TWIST_AT && !g.myDone) twist(g)
  g.raf = requestAnimationFrame(() => loop(g))
}

function twist(g) {
  g.twisted = true
  const tw = g.twist
  const el = $('#twist')
  el.replaceChildren(Object.assign(document.createElement('b'), { textContent: 'TWIST!' }), ' ' + tw.text)
  el.hidden = false
  sfx.whoosh()
  vibrate(30)
  if (tw.effect) board.fx[tw.effect] = true
  g.fxTimer = setTimeout(() => {
    board.fx = {}
    el.hidden = true
  }, tw.ms || 3800)
}

function end(g) {
  if (g.ended || !live(g)) return
  g.ended = true
  g.timer?.stop()
  cancelAnimationFrame(g.raf)
  clearTimeout(g.fxTimer)
  board.fx = {}
  $('#twist').hidden = true
  $('#pencil').classList.remove('on')
  board.stop()
  for (const b of ['#done', '#undo', '#toolPen', '#toolEye']) $(b).disabled = true
  g.seconds = Math.min(60, Math.max(1, Math.round(g.timer.elapsed() / 1000)))
  if (g.ghostRec) replayGhost(g, Infinity)
  if (!g.ghost && !g.myDone) ctx.send({ t: 'd' })
  g.items = board.items

  const at = (ms, fn) => setTimeout(() => live(g) && fn(), ms)
  at(400, () => {
    board.revealed = true
    board.render()
    $('#flap').classList.add('gone')
    sfx.tada()
    vibrate(40)
  })
  at(1300, () => board.startAlive())
  at(1500, () => {
    const b = $('#bubble')
    b.textContent = `Hi! I’m ${g.name}!`
    b.hidden = false
    sfx.babble(b.textContent, 0.75 + (g.seed % 50) / 100)
  })
  if (g.rarity !== 'common') {
    at(3200, () => {
      const tag = $('#rarityTag')
      tag.textContent = g.rarity === 'legendary' ? '✨ LEGENDARY! ✨' : '★ RARE ★'
      tag.className = 'rarity-tag ' + g.rarity
      tag.hidden = false
      $('#board').classList.add(g.rarity)
      if (g.rarity === 'legendary') {
        sfx.legend()
        confetti(['#FF5A4E', '#F2B705', '#3CCF91', '#2E5BFF', '#B04CFF'])
      } else sfx.rare()
      vibrate([30, 40, 30])
    })
  }
  at(g.rarity === 'common' ? 3900 : 5200, () => {
    board.stopAlive()
    g.sprite = inkSprite(g.items)
    ctx.finish(g)
  })
}

$('#undo').onclick = () => board.undo()
$('#toolPen').onclick = () => setTool('pen')
$('#toolEye').onclick = () => setTool('eye')
$('#done').onclick = () => {
  const g = cur
  if (!g || !live(g) || g.ended || g.myDone) return
  g.myDone = true
  board.stop()
  for (const b of ['#done', '#undo', '#toolPen', '#toolEye']) $(b).disabled = true
  ctx.send({ t: 'd' })
  if (g.theirDone) end(g)
  else $('#done').textContent = 'Waiting…'
}
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'z' && cur && !cur.ended) {
    e.preventDefault()
    board.undo()
  }
})

export const creature = {
  id: 'creature',
  adoptable: true,

  setup(g, rng, initiator) {
    const firstTop = rng() < 0.5
    g.role = (g.ghost || initiator ? firstTop : !firstTop) ? 'top' : 'bottom'
    g.theme = pick(rng, THEMES)
    g.name = makeName(rng)
    const tw = pick(rng, TWISTS)
    g.twist = { text: tw.both || tw[g.role], effect: tw.effect, ms: tw.ms }
    g.stats = makeStats(rng)
    g.rarity = rollRarity(rng)
    g.myDone = g.theirDone = g.ended = false
    if (g.ghost) g.ghostRec = makeGhost(other(g.role), mulberry32(g.seed ^ 0x9e3779b9))
    cur = g
    board.reset(g.role) // ready before play starts, in case their first strokes arrive early
  },

  card(g) {
    return {
      title: 'Split\nCreature',
      icon: ICON,
      rule: 'Draw a creature that',
      strong: g.theme,
      note: ['You draw the ', g.role.toUpperCase(), ' half'],
    }
  },

  start(g, api) {
    ctx = api
    cur = g
    api.show('play')
    $('#hudRole').textContent = g.role.toUpperCase()
    $('#playTheme').textContent = g.theme
    $('#flap').className = 'flap ' + (g.role === 'top' ? 'cover-bottom' : 'cover-top')
    for (const id of ['#banner', '#bubble', '#rarityTag', '#twist']) $(id).hidden = true
    $('#board').classList.remove('legendary', 'rare')
    for (const b of ['#done', '#undo', '#toolPen', '#toolEye']) $(b).disabled = false
    $('#done').textContent = 'I’m done ✓'
    setTool('pen')
    flapStatus(g)
    board.resize()
    board.enabled = true
    g.vt = 0
    g.lastNow = performance.now()
    g.twisted = false
    if (g.ghostRec) g.ghostIdx = g.ghostRec.strokes.map(() => 0)
    g.timer = countdown($('#play'), PLAY_MS, { onEnd: () => end(g), onSecond: (s) => s <= 5 && s > 0 && sfx.tick() })
    loop(g)
  },

  onMsg(g, d) {
    const id = typeof d.s === 'string' ? 't' + d.s.slice(0, 12) : null
    if (d.t === 'p' && id && Array.isArray(d.p) && d.p.length <= 4000) board.addRemote(id, d.p, d.w)
    else if (d.t === 'k' && id) board.addRemoteEye(id, d.x, d.y, d.r)
    else if (d.t === 'u' && id) board.removeRemote(id)
    else if (d.t === 'd') {
      g.theirDone = true
      flapStatus(g)
      if (g.myDone) end(g)
    }
  },

  onPartnerLeft(g) {
    g.theirDone = true
    flapStatus(g)
    if (g.myDone) end(g)
  },

  stop(g) {
    g.timer?.stop()
    cancelAnimationFrame(g.raf)
    clearTimeout(g.fxTimer)
    board.fx = {}
    board.stop()
    board.stopAlive()
    if (cur === g) cur = null
  },

  async renderCard(g) {
    const { cv, ctx: c } = await newCard({ gold: g.gold, rarity: g.rarity })
    panel(c, (p, w, h) => {
      p.scale(w / W, h / H)
      paint(p, g.items, { guides: false })
    })
    rarityRibbon(c, g.rarity)
    if (g.gold) goldSeal(c)
    let y = headline(c, 'Meet', g.name + '!')
    y = paragraph(c, `A creature that ${g.theme}.`, y + 2)
    y = Math.max(y + 22, 500)
    c.font = `600 20px ${FONT}`
    for (const s of g.stats) {
      c.fillStyle = COLORS.ink
      c.fillText(s.name, TX, y)
      c.fillStyle = 'rgba(29,27,25,.12)'
      c.beginPath()
      c.roundRect(TX + 150, y - 15, 220, 16, 8)
      c.fill()
      c.fillStyle = s.value >= 90 ? COLORS.me : COLORS.them
      c.beginPath()
      c.roundRect(TX + 150, y - 15, Math.max(16, (220 * s.value) / 99), 16, 8)
      c.fill()
      c.fillStyle = COLORS.ink
      c.fillText(String(s.value), TX + 385, y)
      y += 36
    }
    const them = g.ghost ? 'a ghost 👻' : g.partnerCity
    const lines =
      g.role === 'top'
        ? [[COLORS.me, `Top half · you, ${g.myCity}`], [COLORS.them, `Bottom half · ${them}`]]
        : [[COLORS.them, `Top half · ${them}`], [COLORS.me, `Bottom half · you, ${g.myCity}`]]
    address(c, lines, `drawn in ${g.seconds}s`)
    return cv
  },

  share(g) {
    return { title: g.name, text: `I drew half a creature with a total stranger 🙈 Meet ${g.name}!` }
  },

  record(p, g) {
    p.kinds.creature++
    if (g.rarity === 'legendary') p.legendary++
  },

  news(g) {
    return { k: 'creature', name: g.name, r: g.rarity }
  },
}
