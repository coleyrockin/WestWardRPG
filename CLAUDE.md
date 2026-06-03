# WestWardRPG — Project Guide

Story-first western RPG. **Read this fully before touching code — it prevents the
mistakes that cost hours.** Deep dives: `docs/roadmap.md` (direction — single source of
truth), `docs/3d-art-direction.md` (the look), `docs/map-editing-guide.md` (the world map).

## ⚠️ Two renderers, ONE direction — read this first
The repo has two renderers. This trips up every fresh agent:
- **`src/render3d/` (Three.js 3D) is THE committed direction.** Boots from
  `spikes/render3d.html` → `src/render3d/spike.js`. **New work goes here.**
- **`src/main.js` (11k-line Canvas raycaster) is LEGACY** — the behavioral oracle being
  ported *from*, retired as 3D reaches parity. It still ships at the live-site root
  (`index.html`). **Do not build new features in main.js, and do not grow it.**
- Renderer-agnostic gameplay modules (`jobBoard.js`, `combatProcessor.js`, `lootSystem.js`,
  `progressionSystem.js`, `npcMemory.js`, …) are shared and being ported — **reuse them,
  don't reimplement.**

## Run & verify
- Node 22. `npm run dev` (Vite) → open `/spikes/render3d.html` for the 3D build.
- Gate (keep green, run before every commit): `npx vitest run` (~1252 tests / 117 files),
  `npx tsc --noEmit`, `npx vite build` (the chunk-size warning is expected).
- Push to `main` → Vercel auto-deploys. render3d changes don't touch the live Canvas game.

## Where things live (3D build)
- `spike.js` — scene assembly, render loop, and all the building/prop builders.
- `frontierLayout.js` — the **world map**: coordinate arrays. `+x` = east, `+y` = south,
  hero ≈ 1.8u tall.
- `worldProxies.js` — collision (per-placement AABBs; a `null` footprint = walk-through).
- `assetManifest.js` / `assetLoader.js` — `.glb` pipeline (`scale` × placement `size`, plus
  `heightMul`/`scaleY` to grow tall without widening footprint).
- **Buildings are procedural**: `buildWesternBuilding` + `WESTERN_SPECS` in spike.js
  (false-fronts, board-and-batten siding, porches, framed windows, signs) — the box `.glb`s
  are bypassed for these kinds.
- Look: `timeOfDay.js` (palettes — the demo opens in **goldenHour**), `atmosphere.js`
  (sun / hemi fill / camera-side fill / fog), `postStacks.js` (bloom / Sobel ink / grade /
  split-tone), `nprMaterial.js` (the cel shader).

## Gotchas that waste hours
- **HMR is broken in the spike.** Always hard-reload: `location.href = '…?n=' + Date.now()`.
- **The dev/preview tab is THROTTLED.** Screenshots show *static composition only* — motion,
  the spawn push-in, weather, and combat do **not** animate, and synthetic keypresses don't
  reach the game (pointer-lock). Judge motion/feel/fidelity in a **real browser**.
- **Inspect any beat without driving:** `window.__spike.setPos(x, y)` / `.goto('roadSlime')`
  — a teleport reseeds the follow-cam to gameplay framing; screenshot to force a frame.
- **The `?visual` golden-image baseline pins DUSK.** Do **not** change tone mapping
  (`createRenderer.js`), output color space, or the dusk palette without re-blessing the
  pixelmatch baseline (`npm run test:visual`) — you'll silently break it.

## Guardrails — don't break these
- **Layout tests** (`render3d-frontier-layout.test.ts`): `firstFrameSlabBlockers` must stay
  `[]` — keep the spawn→board camera wedge (x[9.5–16], y[6.5–11]) clear of tall buildings;
  there are floors on natural clusters / planks / production props. Changing a count on
  purpose? Update the expected value in the same commit.
- **Don't move `HERO_OBJECTS`** (jobBoard, smokeCache, slimeTell, roadSlime, brokenWagon, …)
  without updating `FIRST_FIVE_ROUTE` — gameplay beats (`phaseState.js`) trigger on reaching
  them by `kind`.

## Art direction (one line)
Low-poly graphic novel — *Oblivion meets Weird West meets inked comic*. **Lean into the
illustration, away from realism.** "Great" = confident silhouettes + warm-key/cool-shadow
light + the cel/ink render — NOT more polygons or photoreal. Full spec: `docs/3d-art-direction.md`.
