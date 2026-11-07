# Halfies

**You draw half a creature. A total stranger draws the other half.**

Play: https://factorylabs.app/halfies/

1. Press **Find my other half** — no sign-up, no profile.
2. You're matched with a random stranger and get a theme ("a creature that lives in a volcano").
3. One of you draws the top half, the other the bottom. You only see a thin strip of their half at the seam.
4. After 60 seconds the halves are revealed together, your creature gets a name, and you both get a postcard.
5. High-five each other in time and the postcard turns gold. Share it, or go again.

No chat, ever — strangers only talk through the drawing. If nobody else is online, a **ghost** (a pre-drawn partner) draws the other half so you're never stuck waiting.

## How it works

- A static site on GitHub Pages — plain HTML, CSS and ES modules, no build step.
- Players find each other peer-to-peer over WebRTC using [Trystero](https://github.com/dmotz/trystero) (signaling via public Nostr relays). There is no game server; drawings go directly between the two browsers.
- Your collection of postcards (the "passport") lives only in your browser's localStorage.
- The postcard shows only a coarse city taken from your browser's time zone — no IP lookup.

## Develop

```bash
node tools/serve.mjs   # http://localhost:8123 (no-cache static server)
```

Open it in two tabs to play against yourself. Add `?debug` to the URL to get `window.halfies` in the console.

To update the bundled Trystero (`vendor/trystero.js`):

```bash
cd tools && npm install && npm run vendor
```

## Files

| Path | What |
| --- | --- |
| `index.html`, `style.css` | All screens and styling |
| `js/main.js` | Game flow: matching → card → drawing → reveal → postcard |
| `js/net.js` | Lobby, matchmaking handshake, partner messages |
| `js/board.js` | Drawing canvas, seam/peek logic, rendering |
| `js/ghosts.js` | Procedural pre-drawn partners |
| `js/postcard.js` | Postcard rendering and sharing |
| `js/words.js` | Themes and creature names |
