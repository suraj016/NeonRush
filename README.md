# NEON RUSH: CYBER ESCAPE

A premium 3D endless runner for the browser. Sprint a three-lane neon highway, dodge barriers and laser gates, collect energy, and survive as the city accelerates.

The game is a static web app. It needs no API key, backend, or account.

## Stack

- React 19 + Vite
- Three.js
- Zustand + LocalStorage
- Vitest

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

Development server: Vite prints the local URL, usually `http://localhost:5173`.

## Controls

**Keyboard**

- `A` / Left Arrow: move left
- `D` / Right Arrow: move right
- `W` / Up Arrow / Space: jump
- `S` / Down Arrow: slide
- `Esc` / `P`: pause or resume

**Touch**

- Swipe left / right to change lanes
- Swipe up to jump
- Swipe down to slide

## Features

- Procedural recycling track with fair obstacle patterns
- Six hazard behaviours: solid barrier, low barrier, overhead laser, moving wall, spinner, lane gap
- Energy orbs plus Shield, Magnet, and Score Multiplier power-ups
- Missions, runner unlocks, settings, and local persistence
- Cyber City, Neon Tunnel, and Industrial Grid atmosphere shifts
- Keyboard and swipe controls
- Synthesized audio that starts after a user gesture

## Deployment

`npm run build` writes a static site to `dist/`.

- **Vercel:** import the repo. Build command `npm run build`, output `dist`. `vercel.json` already rewrites routes to `index.html`.
- **Netlify:** build command `npm run build`, publish `dist`. `netlify.toml` and `public/_redirects` are included.

No environment variables are required.

## Persistence

Progress is stored under `neon-rush-save-v1` in LocalStorage. Reset it from Settings.

## Tests run in this repo

- `npx tsc -b` — passed
- `npx oxlint` — passed
- `npx vitest run` — 17 tests passed
- `npm run build` — production build succeeded
- Preview server verified at `http://127.0.0.1:4173/` (HTML and image assets returned 200)

Interactive WebGL gameplay, swipe QA, and viewport visual QA were not automated here because no headed browser runner is configured in the project.

## Known limits

- Audio is synthesized in the Web Audio API. There are no streamed music files.
- Changing graphics quality mid-session updates resolution and particles, not the already-built building count.
- Theme shifts change fog, palette, and tunnel arches rather than swapping an entirely new city kit.

## License

Original game code and generated art in this repository are provided for this project.
