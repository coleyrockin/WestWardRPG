# RUSTWATER (working codename) — Project Guide

A **cyberpunk-western open-world RPG**: *Red Dead* geography, *Cyberpunk* flesh, *Fable*
bones. You play Ezra Cross, who inherits the largest water-and-land empire in the Meridian
Territory in the first hour — and spends the game finding out what it costs.
**The design canon is [`docs/rustwater-treatment.md`](docs/rustwater-treatment.md)** (owner-
authored, v0.1); the engine plan that implements it is
[`docs/roadmap.md`](docs/roadmap.md); pick-up-here state lives in
[`docs/NEXT-AGENT.md`](docs/NEXT-AGENT.md).

**How we get there: progressive re-skin, never a restart.** The shipped WestWard engine +
Dustward world are RUSTWATER's substrate — Dustward evolves into Calico Flats, the bounty
loop into Tally/bounty-office content, and every renderer-agnostic system (jobBoard, quest
runtime, shops, NPC memory, progression, saves) extends in place. The game stays playable
at every commit. The public title stays **WestWard** until the cyberpunk-western vertical
slice exists (owner decision 2026-06-11) — don't rename UI/title/README ahead of it.

**One renderer, one game.** Three.js WebGPURenderer + TSL + Blender-authored `.glb` models
+ a cel/ink NPR pipeline. The legacy Canvas raycaster was deleted 2026-06-10; if old docs
mention `src/main.js`, that world is gone. Aesthetic direction bends toward the treatment's
rule — **"nothing is sleek"**: sun-bleached chrome, neon on clapboard — built ON the
existing NPR/lamp/emissive systems. Composition fundamentals: `docs/3d-art-direction.md`.

## ⚡ M0 perf doctrine (read before adding world content)
The game is draw-call-bound (~3k+ unbatched meshes, per-mesh materials — a WebGL2-fallback
constraint). Milestone M0 (`docs/roadmap.md`) requires WebGPU, demotes the fallback to
reduced fidelity, and batches the world. **Until M0 lands: do not add mass content that
creates per-mesh materials** (scatter/flora/particle swarms); single hero objects are fine.

## Run & verify
- Node 22. `npm run dev` (Vite) → open `/` — that's the game.
- **`npm run play`** — one-command build + serve at `http://127.0.0.1:5191/` (the owner's
  play server; rerun it after any reboot).
- Gate (keep green, run before every commit): `npx vitest run` (~693 tests),
  `npx tsc --noEmit`, `npx vite build` (the chunk-size warning is expected).
- Browser gates (need a dev server): `npm run test:render3d` (first-road loop smoke),
  `npm run test:visual` (golden-image pixelmatch — baseline warning below).
- Push to `main` → Vercel auto-deploys the game (live: westward-rpg.vercel.app).

## Where things live
- `index.html` — the game shell (HUD DOM, title screen) → boots `src/render3d/spike.js`.
- `src/render3d/spike.js` — scene assembly, render loop, and all the building/prop builders.
- `src/render3d/` — gameState (RPG state tree: player/inventory/progression/jobs/npcMemory),
  phaseState (first-road loop FSM), questRuntime (generic quest targets/prompts/objectives),
  playerController (shoulder cam), encounterSystem, boardModal/boardDom/boardCopy (job
  board — THE modal pattern to clone for new UI), audioView, interactionSystem, atmosphere,
  timeOfDay (day/goldenHour/dusk/night + sunArc), worldProxies (collision; a `null`
  footprint = walk-through), frontierLayout (the **world map**: coordinate arrays;
  `+x` = east, `+y` = south, hero ≈ 1.8u tall), combat/.
- `src/` (top level) — renderer-agnostic engines RUSTWATER systems extend: jobBoard
  (→ missions/bounty office), shopCatalog + economyServices (→ businesses), lootSystem,
  progressionSystem (→ GUN/IRON/WIRE/TONGUE/TRAIL trees), npcMemory (→ relationships/
  romance), gearCrafting (→ augments), poiSystem, storyContent, savePersistence (IndexedDB
  ironman), inventoryState… Pure logic, unit-tested. **Reuse them, don't reimplement.**
- `src/game/renderer/` — assetManifest/assetLoader (`.glb` pipeline: `scale` × placement
  `size`, plus `heightMul`/`scaleY`), createRenderer, postStacks (bloom / Sobel ink /
  godrays / grade), materials/nprMaterial (hybrid 5-step cel + classic cel3).
  `src/game/world/` — ground (exports `biomeAt`), water, scatter, weather, townsfolk,
  worldClock (day/night arc; boots at day).
- **Buildings are procedural**: `buildWesternBuilding` + `WESTERN_SPECS` in spike.js, plus
  landmark builders (church/hotel/waterTower/blacksmith/windmill/townGate/walk-in saloon).
- Models: `public/models/*.glb`, authored in Blender via `tools/blender/` (Blender MCP at
  `localhost:9876`; `westward_kit.py` has the texture-bake pipeline — characters prove
  textured-cel end-to-end).

## Gotchas that waste hours
- **HMR is broken in the game page.** Always hard-reload: `location.href = '/?n=' + Date.now()`.
- **The dev/preview tab is THROTTLED.** Screenshots show *static composition only* — motion,
  weather, and combat do **not** animate, and synthetic keypresses don't reach the game
  (pointer-lock). Judge motion/feel/perf in a **real foreground browser**. `__spikeReady`
  lags in occluded tabs even when the module is fully loaded.
- **Inspect any beat without driving:** `window.__spike.setPos(x, y)` / `.goto('roadSlime')`
  / `.captureMode()`; `window.__westward3dTest.setTimeOfDay("day")` pins a palette.
- **The `?visual` golden-image baseline pins DUSK.** Do **not** change tone mapping
  (`createRenderer.js`), output color space, or the dusk palette without re-blessing
  (`npm run test:visual:update`) — eyeball the new baseline before committing it.
- WebGL2 fallback quirks (until M0 demotes it): no lines/points/instanced/shared-materials/
  hand-built indexed geometry — regular meshes + per-mesh materials.
- **The save persists the world clock** — "it boots dark" usually means an old save; fresh
  runs boot at day. `indexedDB.deleteDatabase('westward')` for a true fresh start.
- The security test scans DOM modules for parser sinks — build UI with
  `createElement`/`textContent` only (`boardDom.js` is the pattern).

## Guardrails — don't break these
- **Layout tests** (`render3d-frontier-layout.test.ts`): `firstFrameSlabBlockers` must stay
  `[]` — keep the spawn→board camera wedge (x[9.5–16], y[6.5–11]) clear of tall buildings;
  density floors only rise. Changing a count on purpose? Update the expected value in the
  same commit.
- **Don't move `HERO_OBJECTS`** without updating `FIRST_FIVE_ROUTE` — gameplay beats
  (`phaseState.js`) trigger on reaching them by `kind`, and `render3d-phase-state.test.ts`
  is the tripwire. The first-road loop remains the playable spine until M1's missions
  replace it beat-for-beat.
- **Tests are sacred.** Adjust expectations in the same commit; never delete coverage.

## Art direction (one line)
Low-poly graphic-novel western with rusted chrome growing through it — confident
silhouettes, warm-key/cool-shadow light, the cel/ink render, and **nothing sleek**.
Full spec: `docs/3d-art-direction.md` + the treatment's WORLD section.
