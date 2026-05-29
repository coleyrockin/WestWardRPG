# WestWard — Art-Craft Roadmap

The **art-quality track** that runs alongside the engine/systems plan in
[`roadmap.md`](roadmap.md) (feeding its P3 slice / P4 art scale-up / P6 content). Where
`roadmap.md` is about *systems*, this is about *how the characters and worlds are crafted*.

## Why this exists
The engine + NPR look are solid, but **asset craft is the quality ceiling.** Today:

- Assets are **primitive boxes joined** via Blender Python (`tools/blender/`) — no modifiers,
  bmesh, sculpt, or UVs.
- The NPR material (`src/game/renderer/materials/nprMaterial.js`) is **flat-colour only** — no
  texture / UV / vertex-colour inputs, and no texture files are ever loaded.
- Animation is **hand-keyed linear** on a 6-bone auto-weighted rig.
- The world is **hand-placed data on a flat plane.**

The style is **locked**: stylised "moving graphic novel" — cel/toon + ink edges + per-region
post (see [`roadmap.md` §3](roadmap.md)). So this roadmap elevates craft *within* that identity
toward a **hand-painted cel look** (Sable / BotW / graphic-novel), **not** realism. Two chosen
ceiling-raisers:

1. **Painted-texture support** — UV + base/detail/normal maps in the NPR shader.
2. **Mixamo-leverage hybrid characters** — a restyled low-poly mesh on a Mixamo skeleton, driven
   by Mixamo's animation library.

## Principles
- **Stylised, not real** — silhouette-first; hand-painted gradients + hatching, not photoreal PBR.
- **Engine-aware** — textures embedded in `.glb` (CSP-clean, one fetch); skinned meshes render;
  **no** InstancedMesh / Lines / Points / shared-materials on the WebGL2 backend (see
  `memory/render3d-webgpu-backend-quirks`). Scatter/LOD use regular meshes + per-mesh materials or
  textured cards.
- **De-risk before scale** — prove each new capability renders on the headless WebGL2 backend
  before re-authoring assets (the discipline that caught the skinned-mesh + shared-material gotchas).
- **Reproducible where it pays** — keep procedural scripts for modular/repeated geometry;
  **hand-model hero/organic assets** in Blender's UI (the box-script approach is the cap).
- **Quality bar per asset** — silhouette test + turntable + golden-image before it ships.

## Phases

### Phase 1 — Foundations (fast; first)
- [`art-bible.md`](art-bible.md): committed target — references, per-region palette, line weight,
  surface treatment, proportion guides.
- Quality loop: Blender turntable → `~/agents/screenshots/` before export; silhouette test; the
  `test:visual:render3d` golden gate.
- Skill ramp: modifiers (bevel/mirror/array/solidify/subsurf), bmesh, UV unwrap + texture
  paint/bake, sculpt→remesh→decimate, weight painting, the Mixamo workflow.

### Phase 2 — Texture / surface pipeline (the ceiling raise)
- **De-risk (go/no-go):** a UV'd embedded-texture test `.glb` must sample + render on the WebGL2
  backend headless. Fallback if not: vertex colours.
- **Engine:** `nprMaterial.js` gains a base colour map (UV) multiplied into the cel ramp + optional
  detail/hatching map (shadow bands) + optional normal map; `assetLoader.js` stops discarding glTF
  textures and feeds them in. Textures embedded in `.glb` keep CSP clean.
- **Blender:** UV unwrap; hand-paint / gradient-bake base maps; shared trim sheet/atlas for the
  building kit; weathering passes.
- **Prove on one hero asset** (saloon or the player) before rolling out kit-by-kit.

### Phase 3 — Character craft (Mixamo hybrid)
- Mixamo/CC0 humanoid → **restyle/retopo the mesh** to the WestWard drifter (keep skeleton +
  weights), UV + texture it. Pull a **Mixamo clip library** (idle/walk/run/turn/draw/hit/death) →
  glTF. `animatedCharacter.js` already does `SkeletonUtils.clone` + `AnimationMixer` crossfade;
  extend to the richer clip set. Replace the box-rig player.
- NPC variety: palette/texture/proportion/hat variants reusing the rig (feeds Slice 3 townsfolk).

### Phase 4 — World craft (terrain, kit, composition)
- **Terrain:** in-engine TSL heightmap displacement on a segmented plane (extend `ground.js`):
  dunes/rises + a cut road; biome blend by region palette.
- **Modular textured kit:** re-author buildings/props with the Phase 2 pipeline + modelling craft
  (bevels, trim, overhangs, broken edges). Compose via `regionVisualIdentity.js` / `regionArtKits.js`
  with landmark/sightline/density principles.
- **Scatter/vegetation:** regular-mesh pools (`scatter.js`) + textured cross-plane cards for
  grass/brush; document the draw-call budget.
- **Per-region identity:** ship Ashfall + Ironlantern looks (post stacks scaffolded in
  `postStacks.js`).

### Phase 5 — Scale + polish
- Wire `wfcInteriors.js` for interiors; procedural variation for repeated structures.
- LOD within backend limits; perf budget gated with textured assets.
- Full pass: every asset clears the art-bible bar; golden-image per region.

## Verification
- Per capability: de-risk render test on the WebGL2 backend before scaling.
- Per asset: Blender turntable + silhouette test + spike screenshot at play framing.
- Gates: `npm test` / typecheck / lint / build, `test:render3d` smoke, golden-image re-baseline per
  look change; perf (draw calls/tris) watched with textured assets.
- **Honesty gate:** each phase ends with a before/after; if it doesn't clear the art-bible bar,
  iterate before scaling.

## Start here
Phase 1 art bible → Phase 2 de-risk textures → texture one hero asset end-to-end. Prove the ceiling
raise on one asset before re-texturing everything. The player character becomes the first
Mixamo + textured hero asset.
