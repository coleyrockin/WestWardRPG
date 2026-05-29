# WestWard — Next-Agent Handoff

Where the 3D rebuild stands and what to pick up next. Pairs with the systems plan
([`roadmap.md`](roadmap.md)) and the craft track ([`art-craft-roadmap.md`](art-craft-roadmap.md) +
[`art-bible.md`](art-bible.md)).

## What this is
The 3D game lives at **`/spikes/render3d.html`** → [`src/render3d/spike.js`](../src/render3d/spike.js)
(composition root) + **`src/game/`** (engine: `renderer/`, `world/`). The Canvas prototype
(`index.html` / `src/main.js`) is the **frozen behavioural oracle** — do not edit it; port its
*pure logic* (`npcMemory`, `patrolSystem`, `decisionEngine`, …) into `src/game/`.

## Done (live on main → Vercel)
- **NPR render path:** `WebGPURenderer` + TSL with a WebGL2 fallback
  ([`createRenderer.js`](../src/game/renderer/createRenderer.js)); cel+rim toon uber-material
  ([`nprMaterial.js`](../src/game/renderer/materials/nprMaterial.js)); depth-discontinuity **ink
  edges** + bloom + warm grade + film grain ([`postStacks.js`](../src/game/renderer/postStacks.js));
  continuous day/night arc.
- **Blender model set:** [`tools/blender/`](../tools/blender/) builders → `public/models/*.glb`,
  loaded + NPR-reskinned + instanced by [`assetLoader.js`](../src/game/renderer/assetLoader.js)
  (registry: [`assetManifest.js`](../src/game/renderer/assetManifest.js)). Full Frontier set
  (buildings, wagon, mesas ring, watchtower, lamps, job board, props), attached lights, dressing
  variation (`hashYaw`).
- **Living World slice 1 — elements:** `worldClock` (sun arcs), drifting clouds, TSL **animated
  water**, **weather** (rain/dust/wind/fog/lightning), terrain ground + scatter
  (`src/game/world/{worldClock,water,weather,ground,scatter}.js`).
- **Living World slice 2 — third-person character:** rigged drifter
  ([`build_character.py`](../tools/blender/build_character.py) → `character.glb`), skinned loader
  with Idle↔Walk crossfade ([`animatedCharacter.js`](../src/game/world/animatedCharacter.js)),
  third-person follow-cam ([`playerController.js`](../src/render3d/playerController.js)).
- **Living World slice 3 — townsfolk:** 5 ambient NPCs reusing the rig
  (`SkeletonUtils.clone` + per-instance mixer, per-NPC colour tint), wandering fixed town/road
  loops ([`townsfolk.js`](../src/game/world/townsfolk.js) + pure
  [`npcWander.js`](../src/game/world/npcWander.js)); frozen under `?visual`.

- **Art-craft Phase 2 — texture pipeline (proven):** embedded glTF textures sample on the WebGL2
  backend; `nprMaterial.js` takes a painted `map` (texture×tint → cel ramp); `assetLoader.js` +
  `animatedCharacter.js` carry glTF textures through. The drifter (`build_character.py` `_bake_albedo`)
  ships a UV-unwrapped, baked-weathering albedo embedded in `character.glb`. Texture sweep baked
  every non-emissive prop + the building kit (emissive kept flat via `export_glb(bake=…)`).
- **Richer detail:** drifter has a face/eyes + western gear; buildings are false-fronts (siding,
  framed windows + glass, door, sign).
- **6A props + variety:** wagon plank seams/spoked wheels, ribbed cactus, lantern cage, framed sign;
  `build_character` `variant` param (drifter/vendor/vest) → 3 `.glb`, townsfolk vary by variant +
  tint + height scale.
- **6B hero rig:** broader proportions + Run/Turn/Draw clips (Shift=run, F=draw);
  `animatedCharacter` idle→walk→run blend + `playOnce()` one-shots; `loadTemplate` caches per-URL.
- **6C interactive NPCs:** proximity → townsperson pauses, faces you, "E — Talk to <name>" →
  memory-aware greeting via the pure `npcMemory` module (names: Mabel/Cole/Rosa/Hank/Pearl).

## Pick up next (in order)
1. **Systems depth** ([`roadmap.md`](roadmap.md)): the deeper 6C alternative not yet done — drive the
   scene from the event-sourced [`sim.js`](../src/game/sim.js) (`stepSimulation`/`toRenderState`)
   instead of the legacy snapshot (render-decoupling P1 deliverable). Then NPC schedules/quests
   (port `patrolSystem`/`questDefinitions`/`decisionEngine`), combat (P2).
2. **Mixamo-hybrid hero** (deferred from 6B — Adobe-login-gated, needs user-supplied FBX): retarget
   a real humanoid + clip library onto the rig for higher-fidelity motion.
3. **Texture atlas** if `public/models/` (~8MB of embedded albedos) needs trimming; world terrain
   relief ([`ground.js`](../src/game/world/ground.js) TSL heightmap) per the art-craft roadmap.
2. **NPC depth:** richer behaviour by porting Canvas `patrolSystem`/`npcBehaviors`/`npcMemory`;
   make townsfolk interactive (proximity → greeting), schedules tied to `worldClock`.
3. **Back to systems** ([`roadmap.md`](roadmap.md) P3+): wire the event-sourced sim
   (`src/game/sim.js`) to the renderer, region streaming, combat.

## How to run + verify
```bash
npm run dev                                              # → http://127.0.0.1:5180/spikes/render3d.html
npm test && npm run typecheck:ts && npm run test:syntax && npm run dev:lint && npm run build
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d         # loop smoke (needs dev server)
WESTWARD_URL=http://127.0.0.1:5180 npm run test:visual:render3d  # golden gate (add :update to re-baseline)
```
Controls: WASD walk, drag turn, `T` cycles time-of-day, `G` cycles weather, `E` interact.

## Gotchas (read before touching the renderer)
- **Backend quirks** (`memory/render3d-webgpu-backend-quirks.md`): on the headless WebGL2 backend,
  **skinned meshes work**, but **InstancedMesh / Lines / Points / shared-materials do NOT** — use
  regular meshes + per-mesh materials. De-risk any new render capability headless before scaling.
- **One Three instance:** `vite.config.js` aliases `three` → `three/webgpu` (exact match). Import
  node materials from `three/webgpu`, TSL from `three/tsl`.
- **Determinism:** all continuous motion must freeze under the `?visual` flag (see `visualCapture`
  in `spike.js`) or the golden gate breaks. Re-baseline (`:update`) on any intended look change.
- **Blender:** author via the Blender MCP running committed `tools/blender/*.py`; export `.glb` to
  `public/models/`. Preview renders + screenshots go to `~/agents/screenshots/` — **never** the repo.
- **CSP:** assets are same-origin `.glb` (`connect-src 'self'`); embed textures in the `.glb`. No
  CDN, no blob workers, no `new Function`.
- **Deploy:** push to `main` → Vercel auto-deploys production.
