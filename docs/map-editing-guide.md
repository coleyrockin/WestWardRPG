# Map-Editing Guide — WestWard 3D Frontier (agent handoff)

> **You are the next agent. Your job: edit the world map and make it better.** This is a
> self-contained tactical guide for the 3D town/road layout. For the overall project
> direction see [`roadmap.md`](roadmap.md); for the look target see
> [`3d-art-direction.md`](3d-art-direction.md). This guide is the *how* for the map itself.

## TL;DR

- **The map lives in one file:** [`src/render3d/frontierLayout.js`](../src/render3d/frontierLayout.js).
  It's plain data + a few procedural generators. Editing the map = editing coordinate arrays.
- **It boots at** `spikes/render3d.html` → `src/render3d/spike.js` (Three.js). Run `npm run dev`,
  open `/spikes/render3d.html`.
- **Inspect any beat without driving:** the dev hook `window.__spike` — `goto('roadSlime')`,
  `setPos(x, y)`, `waypoints()`. (rAF is throttled in a backgrounded/preview tab, so movement &
  the spawn push-in won't animate there; a teleport reseeds the camera to gameplay framing.)
- **Guardrails:** `tests/render3d-frontier-layout.test.ts` enforces composition floors. Keep the
  suite green (`npx vitest run`, currently **1251**). When you intentionally change counts, update
  that test's expected values in the same commit — don't gut it.
- **Don't move the hero objects** without updating the route — gameplay beats are tied to them.

## Coordinate system

`+x = east`, `+y = south`, origin top-left of the world. The Three.js renderer maps
`(x → X, y → Z, height → Y)`. Units are ~1 = a person's stride; the hero is ~1.8u tall.
Playable rectangle is roughly `x ∈ [-8, 70]`, `y ∈ [-6, 27]`, walled by `BOUNDARY_RING` mesas.

## The route (the 5-minute spine) — do not casually move these

`FIRST_FIVE_ROUTE` + `HERO_OBJECTS` define the playable beats. The phase machine
(`src/render3d/phaseState.js`) advances when the player reaches each by `kind`, so moving a hero
object moves the gameplay trigger with it — keep them coherent.

| kind | x | y | beat |
|---|---|---|---|
| spawn | 9.5 | 8.5 | start (faces east) |
| jobBoard | 13.0 | 5.65 | Boone's board |
| roadSign | 24.0 | 6.3 | marshal road sign |
| townBark | 31.5 | 8.8 | town-edge warning |
| smokeCache | 40.5 | 12.9 | smoke cache |
| slimeTell | 48.2 | 16.4 | slime trail |
| roadSlime | 53.5 | 15.0 | the fight |
| brokenWagon | 60.5 | 12.2 | salvage (first-mission destination) |

The road runs east, drifting south from `y≈8.5` (town) to `y≈16` (marsh) then back north to the
wagon. The travel lane is ~`y±2` of the route; **keep props off it** (place on the shoulders).

## File structure of `frontierLayout.js`

- **Absolute-coordinate arrays** (edit these directly — `x`/`y` are world coords):
  `TOWN_EDGE`, `PRODUCTION_MAIN_STREET` (the storefronts the player sees first), `ROAD_CORRIDOR`
  (spawn→board framing), `ROUTE_LIGHTS`, `ROAD_FLORA`, `MARSH`, `SCENE_DRESSING` (cache + slime
  beat staging), `BOUNDARY_RING` (the mesa horizon wall), `HERO_OBJECTS`.
- **Anchor-relative dressing** (`VISTAS`, `ROADS`, `PROPS`, `LANDMARK`): carry `dx`/`dy` relative
  to `FRONTIER_ANCHOR (9.5, 8.5)` × `DEPTH_SPREAD[depthLane]`. Fiddlier — prefer absolute arrays
  for new work. (`ROADS` is currently empty — the old centreline sign-posts were removed.)
- **Procedural generators** (return arrays, spread into `ABSOLUTE_ZONES`): `routePlanks()` (shoulder
  posts), `routeRuts()` (road ruts), `routeNaturalClusters()` (sage/grass scrub). Tune density by
  the `count = Math.max(...)` and push-out by the `shoulder`/`side` offsets.
- **`buildFrontierPlacements()`** flattens everything to absolute `{kind, x, y, size, color, yaw}`
  placements. That's what the renderer consumes.

Each placement: `{ kind, label, x, y, color, size, yaw? }`. `kind` must exist in the asset
manifest ([`src/game/renderer/assetManifest.js`](../src/game/renderer/assetManifest.js)) or in the
procedural `buildPlacement` switch in `spike.js`. `color` tints procedural builders and the
auto-signboard; for `.glb` models the model's own colours win (per-instance tint isn't wired yet).

## How to edit

- **Move/add a prop:** edit/append to an absolute array. Available `kind`s: see the manifest —
  buildings (`productionSaloon/Store/Assay`, `heroTown*`, `saloon`, `storefront`, `town`), props
  (`crate`, `barrelCrateCluster`, `brokenFence`, `cart`, `lamp/lampLow/lampTall`, `hitchingRail`,
  `hangingSign`, `npcSilhouette`, `dustSmokePlume`, `mudRutDecal`), nature (`cactus`, `deadTree`,
  `rock`, `boulder`, `reeds`, `sageCluster`, `roadGrass`, `marshCluster`), terrain (`mesa*`,
  `cliff`, `heroMesaSkyline`), lights (`lampLow` etc. carry a PointLight).
- **Building scale:** in the manifest, `scale` = horizontal footprint × placement `size`; the new
  **`heightMul`** grows a building *taller without wider* (via `scaleY` in `assetLoader.instanceModel`)
  — that's how false-fronts tower over the hero without their footprints colliding with the
  road/camera. Main-street buildings are ~`scale 1.6, heightMul 1.5`. Each building also gets a
  per-instance height/yaw jitter + an auto **signboard** (computed from its bbox in
  `spike.js: addWesternFacadeDetail`).
- **Real building geometry** (the biggest open win): the boxes are authored low-poly `.glb`s.
  A generator is ready at [`scripts/blender/make_western_building.py`](../scripts/blender/make_western_building.py)
  — run it in Blender, export to `public/models/`, then point the manifest at the new `.glb` names.

## Guardrails — what NOT to break

`tests/render3d-frontier-layout.test.ts` (keep green; update expectations when you change counts on purpose):
- `firstFrameSlabBlockers` must stay **`[]`** — no big building (`size > 0.95`, kinds in the slab
  list) inside the **spawn→board camera wedge** `x ∈ [9.5, 16], y ∈ [6.5, 11]`. Keep that wedge open.
- Floors: `minNaturalClusters: 34`, `roadPlank ≥ 12`, `roadRut ≥ 10`, `minProductionStreetProps 36`,
  `minStorefronts 6`, `minNpcSilhouettes 6`, `minWindowLights 10` (`FIRST_ROAD_ART_STYLE`).
- Route assertions: the `targetKinds` order + `totalDistance > 95` + `estimatedPlaySeconds` in
  `[240, 360]`. Don't break the 8-beat spine.
- Spacing rule of thumb (in the file's comments): buildings need ≥ ~3.5u (small) to 6.5u (scaled)
  centre-to-centre or they overlap.

## How to verify (the throttled-preview workflow)

1. `npm run dev`, open `/spikes/render3d.html` in the **Claude Preview** (or a real browser).
2. `window.__spike.setPos(x, y)` / `.goto('smokeCache')` to jump to any beat. A teleport reseeds
   the follow-cam to **gameplay framing** (the spawn push-in otherwise holds the camera wide in a
   throttled tab). Screenshot to force a frame.
3. **rAF is throttled when the tab isn't foreground** — movement, the push-in, weather, and combat
   won't animate in the preview. Judge *static composition* there; judge *motion/feel* in a real
   browser at full framerate. Synthetic keypresses don't reach the game (pointer-lock).
4. Gate every change: `npx vitest run` (stay green), `npx tsc --noEmit`, `npx vite build` (clean —
   chunk-size warning is expected). HMR is broken; hard-reload (`location.href = ...?n=Date.now()`).
5. Commit incrementally so the map is always in a known-good state.

## Prioritized ideas to make the map *better*

1. **Town depth.** The main street is a single row flanking the road. Add a second row / back-alley
   / cross-street behind it (new absolute building array, off the wedge) so the town reads as a
   place with depth, not a façade strip.
2. **A landmark silhouette per district.** The watchtower anchors the town; give the marsh and the
   wagon road their own tall silhouette (a derrick, a water tower, a dead giant tree) so each leg
   has a "you are here."
3. **Shape the road.** It's mostly straight planes. Add a gentle curve, a fork to a dead-end of
   interest, or a plank bridge over the marsh at the slime crossing — staging, not new systems.
4. **District identity.** Make the town→outskirts→marsh transition legible: thinning buildings,
   then fences/wagons/debris (frontier outskirts), then reeds/water/fog (marsh). Some of this
   exists; push the gradient.
5. **Compose the opening.** Pillar 6 in the art doc wants a foreground depth element framing the
   spawn shot — try it *carefully* (verify + revert; near-camera props clutter easily).
6. **Real buildings** (biggest visual jump) — the Blender generator above.
7. **Resist clutter.** The scrub floor is already at its test minimum; adding more reads busy.
   Prefer *composition* (placement, silhouette, leading lines) over *density*.

## Gotchas

- HMR is broken in this setup → always hard-reload.
- The dev teleport hook `window.__spike` lives in `spike.js` (spike route only; harmless in prod).
- The opening was carefully tuned (lighting, scale, framing) — don't regress it; verify the spawn
  shot after map edits.
- Lighting/grade live in `src/render3d/timeOfDay.js` (goldenHour palette) — out of scope for *map*
  edits, and easy to over-tune; leave them unless asked.
