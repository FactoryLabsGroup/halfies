import { paint, W, H, COLORS } from './board.js'

const PW = 1200
const PH = 880
const FONT = '"Bricolage Grotesque", ui-rounded, system-ui, sans-serif'

let fontsReady = null
function loadFonts() {
  fontsReady ||= Promise.all([
    document.fonts.load(`800 60px ${FONT}`),
    document.fonts.load(`600 28px ${FONT}`),
    document.fonts.load(`400 24px ${FONT}`),
  ]).catch(() => {})
  return fontsReady
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = t
  }
  if (line) lines.push(line)
  return lines
}

/**
 * info: { name, theme, role, myCity, partnerCity, ghost, gold, seconds, date }
 */
export async function renderPostcard(strokes, info) {
  await loadFonts()
  const cv = document.createElement('canvas')
  cv.width = PW
  cv.height = PH
  const ctx = cv.getContext('2d')

  // card
  if (info.gold) {
    const g = ctx.createLinearGradient(0, 0, PW, PH)
    g.addColorStop(0, '#FFE8A3')
    g.addColorStop(0.5, '#F7D36A')
    g.addColorStop(1, '#F2B705')
    ctx.fillStyle = g
  } else ctx.fillStyle = COLORS.paper
  ctx.fillRect(0, 0, PW, PH)

  // perforated edge
  ctx.strokeStyle = 'rgba(29,27,25,.35)'
  ctx.lineWidth = 3
  ctx.setLineDash([2, 12])
  ctx.lineCap = 'round'
  ctx.strokeRect(18, 18, PW - 36, PH - 36)
  ctx.setLineDash([])

  // drawing
  const dw = 570, dh = (dw * H) / W, dx = 50, dy = (PH - dh) / 2
  ctx.save()
  ctx.translate(dx, dy)
  ctx.scale(dw / W, dh / H)
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 24)
  ctx.clip()
  paint(ctx, strokes, { guides: false })
  ctx.restore()
  ctx.lineWidth = 4
  ctx.strokeStyle = COLORS.ink
  ctx.beginPath()
  ctx.roundRect(dx, dy, dw, dh, 18)
  ctx.stroke()

  // divider
  ctx.strokeStyle = 'rgba(29,27,25,.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(670, 70)
  ctx.lineTo(670, PH - 70)
  ctx.stroke()

  // stamp
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

  // postmark
  ctx.save()
  ctx.translate(sx - 10, sy + 120)
  ctx.rotate(-0.25)
  ctx.strokeStyle = info.gold ? 'rgba(29,27,25,.55)' : 'rgba(46,91,255,.6)'
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, 62, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, 50, 0, Math.PI * 2)
  ctx.stroke()
  ctx.font = `600 15px ${FONT}`
  ctx.fillText(info.date, 0, 5)
  ctx.font = `800 13px ${FONT}`
  ctx.fillText('MADE WITH', 0, -18)
  ctx.fillText('A STRANGER', 0, 28)
  ctx.restore()

  // text block
  const tx = 715, maxW = 430
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(29,27,25,.6)'
  ctx.font = `600 26px ${FONT}`
  ctx.fillText('Meet', tx, 300)
  ctx.fillStyle = COLORS.ink
  ctx.font = `800 62px ${FONT}`
  let y = 362
  for (const l of wrap(ctx, info.name + '!', maxW).slice(0, 3)) {
    ctx.fillText(l, tx, y)
    y += 64
  }
  ctx.font = `400 26px ${FONT}`
  ctx.fillStyle = 'rgba(29,27,25,.8)'
  y += 6
  for (const l of wrap(ctx, `A creature that ${info.theme}.`, maxW).slice(0, 3)) {
    ctx.fillText(l, tx, y)
    y += 34
  }

  // address lines
  const lines = info.role === 'top'
    ? [[COLORS.me, `Top half · you, ${info.myCity}`], [COLORS.them, info.ghost ? 'Bottom half · a ghost 👻' : `Bottom half · ${info.partnerCity}`]]
    : [[COLORS.them, info.ghost ? 'Top half · a ghost 👻' : `Top half · ${info.partnerCity}`], [COLORS.me, `Bottom half · you, ${info.myCity}`]]
  let ay = PH - 190
  ctx.font = `600 24px ${FONT}`
  for (const [c, t] of lines) {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(tx + 9, ay - 8, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COLORS.ink
    ctx.fillText(t, tx + 30, ay)
    ctx.strokeStyle = 'rgba(29,27,25,.2)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(tx, ay + 16)
    ctx.lineTo(tx + maxW, ay + 16)
    ctx.stroke()
    ay += 52
  }
  ctx.fillStyle = 'rgba(29,27,25,.55)'
  ctx.font = `400 20px ${FONT}`
  ctx.fillText(`drawn in ${info.seconds}s · factorylabs.app/halfies`, tx, ay + 8)

  if (info.gold) {
    ctx.save()
    ctx.translate(dx + dw - 18, dy + dh - 30)
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
  return cv
}

export function thumbnail(canvas, width = 240) {
  const t = document.createElement('canvas')
  t.width = width
  t.height = Math.round((canvas.height / canvas.width) * width)
  t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height)
  return t.toDataURL('image/jpeg', 0.72)
}

export async function sharePostcard(canvas, name) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) return
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const file = new File([blob], `halfies-${slug || 'creature'}.png`, { type: 'image/png' })
  const text = `I drew half a creature with a total stranger 🙈 Meet ${name}! Your turn → https://factorylabs.app/halfies/`
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
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
