# WestWard Engine Rewrite Roadmap

A compact dark western RPG rebuilt for a richer browser-native presentation.

This roadmap is the single source of truth. Do not create parallel TODO, PLAN,
ROADMAP, rewrite, or engine-spike planning files. Update this file when scope
changes.

## Decision

WestWard has outgrown the current Canvas raycasting renderer.

The existing game proves that the project has valuable RPG systems: jobs, loot,
gear, housing, NPC memory, save recovery, run summaries, and deterministic
browser tests. The weak point is the visual engine. The game still looks too
flat, too samey, and too procedural for the target fantasy.

The next major project direction is an engine rewrite focused on presentation,
scene depth, characters, animation, and art direction.

The current Canvas build becomes the **reference build**:

1. It remains playable while the rewrite is built.
2. It remains the source of truth for shipped gameplay behavior.
3. It protects the project from losing working RPG systems during the rewrite.
4. It can be removed only after the new version proves the same vertical slice.

## Creative Target

WestWard should feel like:

1. A stylized dark western RPG.
2. Oblivion-style road wandering, scaled down.
3. Weird West mood.
4. Low-poly graphic novel scenery.
5. A haunted frontier town at dusk.
6. Dusty roads, warm lanterns, foggy marshes, strange creatures, wanted boards,
   rough timber, purple shadows, and readable silhouettes.

The goal is not realism. The goal is beauty, clarity, mood, and playability.

## Research Summary

Recent web RPG and engine research points to one practical conclusion:

WestWard should not keep trying to look like a modern RPG inside the old
raycaster. Browser games that feel visually richer use one of two paths:

1. A serious 2D engine with strong authored art.
2. A real 3D/WebGL renderer with scene depth, lighting, models, animation, and
   post-processing.

WestWard wants first-person exploration, readable roads, scenery depth, skies,
landmarks, character silhouettes, and animated enemies. That makes a 3D/WebGL
presentation layer the better fit.

Useful references:

1. Hordes.io proves a browser RPG can run as a 3D HTML5/WebGL experience.
2. BrowserQuest proves HTML5/Canvas can ship multiplayer RPG structure, but its
   visual ambition is 2D and classic.
3. CrossCode proves HTML5/JavaScript can support a serious RPG, but it succeeds
   through strong 2D authored art rather than first-person 3D.
4. Mad World shows the value of a strong art identity in browser RPGs.
5. RPGJS and RPG Paper Maker are useful reminders that RPG tools matter, but
   they are not the best fit for WestWard's first-person dark western target.
6. Phaser is excellent for 2D browser games, but its own docs say it is not the
   right choice for fully 3D games.
7. Godot can export to web, but its web path adds deployment and browser
   constraints that fight this project's current JavaScript/Vite foundation.
8. PlayCanvas is powerful, but it moves the project toward another engine
   ecosystem and editor model.
9. Three.js is the best first rewrite target because it fits the current Vite
   project, supports glTF/GLB assets, gives direct renderer control, and lets
   the existing game state remain outside the scene graph.

## Engine Direction

Use **Three.js** for the first rewrite spike.

This is not a full commitment to ship the final game in Three.js until the spike
proves the first five minutes look dramatically better.

Why Three.js first:

1. It fits the current web stack.
2. It keeps the game local-first and browser-native.
3. It supports GLB/glTF models, animation clips, lighting, fog, particles, and
   post-processing.
4. It allows custom low-poly Weird West art direction without adopting a
   heavier editor workflow.
5. It lets the DOM remain the right home for HUD, menus, accessibility text,
   save recovery, job boards, inventory, and settings.
6. It can coexist beside the current Canvas renderer during migration.

Do not start with Babylon, PlayCanvas, Godot, Unity WebGL, or Phaser unless the
Three.js spike fails for a specific written reason.

## Rewrite Rules

1. Player-visible improvement beats architecture theater.
2. Preserve working RPG systems until the replacement proves parity.
3. Do not delete the Canvas version until the new renderer completes the same
   first-road loop.
4. Simulation state must not live inside Three.js meshes.
5. Renderer objects must never become save data.
6. HUD and menus stay DOM-first unless a visual effect truly belongs in 3D.
7. Use GLB/glTF as the asset format for real 3D assets.
8. Keep procedural placeholder assets only as scaffolding, not final proof.
9. No new pets, LLM dialogue, economy expansion, second-region expansion, or
   feature creep during the rewrite.
10. Every phase needs screenshot proof, browser smoke proof, and clear rollback
    safety.

## Product Definition

The rewrite is successful when a new player can play the first 20 to 40 minutes
and say:

1. I can tell where I am.
2. I can tell where the road goes.
3. I can tell who Boone is and what the board does.
4. I can see Smoke Cache before the HUD explains it.
5. I can recognize Broken Wagon from its silhouette.
6. I can tell the Road Slime is dangerous before it hits me.
7. I understand my reward and why it matters.
8. I can return to town and see the world react.
9. I can save, reload, recover, and continue.
10. I would show the first screenshot to someone without apologizing.

## Keep, Replace, Rebuild

### Keep

These systems are valuable and should be preserved or adapted:

1. `jobBoard.js`
2. `firstRoadMemory.js`
3. `gameFeel.js` derived first-session helpers
4. `interactionPrompt.js`
5. `lootSystem.js`
6. `gearCrafting.js`
7. `craftingStation.js`
8. `npcMemory.js`
9. `runSummary.js`
10. `saveMigration.js`
11. `savePersistence.js`
12. `graphicsSettings.js` concepts
13. `combatReadability.js`
14. browser smoke/test-action infrastructure
15. `render_game_to_text()` as a QA/debug contract

### Replace

These areas should be rewritten rather than endlessly patched:

1. The current raycast world renderer.
2. Wall-column scenery.
3. Procedural flat sprite character rendering.
4. Canvas-only HUD density.
5. Near-wall visual treatment.
6. Fake scenery depth.
7. Flat prop lineups.
8. The current first-person visual composition.

### Rebuild Carefully

These systems need new boundaries but should preserve behavior:

1. Input routing.
2. Camera control.
3. Collision and interaction queries.
4. Entity presentation.
5. Combat animation feedback.
6. Minimap and objective presentation.
7. Save/load UI.
8. Settings and accessibility.

## Target Architecture

The rewrite should move toward this structure:

```text
src/
  core/
    state/
    save/
    math/
    events/
  systems/
    jobs/
    loot/
    gear/
    housing/
    npc/
    combat/
    progression/
    narrative/
  world/
    maps/
    regions/
    collisions/
    spawns/
    interactions/
  render3d/
    app/
    camera/
    scene/
    materials/
    objects/
    actors/
    terrain/
    fx/
    loaders/
    debug/
  ui/
    hud/
    menus/
    dialogue/
    job-board/
    save-recovery/
    settings/
  bridge/
    stateSnapshot.js
    rendererAdapter.js
    interactionAdapter.js
    qaSnapshot.js
```

The current `src/main.js` should shrink into a runtime bootstrap while the new
structure takes over. Do not move everything at once.

## Milestone 0: Rewrite Prep And Repo Hygiene

Status: **done (2026-05-24).** Canvas game-feel/minimap/region polish committed
as the final reference-build pass (`2a8d3e2`); stale pre-refactor autostash
dropped; reference build verified green (996 tests, typecheck, syntax, build);
spike branch `rewrite/threejs-spike` created from a known baseline; README notes
the rewrite spike is the active direction.

Goal: Make the rewrite safe before adding the new engine.

Required work:

1. Decide what to do with the current dirty Canvas visual pass.
   - Either commit it as the final Canvas reference polish.
   - Or discard only the rewrite-obsolete visual polish after explicit owner
     approval.
   - Do not silently lose gameplay, test, smoke, or objective-clarity work.
2. Freeze the Canvas build as the reference path.
3. Add a short README note that a renderer rewrite spike is the active next
   direction.
4. Keep all tests green before installing new rendering dependencies.
5. Add an architectural note inside this roadmap only; no extra plan file.

Acceptance:

1. `main` is clean or intentionally dirty with known scope.
2. Current Canvas game still passes tests and smoke.
3. The rewrite branch starts from a known baseline.

## Milestone 1: Three.js Spike

Status: **done (2026-05-24) — Three.js confirmed as the rewrite path.**

Goal: Prove that the new visual direction can beat the current screenshot fast.

Scope:

1. Install Three.js.
2. Add a separate `render3d` bootstrap behind a feature flag or dev route.
3. Render one static Dustward opening scene.
4. Use placeholder low-poly geometry first: terrain, road, fences, buildings,
   job board, lamps, trees, Smoke Cache plume, Broken Wagon, Road Slime.
5. Do not connect full gameplay yet.
6. Keep the existing Canvas game playable.

Required first scene:

1. Dusk skybox or gradient dome.
2. Fog and atmospheric haze.
3. Warm lantern lights.
4. Dusty road with readable edges.
5. Town buildings with silhouettes.
6. Boone/job-board landmark.
7. Smoke Cache visible down the road.
8. Broken Wagon visible as a distinct object.
9. One Road Slime with hostile silhouette.
10. DOM objective strip over the scene.

Acceptance:

1. The first screenshot is obviously better than the Canvas screenshot.
2. The scene runs in browser without gameplay regressions.
3. The scene can be captured by the existing visual tooling or a new equivalent.
4. No save schema changes.

Stop condition:

If the Three.js spike does not produce a visibly better first screenshot within
one focused slice, do not continue blindly. Re-evaluate PlayCanvas or a 2.5D
authored-art direction.

### Spike Outcome

The spike cleared the strategic gate: the Three.js dusk frontier opening is more
dimensional and atmospheric than the old raycaster can realistically become.
**Decision: Three.js is the engine.** The visual comparison script still needs a
fair in-world Canvas capture before it becomes a strict proof gate.

What shipped (all behind a dev route; the Canvas game is byte-for-byte unchanged):

1. `render3d.html` — dev route serving the spike (`npm run dev` → `/render3d.html`).
2. `src/render3d/spike.js` — `startSpike(canvas)`: WebGL renderer (ACES tone map,
   PCF soft shadows), dusk gradient sky-dome shader, `FogExp2` haze, hemisphere +
   low warm directional sun + per-lamp point lights, and per-`kind` placeholder
   builders (building, watchtower beacon, lamp, fence, sign, job board, smoke
   cache + plume, broken wagon, road slime). Sets `window.__spikeReady` after
   first frame for capture.
3. `src/render3d/frontierLayout.js` — data-driven placement: world coords mirror
   the real frontier (`REGION_PRESENTATION.frontier` offsets + `poiSystem.js` hero
   positions), spread by `depthLane` so background reads as horizon silhouettes.
4. `scripts/spike_compare.mjs` — Playwright capture of old vs new
   (`output/spike-compare/`); reports console errors. Spike renders error-free.

Known and intentional limits (these define the work below): placeholder
primitives, no GLB art, no animation, no gameplay wiring, frontier only.

## Milestone 2: State Adapter

Status: **done (2026-05-24)** — the render snapshot bridge is in place. The 3D
spike consumes a plain `westward-render-snapshot`, exposes it for browser proof,
and keeps the static frontier layout only as fallback/seed data.

Goal: Feed the new renderer from existing game state without coupling gameplay
to Three.js.

Required work:

1. Add `createRenderSnapshot(state)` or equivalent.
2. Include player position, heading, region, time, weather, active objective,
   interactables, visible NPCs, enemies, POIs, route markers, lights, and
   combat cues.
3. Add tests proving the snapshot is serializable.
4. Keep `render_game_to_text()` intact.
5. Keep the old Canvas renderer reading the old state until replacement is
   proven.

Acceptance:

1. Three.js scene reads from a plain object snapshot.
2. No Three.js object is stored in save data.
3. Snapshot tests cover the first-road loop phases.

Outcome:

1. `src/bridge/stateSnapshot.js` exports `createRenderSnapshot(state, options)`.
2. Snapshot output is JSON-safe and includes player, region, weather, objective,
   first-road memory, interactables, enemies, route markers, combat cues, lights,
   and world objects.
3. `src/render3d/spike.js` now consumes that snapshot and publishes
   `window.__westwardRenderSnapshot` for browser proof.
4. `tests/state-snapshot.test.ts` covers serialization, starting board objective,
   active bounty route state, combat cue state, and Old Road Survey availability.

## Milestone 3: First Five-Minute Rewrite

Status: **active next (2026-05-25).**

Goal: Rebuild the first playable slice in the new renderer.

Player path:

1. Spawn in Dustward.
2. See town, Boone, job board, road, and Smoke Cache.
3. Open Boone board.
4. Accept Marsh Slime Bounty.
5. Follow the road.
6. Reach/open Smoke Cache.
7. Fight Road Slime.
8. Inspect Broken Wagon.
9. Earn Map Scrap.
10. Return to Boone.
11. See Old Road Survey follow-up.

Required work:

1. Player movement and camera in Three.js.
2. Collision against simplified world proxies.
3. Interaction prompts tied to actual scene objects.
4. Objective strip tied to existing first-five-minute helper.
5. Route markers rendered as physical world signs plus minimap/DOM support.
6. Smoke Cache, Broken Wagon, Boone board, and Road Slime as distinct hero
   objects.
7. Basic animation states: idle, walk bob, interact glow, enemy aggro, windup,
   hit, stagger, death, reward pop.

Acceptance:

1. A tester can complete the first five-minute loop in the new renderer.
2. Prompt/objective disagreement is impossible by construction.
3. Browser smoke asserts objective, prompt, job state, reward, memory, and
   first-road status.
4. Screenshots show a dramatic visual improvement.

## Milestone 4: Art Pipeline

Goal: Stop relying on programmer art.

Required work:

1. Define `assets/manifest.json` with stable IDs.
2. Use GLB/glTF for 3D models.
3. Keep temporary procedural primitives only for missing assets.
4. Add low-poly asset conventions:
   - one unit scale
   - centered pivots
   - named collision proxies
   - animation clip names
   - texture size limits
   - palette rules
5. Add asset validation.
6. Add asset budget:
   - first scene loads quickly
   - mobile fallback available
   - no uncompressed giant textures

First asset set:

1. Dustward road terrain.
2. Frontier building kit.
3. Boone board.
4. Lantern.
5. Fence.
6. Dead tree / cottonwood.
7. Smoke Cache.
8. Broken Wagon.
9. Road Slime.
10. Boone placeholder character.

Acceptance:

1. The first scene uses named assets through the manifest.
2. Missing assets fail gracefully.
3. Asset size and load time are measured.

## Milestone 5: Combat And Character Feel

Goal: Make the first enemy and NPCs feel alive.

Required work:

1. Replace rectangle/sprite characters with stylized low-poly or billboarded
   character rigs.
2. Add Boone idle pose and board-facing placement.
3. Add Road Slime animation states:
   - idle
   - alert
   - windup
   - lunge
   - hit flash
   - stagger
   - death
   - reward drop
4. Add weapon/hand presentation that does not look like a pasted shape.
5. Add hit pause, camera impulse, particles, and reward sparkle with settings
   respect for reduced motion.

Acceptance:

1. The player can read enemy intent without reading text.
2. Combat looks better in motion than in the old Canvas build.
3. Combat accessibility cues remain available.

## Milestone 6: UI Rebuild

Goal: Make the interface feel like a premium game shell, not debug overlay.

Required work:

1. Move text-heavy HUD and menus into DOM modules.
2. Keep the live scene low-chrome.
3. Build:
   - objective strip
   - interaction prompt
   - vitals strip
   - minimap
   - Boone job board
   - dialogue
   - inventory/equipment
   - house/workbench
   - save/recovery
   - settings/pause
4. Use a dark western command-panel style.
5. Support keyboard, pointer, narrow viewport, and reduced motion.

Acceptance:

1. The HUD no longer competes with the scene.
2. Job board and dialogue feel like RPG UI.
3. Mobile/narrow viewport stays readable.

## Milestone 7: System Parity

Goal: Move the real game loop onto the new presentation without losing systems.

Required parity:

1. Save/load.
2. Boone jobs.
3. First-road memory.
4. Loot and inventory.
5. Gear and armor.
6. House/workbench.
7. NPC memory.
8. Region identity.
9. Run summary.
10. Browser smoke and visual tests.

Acceptance:

1. The new renderer completes everything the MVP Canvas loop completes.
2. `render_game_to_text()` remains useful.
3. Existing unit tests still pass or are migrated with equivalent coverage.

## Milestone 8: Retire The Old Renderer

Goal: Remove the old visual architecture only after the new version earns it.

Required work:

1. Compare old and new first-road smoke scenarios.
2. Compare save/load behavior.
3. Compare run-summary output.
4. Remove obsolete Canvas-only renderer code.
5. Keep pure game systems.
6. Shrink `main.js` into runtime/bootstrap.
7. Update README screenshots, commands, and architecture map.

Acceptance:

1. No visible gameplay regression.
2. No save regression.
3. No roadmap/docs contradiction.
4. New screenshots are good enough for a public repo.

## Milestone 9: Release Rewrite MVP

Goal: Ship the rewritten vertical slice as the new project identity.

Required work:

1. Build offline package.
2. Add public screenshots and short gameplay GIF/video.
3. Update README with engine rewrite status.
4. Update known limitations.
5. Run full QA:
   - unit tests
   - typecheck
   - syntax
   - lint
   - build
   - smoke
   - visual capture
   - visual diff
   - offline package
6. Playtest on desktop and narrow viewport.

Acceptance:

1. A non-developer can launch and play.
2. A recruiter can see the project quality from screenshots.
3. A developer can understand the architecture.
4. The first five minutes look and feel like the new WestWard.

## Graphics: Next-Level Plan

The spike proves depth and mood with primitives. This is the playbook to take it
from "promising blocks" to "show the screenshot without apologizing." Work it
roughly top-down — each tier multiplies the ones below it. Everything here is
Three.js-native and reduced-motion-safe.

### 1. Rendering & post-processing (biggest win per hour)

Add `postprocessing` (`EffectComposer`) on top of the existing ACES tone map:

1. **Selective bloom** on emissive lanterns, beacon, reward sparkle, slime eyes —
   the single highest-impact upgrade for the dusk-lantern fantasy. Keep it
   selective so the whole frame doesn't wash out (the spike's first pass blew the
   lamps to white; emissive intensity is now tuned, but bloom is the real fix).
2. **Color-grade LUT** to lock the Weird West palette — purple shadows, warm
   mids, desaturated dust. One graded look beats per-material color-picking.
3. **Outline / edge pass** (or inverted-hull) for readable silhouettes — directly
   serves the "recognize the slime/wagon before the HUD explains it" goal and the
   low-poly graphic-novel target.
4. **SMAA/FXAA**, subtle vignette, filmic grain at low strength.
5. **Contact/blob shadows** under actors in addition to the sun shadow map, so
   characters feel planted.

### 2. Lighting & atmosphere

1. Real **sun + sky** (Three `Sky` shader or a tuned gradient dome with a sun
   disc) driven by a single time-of-day value; wire it to the existing game time.
2. **Volumetric haze / god-rays** from the low sun and lantern cones (cheap
   additive cones or a light-shaft post pass — not full volumetrics).
3. Layered **fog** (near dust + far depth fade) so the road reads into distance.
4. Lantern flicker via noise on intensity (reduced-motion: hold steady).

### 3. Art direction & materials (retire programmer art — Milestone 4)

1. Replace box/cone placeholders with **low-poly GLB models** (vertex-colored or
   lightly textured), loaded via `GLTFLoader` + **DRACO/meshopt** compression.
2. Decide the shading language with a quick A/B: **stylized PBR low-poly** vs
   **toon ramp** (`MeshToonMaterial` + gradient map) — the toon look may hit the
   "graphic novel" target faster. Pick one and commit.
3. Central **palette module** (extend `regionVisualIdentity` color language) so
   every asset and the LUT share one source of truth.
4. `assets/manifest.json` with stable IDs, one-unit scale, centered pivots, named
   collision proxies, animation-clip names, texture-size + palette rules, and
   asset validation. Missing assets fail gracefully to a tagged primitive.

### 4. World depth & density

1. Real **terrain mesh** with the road carved/vertex-painted in, dust ruts via
   normal map — replaces the flat ground plane.
2. **InstancedMesh** sage/grass/rocks/fence-rails for density at near-zero draw
   cost; **merge** static town geometry.
3. **Distant silhouette billboards** for far hills/mesas/treeline behind the fog.
4. LOD for hero props; cull offscreen.

### 5. Characters, enemies & animation (game-to-next-level)

1. Rigged GLB characters through `AnimationMixer` with the clip set the roadmap
   already names: idle, walk-bob, interact glow, enemy aggro, windup, lunge, hit
   flash, stagger, death, reward pop.
2. **Telegraph enemy intent visually** — the Road Slime's windup/lunge must be
   readable without text (squash-stretch + tell). This is a core MVP success
   criterion, not polish.
3. Boone with an idle pose and board-facing placement; weapon/hand presentation
   that isn't a pasted shape.

### 6. VFX & game feel

1. Real **particle systems**: smoke-cache plume, footstep dust, hit impact,
   reward sparkle (replace the stacked-cone plume placeholder).
2. **Hit-pause + camera impulse** on combat, gentle **head-bob** on walk — all
   gated by `prefers-reduced-motion` and the settings menu.
3. **Audio** is a force-multiplier the roadmap under-weights: ambient dusk bed,
   lantern crackle, footsteps, slime SFX, reward sting. Low effort, high "alive."

### 7. Performance & quality tiers

1. Set **asset/draw-call/texture budgets**; cap `pixelRatio` (≤2); KTX2/Basis
   textures.
2. Map **low/balanced/high** presets onto existing `graphicsSettings` concepts:
   shadow resolution, bloom on/off, particle density, instancing distance,
   post-stack depth. Provide a mobile/narrow-viewport fallback.
3. Add an FPS/draw-call debug overlay (stats) gated to dev.

### 8. Tooling & guardrails

1. Extend visual-regression to the **3D route**: screenshot `/render3d.html`
   (build on `scripts/spike_compare.mjs`) and gate it like the Canvas captures.
2. Keep `render_game_to_text()` and the `opening_scene_proof` contract authoritative
   for QA as the renderer changes.
3. Consider **diegetic UI**: Boone's board as a real approachable in-world object
   that opens the DOM panel — closes the prompt/objective/world gap by construction.

## Risk Register

| Risk | Why It Matters | Guardrail |
| --- | --- | --- |
| Rewrite sinkhole | Full rewrites can stall forever | Spike first, ship first five minutes before broader migration |
| Losing working RPG systems | The current systems are the project value | Keep game state and tests as source of truth |
| Three.js becomes messy | Three.js is a renderer, not a full game engine | Build clear core/systems/render/ui boundaries |
| Asset bottleneck | Better engine still needs better art | Start with low-poly kit + manifest + validation |
| Performance regression | WebGL scenes can get expensive | Set asset budgets, quality settings, screenshot and FPS checks |
| Save corruption | Renderer changes must not affect save state | Renderer snapshots only; no renderer objects in saves |
| UI clutter returns | RPG systems can crowd the screen | DOM UI, low-chrome default, objective-first HUD |

## Immediate Action Plan

Steps 1–8 are **done** (Milestones 0–2: prep, Three.js spike, screenshot gate,
decision = Three.js, render snapshot bridge). What remains, in order:

9. Fix the visual comparison gate so it compares old in-world Canvas gameplay
   against new Three.js gameplay, not title/menu state.
10. Rebuild the **first five-minute loop** in the new renderer (Milestone 3).
11. Only then migrate broader systems (Milestones 4–9), pulling from the
    **Graphics: Next-Level Plan** as each scene/character lands.

### Tomorrow Agent Handoff — Start Here

Branch is merged to `main`. The spike is on `main` and runnable today.

- **Run it:** `npm run dev` → open `http://127.0.0.1:5173/render3d.html`.
- **Compare:** `node scripts/spike_compare.mjs` (dev server up) → writes
  `output/spike-compare/{old,new}.png`, asserts no console errors, and verifies
  the Three.js route publishes a `westward-render-snapshot`.
- **Verify (before any commit):** `npm test` · `npm run typecheck:ts` ·
  `npm run test:syntax` · `npm run dev:lint` · `npm run build` (must still emit
  `index.html` **and** `render3d.html`). The Canvas game must stay untouched and
  green.

**Critical first task — fix the comparison proof:**

The current compare script verifies the new 3D snapshot correctly, but the old
Canvas screenshot can still land on title/save/menu UI. That makes the old-vs-new
claim weaker than it should be. Before polishing the scene, make the comparison
apples-to-apples:

1. Capture old Canvas in an actual in-world Dustward gameplay state.
2. Assert the old capture is not title, save, settings, job-board modal, or any
   other non-gameplay screen.
3. Keep the new route assertion:
   `window.__westwardRenderSnapshot.kind === "westward-render-snapshot"` and
   `objective.phase === "accept_bounty"`.
4. Store captures in `output/spike-compare/` only; do not commit screenshots
   until the owner approves them.

**Then do Milestone 3A — art proof before gameplay wiring:**

The five-agent review agreed on the same point: the Three.js spike is the right
path, but it still reads like programmer-art blockout. Tomorrow should make one
first-frame screenshot undeniable before adding broader systems.

1. Recompose the spawn frame around the road:
   - road centered and readable
   - Boone/job board as a near-left landmark
   - Smoke Cache visible down-road
   - Broken Wagon as a shoulder discovery
   - Road Slime as a clear threat
   - watchtower/mesa/town silhouette on the horizon
2. Push buildings out of the camera's face; use them to frame the road instead
   of dominating the frame.
3. Add a stronger palette:
   - purple dusk shadows
   - amber lantern light
   - muted dusty road
   - sickly green slime glow
   - pale smoke plume
4. Add graphic-novel readability:
   - bolder silhouettes
   - contact/blob shadows
   - selective emissive glow
   - subtle vignette/post tone
5. Remove prototype language from the public frame. No visible "render3d spike"
   label in screenshots meant for review.

Acceptance for tomorrow:

1. `old.png` is real Canvas gameplay and `new.png` is the Three.js opening.
2. The first 3D screenshot clearly beats the Canvas screenshot without needing
   explanation.
3. A reviewer can identify road, town, Boone board, Smoke Cache, Broken Wagon,
   Road Slime, and horizon landmark without reading debug text.
4. Canvas remains playable and untouched.
5. Full gates pass before commit.

## Verification Gates

Run before meaningful commits:

```bash
git diff --check
npm test
npm run typecheck:ts
npm run test:syntax
npm run dev:lint
npm run build
```

Run when player flow, UI, save, or renderer behavior changes:

```bash
npm run test:smoke
```

Run when visuals change:

```bash
npm run test:visual:capture
npm run test:visual:review
npm run test:visual
```

Run before release handoff:

```bash
npm run package:itch
```

## Current Repo Note

As of 2026-05-24, Milestones 0–2 are landed on `main`: the Canvas polish pass is
committed as the reference build, the Three.js spike lives behind the
`render3d.html` dev route, and the first plain render snapshot bridge feeds that
spike without coupling game state to Three.js. The Canvas renderer
(`src/main.js`) is the reference and remains untouched by spike work.

Do not delete the Canvas renderer or mix Canvas changes with renderer-rewrite
work in one commit until Milestone 8 (System Parity proven, then retire).
