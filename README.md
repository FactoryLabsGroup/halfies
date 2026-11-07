# Halfies

**One minute. One total stranger. Make something weird together.**

Play: https://factorylabs.app/halfies/

Press **Find my other half** — no sign-up, no profile — and you're matched with a random stranger. A card flips to pick one of three activities:

- **Split Creature** — you draw the top half of a creature, they draw the bottom (you only see a thin strip of theirs). Googly-eye stickers, a surprise twist halfway through, then the creature comes alive, says its name, and gets trading-card stats and a rarity (rare / ✨ legendary). Adopt it and it moves into your zoo.
- **Mind Meld** — both type a word at the same time; keep going until you say the same one (6 tries).
- **Sync Grid** — both paint the same prompt on an 8×8 grid without seeing each other; get a % in sync.

Every round ends with a postcard you can share. High-five each other in time and it turns gold.

No free-text chat — strangers "talk" only through emoji reactions and a few preset phrases. If nobody else is online, a **ghost** (a pre-made partner) plays with you so you're never stuck waiting.

Your home screen keeps a **zoo** of adopted creatures, **stamps** you've earned, and a **live ticker** of what other players just made.

## How it works

- A static site on GitHub Pages — plain HTML, CSS and ES modules, no build step.
- Players find each other peer-to-peer over WebRTC using [Trystero](https://github.com/dmotz/trystero) (signaling via public Nostr relays). There is no game server; drawings go directly between the two browsers.
- Your collection of postcards (the "passport") lives only in your browser's localStorage.
- The postcard shows only a coarse city taken from your browser's time zone — no IP lookup.

## Develop

```bash
node tools/serve.mjs   # http://localhost:8123 (no-cache static server)
```

Open it in two tabs to play against yourself. Add `?debug` to the URL to get `window.halfies` in the console, and `?act=creature|meld|grid` to force an activity (both tabs need it).

To update the bundled Trystero (`vendor/trystero.js`):

```bash
cd tools && npm install && npm run vendor
```

## Files

| Path | What |
| --- | --- |
| `index.html`, `style.css` | All screens and styling |
| `js/main.js` | Shared flow: matching → card → activity → reveal (high-five, adopt, reactions, ticker) |
| `js/act-creature.js`, `js/act-meld.js`, `js/act-grid.js` | The three activities (setup, play, postcard) |
| `js/net.js` | Lobby, matchmaking handshake, partner messages, lobby news |
| `js/board.js` | Drawing canvas: seam/peek, googly eyes, twist effects, "alive" animation |
| `js/ghosts.js` | Procedural pre-drawn creature halves |
| `js/postcard.js` | Shared postcard frame and sharing |
| `js/passport.js`, `js/zoo.js` | Stats, stamps and the creature zoo (localStorage) |
| `js/react.js`, `js/sfx.js` | Emoji reactions / phrases, sound effects |
| `js/words.js` | Themes, names, twists, stats, word filter |
