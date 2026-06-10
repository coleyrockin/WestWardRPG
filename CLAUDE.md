# WestWardRPG — Project Guide

Story-first western RPG rendered as a low-poly graphic novel — Three.js + Blender-authored
models + a cel/ink NPR pipeline. **One renderer, one game.** The legacy Canvas raycaster was
deleted 2026-06-10 (`refactor!: delete the Canvas game`); if old docs/commits mention
`src/main.js` or a "behavioral oracle", that world is gone.
Deep dives: `docs/roadmap.md` (direction — single source of truth),
`docs/3d-art-direction.md` (the look), `docs/map-editing-guide.md` (the world map).

## Run & verify
- Node 22. `npm run dev` (Vite) → open `/` — that's the game.
- Gate (keep green, run before every commit): `npx vitest run` (~536 tests / 52 files),
  `npx tsc --noEmit`, `npx vite build` (the chunk-size warning is expected).
- Browser gates (need a dev server): `npm run test:render3d` (first-road loop smoke),
  `npm run test:visual` (golden-image pixelmatch — baseline warning below).
- Push to `main` → Vercel auto-deploys the game.

## Where things live
- `index.html` — the game shell (HUD DOM, title screen) → boots `src/render3d/spike.js`.
- `src/render3d/spike.js` — scene assembly, render loop, and all the building/prop builders.
- `src/render3d/` — gameState (RPG state tree), phaseState (first-road loop FSM),
  playerController, encounterSystem, boardModal/boardDom/boardCopy (job board),
  audioView (Web Audio layer), interactionSystem, atmosphere, timeOfDay, worldProxies
  (collision; a `null` footprint = walk-through), frontierLayout (the **world map**:
  coordinate arrays; `+x` = east, `+y` = south, hero ≈ 1.8u tall),
  combat/ (playerCombat, slimeBehavior, hitFx).
- `src/` (top level) — renderer-agnostic engine modules the game imports: jobBoard,
  lootSystem, progressionSystem, npcMemory, gearCrafting, poiSystem, storyContent,
  savePersistence (IndexedDB saves), inventoryState, characterIdentity… Pure logic,
  unit-tested. **Reuse them, don't reimplement.**
- `src/game/renderer/` — assetManifest/assetLoader (`.glb` pipeline: `scale` × placement
  `size`, plus `heightMul`/`scaleY` to grow tall without widening footprint),
  createRenderer, postStacks (bloom / Sobel ink / grade / split-tone),
  materials/nprMaterial (the cel shader). `src/game/world/` — ground, water, scatter,
  weather, townsfolk, worldClock.
- **Buildings are procedural**: `buildWesternBuilding` + `WESTERN_SPECS` in spike.js
  (false-fronts, board-and-batten siding, porches, framed windows, signs) — the box `.glb`s
  are bypassed for these kinds.
- Models: `public/models/*.glb`, authored in Blender via `tools/blender/` (Blender MCP at
  `localhost:9876`).

## Gotchas that waste hours
- **HMR is broken in the game page.** Always hard-reload: `location.href = '/?n=' + Date.now()`.
- **The dev/preview tab is THROTTLED.** Screenshots show *static composition only* — motion,
  the spawn push-in, weather, and combat do **not** animate, and synthetic keypresses don't
  reach the game (pointer-lock). Judge motion/feel/fidelity in a **real browser**.
- **Inspect any beat without driving:** `window.__spike.setPos(x, y)` / `.goto('roadSlime')`
  — a teleport reseeds the follow-cam to gameplay framing; screenshot to force a frame.
- **The `?visual` golden-image baseline pins DUSK.** Do **not** change tone mapping
  (`createRenderer.js`), output color space, or the dusk palette without re-blessing the
  pixelmatch baseline (`npm run test:visual:update`) — you'll silently break CI.
- WebGL2 fallback quirks: no lines/points/instanced/shared-materials — use regular meshes +
  per-mesh materials.

## Guardrails — don't break these
- **Layout tests** (`render3d-frontier-layout.test.ts`): `firstFrameSlabBlockers` must stay
  `[]` — keep the spawn→board camera wedge (x[9.5–16], y[6.5–11]) clear of tall buildings;
  there are floors on natural clusters / planks / production props. Changing a count on
  purpose? Update the expected value in the same commit.
- **Don't move `HERO_OBJECTS`** (jobBoard, smokeCache, slimeTell, roadSlime, brokenWagon, …)
  without updating `FIRST_FIVE_ROUTE` — gameplay beats (`phaseState.js`) trigger on reaching
  them by `kind`.

## Art direction (one line)
Low-poly graphic novel — *Oblivion meets Weird West meets an inked comic*. **Lean into the
illustration, away from realism.** "Great" = confident silhouettes + warm-key/cool-shadow
light + the cel/ink render — NOT more polygons or photoreal. Full spec: `docs/3d-art-direction.md`.
