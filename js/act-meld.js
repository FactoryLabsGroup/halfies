// Activity: Mind Meld — both type a word at the same time; keep trying until you say the same one.
import { $, countdown, confetti, vibrate } from './util.js'
import { normalizeWord, isBadWord } from './words.js'
import { newCard, panel, headline, paragraph, address, FONT } from './postcard.js'
import { COLORS } from './board.js'
import { sfx } from './sfx.js'

const ROUNDS = 6
const ROUND_MS = 20_000

const ICON = `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="46" cy="60" r="32" fill="#FF5A4E" style="mix-blend-mode:multiply"/><circle cx="74" cy="60" r="32" fill="#2E5BFF" style="mix-blend-mode:multiply"/><text x="60" y="70" text-anchor="middle" font-size="28" font-family="sans-serif">💭</text></svg>`

let ctx = null
let cur = null
const live = (g) => ctx?.cur(g) && cur === g
const input = $('#meldInput')

function status(text) {
  $('#meldStatus').textContent = text
}

function word(text, who) {
  const s = document.createElement('span')
  s.className = 'w ' + who
  s.textContent = text || '…'
  return s
}

function nextRound(g) {
  g.round++
  g.revealing = false
  $('#meldRound').textContent = `Round ${g.round}/${ROUNDS}`
  const prompt = $('#meldPrompt')
  if (g.round === 1) prompt.textContent = 'Type any word!'
  else {
    const [a, b] = g.history[g.history.length - 1]
    prompt.replaceChildren('Find a word that links ', word(a, 'me'), ' + ', word(b, 'them'))
  }
  input.value = ''
  input.disabled = false
  $('#meldSend').disabled = false
  input.focus({ preventScroll: true })
  status(g.theirs[g.round] !== undefined ? 'They’re ready ✓ Your turn!' : '')
  g.timer = countdown($('#meld'), ROUND_MS, {
    onEnd: () => submit(g, input.value, true),
    onSecond: (s) => s <= 3 && s > 0 && sfx.tick(),
  })
}

function submit(g, raw, auto = false) {
  if (!live(g) || g.ended || g.mine[g.round] !== undefined) return
  let w = normalizeWord(raw)
  if (!auto && !w) return status('One word, letters only 🙂')
  if (w && isBadWord(w)) {
    if (!auto) {
      input.select()
      return status('Let’s keep it friendly 🙂')
    }
    w = ''
  }
  g.mine[g.round] = w
  ctx.send({ t: 'w', r: g.round, w })
  input.disabled = true
  $('#meldSend').disabled = true
  input.blur()
  status(g.theirs[g.round] !== undefined ? '' : 'Waiting for them…')
  check(g)
}

function check(g) {
  const r = g.round
  if (g.ended || g.revealing || g.mine[r] === undefined || g.theirs[r] === undefined) return
  g.revealing = true
  g.timer.stop()
  const a = g.mine[r], b = g.theirs[r]
  g.history.push([a, b])
  const match = !!a && a === b
  const li = document.createElement('li')
  li.className = match ? 'match' : ''
  li.append(word(a, 'me'), document.createTextNode(match ? ' = ' : ' · '), word(b, 'them'))
  $('#meldHistory').appendChild(li)
  li.scrollIntoView({ block: 'nearest' })
  if (match) {
    g.result = { win: true, word: a, rounds: r }
    $('#meldPrompt').textContent = 'MIND MELD! 🧠✨'
    status(`You both said “${a}”!`)
    sfx.gold()
    vibrate([40, 60, 40])
    confetti()
    setTimeout(() => finish(g), 2400)
  } else if (r >= ROUNDS) {
    g.result = { win: false, rounds: r }
    $('#meldPrompt').textContent = 'So close… 🫠'
    status('')
    sfx.sad()
    setTimeout(() => finish(g), 2000)
  } else {
    sfx.pop()
    status(a && b ? 'Not yet… think of what links them!' : 'Someone ran out of time ⏰')
    setTimeout(() => live(g) && !g.ended && nextRound(g), 1600)
  }
}

function finish(g) {
  if (!live(g) || g.ended) return
  g.ended = true
  g.timer?.stop()
  g.seconds = Math.round((performance.now() - g.t0) / 1000)
  ctx.finish(g)
}

$('#meldForm').addEventListener('submit', (e) => {
  e.preventDefault()
  if (cur) submit(cur, input.value)
})

export const meld = {
  id: 'meld',
  adoptable: false,

  setup(g) {
    g.round = 0
    g.mine = {}
    g.theirs = {}
    g.history = []
    g.result = null
    g.ended = false
    cur = g
  },

  card() {
    return {
      title: 'Mind\nMeld',
      icon: ICON,
      rule: 'Say the same word as a stranger',
      strong: `in ${ROUNDS} tries or fewer`,
      note: ['Start with any word. Then find a word that ', 'links', ' your last two.'],
    }
  },

  start(g, api) {
    ctx = api
    cur = g
    g.t0 = performance.now()
    api.show('meld')
    $('#meldHistory').replaceChildren()
    nextRound(g)
  },

  onMsg(g, d) {
    if (d.t !== 'w') return
    const r = d.r | 0
    if (r < 1 || r > ROUNDS || g.theirs[r] !== undefined) return
    let w = normalizeWord(d.w)
    if (w && isBadWord(w)) w = '***'
    g.theirs[r] = w
    if (r === g.round && g.mine[r] === undefined) status('They’re ready ✓ Your turn!')
    check(g)
  },

  onPartnerLeft(g) {
    if (g.ended || g.result) return
    g.result = { win: false, rounds: g.round, left: true }
    g.timer?.stop()
    input.disabled = true
    $('#meldPrompt').textContent = 'They left 💨'
    setTimeout(() => finish(g), 1500)
  },

  stop(g) {
    g.timer?.stop()
    if (cur === g) cur = null
  },

  async renderCard(g) {
    const { cv, ctx: c } = await newCard({ gold: g.gold })
    const win = g.result?.win
    panel(c, (p, w) => {
      p.textAlign = 'center'
      p.fillStyle = COLORS.ink
      p.font = `800 54px ${FONT}`
      p.fillText(win ? 'MIND MELD!' : 'ALMOST!', w / 2, 100)
      let y = 200
      for (const [a, b] of g.history.slice(-7)) {
        const match = a && a === b
        if (match) {
          p.font = `800 68px ${FONT}`
          p.fillStyle = '#5B2A86'
          p.fillText(`✨ ${a} ✨`, w / 2, y + 26)
          y += 100
          continue
        }
        p.font = `600 44px ${FONT}`
        p.textAlign = 'right'
        p.fillStyle = COLORS.me
        p.fillText(a || '…', w / 2 - 24, y)
        p.textAlign = 'center'
        p.fillStyle = 'rgba(29,27,25,.4)'
        p.fillText('·', w / 2, y)
        p.textAlign = 'left'
        p.fillStyle = COLORS.them
        p.fillText(b || '…', w / 2 + 24, y)
        p.textAlign = 'center'
        y += 80
      }
    })
    const r = g.result?.rounds || g.history.length
    let y
    if (win) {
      y = headline(c, 'We both said', `“${g.result.word}”`)
      paragraph(c, `Mind-melded in ${r} round${r === 1 ? '' : 's'} — two total strangers, one brain.`, y + 2, { maxLines: 3 })
    } else {
      y = headline(c, 'Two strangers,', 'so close!')
      paragraph(c, g.result?.left ? 'They vanished mid-thought 💨' : `${r} rounds and we never quite met.`, y + 2, { maxLines: 3 })
    }
    address(c, [[COLORS.me, `You · ${g.myCity}`], [COLORS.them, g.partnerCity]], 'mind meld')
    return cv
  },

  share(g) {
    return g.result?.win
      ? { title: 'mind-meld', text: `A total stranger and I both said “${g.result.word}” 🧠` }
      : { title: 'mind-meld', text: 'A stranger and I tried to read each other’s minds 🫠' }
  },

  record(p, g) {
    p.kinds.meld++
    if (g.result?.win) p.melds++
  },

  news(g) {
    return { k: 'meld', win: !!g.result?.win }
  },
}
