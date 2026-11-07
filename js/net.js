// Serverless matchmaking: every open page joins one lobby room over WebRTC
// (signaling via public Nostr relays). Waiting players pair up with a tiny
// invite/answer handshake; game messages then go only to your partner.
import { joinRoom, selfId } from '../vendor/trystero.js'
import { randId, randSeed } from './util.js'

const APP_ID = 'factorylabs.app/halfies'
const LOBBY = 'lobby-v1'
const INVITE_TIMEOUT = 4000

export function createNet({ onCount, onMatch, onGame, onPartnerLeft }) {
  const room = joinRoom({ appId: APP_ID, relayConfig: { warnOnRelayFailure: false } }, LOBBY)
  const waiting = new Set()
  const blocked = new Set()
  const cooldown = new Map()
  let state = 'idle' // idle | waiting | pending | matched
  let pendingTo = null
  let pending = null
  let pendingTimer = 0
  let retryTimer = 0
  let partner = null
  let lastPartner = null
  let matchId = null

  const st = room.makeAction('st')
  const inv = room.makeAction('inv')
  const ans = room.makeAction('ans')
  const game = room.makeAction('g')

  const lookingNow = () => state === 'waiting' || state === 'pending'
  const count = () => onCount(Object.keys(room.getPeers()).length + 1)
  const announce = () => st.send({ w: lookingNow() }).catch(() => {})

  room.onPeerJoin = (id) => {
    st.send({ w: lookingNow() }, { target: id }).catch(() => {})
    count()
  }

  room.onPeerLeave = (id) => {
    waiting.delete(id)
    count()
    if (state === 'pending' && id === pendingTo) {
      clearTimeout(pendingTimer)
      pendingTo = null
      state = 'waiting'
      tryInvite()
    }
    if (id === partner) partnerGone()
  }

  st.onMessage = (d, { peerId }) => {
    if (d && d.w) waiting.add(peerId)
    else waiting.delete(peerId)
    tryInvite()
  }

  // Only the lower id invites, so two peers never invite each other at once.
  function tryInvite() {
    if (state !== 'waiting') return
    const now = Date.now()
    const candidates = [...waiting].filter((id) => id > selfId && !blocked.has(id))
    const options = candidates.filter((id) => !((cooldown.get(id) || 0) > now))
    if (!options.length) {
      // Someone is only cooling down — try them again once the cooldown ends.
      const next = Math.min(...candidates.map((id) => cooldown.get(id) || Infinity))
      clearTimeout(retryTimer)
      if (Number.isFinite(next)) retryTimer = setTimeout(tryInvite, next - now + 50)
      return
    }
    const id = options[Math.floor(Math.random() * options.length)]
    state = 'pending'
    pendingTo = id
    pending = { m: randId(10), seed: randSeed() }
    inv.send(pending, { target: id }).catch(() => {})
    pendingTimer = setTimeout(() => {
      if (state === 'pending' && pendingTo === id) {
        cooldown.set(id, Date.now() + 5000)
        pendingTo = null
        state = 'waiting'
        tryInvite()
      }
    }, INVITE_TIMEOUT)
  }

  inv.onMessage = (d, { peerId }) => {
    if (!d || typeof d.m !== 'string') return
    const ok = state === 'waiting' && !blocked.has(peerId)
    ans.send({ m: d.m, ok, b: blocked.has(peerId) ? 1 : 0 }, { target: peerId }).catch(() => {})
    if (!ok) return
    state = 'matched'
    partner = lastPartner = peerId
    matchId = d.m
    announce()
    onMatch({ partner: peerId, seed: d.seed >>> 0, initiator: false })
  }

  ans.onMessage = (d, { peerId }) => {
    if (!d) return
    if (state === 'pending' && peerId === pendingTo && d.m === pending.m) {
      clearTimeout(pendingTimer)
      pendingTo = null
      if (d.ok) {
        state = 'matched'
        partner = lastPartner = peerId
        matchId = d.m
        announce()
        onMatch({ partner: peerId, seed: pending.seed, initiator: true })
      } else {
        if (d.b) blocked.add(peerId) // they skipped us earlier — don't keep knocking
        cooldown.set(peerId, Date.now() + 3000)
        state = 'waiting'
        tryInvite()
      }
    } else if (d.ok) {
      // They accepted an invite we already gave up on — tell them it's off.
      game.send({ t: 'bye', m: d.m }, { target: peerId }).catch(() => {})
    }
  }

  game.onMessage = (d, { peerId }) => {
    if (!d || peerId !== partner) return
    if (d.t === 'bye') {
      if (d.m === matchId) partnerGone()
      return
    }
    onGame(d)
  }

  function partnerGone() {
    if (!partner) return
    partner = null
    onPartnerLeft()
  }

  addEventListener('pagehide', () => room.leave())

  return {
    startWaiting() {
      if (state === 'matched') this.endMatch()
      state = 'waiting'
      announce()
      tryInvite()
    },
    stopWaiting() {
      if (state === 'pending') {
        clearTimeout(pendingTimer)
        pendingTo = null
      }
      if (state !== 'matched') {
        state = 'idle'
        announce()
      }
    },
    isPending: () => state === 'pending',
    debug: () => ({ selfId, state, partner, waiting: [...waiting], blocked: [...blocked], peers: Object.keys(room.getPeers()) }),
    send(d) {
      if (partner) game.send(d, { target: partner }).catch(() => {})
    },
    endMatch({ block = false } = {}) {
      if (block && lastPartner) blocked.add(lastPartner)
      if (partner) {
        game.send({ t: 'bye', m: matchId }, { target: partner }).catch(() => {})
      }
      partner = null
      matchId = null
      if (state === 'matched') {
        state = 'idle'
        announce()
      }
    },
  }
}
