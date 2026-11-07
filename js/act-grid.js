// Activity: Sync Grid — both paint the same prompt on an 8×8 grid without seeing each other.
import { $, mulberry32, pick, countdown, confetti, vibrate } from './util.js'
import { newCard, panel, goldSeal, headline, paragraph, address, FONT } from './postcard.js'
import { COLORS } from './board.js'
import { sfx } from './sfx.js'

const N = 8
const PLAY_MS = 40_000
const BOTH = '#5B2A86'

const ICON = `<svg viewBox="0 0 120 120" aria-hidden="true">${Array.from({ length: 16 }, (_, i) => {
  const x = 20 + (i % 4) * 21, y = 20 + Math.floor(i / 4) * 21
  const c = [0, 3, 5, 6, 9, 10, 12, 15].includes(i) ? '#5B2A86' : [1, 4, 11].includes(i) ? '#FF5A4E' : [7, 13].includes(i) ? '#2E5BFF' : '#E8E1D5'
  return `<rect x="${x}" y="${y}" width="18" height="18" rx="4" fill="${c}"/>`
}).join('')}</svg>`

const art = (rows) => rows.join('').split('').map((c) => (c === '#' ? 1 : 0))
const PROMPTS = [
  { name: 'a heart ❤️', bits: art(['........', '.##..##.', '########', '########', '.######.', '..####..', '...##...', '........']) },
  { name: 'a smiley 🙂', bits: art(['..####..', '.#....#.', '#.#..#.#', '#......#', '#.#..#.#', '#..##..#', '.#....#.', '..####..']) },
  { name: 'a house 🏠', bits: art(['...##...', '..####..', '.######.', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.######.']) },
  { name: 'a tree 🌲', bits: art(['...##...', '..####..', '.######.', '..####..', '.######.', '########', '...##...', '...##...']) },
  { name: 'a star ⭐', bits: art(['...##...', '...##...', '########', '.######.', '..####..', '.##..##.', '.#....#.', '........']) },
  { name: 'a fish 🐟', bits: art(['........', '...###..', '#.#####.', '#####.##', '#.######', '...###..', '........', '........']) },
  { name: 'a mushroom 🍄', bits: art(['..####..', '.##..##.', '########', '#.####.#', '...##...', '..####..', '..####..', '........']) },
  { name: 'a ghost 👻', bits: art(['..####..', '.######.', '##.##.##', '########', '########', '########', '########', '#.#..#.#']) },
  { name: 'a cat 🐱', bits: art(['#......#', '##....##', '########', '#.#..#.#', '########', '#..##..#', '.######.', '..####..']) },
  { name: 'a rocket 🚀', bits: art(['...##...', '..####..', '..#..#..', '..####..', '..####..', '.######.', '##.##.##', '...##...']) },
]

let ctx = null
let cur = null
const live = (g) => ctx?.cur(g) && cur === g
const box = $('#gridBox')

// build the 64 cells once
for (let i = 0; i < N * N; i++) {
  const c = document.createElement('div')
  c.className = 'cell'
  c.dataset.i = i
  box.appendChild(c)
}
const cells = [...box.children]

function paintCell(g, i, v) {
  if (g.bits[i] === v) return
  g.bits[i] = v
  cells[i].classList.toggle('on', !!v)
  sendCount(g)
}

function sendCount(g) {
  if (g.countTimer) return
  g.countTimer = setTimeout(() => {
    g.countTimer = 0
    if (live(g) && !g.ended) ctx.send({ t: 'gc', n: g.bits.reduce((a, b) => a + b, 0) })
  }, 250)
}

let drag = null
box.addEventListener('pointerdown', (e) => {
  const g = cur
  const cell = e.target.closest('.cell')
  if (!g || !live(g) || g.ended || g.myDone || !cell) return
  e.preventDefault()
  const i = +cell.dataset.i
  drag = { mode: g.bits[i] ? 0 : 1 }
  paintCell(g, i, drag.mode)
})
box.addEventListener('pointermove', (e) => {
  const g = cur
  if (!drag || !g || g.ended || g.myDone) return
  const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.cell')
  if (cell && box.contains(cell)) paintCell(g, +cell.dataset.i, drag.mode)
})
addEventListener('pointerup', () => (drag = null))
addEventListener('pointercancel', () => (drag = null))

function setStatus(g) {
  const n = g.theirCount
  $('#gridStatus').textContent = g.gone
    ? 'they left 💨'
    : g.theirDone
      ? `they’re done ✓ (${n} cells)`
      : `${g.ghost ? 'the ghost' : 'they'} painted ${n} cell${n === 1 ? '' : 's'}`
}

function end(g) {
  if (g.ended || !live(g)) return
  g.ended = true
  g.timer?.stop()
  g.ghostTimers?.forEach(clearTimeout)
  $('#gridDone').disabled = $('#gridClear').disabled = true
  g.seconds = Math.min(40, Math.max(1, Math.round(g.timer.elapsed() / 1000)))
  ctx.send({ t: 'gg', b: g.bits.join('') })
  if (g.ghost) g.theirBits = g.ghostBits
  $('#gridStatus').textContent = 'Comparing minds…'
  g.waitTimer = setTimeout(() => reveal(g), 3500) // give up waiting after a bit
  if (g.theirBits || g.gone) setTimeout(() => reveal(g), 500)
}

function reveal(g) {
  if (!live(g) || g.revealed) return
  g.revealed = true
  clearTimeout(g.waitTimer)
  const theirs = g.theirBits || new Array(N * N).fill(0)
  let both = 0, any = 0
  cells.forEach((c, i) => {
    const a = g.bits[i], b = theirs[i]
    if (a && b) both++
    if (a || b) any++
    c.className = 'cell ' + (a && b ? 'both' : a ? 'me' : b ? 'them' : '')
    c.style.animationDelay = (i % N) * 30 + Math.floor(i / N) * 30 + 'ms'
    c.classList.add('pop')
  })
  g.score = any ? Math.round((100 * both) / any) : 0
  g.verdict = g.score >= 80 ? 'TELEPATHS! 🧠' : g.score >= 60 ? 'Same wavelength 📡' : g.score >= 40 ? 'Kinda close 🤏' : 'Different planets 🪐'
  const st = $('#gridStatus')
  let n = 0
  const tick = setInterval(() => {
    n = Math.min(g.score, n + Math.max(1, Math.ceil(g.score / 25)))
    st.textContent = `${n}% in sync`
    if (n >= g.score) {
      clearInterval(tick)
      st.textContent = `${g.score}% in sync — ${g.verdict}`
      if (g.score >= 80) {
        sfx.gold()
        confetti()
        vibrate([40, 60, 40])
      } else sfx.tada()
    }
  }, 40)
  setTimeout(() => live(g) && ctx.finish(g), 3200)
}

$('#gridClear').onclick = () => {
  const g = cur
  if (!g || g.ended || g.myDone) return
  g.bits.forEach((v, i) => v && paintCell(g, i, 0))
}
$('#gridDone').onclick = () => {
  const g = cur
  if (!g || !live(g) || g.ended || g.myDone) return
  g.myDone = true
  $('#gridDone').disabled = $('#gridClear').disabled = true
  $('#gridDone').textContent = 'Waiting…'
  ctx.send({ t: 'gd' })
  if (g.theirDone) end(g)
}

export const grid = {
  id: 'grid',
  adoptable: false,

  setup(g, rng) {
    g.prompt = pick(rng, PROMPTS)
    g.bits = new Array(N * N).fill(0)
    g.theirBits = null
    g.theirCount = 0
    g.myDone = g.theirDone = g.ended = g.revealed = false
    if (g.ghost) {
      const r = mulberry32(g.seed ^ 0x51ed)
      g.ghostBits = [...g.prompt.bits]
      const flips = 3 + Math.floor(r() * 6)
      for (let k = 0; k < flips; k++) {
        const i = Math.floor(r() * N * N)
        g.ghostBits[i] ^= 1
      }
    }
    cur = g
  },

  card(g) {
    return {
      title: 'Sync\nGrid',
      icon: ICON,
      rule: 'Paint the same picture:',
      strong: g.prompt.name,
      note: ['You can’t see each other’s grid. ', 'Think alike!', ''],
    }
  },

  start(g, api) {
    ctx = api
    cur = g
    api.show('grid')
    $('#gridPrompt').textContent = g.prompt.name
    cells.forEach((c) => {
      c.className = 'cell'
      c.style.animationDelay = ''
    })
    $('#gridDone').disabled = $('#gridClear').disabled = false
    $('#gridDone').textContent = 'I’m done ✓'
    setStatus(g)
    g.timer = countdown($('#grid'), PLAY_MS, { onEnd: () => end(g), onSecond: (s) => s <= 5 && s > 0 && sfx.tick() })
    if (g.ghost) {
      // the ghost "paints" its cells over ~15–28 seconds
      const total = g.ghostBits.reduce((a, b) => a + b, 0)
      const dur = 15000 + (g.seed % 13000)
      g.ghostTimers = []
      for (let k = 1; k <= total; k++) {
        g.ghostTimers.push(setTimeout(() => {
          if (!live(g) || g.ended) return
          g.theirCount = k
          if (k === total) g.theirDone = true
          setStatus(g)
          if (g.theirDone && g.myDone) end(g)
        }, 1500 + (dur * k) / total))
      }
    }
  },

  onMsg(g, d) {
    if (d.t === 'gc') {
      g.theirCount = Math.max(0, Math.min(64, d.n | 0))
      if (!g.ended) setStatus(g)
    } else if (d.t === 'gd') {
      g.theirDone = true
      if (!g.ended) setStatus(g)
      if (g.myDone) end(g)
    } else if (d.t === 'gg' && typeof d.b === 'string' && /^[01]{64}$/.test(d.b)) {
      g.theirBits = d.b.split('').map(Number)
      g.theirCount = g.theirBits.reduce((a, b) => a + b, 0)
      if (g.ended) reveal(g)
    }
  },

  onPartnerLeft(g) {
    g.theirDone = true
    if (!g.ended) setStatus(g)
    if (g.ended) reveal(g)
    else if (g.myDone) end(g)
  },

  stop(g) {
    g.timer?.stop()
    g.ghostTimers?.forEach(clearTimeout)
    clearTimeout(g.waitTimer)
    if (cur === g) cur = null
  },

  async renderCard(g) {
    const { cv, ctx: c } = await newCard({ gold: g.gold })
    const theirs = g.theirBits || new Array(N * N).fill(0)
    panel(c, (p, w) => {
      p.textAlign = 'center'
      p.fillStyle = COLORS.ink
      p.font = `800 40px ${FONT}`
      p.fillText(`Paint ${g.prompt.name}`, w / 2, 80)
      const size = 60, gap = 4, x0 = (w - N * size) / 2, y0 = 130
      for (let i = 0; i < N * N; i++) {
        const a = g.bits[i], b = theirs[i]
        p.fillStyle = a && b ? BOTH : a ? COLORS.me : b ? COLORS.them : 'rgba(29,27,25,.07)'
        p.beginPath()
        p.roundRect(x0 + (i % N) * size + gap / 2, y0 + Math.floor(i / N) * size + gap / 2, size - gap, size - gap, 8)
        p.fill()
      }
      const ly = y0 + N * size + 60
      p.font = `600 26px ${FONT}`
      ;[[COLORS.me, 'you'], [COLORS.them, 'them'], [BOTH, 'both']].forEach(([col, label], k) => {
        const lx = w / 2 - 170 + k * 130
        p.fillStyle = col
        p.beginPath()
        p.roundRect(lx, ly - 20, 26, 26, 6)
        p.fill()
        p.fillStyle = COLORS.ink
        p.textAlign = 'left'
        p.fillText(label, lx + 36, ly)
      })
    })
    if (g.gold) goldSeal(c)
    const y = headline(c, 'We were', `${g.score}% in sync`)
    paragraph(c, g.verdict, y + 4, { size: 30, weight: 800, color: g.score >= 80 ? BOTH : COLORS.ink })
    const them = g.ghost ? 'a ghost 👻' : g.partnerCity
    address(c, [[COLORS.me, `You · ${g.myCity}`], [COLORS.them, them]], `sync grid · ${g.seconds}s`)
    return cv
  },

  share(g) {
    return { title: 'sync-grid', text: `A total stranger and I painted ${g.prompt.name.replace(/\s\S+$/, '')} and were ${g.score}% in sync 📡` }
  },

  record(p, g) {
    p.kinds.grid++
    if (g.score >= 80) p.telepath++
  },

  news(g) {
    return { k: 'grid', score: g.score }
  },
}
