# The Meridian — Connected Water System (plan + NOW-phase build)

> Water is the game's spine: Ezra inherits the largest water-and-land empire in the
> Meridian Territory and Act 3 is the Water War (`rustwater-treatment.md`). This turns the
> lone marsh pond into ONE connected system the geography can fight over later. Built on the
> existing TSL water engine (`src/game/world/water.js`) — extended, never reimplemented.

## Topology (fitted to the REAL map; +x=east, +y=south; bounds x[-78,150] y[-60,90])
ONE system, upstream→downstream, every body a flat cel plane at y≈0.04:
1. **Caldera headwaters** — narrative source, far N. Backdrop only (a region later).
2. **Cross Reservoir + Cross Dam** — the lake + the hero landmark. Reservoir is a large calm
   cel plane centered ~`(47,-32)`; the **Cross Dam** (rusted-chrome procedural hero,
   `buildCrossDam`) spans the river mouth at `(47,-15)`, facing the territory. The Water War
   flashpoint — hold the dam, hold every drop downstream.
3. **The Meridian River** — the artery. Flows S down the **east** side of Westward (x≈47,
   clear of the town + every hero waypoint by ≥1u), crosses the first-road route at ONE
   walkable **ford** at the marsh's north edge, folds the **existing marsh in as a backwater**
   (unmoved), then steps SE through the lower reach toward Sunken Wash and the sea. The lower
   reach carries a sickly **industrial tint** (the empire's runoff — the environmental-cost seed).
4. **The Ocean** — far S boundary band (y≈88); its SW edge is the Drift coast. Deepest, coolest,
   biggest swells. Hard boundary; visible, not all reachable now.

### Key tradeoff (deliberate deviation from the original locked spec)
The locked spec had the river pass *both* towns and tint near Calico. The map forbids it: the
protected marsh (must be connected) is far EAST (x=48) while Calico is far WEST (x=-52) — one
channel can't touch both without crossing both town cores. **The river runs the eastern
corridor so it can fold in the marsh; Calico's Meridian dependency is narrative** — its water
tower + the "WATER IS LAW / SINCE THE SEVERANCE" lore sign (shipped) + a future east canal. The
industrial tint moved downstream (past the wash), which is strictly better thematically.

## Architecture (single source of truth)
- **`src/render3d/waterLayout.js`** (NEW, pure + `.d.ts` + tested) — every body as data
  (`RIVER_PIECES`, `RESERVOIR`, `OCEAN`, `DAM`) plus `waterBodies()` (the mesh list),
  `waterCollisionBoxes()` (blocking AABBs), and clearance helpers. River pieces are
  **axis-aligned rectangles** — collision equals the visual exactly; no rotation math. The dam
  lives here too, so `frontierLayout.js` and its big test stay untouched (less risk than a
  count-bump).
- **`src/game/world/water.js`** — extended with per-body knobs (directional flow scroll, cel
  band quantization, wave amp/scale, reduced-fidelity WebGL2 flat plane, opacity). Defaults
  reproduce the marsh byte-identically.
- **`src/game/world/ground.js`** — `waterBasin(x,z)` carves the upper riverbed + reservoir bed
  FLAT (pure + mirrored TSL) so dune relief never pierces the surface — exactly why the marsh
  basin is flattened. Provably 0 inside the dusk frame.
- **`src/render3d/spike.js`** — builds the meshes from `waterBodies()` (with `reducedFidelity`),
  builds the dam, animates all uniforms each frame, and concats `waterCollisionBoxes()` onto the
  proxy list so deep water blocks and the ford is the one crossing.

## Look & tech — cel water, "nothing is sleek"
TSL `MeshBasicNodeMaterial` (unlit): summed-sine vertex waves + flow-scrolled cel-banded ripple
bands + fresnel sky-tint + glint. Per-body palette (reservoir calm/mirror, river living/banded,
ocean big-swell, lower reach industrial). **Ink shoreline is free** (postStacks' depth Sobel
inks every water/ground edge). Day/night via the per-frame `skyTint` uniform. **WebGPU** = full
animated water; **WebGL2** = flat reduced plane. **No reflection pass** (a glossy mirror would
regress the cel look — deferred to LATER behind a quality flag).

## Perf budget (held)
8 water meshes (6 river pieces + reservoir + ocean) + ~8 dam boxes (one hero landmark; M0 allows
it). ZERO extra render passes. No foam/reed/boat/spray swarms — fake foam in-shader. One shared
water factory.

## Tests (all green: 761 vitest)
- `tests/world-water.test.ts` — flow/band/wave pure helpers + reduced/banded materials.
- `tests/water-layout.test.ts` — deep water clears every hero waypoint by ≥1u, stays out of the
  spawn wedge; one walkable ford; ford overlaps the marsh; collision coverage.
- `tests/world-ground.test.ts` — `waterBasin` flattens river/reservoir, leaves the dusk frame
  and open range untouched.
- Browser: `test:render3d` (loop smoke), `test:visual` (golden dusk — water is out of frame, so
  the baseline holds with NO re-bless).

## Golden-frame safety
Every body + the dam + both flatten basins are outside the dusk camera wedge (camera at world
`(6.6,10.2)` looking east down the Westward street). The `?visual` baseline boots
`visualCapture=true` and freezes motion, so even animated water can't shift it. If `test:visual`
ever trips here, it's a routing bug — fix the route, don't re-bless.

## LATER (M0+, WebGPU behind a quality flag)
Planar reflections (dam/sky in the reservoir); in-shader foam → particle foam at shore +
spillway; reed/dock/boat bank scatter; dam spray/mist; caustics; the Calico east canal/aqueduct;
the Caldera headwaters as a real N region; a true spline river ribbon with width variation.

## Owner-foreground follow-up
The water reads clearly at dusk (cool masses against the warm palette); the daytime punch/
saturation of the river-as-artery is best tuned in a real foreground tab (`npm run play`) where
AO/godrays and full framerate apply — the throttled/headless capture under-represents it.
