# WestWard

A story-first western RPG rendered as a low-poly graphic novel — *Oblivion meets Weird West meets an inked comic* — built entirely in Three.js and playable in the browser.

[![QA](https://github.com/coleyrockin/WestWardRPG/actions/workflows/qa.yml/badge.svg)](https://github.com/coleyrockin/WestWardRPG/actions/workflows/qa.yml)
![Tests](https://img.shields.io/badge/tests-1252_passing-6E9F18?style=flat&logo=vitest&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r184-000000?style=flat&logo=threedotjs)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)

**[▶ Play now](https://westward-rpg.vercel.app)** · [Latest release](https://github.com/coleyrockin/WestWardRPG/releases/latest) · [Roadmap](ROADMAP.md)

---

![Dustward town at golden hour — road, lanterns, western buildings](docs/images/launch-town-dusk.png)

---

## What this is

Most indie RPGs are systems demos — procedural dungeons, a combat sandbox, loot tables — with a thin story bolted on at the end. WestWard inverts that. The **three ideology axes**, **8-quest chain**, **faction reputation**, **NPC memory**, and **10+ endings** are the product. Combat and the economy exist to put pressure on decisions; they're the stakes, not the point.

The renderer is a **NPR cel-shader** (WebGPU + TSL, WebGL2 fallback): ink edges from depth discontinuity, flat cel banding, per-region post stacks, a continuous day/night arc. The visual direction is committed — low-poly + graphic-novel illustration, not photoreal. That's a deliberate tradeoff: confident silhouettes and dramatic light are achievable at this scale where photorealism never will be.

The Canvas raycaster (`index.html`) still ships and runs the full game — 7 enemy archetypes, 3 factions, 18 POIs, gear crafting, NG+. It's the **behavioral oracle**: its renderer-agnostic modules and ~1,250 tests are being ported into the 3D build, after which the raycaster retires.

---

## Installation

Node 22 required (matches CI).

```bash
git clone https://github.com/coleyrockin/WestWardRPG.git
cd WestWardRPG
npm ci
npm run dev
```

Open the Vite URL. For the 3D build specifically, navigate to `spikes/render3d.html`.

---

## Usage

### Playing the 3D build

The opening drops you into Dustward at golden hour. Walk east down the main road:

1. Find **Marshal Boone's job board** at the board plaza
2. Follow the **Marsh Slime Bounty** east toward the smoke cache
3. Fight the road slime in the marsh clearing
4. Salvage the **broken wagon** for map scrap
5. Return to Boone

That's the authored first-road loop — the current 3D showcase.

### Dev tooling

The `window.__spike` harness is available from the browser console:

```js
__spike.goto('roadSlime')     // teleport to a beat
__spike.setPos(x, y)          // place hero at world coords
__spike.setPalette({ grade: { splitStrength: 0.6 } })  // live palette tweak
__spike.setLight('sun', { intensity: 3.0 })
__spike.captureMode()         // freeze clock + weather for screenshots
__spike.dumpLook()            // print current lighting/grade as JSON
```

### Verification gate

Run before every commit:

```bash
npm test && npm run typecheck:ts && npm run test:syntax && npm run dev:lint && npm run build
```

With a dev server running:

```bash
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d
npm run test:visual   # pixelmatch golden-image check (dusk palette pinned)
```

### Offline / itch.io build

```bash
npm run package:itch  # → releases/westward-rpg-offline-v1.0.0.zip
```

Unzip and open `index.html` — no server needed.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Renderer | Three.js r184, `WebGPURenderer` + TSL | One shader graph → WGSL and GLSL from the same source; WebGL2 fallback keeps itch.io/older GPUs running |
| Build | Vite 6 | Fast HMR for a single-file 11k-line scene; dual entry (`index.html` + `render3d.html`) |
| Tests | Vitest 4, `environment: "node"` | Pure logic modules tested headless; no jsdom, no WebGL in tests |
| Types | TypeScript (noEmit check only) | Type-checks the shell layer; pure JS modules stay lean |
| Smoke | Playwright + custom scripts | Golden-path loop, save-recovery, visual regression |
| Language | Plain JS + TypeScript | No framework. The renderer is the framework. |
| Deploy | Vercel (auto on push to `main`) | Zero config; `vercel.json` handles CSP + static caching |

The NPR shader stack: `nprMaterial.js` (TSL cel ramp + Fresnel rim), `postStacks.js` (Sobel ink edges + bloom + split-tone grade + vignette), `atmosphere.js` (sky dome + lights + fog, palette-driven), `timeOfDay.js` (dusk / goldenHour / night palettes + `sunArc` continuous arc).

---

## Project structure (abbreviated)

```
src/
├── render3d/          ← 3D engine (the active build)
│   ├── spike.js       ← scene assembly, render loop, all builders
│   ├── frontierLayout.js  ← world map: coordinates, beat route
│   ├── atmosphere.js  ← sky, lights, fog (palette-driven)
│   ├── timeOfDay.js   ← palettes + sunArc
│   └── worldProxies.js  ← collision AABBs
├── game/
│   ├── renderer/      ← materials, post stacks, asset pipeline
│   └── world/         ← ground, water, scatter
├── main.js            ← Canvas raycaster (behavioral oracle, ships today)
├── combatProcessor.js ← combat math (pure, Tier-B port target)
├── decisionEngine.js  ← ending resolution (pure, Tier-A port target)
└── [30+ renderer-agnostic modules]
docs/
├── roadmap.md         ← technical execution roadmap (dev-facing)
├── 3d-art-direction.md
└── superpowers/plans/ ← scoped execution plans
tests/                 ← 1252 Vitest tests across 117 files
```

---

## Controls

`WASD` — move · Mouse — look (pointer lock) · `E` / Enter — interact · Space / LMB — attack · `C` / RMB — block · `Q` — potion · `X` — dodge · `M` — map · `F` — fullscreen · `G` — travel

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: run `npm run qa` before opening a PR, keep modules pure (no WebGL/DOM in unit-tested files), and don't grow `src/main.js` — it's the oracle, not the future.

---

## License

MIT — see [LICENSE](LICENSE).
