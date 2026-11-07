// The home-screen zoo: every adopted creature wanders around and says hi when tapped.
import { sfx } from './sfx.js'

let walkers = []
let raf = 0
let box = null

export function renderZoo(el, list) {
  box = el
  cancelAnimationFrame(raf)
  walkers = []
  el.replaceChildren()
  if (!list.length) {
    const hint = document.createElement('p')
    hint.className = 'zoo-hint'
    hint.textContent = 'Adopt creatures and they’ll live here 🦕'
    el.appendChild(hint)
    return
  }
  const width = el.clientWidth || 320
  list.slice(-10).forEach((z, i) => {
    const w = document.createElement('div')
    w.className = 'walker' + (z.rarity === 'legendary' ? ' legendary' : z.rarity === 'rare' ? ' rare' : '')
    const img = new Image()
    img.src = z.img
    img.alt = z.name
    img.draggable = false
    const bubble = document.createElement('span')
    bubble.className = 'bubble'
    bubble.textContent = `Hi! I’m ${z.name}!`
    w.append(bubble, img)
    el.appendChild(w)
    const it = {
      el: w,
      x: Math.random() * Math.max(10, width - 70),
      vx: (0.25 + Math.random() * 0.45) * (Math.random() < 0.5 ? -1 : 1),
      phase: Math.random() * 6,
      jump: 0,
      pitch: 0.8 + ((i * 37) % 10) / 20,
      name: z.name,
    }
    w.addEventListener('click', () => {
      it.jump = 1
      w.classList.add('talk')
      sfx.babble(bubble.textContent, it.pitch)
      setTimeout(() => w.classList.remove('talk'), 1800)
    })
    walkers.push(it)
  })
  const step = (t) => {
    const width = box.clientWidth
    for (const it of walkers) {
      const w = it.el.offsetWidth || 60
      it.x += it.vx
      if (it.x < 0 || it.x > width - w) {
        it.vx *= -1
        it.x = Math.max(0, Math.min(width - w, it.x))
      }
      if (Math.random() < 0.002) it.vx *= -1
      it.jump = Math.max(0, it.jump - 0.03)
      const hop = Math.abs(Math.sin(t / 220 + it.phase)) * 6 + Math.sin(it.jump * Math.PI) * 40
      it.el.style.transform = `translate(${it.x}px, ${-hop}px)`
      it.el.querySelector('img').style.transform = `scaleX(${it.vx < 0 ? -1 : 1}) rotate(${Math.sin(t / 260 + it.phase) * 6}deg)`
    }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

export function pauseZoo() {
  cancelAnimationFrame(raf)
}
