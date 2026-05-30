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

## ⚡ IMMEDIATE TASK (do this first — user is waiting on live render)

**Fix the grade/light problem.** User looked at the live Vercel WebGPU render and gave this diagnosis:

> "The composition fix landed (town reads, road, depth, warm pool on the left). The real problem is it's flat and pale: uniform cream values, weak shadows, only the left has drama. That's a grade/light problem — NOT a buildings problem. Push grade + contrast hard, deepen shadows, add god-ray/rim, spread the warm drama across the whole scene. Then sun-shaft motes + heat shimmer. Deploy each step so I can judge live."

**Do NOT pivot to Blender.** The buildings are explicitly not the problem.

### Root cause
`postStacks.js` grade (line ~95) is a flat tint-multiply — mathematically cannot create contrast:
```js
const graded = inked
  .mul(mix(vec3(1,1,1), vec3(uniforms.gradeTint).mul(1.6), uniforms.gradeAmount))
  .mul(uniforms.exposure);
```
All values shift toward the tint uniformly. Drama only appears where point-lights pool.

### Fix: cinematic grade chain in `src/game/renderer/postStacks.js`

Replace the graded block with a 4-step chain. New TSL uniforms needed: `contrastAmount`, `saturationAmount`, `shadowTint` (Color), `highlightTint` (Color).

**Step 1 — Contrast S-curve** (deepens shadows, lifts highlights):
```js
const contrasted = inked.sub(0.5).mul(uniforms.contrastAmount).add(0.5).clamp(0,1);
```
Start: `contrastAmount = 1.6`

**Step 2 — Saturation** (kills cream-wash desaturation):
```js
const luma = contrasted.dot(vec3(0.2126, 0.7152, 0.0722));
const saturated = mix(vec3(luma), contrasted, uniforms.saturationAmount);
```
Start: `saturationAmount = 1.45`

**Step 3 — Split-tone** (THIS spreads drama across whole frame — cool shadows + warm highlights):
```js
// Shadow tint: deep blue-purple toward darks; highlight tint: amber toward lights
const shadowW = saturated.oneMinus().pow(2);  // strongest in darks
const highlightW = saturated.pow(2);          // strongest in lights
const splitToned = saturated
  .mul(mix(vec3(1,1,1), vec3(uniforms.shadowTint), shadowW))
  .mul(mix(vec3(1,1,1), vec3(uniforms.highlightTint), highlightW));
```
Start: `shadowTint = "#1a0a2e"` (deep blue-purple), `highlightTint = "#ffb040"` (warm amber).

**Step 4 — Exposure + existing vignette** (unchanged).

### Lighting changes in `src/render3d/timeOfDay.js` (dusk palette)
- `rim.intensity`: `0.55 → 1.0` (the rim is the main silhouette separator — crank it)
- `sun.intensity`: `2.2 → 2.8` (low raking amber)
- `hemi.intensity`: `0.34 → 0.18` (ambient flood is what makes everything uniform — cut harder)
- `sun.dir.y`: `3.5 → 2.5` (lower sun = longer shadow rakes across ground)

### God-ray in `postStacks.js`
- `godrayStrength`: `0.85 → 1.3` (should be visible shafts through mesas — push hard)

### Deploy workflow
After grade fix committed:
```bash
npm test && npm run typecheck:ts && npm run build
WESTWARD_URL=http://127.0.0.1:5189 npm run test:render3d
WESTWARD_URL=http://127.0.0.1:5189 npm run test:visual:render3d:update  # re-baseline (look changed)
WESTWARD_URL=http://127.0.0.1:5189 npm run test:visual:render3d         # MUST be PASS 0.00%
git push origin main   # → Vercel auto-deploys → user judges live
```
Then lighting changes → push → user judges. Then atmosphere (below).

### Atmosphere (AFTER grade is approved)
Branch `feature/part7-atmosphere` @ `1dfbf8d` is LOCAL ONLY (not pushed to origin). It has:
- `src/game/world/dustMotes.js` — sun-shaft motes, hidden under `?visual`
- `src/render3d/heatShimmer.js` + test — horizon-weighted resample wobble
- GTAO opt-in via `?ao` (OFF by default, de-risk passed on SwiftShader)

After grade is approved, merge this to main:
```bash
git merge feature/part7-atmosphere
# fix any conflicts (unlikely — different files)
npm test && npm run build
git push origin main
```

---

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
- **Living World:** worldClock (sun arcs), animated water, weather, terrain relief + scatter (FBM
  displacement, flat-masked corridor + marsh), 3rd-person rigged character, 5 interactive townsfolk.
- **Visual overhaul (main @ `a5a75d6`):** hero capture camera, golden-hour dusk palette, terrain
  relief, denser scatter, milk-killed fog/bloom. Composition reads — town/road/depth land.
- **6A/6B/6C:** prop detail, hero rig (Run/Turn/Draw), interactive NPCs (Mabel/Cole/Rosa/Hank/Pearl).

## After-grade pick-up order
1. Atmosphere merge (motes + shimmer) from `feature/part7-atmosphere`
2. Systems depth: sim.js → renderer wiring (`roadmap.md` P1)
3. Mixamo-hybrid hero (needs user-supplied FBX)

## Pick up next (in order)
1. **Systems depth** ([`roadmap.md`](roadmap.md)): drive the scene from the event-sourced
   [`sim.js`](../src/game/sim.js) (`stepSimulation`/`toRenderState`) instead of the legacy snapshot.
2. **Mixamo-hybrid hero** (deferred — needs user-supplied FBX).
3. **Texture atlas** if `public/models/` (~8MB of embedded albedos) needs trimming.

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
