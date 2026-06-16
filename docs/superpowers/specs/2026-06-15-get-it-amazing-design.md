# Get It Amazing — visual + density push (design)

**Date:** 2026-06-15
**Status:** Approved direction (owner: "go all the way 1+2+3"); execute after Phase 1 hardening lands.
**Goal:** The next time the owner opens the game, the first thing he sees makes the old "closet / looked like shit" memory embarrassing.

## Evidence of current state (measured, not assumed)

- Captured the live look (hardware-GL fastshot, golden/dusk): `~/agents/screenshots/dustwater/fast/state-*.png`.
  - Not a closet anymore. Real WebGPU look is ON in a foreground Chrome (grounding + godrays).
  - The game **spawns facing east INTO the cluttered town interior** (PLAYER_SPAWN {9.5, 8.5}, yaw 0).
  - The **ground is a flat empty tan plane** — the open range reads sparse.
  - The **HUD (job board panel + bounty toasts + field map) crowds every frame**, even mid-ride.
  - The **best-looking frame is dusk** with emissive lamps ("neon on clapboard").
- M0 draw-call baseline (WebGPU, foreground Chrome, `__westward3dStats()`):
  | Pose | calls | meshes | materials | shadowCasters | tris |
  | --- | --- | --- | --- | --- | --- |
  | town (9.5,8.5) | 504 | 3504 | 665 | 1158 | 112,678 |
  | open_range (60,12) | 612 | 3504 | 665 | 1158 | 127,319 |
  | marsh (48,16) | 720 | 3504 | 665 | 1158 | 131,209 |
  - 3504 meshes are built once and never culled by distance. M0 target: **< 400 draw calls in town**.
  - OPEN_RANGE_BOUNDS = {minX:-78, maxX:150, minY:-60, maxY:90} = 228×150; flora builders emit ~8 meshes/placement.

---

## Phase 2 — The First 60 Seconds (no engine work; fast, low-risk)

### Move 1 — Open on a hero vista, not the town interior
- **Change:** the opening frame faces the mesa skyline / open range, then rotates into the street during the push-in.
- **Files:** `spike.js:4684-4742` (`camIntroStart`/`CAM_INTRO_DUR` push-in), `spike.js:4697` (`introLookTarget` currently aims at the jobBoard), `spike.js:3800` (`player.resetCameraBehind(yaw)` at first-road spawn — **yaw is NOT guarded**), `frontierLayout.js:544-571` (`BOUNDARY_RING` north mesas, the silhouette ridge).
- **Approach:** at `camIntroStart`, set the camera heading NW/N (toward the boundary mesas + open range) for the early push-in segment, then drift to the jobBoard target by settle. Pure change to the push-in's starting `setLookTarget` + the spawn yaw — **no PLAYER_SPAWN coordinate move, no HERO_OBJECTS move.**
- **Guardrail:** the `?visual` dusk baseline uses `applyHeroCamera()` (`spike.js:3100-3110`, a hard-set pose) — the push-in/spawn-yaw is invisible to it. **No re-bless.** No `firstFrameSlabBlockers` impact (spawn is not a placement).

### Move 2 — Melt the HUD during free-roam, restore on interaction
- **Change:** job board panel + bounty toasts + field map fade to near-zero opacity when there's no active interaction; fade back in on approach/board-open/combat.
- **Files:** `index.html:940-954` (existing `.hud-hidden`/`.hud-reveal` opacity transitions to reuse), `index.html` `#job-toast`/`#job-tracker`/`#field-map`, `interactionSystem.js:109` (`interaction.nearest`), `spike.js:4800` (`interaction.update` per frame), `spike.js:4826-4831` (0.18s sync gate to hang the toggle on).
- **Approach:** signal `hudActive = interaction.nearest !== null || boardModalController.isOpen() || encounter?.getState()?.active`. Add a `hud-dimmed` CSS class (opacity ~0.08, `pointer-events:none`, ~1.2s ease) toggled on the three clutter panels with a ~3s pre-dim delay (no flicker during travel). Keep `#objective`, `#prompt`, `#hero-panel` visible for orientation.
- **Guardrail:** opacity-class fade rides on top of existing `display` state (avoids the specificity war `syncProductionHud` handles). `getHudFantasyMetrics` reads `el.hidden`, not opacity → tests unaffected. `visualCapture` bypasses (nearest is null in capture). **No re-bless.**

### Move 3 — Push the dusk/emissive mood + fog depth grading
- **Change:** at boot the player sees the **goldenHour** palette (`dayTime=0.25`, `spike.js:2688`). Thicken its haze + punch its emissives so the flat ground reads as intentional aerial perspective and the lamps glow like dusk.
- **Files:** `timeOfDay.js:75-120` (`goldenHour` palette — fog density 0.01→~0.013, fog color neutral grey → warmer `#b09a88`, bloom 0.44→~0.55, hemi.ground `#4e4a40`→`#5a5240`), `atmosphere.js:192-243` (`applyPalette` writes fog).
- **Guardrail:** the baseline pins **dusk** via `pinClock(clock,"dusk")` (`spike.js:2689`). **All `goldenHour`/`day` palette changes are golden-safe.** Do NOT touch `dusk.*`, `createRenderer.js:79-81` (ACES tone map / exposure 1.05 / sRGB), or atmosphere defaults dusk falls back to, **without a deliberate `npm run test:visual:update` + eyeball.** Default stance: stay in goldenHour; only re-bless dusk if a dusk change is truly wanted.

### Move 4 — Declutter the town silhouette / fix foreground framing
- **Change:** the worm's-eye view through the production frontage walls is the problem; Move 1 (facing away from it first) is the primary fix. Secondary: nudge the foreground frame props into the wide vantage; shrink the two nearest town buildings.
- **Files:** `frontierLayout.js:493-496` (`FOREGROUND_FRAME` snag x7.4/cart x8.1 — pull east to ~x10.5–11, keep y outside the [6.5,11] wedge), `frontierLayout.js:247-256` (`TOWN_EDGE` — shrink `heroTownSaloon`/`heroTownStore` size 0.92/0.78 → ~0.75/0.65).
- **Guardrail:** `deadTree`/`cart` are not in `BUILDING_KINDS` → `firstFrameSlabBlockers` audit unaffected. Layout-only, **no re-bless.**

**Phase 2 outcome:** opening + first ride look composed, moody, intentional — a real first impression — with zero engine work and (almost) zero baseline risk.

---

## Phase 3 — M0 Density (the big lever; real engine work)

**Why:** the flat empty ground is the #1 "looks like shit" factor and it's an engine limit — draw-call-bound, so no grass/scatter/draw-distance yet. M0 = WebGPU batching → density + sightlines.

**Crux (from research + baseline):** per-mesh flora builders (`buildSagePatch` ≈8 meshes/placement, `buildBrush`/`buildCactus`/`buildReeds`) over the 228×150 range emit ~1000–1400 open-range meshes alone. Scatter (`scatter.js`) is ALREADY instanced and golden-safe — that's the template.

**Ordered steps (each self-contained):**
1. **Baseline recorded** (done above; fill `roadmap.md` M0 table). Targets: ≥5× frame-time, <400 town draw calls.
2. **Flora → InstancedMesh.** Replace `buildSagePatch/buildBrush/buildCactus/buildDeadTree/buildReeds` (`spike.js`) with one InstancedMesh per (kind,color) bucket, matrices from world pos+yaw+size (mirror `scatter.js:38-81`). **Keep placement deterministic** (seeded, no `Math.random()`) so the golden frame is stable. Extract to `src/game/world/flora.js` (spike.js is ~4969 lines — god-file rule).
3. **Road ruts/planks → InstancedMesh** (`routeRuts`/`routePlanks`, uniform geometry).
4. **Tumbleweeds → InstancedMesh** (3 today; easy).
5. **Distance culling** for open-range flora in `stepWorld` — hide `placementNode.visible` beyond ~80u with hysteresis (show<75/hide>85). Cuts both draw calls and the 1158 shadow-casters.
6. **Demote WebGL2 fallback** to the `reducedFidelity` flag (normalize `scatter.js`/`weatherView.js` off `backend===webgl`).
7. **CI draw-call ceiling** — assert `__westward3dStats().calls < 400` at town in a perf test.
8. **Then add density** — with batching landed, raise flora/grass density for the lush look (the actual payoff).

**Open questions to resolve during execution:** do GLB-model flora (`sageCluster.glb` etc.) dominate over procedural builders? (If so, batch the GLB path too — extract geometry into InstancedMesh.) Confirm `materials(665) << meshes(3504)` means the nprMaterial cache is healthy.

**Risks:** InstancedMesh shares one `castShadow`/material per batch (fine for flora — no per-instance opacity); cel/ink Sobel + GTAO are screen-space, immune; golden baseline runs WebGL2/SwiftShader in CI and is safe if placement stays deterministic.

---

## Sequencing & guardrail summary

1. **Phase 1 HARDEN** (audit running) → fix every real bug (TDD) → boot-verify. **No src edits until this lands.**
2. **Phase 2** (this doc) → execute the 4 moves → capture before/after → **owner checkpoint: "here's the new opening."**
3. **Phase 3 M0** → batching steps 1–7 → density step 8 → capture → owner checkpoint.

**Guardrails that gate this work:** dusk golden baseline (stay in goldenHour; deliberate re-bless only), `firstFrameSlabBlockers==[]` (no BUILDING_KINDS in the spawn→board wedge), `HERO_OBJECTS`/`FIRST_FIVE_ROUTE` lockstep (untouched by all moves), `PLAYER_SPAWN` coordinate pinned (yaw is free). Deploy stays **held** for the owner's word.
