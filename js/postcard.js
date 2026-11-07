// Shared postcard pieces. Each activity draws its own left panel and headline;
// the frame, stamp, postmark, address lines and sharing live here.
import { COLORS } from './board.js'

export const PW = 1200
export const PH = 880
export const FONT = '"Bricolage Grotesque", ui-rounded, system-ui, sans-serif'
export const PANEL = { x: 50, y: 60, w: 570, h: 760 } // left picture area
export const TX = 715 // right text column
export const TW = 430

let fontsReady = null
function loadFonts() {
  fontsReady ||= Promise.all([
    document.fonts.load(`800 60px ${FONT}`),
    document.fonts.load(`600 28px ${FONT}`),
    document.fonts.load(`400 24px ${FONT}`),
  ]).catch(() => {})
  return fontsReady
}

export function wrap(ctx, text, maxW) {
  const lines = []
  let line = ''
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = t
  }
  if (line) lines.push(line)
  return lines
}

export const dateStr = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

/** Blank card with background, perforated edge, optional rarity frame, stamp and postmark. */
export async function newCard({ gold = false, rarity = 'common' } = {}) {
  await loadFonts()
  const cv = document.createElement('canvas')
  cv.width = PW
  cv.height = PH
  const ctx = cv.getContext('2d')

  if (gold) {
    const g = ctx.createLinearGradient(0, 0, PW, PH)
    g.addColorStop(0, '#FFE8A3')
    g.addColorStop(0.5, '#F7D36A')
    g.addColorStop(1, '#F2B705')
    ctx.fillStyle = g
  } else ctx.fillStyle = COLORS.paper
  ctx.fillRect(0, 0, PW, PH)

  if (rarity === 'legendary') {
    const g = ctx.createLinearGradient(0, 0, PW, PH)
    ;['#FF5A4E', '#F2B705', '#3CCF91', '#2E5BFF', '#B04CFF', '#FF5A4E'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c))
    ctx.strokeStyle = g
    ctx.lineWidth = 22
    ctx.strokeRect(11, 11, PW - 22, PH - 22)
  } else if (rarity === 'rare') {
    ctx.strokeStyle = COLORS.them
    ctx.lineWidth = 12
    ctx.strokeRect(6, 6, PW - 12, PH - 12)
  }

  ctx.strokeStyle = 'rgba(29,27,25,.35)'
  ctx.lineWidth = 3
  ctx.setLineDash([2, 12])
  ctx.lineCap = 'round'
  ctx.strokeRect(26, 26, PW - 52, PH - 52)
  ctx.setLineDash([])

  // divider
  ctx.strokeStyle = 'rgba(29,27,25,.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(670, 70)
  ctx.lineTo(670, PH - 70)
  ctx.stroke()

  drawStamp(ctx)
  drawPostmark(ctx, gold)
  return { cv, ctx }
}

function drawStamp(ctx) {
  const sx = 1000, sy = 60, sw = 140, sh = 170
  ctx.fillStyle = '#fff'
  ctx.fillRect(sx, sy, sw, sh)
  ctx.strokeStyle = COLORS.ink
  ctx.lineWidth = 3
  ctx.setLineDash([6, 6])
  ctx.strokeRect(sx + 6, sy + 6, sw - 12, sh - 12)
  ctx.setLineDash([])
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = COLORS.me
  ctx.beginPath()
  ctx.arc(sx + sw / 2, sy + 82, 42, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = COLORS.them
  ctx.beginPath()
  ctx.arc(sx + sw / 2, sy + 82, 42, 0, Math.PI)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = COLORS.ink
  ctx.beginPath()
  ctx.arc(sx + sw / 2 - 15, sy + 68, 5, 0, Math.PI * 2)
  ctx.arc(sx + sw / 2 + 15, sy + 68, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = `800 20px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('HALFIES', sx + sw / 2, sy + sh - 22)
  ctx.textAlign = 'left'
}

function drawPostmark(ctx, gold) {
  ctx.save()
  ctx.translate(990, 180)
  ctx.rotate(-0.25)
  ctx.strokeStyle = ctx.fillStyle = gold ? 'rgba(29,27,25,.55)' : 'rgba(46,91,255,.6)'
  ctx.lineWidth = 3
  for (const r of [62, 50]) {
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.textAlign = 'center'
  ctx.font = `600 15px ${FONT}`
  ctx.fillText(dateStr(), 0, 5)
  ctx.font = `800 13px ${FONT}`
  ctx.fillText('MADE WITH', 0, -18)
  ctx.fillText('A STRANGER', 0, 28)
  ctx.restore()
}

/** Rounded picture panel on the left; `draw(ctx)` paints inside a W×H-sized local space of the panel. */
export function panel(ctx, draw) {
  const { x, y, w, h } = PANEL
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 18)
  ctx.fillStyle = COLORS.paper
  ctx.fill()
  ctx.clip()
  ctx.translate(x, y)
  draw(ctx, w, h)
  ctx.restore()
  ctx.lineWidth = 4
  ctx.strokeStyle = COLORS.ink
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 18)
  ctx.stroke()
}

/** "Golden ✋" seal over the panel's corner. */
export function goldSeal(ctx) {
  ctx.save()
  ctx.translate(PANEL.x + PANEL.w - 18, PANEL.y + PANEL.h - 30)
  ctx.rotate(0.2)
  ctx.fillStyle = COLORS.ink
  ctx.beginPath()
  ctx.arc(0, 0, 58, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#F7D36A'
  ctx.textAlign = 'center'
  ctx.font = `800 17px ${FONT}`
  ctx.fillText('GOLDEN', 0, -12)
  ctx.font = `400 34px ${FONT}`
  ctx.fillText('✋', 0, 30)
  ctx.restore()
}

/** Rarity ribbon over the panel's top-left corner. */
export function rarityRibbon(ctx, rarity) {
  if (rarity === 'common') return
  const legendary = rarity === 'legendary'
  ctx.save()
  ctx.translate(PANEL.x + 20, PANEL.y + 24)
  ctx.rotate(-0.12)
  ctx.font = `800 24px ${FONT}`
  const label = legendary ? '✨ LEGENDARY' : '★ RARE'
  const w = ctx.measureText(label).width + 32
  ctx.fillStyle = legendary ? COLORS.ink : COLORS.them
  ctx.beginPath()
  ctx.roundRect(0, 0, w, 44, 10)
  ctx.fill()
  ctx.fillStyle = legendary ? '#F7D36A' : '#fff'
  ctx.fillText(label, 16, 31)
  ctx.restore()
}

/** Headline block: small label + big title (max 2 lines). Returns the y below it. */
export function headline(ctx, label, title, y = 268) {
  ctx.fillStyle = 'rgba(29,27,25,.6)'
  ctx.font = `600 26px ${FONT}`
  ctx.fillText(label, TX, y)
  ctx.fillStyle = COLORS.ink
  ctx.font = `800 58px ${FONT}`
  y += 60
  for (const l of wrap(ctx, title, TW).slice(0, 2)) {
    ctx.fillText(l, TX, y)
    y += 62
  }
  return y
}

export function paragraph(ctx, text, y, { size = 24, maxLines = 2, color = 'rgba(29,27,25,.8)', weight = 400 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`
  ctx.fillStyle = color
  for (const l of wrap(ctx, text, TW).slice(0, maxLines)) {
    ctx.fillText(l, TX, y)
    y += size * 1.3
  }
  return y
}

/** Address lines at the bottom right: [[color, text], …] plus the footer. */
export function address(ctx, lines, footer) {
  let y = PH - 168
  ctx.font = `600 24px ${FONT}`
  for (const [c, t] of lines) {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(TX + 9, y - 8, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COLORS.ink
    ctx.fillText(t, TX + 30, y)
    ctx.strokeStyle = 'rgba(29,27,25,.2)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(TX, y + 16)
    ctx.lineTo(TX + TW, y + 16)
    ctx.stroke()
    y += 50
  }
  ctx.fillStyle = 'rgba(29,27,25,.55)'
  ctx.font = `400 20px ${FONT}`
  ctx.fillText(`${footer} · factorylabs.app/halfies`, TX, y + 6)
}

export function thumbnail(canvas, width = 240) {
  const t = document.createElement('canvas')
  t.width = width
  t.height = Math.round((canvas.height / canvas.width) * width)
  t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height)
  return t.toDataURL('image/jpeg', 0.72)
}

export async function sharePostcard(canvas, { title, text }) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) return
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const file = new File([blob], `halfies-${slug || 'postcard'}.png`, { type: 'image/png' })
  const full = `${text} Your turn → https://factorylabs.app/halfies/`
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: full })
      return
    } catch (e) {
      if (e.name === 'AbortError') return
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
