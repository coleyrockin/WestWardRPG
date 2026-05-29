# WestWard — Art Bible

The committed quality target for characters and worlds. [`art-craft-roadmap.md`](art-craft-roadmap.md)
is *how* we raise craft over time; this is the *bar each asset is measured against now*. Keep it
short and enforce it: every asset clears the checklist before it ships.

## North star
A **moving graphic novel** — a stylised hardcore western. Think *Sable* / *The Good, the Bad and
the Ugly* by way of a cel-shaded comic: bold silhouettes, flat painted fills, inked edges, dusty
golden light. **Not** realism, **not** generic low-poly mobile. If an asset could appear in a
free Unity starter kit, it's wrong.

## The three rules (in priority order)
1. **Silhouette first.** Every asset must read as itself in pure black at 64px. Buildings get
   false-front rooflines + overhangs; the drifter reads by hat + coat flare; mesas read by their
   stepped notch. Test it: squint / black-fill the turntable.
2. **Flat fills, inked edges.** Surfaces are 2–3 flat cel bands (the NPR toon ramp), separated by
   the depth/normal ink pass — never smooth PBR gradients. Detail comes from *shape* and *line*,
   not from noise or specular.
3. **Chunky, not busy.** Low triangle counts with intentional bevels read better under the ink
   pass than dense meshes. Budget: dressing < ~300 tris, hero < ~800, character ≈ 1–2k.

## Palette (canonical — from `tools/blender/westward_kit.PALETTE`)
- **Frontier (Dustward):** golds `#ffd77b` `#caa66c` `#d8a84f`, tan `#b9824d`, scrub green
  `#5c7a3a` `#577038`, earth `#5a4636`, darks `#3e3224` `#241810`. Warm golden-hour key.
- **Ashfall (later):** bleached bone, ember orange, ash grey, heat-haze whites.
- **Ironlantern (later):** desaturated steel/teal, neon sign accents, surveillance amber.
- Emissive only where it earns it: lamp panes, beacon, job-board, slime, sign glow.

## Lighting & post (the look is half the craft)
- Continuous day/night arc (`worldClock` → `sunArc`); golden-hour is the signature framing.
- Ink edges + bloom + warm grade + film grain are tuned **restrained** — definition over wash
  (we over-cooked bloom once; keep contrast). Re-tune post against new assets, never ship blown-out.

## Character spec (the drifter, and the NPC base)
- **Proportions:** slightly heroic — ~6.5 heads, broad shoulders, defined hat brim + coat flare
  for silhouette. Hands/feet simplified blocks are fine; the *shape language* must read.
- **Surface:** 3–4 flat material zones (skin, coat, dark trim, hat) → cel bands + rim. Texture/UV
  is the planned ceiling-raise (roadmap Phase 2/3), not required to clear the bar.
- **Rig & motion:** clean weights, no candy-wrapper joints. Anim clips must have *weight* — a
  walk with hip bob + arm counter-swing + slight lean, not a stiff slide. Target clip set:
  idle, walk, run, turn, interact, hit, death.
- **Variety:** NPCs reuse the rig; vary by palette + hat + proportion + scale, not new skeletons.

## World craft
- **Terrain reads as place, not plane:** rises/dunes + a cut road + a marsh hollow; biome blend by
  region palette. Flat ground is a failure state.
- **Composition:** a landmark on the skyline (watchtower/mesa notch), leading lines (the road)
  toward the objective, layered depth (foreground props → midground town → background mesa ring),
  density that breathes (clusters + negative space, never uniform scatter).
- **Modular kit:** buildings/props compose from shared, beveled, weathered pieces with broken
  edges — never pristine boxes. Reuse with per-placement yaw/scale variation (`hashYaw`).

## Engine constraints (non-negotiable — see `memory/render3d-webgpu-backend-quirks`)
- WebGPURenderer, **WebGL2 backend in CI/headless** (SwiftShader). Skinned meshes + AnimationMixer
  render; **InstancedMesh / Lines / Points / shared-materials do NOT** — use regular meshes +
  per-mesh materials, or textured cards.
- Assets are `.glb` in `public/models/`, served same-origin (CSP `connect-src 'self'`); embed
  textures in the `.glb` (one fetch, CSP-clean). No external CDN, no blob workers.
- Continuous motion must freeze under `?visual` so the golden-image gate stays deterministic.

## Per-asset ship checklist
- [ ] Silhouette test passes (reads at 64px black-fill).
- [ ] Flat cel fills + clean ink edges (no smooth-PBR look, no z-fighting).
- [ ] On-palette for its region; emissive only where earned.
- [ ] Within tri budget; origin at base; scale matches world units.
- [ ] Renders on the headless WebGL2 backend (de-risk new capabilities first).
- [ ] Blender turntable + in-spike screenshot at play framing reviewed; golden gate green.
