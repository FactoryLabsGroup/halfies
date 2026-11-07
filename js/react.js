// Emoji reactions — the only way strangers "talk". Mine float up on the left, theirs on the right.
import { $ } from './util.js'

export const EMOJIS = ['😂', '😱', '😍', '🤔']
export const PHRASES = ['haha!', 'nice!', 'what is that?!', 'genius', 'oops', 'again?']

export function reactsMarkup(withPhrases = false) {
  const btns = EMOJIS.map((e) => `<button class="react" data-react="${e}" aria-label="React ${e}">${e}</button>`).join('')
  return btns + (withPhrases ? `<button class="react more" data-phrases aria-label="Quick phrases">💬</button>` : '')
}

export function floatReaction(content, mine) {
  const el = document.createElement('span')
  const isEmoji = EMOJIS.includes(content)
  el.className = `float ${mine ? 'mine' : 'theirs'}${isEmoji ? '' : ' phrase'}`
  el.textContent = content
  el.style.left = (mine ? 6 + Math.random() * 30 : 58 + Math.random() * 30) + 'vw'
  el.style.setProperty('--drift', (Math.random() - 0.5) * 80 + 'px')
  $('#floats').appendChild(el)
  setTimeout(() => el.remove(), 2600)
}
