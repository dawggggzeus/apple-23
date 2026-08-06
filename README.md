# Birthday Wish App

A small interactive birthday experience: light candles → cut the cake → reveal a letter.

## Run it locally

Requires [Node.js](https://nodejs.org) (v18+) installed.

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (usually http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview
```

The build output goes to the `dist` folder — you can host that anywhere (Vercel, Netlify, GitHub Pages, or just open `dist/index.html` after building).

## Personalize it

Open `src/App.jsx` and edit near the top:

- `NAME` — her name
- `LETTER_LINES` — the final message (each string is a new line/paragraph)
- `CANDLE_COUNT` — how many candles to light
- `TARGET_DATE` — set to an ISO date (e.g. `"2026-08-15T00:00:00"`) to lock the app behind a countdown until then. Leave as `""` to skip the lock.
- `BIRTH_YEAR` — set to show "Turning X today" on the intro screen. Leave as `""` to skip.
- `SENDER_NAME` — signs the closing line of the letter (e.g. `"Alex"`, `"Your favorite person"`).
- `BONUS_LINES` — an array of messages revealed when she cracks open the surprise egg; one is picked at random each time. Add, remove, or edit any of them.

## Features

- **Background music** — a soft ambient pad, synthesized live with the Web Audio API (no audio files needed). Toggle with the note icon, top right.
- **Sound effects** — candle blow, cake cut, confetti pop, and a closing chime, all synthesized the same way.
- **Haptic feedback** — a subtle vibration on candle blows, the cake cut, replay, confetti, and the surprise egg (phones with vibration support only).
- **Make a wish** — an optional text step before the candles; if she types something, it's echoed back in the letter and included in the downloaded keepsake.
- **Floating balloons** — ambient decoration drifting up behind the card.
- **Light / dark theme toggle** — sun/moon icon, top right.
- **Countdown lock** — optional, via `TARGET_DATE` above.
- **Staggered entrance & step transitions** — the intro fades in piece by piece, and each step (candles → cake → letter) transitions in smoothly instead of swapping instantly.
- **Letter design** — a distinct paper panel, wax-seal emblem, ornamental divider, drop cap, and a signed closing.
- **Surprise egg** — after the letter, a gently wobbling egg needs 3 taps to crack. On the final tap: a golden light burst, a scatter of small particles, a toy capsule bounces out, then a random bonus line fades in (`BONUS_LINES` — 3 variants, one picked at random each time).
- **Cake → confetti transition** — once fully sliced, the cake visually crumbles into shards that hand off into the confetti burst on the letter screen, instead of a plain fade between steps.
- **Kinder Joy-inspired palette** — the wax seal and surprise egg carry a warm red/gold/cream color language.
- **Malayali touches** — a Malayalam greeting ("ജന്മദിനാശംസകൾ") on the intro screen, a Malayalam signature ("സ്നേഹത്തോടെ") closing the letter, a nilavilakku (traditional brass lamp) in place of Western candles, pookalam-inspired flower-petal confetti, a kasavu-style gold trim on the card border, an ambient backdrop of palm trees and a slowly walking elephant silhouette, and (if `TARGET_DATE` is set) a Vishukkani-framed countdown with a golden "first sight" flash on unlock.
- **Replay button** — resets the whole experience from the letter screen.
- **More confetti** — tap the sparkle on the letter screen to relaunch the confetti burst any time.
- **Save keepsake** — downloads the letter (including the wish line, if any) as a `.txt` file.
- **Tab title, favicon & link preview** — set in `index.html`; update the title and `og:title`/`og:description` there to match if you change `NAME` in `App.jsx`, so shared links preview correctly.

All animations respect `prefers-reduced-motion` for accessibility.
