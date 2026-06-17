# RUSTWATER — Next-Agent Handoff

**This is the ONE handoff. There is never more than one.** Rewrite this file at the end of a
session; delete stale/dated session docs — do not accrete a pile of them (owner rule, 2026-06-15).
Durable canon is separate and stays: the design canon is [`rustwater-treatment.md`](rustwater-treatment.md)
(cyberpunk-western open-world RPG — *Red Dead* geography, *Cyberpunk* flesh, *Fable* bones), the
engine/execution plan is [`roadmap.md`](roadmap.md) (M0–M4), engine truths are in `CLAUDE.md`.

Last updated: **2026-06-17** · branch **`feat/westward-believability`** merged to LOCAL `main`
(NOT pushed — deploy HELD). Gate: **866 vitest, tsc clean, build ok.** Dusk golden gate is
**pending a DELIBERATE re-bless** — the Phase A lighting below moved the dusk frame on purpose
(god-rays/split are now live); re-bless once the look is signed off, not before. live:
westward-rpg.vercel.app · play: `npm run play` → :5191 · dev: `npm run dev` → :5180.

> ## ⭐ ACTIVE — WESTWARD: THE BELIEVABILITY PASS (brainstormed → planned → underway 2026-06-17)
> Westward (the town) is the HEART of Dustwater — "the one screenshot that says *Red Dead +
> Cyberpunk + Fable*." Owner north star: **the most beautiful browser RPG ever — players assume
> UE5, then 'wait, this is Chrome?'.** Visual canon (owner-provided UE5-grade reference):
> **`docs/art/westward-target.png`** — duster-and-hat rider on a muddy, puddle-reflective main
> street; weathered timber wearing rusted future-tech (antenna masts/cables/neon); the **water
> tower as CATHEDRAL** anchoring the vista in golden god-ray haze. Full approved plan:
> `~/.claude/plans/tingly-squishing-crystal.md` (essence captured here — the single handoff).
>
> **Owner-authorized PIVOTS** (deliberate, supersede prior canon — update CLAUDE.md/art bible in
> Phase E): (1) illustration/never-photoreal → **grounded & weathered (Red Dead-lite)**; (2) cel/ink
> NPR → **naturalistic PBR**, applied **Westward-first** (cel/ink stays global default elsewhere this
> pass). **Blast radius:** lighting + atmosphere + shadow-lag fix went GLOBAL; naturalistic MATERIALS
> are Westward-scoped via a new factory, rolled outward later (the faint ride-out shading seam is
> hidden by the shared golden light + fog). **Owner priority order — drives every call: Lighting →
> Atmosphere → Composition → Materials → Animation → Geometry. No clutter / no asset spam.
> Believability, not realism.** Recipe-first; judge EVERY step on the hero frame.
>
> ### Plan + progress
> - **Phase A — GLOBAL lighting + lag fix — ✅ DONE (commit `f4df225`).** (1) Shadow-lag fix:
>   `shadowMap.autoUpdate=false` (createRenderer.js) + atmosphere flips `needsUpdate` ONLY when the
>   sun/shadow-focus actually moves → standing still pays ZERO shadow passes/frame (was re-rastering
>   ~1158 casters into the 1536² map every frame). WebGPU-only. (2) **Bug fixed:** `lerpPalette`
>   DROPPED godray/split/vignette/bloomThreshold — both live play AND the ?visual capture fell back
>   to postStacks defaults, so every authored cinematic value was DEAD. Now carried (timeOfDay.js).
>   (3) goldenHour godray 0.2→0.3; NIGHT magic: cool moon-blue fill + bloom 1.2→1.6 / threshold 0.80
>   (lamps/neon bloom like a lighthouse). +2 regression tests.
> - **Phase B — naturalistic materials (Westward) + wet street — ◐ IN PROGRESS.**
>   - ✅ **Foundation (commit `9acac0f`):** `createGroundedMaterial(hex,opts)` in
>     `src/game/renderer/materials/groundedMaterial.js` — `MeshStandardNodeMaterial` drop-in for the
>     town builders' `standard()` wrapper; same (hex,opts) contract; real roughness/metalness +
>     emissive + albedo/normal/roughness maps. 9 unit tests.
>   - ✅ **Step 6 + light step 8 — WIRED (this session, gate green 861 vitest/tsc/build; reviewed by a
>     5-lens adversarial workflow).** `standard()` now routes to the grounded factory via a module flag
>     `_groundedTownBuild`, set ONLY inside `buildPlacement` (save/restored around `_buildPlacementDispatch`
>     so it never leaks to ground/hero/lamp/god-ray calls) to `isWestwardTown(p) && GROUNDED_TOWN_KINDS.has(p.kind)`.
>     `isWestwardTown` = x∈[-10,31] → cleanly isolates Westward from Calico (x≤-39) + the eastern open range
>     (x≥33), which stay cel/ink. Re-authored per-surface roughness/metalness (killed the `roughness:1`
>     plaster in `buildWesternBuilding`/`buildWalkInSaloon`/`buildPorch`; weathered metal on water tower /
>     steel-mustang / antenna). Neon contained to warm-saloon-red / cool-store-cyan **gated on the flag**
>     (Calico keeps its magenta/cyan). **Global ink dropped** (`REGION_POST.frontier.edgeStrength` 2.5→0,
>     postStacks.js). Before/after WebGL proof in `~/agents/screenshots/dustwater/fast/b6{before,after,fix}-*`;
>     Calico control confirms no PBR leak west.
>   - ✅ **Golden-hour IBL — DONE (this session, gate green 866 vitest/tsc/build).** `src/render3d/envLight.js`:
>        a pure golden-hour gradient (`goldenHourEnvPixels`, 5 unit tests) → `PMREMGenerator.fromEquirectangular`
>        (sync; renderer.init() already awaited) → `scene.environment` + `environmentIntensity 0.9`, installed
>        (awaited) at boot in `startSpike` right after `createAtmosphere` so the deterministic ?visual capture
>        sees it. Degrades to no-IBL on failure (try/catch). **Verified on the WebGL2 backend** (probe:
>        `scene.environment` set, 224 PBR + 28 metal materials lit, zero console warnings) and an env-ON/OFF
>        A/B (`~/agents/screenshots/dustwater/fast/iblab-env{ON,OFF}.png`) shows warm indirect fill lifting the
>        crushed shadows. So the metals now reflect the warm sky instead of reading dark — metalness can climb
>        toward gleam in Phase C. ⏸️ **Owner: verify on WebGPU** (same TSL graph runs both backends, but only
>        your machine shows the WebGPU result + shadows + god-rays). 🔧 One-line tunable: `environmentIntensity`
>        in envLight.js. ⬜ TODO: modulate it per time-of-day in `atmosphere.applyPalette` (dimmer/cooler at
>        night — it's a static golden-hour env now, slightly warm under moonlight).
>   - ⚠️ **One fact the review surfaced — read before continuing:**
>     - **The GLB-backed main street keeps its baked materials this pass.** `heroTown*` + `production*` +
>        `gate`/`watchtower`/`porch`/`landmark` render as GLB models (assetManifest) — `standard()` (and the
>        PBR pivot) only fires on their GLB-load-FAILURE fallback. So only the WESTERN_SPECS facades +
>        procedural landmarks (church/hotel/waterTower/blacksmith/walkInSaloon/windmill/townGate/steelMustang/
>        antennaMast) visibly pivoted to PBR + everything lost the ink. If the main-street GLB masses must
>        also pivot, that's a separate task (re-author the .glb materials, or replace with procedural).
>     - Known, ACCEPTED trade: routing adds ~40–65 net scene materials (erodes the 665→321 M0 win ~13–20%) —
>       fine while LOOK > perf, revisit at M0.
>   - ⬜ **NEXT (resume here): Phase B step 7 — the wet/muddy main street** (new road-footprint plane,
>     normal+roughness maps, puddle = low-roughness spec — APPROXIMATE, not true SSR; reuse `ground.js`
>     corridor mask; the IBL now in place gives the puddle specular something warm to reflect). Largest
>     genuinely-new build (no UV/texture infra today). Then finish **step 8 palette discipline**
>     (`WESTERN_SPECS` body/trim/roof + `regionArtKits.frontier.walls`) — judge at golden hour; keep the
>     `region-visual-identity.test.ts` cue STRINGS intact.
> - **Phase C — signatures + restrained cyber-aging:** water-tower CATHEDRAL (`buildWaterTower`
>   spike.js:1071, scaffold→tank + WESTWARD banner + tech-ring + holo emblem, scaled to anchor the
>   vista); arch glow-up (`buildTownGate`:920); SPARSE rusted cyber-aging (`buildAntennaMast` exists;
>   solar/cables/flickering neon/broken holo board/peeling ads — emissive-only, no extra lights);
>   water-scarcity signage. Respect `firstFrameSlabBlockers===[]`.
> - **Phase D — a little life (visual only):** gathered silhouettes outside the glowing saloon,
>   musicians, stalls, horses + steel-mustangs at the rail, chimney smoke. Alive, NOT crowded.
>   Townsfolk suppressed under ?visual → golden-safe.
> - **Phase E — extraction + docs + verify + ship:** extract the builder fleet (spike.js:296-1494 →
>   `primitives.js`/`townBuild.js`/`townLandmarks.js`/`cyberAging.js` — the 5k god-file); update the
>   CLAUDE.md art-direction line + art bible (the pivots); RE-BLESS dusk golden; boot-verify in a
>   REAL foreground Chrome via the production path; flip `DEV_LOCK_DAYLIGHT`→golden-hour boot. Deploy
>   HELD for owner.
>
> ### ⏸️ OWNER VERIFY before resuming (WebGPU-only — only your Chrome shows it). Dev: http://127.0.0.1:5180
> Phase A's two big wins don't appear in the headless capture (it runs WebGL: no shadows/god-rays).
> In real Chrome: (1) stand still in town — did the lag ease? (2) press `T` → golden hour: god-ray
> shafts down the street? → night: more beautiful (lamp/neon bloom, moon-blue)? (3) **the one risk:**
> walk around — do shadows still render AND update? (the WebGPU shadow path couldn't be verified
> headlessly; if broken it's a one-line revert of `shadowMap.autoUpdate=false`).

---

> ## DIRECTION PIVOT (2026-06-16 pm) — LOOK before perf  [historical diagnosis — kept so it isn't re-litigated]
> The owner played it and called it **laggy, too dark, character looks Roblox, "the map STILL
> looks like a shitty Reno movie set."** We diagnosed all three live (foreground browser + code map)
> and pivoted from M0-perf to **the LOOK**. Owner's steer: **realism / believable**, and **lock the
> game to DAYLIGHT while we build so imperfections show.** Three-symptom root causes (kept so they
> aren't re-litigated):
> - **DARK** → the world clock DRIFTED goldenHour→dusk→night over ~12 min and the save persisted it,
>   so returning sessions booted dark. NOT a broken light. → **FIXED:** `DEV_LOCK_DAYLIGHT` (spike.js,
>   commit `c2e2466`) boots `day`, no drift, ignores drifted saves. Golden gate still pins dusk.
>   Flip the flag false to restore the goldenHour boot + day/night cycle when the world look is done.
> - **CHARACTER "Roblox"** → was a 792-vert blocky drifter + a floating hip-lantern blob. → **FIXED
>   (hero realism pass, see below).**
> - **LAGGY** → draw-call/submission-bound, and the BIGGEST untouched cost is the **shadow pass**:
>   **1158 casters re-rendered into a 1536² map EVERY frame** — no `shadowMap.autoUpdate=false`, and
>   `setShadowFocus` moves the shadow cam every frame so even standing still pays full cost
>   (atmosphere.js:131-190, spike.js shadow-focus call). WebGPU-only → lands on the owner's machine.
>   STILL TODO (highest perf lever; golden-safe — baseline runs WebGL shadows-off). **Also: a true
>   FPS number is still unmeasured — the Playwright tab background-throttles rAF to 1 Hz, so FPS
>   readings there are garbage. Need a real foreground probe / in-game FPS HUD before tuning perf.**
>
> ### ✅ HERO REALISM PASS — DONE (commits `1195b88`, `54202f7`, `e318d3f`)
> Blockhead → believable hatted drifter, all golden-safe (the `?visual` capture forces the
> placeholder hero, so none of this touches the dusk frame). Before/after shots in
> `~/agents/screenshots/dustwater/fast/` (`char-*` old, `hero3-*` final).
> 1. **Swapped** the 792-vert blob for the **Quaternius "Universal Animation Library"** rig (CC0,
>    login-free raw-GitHub download, ~8.5k verts, true human proportions, 53-joint humanoid, 46
>    clips incl. a pistol set). Files: `public/models/AnimationLibrary_Godot_Standard.gltf`+`.bin`.
>    `resolveClipAliases` (animatedCharacter.js, unit-tested) maps its `Idle_Loop`/`Walk_Loop`/
>    `Jog_Fwd_Loop`/`Pistol_Shoot` → our canonical `idle`/`walk`/`run`/`draw` via `HERO_CLIP_MAP`.
> 2. **Dressed** the untextured mannequin: `createHeroDressMaterial` (nprMaterial.js) — a HEIGHT-ZONED
>    albedo keyed on bind-pose local Y (positionGeometry) → boots→trousers→shirt(+sleeves)→skin,
>    smoothstep-blended, smooth-shaded, through the world cel ramp. `HERO_DRESS` zones in spike.js
>    (tuned to the rig's measured 1.83u T-pose). Killed the garish purple joints.
> 3. **Cowboy hat** bone-attached to `DEF-head` via `Object3D.attach` (`buildCowboyHat`/
>    `attachCowboyHat`, spike.js) — rides the head, covers the featureless mannequin head, reads
>    gunslinger in profile. Removed the floating bedroll/scarf/lantern accents (stubbed).
> NEXT on the hero (deferred, owner said reassess after the hat): facial features, finer texture,
> per-garment detail (a Blender UV-paint pass if we want more than the height-zoned read).
>
> ### ▶ NEXT BIG THING — THE WORLD ("movie set") → NOW ACTIVE
> This complaint became the **Westward Believability Pass** at the top of this handoff (brainstormed,
> planned, underway). The root diagnosis stands: flat-shaded box buildings in garish colours, a flat
> untextured tan ground, no material/atmospheric depth. The plan fixes it lighting-first.
>
> **MEASUREMENT CAVEAT (still true) — read before claiming draw-call wins.** See the M0 section.

---

## M0 / PERF (deprioritised behind the LOOK, but still real)

---

## NOW — where we are

The vision: you inherit the largest water-and-land empire in the Meridian Territory in the first
hour, then spend the game finding out what it costs. Progressive re-skin of the shipped WestWard
engine; playable at every commit; public title stays "WestWard" until the cyberpunk-western
vertical slice exists.

### ✅ This session shipped (all on `main`, NOT pushed)
1. **Phase 1 — hardening** (earlier 06-15): 9 audit-confirmed defects fixed (mount prompt
   visibility, runSave backup recovery, jobBoard Tonic→Potion, slime mid-fight resume, bank POI
   loot, wagon Map-Scrap toast, maxHP-resume collapse). Gate green.
2. **Phase 2 — "The First 60 Seconds"** (4 golden-safe visual moves; commits `28696c7`,
   `5841f14`, `8e7fdfd`, `b1cb478`):
   - **Move 2 — HUD melt**: bounty toast / field map / job tracker fade out after ~3s idle
     free-roam, snap back near an interactable / board-open / combat. Pure `hudDim.js`
     (`hudIsActive` + `computeHudDimState`, 9 unit tests) → opacity-only `.hud-dimmed` class
     toggled in the spike.js loop; gated off in funeral/implant + visualCapture.
   - **Move 4 — declutter**: pulled the foreground snag/cart east out of the worm's-eye wall;
     shrank the two westmost hero buildings. `firstFrameSlabBlockers` stays `[]`.
   - **Move 3 — mood**: deepened the goldenHour BOOT palette (fog 0.01→0.012, bloom 0.44→0.50,
     warmer ground bounce). Dusk untouched → golden-safe.
   - **Move 1 — vista opening**: the establishing push-in now SWEEPS the gaze from the north-mesa
     skyline down to Boone's board (was a worm's-eye stare into the frontage). Pure look-target
     blend; no spawn/yaw move; bypassed under capture.

### ⏸️ OWNER CHECKPOINT — needed before Phase 3
Phase 2's **feel** (the vista sweep + HUD melt are MOTION) can't be judged in the throttled
dev/preview tab — they need a real foreground browser. **Do this first thing:** `npm run play`,
watch the opening (funeral graveside cam → ride past title → the new vista-sweep push-in →
settle on the board) and ride out so the HUD melts, then ride back to the board so it snaps in.
Tunables if any beat feels off: `introVistaTarget` (spike.js, the vista aim point),
`CAM_INTRO_DUR`, `HUD_DIM_DELAY` (hudDim.js), and the goldenHour nudges (timeOfDay.js). Then green-
light Phase 3.

---

## NEXT — Phase 3 (M0): Performance Reset + density  (the owner has flagged lag twice)

This is the big lever and the long-standing "performance first" priority. The game is
**draw-call-bound**: 3504 meshes built once and never distance-culled, per-mesh materials (a
WebGL2-fallback constraint). Full plan: `roadmap.md` M0. Measured baseline (WebGPU, foreground
Chrome, `window.__westward3dStats()`), preserved here so it isn't lost:

| Pose | draw calls | meshes | materials | shadowCasters | tris |
| --- | --- | --- | --- | --- | --- |
| town (9.5,8.5) | 504 | 3504 | 665 | 1158 | 112,678 |
| open_range (60,12) | 612 | 3504 | 665 | 1158 | 127,319 |
| marsh (48,16) | 720 | 3504 | 665 | 1158 | 131,209 |

> ⚠️ **MEASUREMENT CAVEAT (found 2026-06-16, the hard way).** `__westward3dStats().calls` is
> **NOT a reliable per-frame draw count via Playwright** — `renderer.info.render.calls` accumulates
> across the multi-pass post pipeline and is not reset per frame, so reads swing wildly (e.g. the
> SAME town pose read 216, 3492, and 10152 depending on timing). The "draw calls" column above is
> from a foreground DevTools read whose method isn't reproducible here. **Only `meshes` and
> `materials` (a `scene.traverse` count) and `shadowCasters` are trustworthy and reproducible.**
> Before claiming a draw-call number, build the proper probe (step 1) that sets
> `renderer.info.autoReset=false`, calls `renderer.info.reset()` at frame start, and reads
> `.calls` after exactly one settled frame — OR add a per-frame total to `__westward3dStats`.
> Until then, prove wins via `meshes`/`materials`/`shadowCasters` deltas, not `.calls`.

**Target: < 400 draw calls in town, ≥5× frame-time.** Ordered, self-contained steps:
1. **DO THIS FIRST — fix the draw-call measurement.** Re-measure in a real FOREGROUND tab, but
   with a correct per-frame draw count (see caveat above). Probe pattern: a throwaway
   `scripts/_boot_probe_tmp.mjs` (recreate if gone). Fill the `roadmap.md` M0 table with REAL
   numbers; the table above's draw-call column is suspect.
2. **Flora → `InstancedMesh`** — extract to `src/game/world/flora.js`, one InstancedMesh per
   (kind,color) bucket; matrices from seeded world pos+yaw+size (mirror `scatter.js:38-81`,
   already instanced + golden-safe). **Keep placement deterministic** (no `Math.random()`) so the
   golden frame stays stable. (spike.js is ~5000 lines — god-file rule).
   - ✅ **DONE 2026-06-16 (Increment 1): `createRouteSageField` → `flora.js`.** The first-road
     sage field was ~605 individual `THREE.Mesh` with the per-blade-material anti-pattern; now 4
     `InstancedMesh` (one per colour). Placement ported byte-identical (same seedValue sin-hash,
     same `n`-per-clump order) → golden frame unchanged (PASS 4.15% vs 4.11% baseline noise).
     Verified WebGPU foreground: **scene meshes 3504 → 2903 (−601)** — the reliable proof (601
     blade meshes collapsed to 4 InstancedMesh). (An earlier "town draws 504→216" claim was
     RETRACTED — see the measurement caveat; `.calls` isn't trustworthy here.)
     Pure helper `routeSageBlades(route)` is unit-tested (`tests/world-flora.test.ts`, 8 cases).
     0 console errors on boot. **NO reducedFidelity halving** added (full density on both
     backends) so the blessed baseline didn't move — fallback halving is step 5's job.
   - ⬜ **STILL TODO: the per-kind procedural flora** — `buildSagePatch`/`buildBrush`/`buildCactus`/
     `buildDeadTree`/`buildReeds` dispatched per-placement (frontierLayout `openRangeWilderness`
     + road-shoulder `routeNaturalClusters` + authored arrays; ~962 world flora meshes). Convert
     to a single `createFloraField`-style builder called once at assembly (like `createScatter`),
     bucketed by (kind,color). RISK: keep `frontierLayout.js` placement DATA byte-identical (the
     layout tests assert on kinds/coords/labels, NOT meshes — see
     `render3d-frontier-layout.test.ts`: `naturalClusterCount>=24`, `firstFrameSlabBlockers===[]`).
     The near-spawn road-shoulder sage (`ROAD_FLORA` ~x10–13,y6) IS in the dusk frame — reproduce
     its transforms exactly or the golden gate trips.
   - KNOWN CLEANUP (benign): `createScatter` is passed `reducedFidelity` (spike.js call) but
     `scatter.js` only destructures `backend`; the arg is dead (halving still works off
     `backend==="webgl"`). Unify scatter + flora on the `reducedFidelity` flag during step 5.
3. Road ruts/planks → InstancedMesh; tumbleweeds → InstancedMesh (3 today, easy).
4. **Distance culling** for far flora — ✅ **DONE 2026-06-16 (Increment 2).** `floraVisibleAt`
   hysteresis helper in `flora.js` (show 75u / hide 85u, squared-distance, unit-tested) + a
   per-frame pass in the loop (after `updateOcclusionFades`) that toggles `node.visible` for
   `FLORA_CULL_KINDS` = {cactus, deadTree} in `placementNodes`. **Gated on `!visualCapture`** so the
   dusk golden frame keeps every flora (PASS 4.12%). Adversarially reviewed: golden-safe, no fight
   with the opacity-based occlusion fade, no permanent-hide path. ⚠️ **Draw-call benefit is
   UNMEASURED** (see caveat) and the 85u pop-in wants the owner's eye on a real ride — radii are
   one-line tunable (`FLORA_CULL_SHOW`/`FLORA_CULL_HIDE`). sageCluster/roadGrass are ALSO tracked
   (model path) and could join `FLORA_CULL_KINDS` later for a bigger cull.
   - ✅ **Also Increment 2: contact-shadow material/geometry sharing.** `addContactShadow` minted a
     fresh `CircleGeometry` + 2 raw `MeshBasicMaterial` per call scene-wide (~172 nodes). Now one
     shared unit-circle geo + 2 shared materials (penumbra 0.32 / core 0.46). Pixel-identical
     (golden PASS); **materials 665 → 321 (−344)** — reliably measured. Discs stay parented (still
     cull/move with their node). Full disc→InstancedMesh folding (mesh-count win) deferred:
     decoupling from parents complicates the cull + occlusion-fade.
5. Demote the WebGL2 fallback to a `reducedFidelity` flag (halve scatter+weather pools, castShadow
   off); the fallback bans (no instancing/shared-materials/lines/points/hand-built indexed
   geometry) then apply ONLY to the reduced path.
6. **CI draw-call ceiling** — assert draw calls `< 400` at town. BLOCKED on step 1: `.calls` isn't
   a reliable per-frame count yet (see caveat). Until the probe is fixed, gate on the reproducible
   `meshes`/`materials`/`shadowCasters` traversal counts instead, then add the `.calls` ceiling.
7. **Then add density** (step 8 = the payoff): with batching landed, raise flora/grass density for
   the lush *Red Dead* look the flat tan plane is currently missing.

The WebGPU decision is already wired: `createRenderer.js` resolves `backend` ("webgpu"|"webgl");
full fidelity becomes WebGPU-only.

## LATER (after M0)
- **M1 — mission 1.1 "Dust to Dust"**: the funeral cold-open already partly exists (graveside
  camera, `funeralCam`, `funeral`/`implant` phases, the Executor). Build it out to replace the
  first-road spawn beat. TRIPWIRE: `tests/render3d-phase-state.test.ts` passes UNTOUCHED until the
  new mission machine replaces the loop beat-for-beat. S7 courier-quest wiring (jobBoard
  `frontier_eastwater_run` + questRuntime) is the integration template.
- **Standing HUD panel** (teed up earlier, still unbuilt): make `game.factionRep` /
  `executorApproval` / named-NPCs-met VISIBLE — a toggleable `#standing-panel` built with the
  `boardDom.js` createElement/textContent pattern; default `hidden` (golden-clean).
- **Water**: planar reflections + particle foam (WebGPU, behind a quality flag), the Calico east
  canal, the Caldera headwaters (`docs/water-plan.md` "LATER").
- **Shop UI** (engine shipped: shopCatalog/tradeWithVendor/economyServices): clone the board-modal
  pattern → M2's business UI.
- **Design backlog (owner sessions — do NOT improvise canon)**: Act 2 beats, full skill trees
  (GUN/IRON/WIRE/TONGUE/TRAIL), the eight romance characters, economy math, the Seizure script.
  Prompt Boyd.
- One-line README note that the project is evolving toward RUSTWATER (deferred; README still
  markets WestWard, the public name for now).

---

## How to run + verify
```bash
npm run play                                      # build + serve → http://127.0.0.1:5191/ (foreground!)
npm run dev                                       # dev server :5180 (HMR broken in-game: hard-reload)
npx vitest run && npx tsc --noEmit && npx vite build         # the gate (chunk-size warning expected)
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d     # loop smoke (needs dev server)
WESTWARD_URL=http://127.0.0.1:5180 npm run test:visual       # dusk golden gate (:update deliberately only)
```
Controls: WASD move, Shift run, Space dodge, E use, F draw, 3 field-map, T time-of-day, G weather,
M mute. Headed captures → `~/agents/screenshots/` (NEVER the repo).

## Hard-won gotchas (beyond CLAUDE.md)
- **The local visual capture flakes/hangs under CPU load** (SwiftShader). It wedges if you poll
  while it runs — launch it idle, do NOTHING else, wait for exit. Trust the diff image, not the
  percentage; ~4% is normal baseline noise (PASS threshold is 10%). Kill + re-run idle if wedged.
- **Never edit watched files while a browser gate runs** — Vite reloads mid-capture and the
  screenshot races the reboot (a 37.9% "diff" was pure artifact). Finish edits, then gate.
- **The dev/preview tab is THROTTLED** — screenshots show static composition only; motion/weather/
  combat don't animate, synthetic keys don't reach the game (pointer-lock). Judge motion in a real
  foreground browser. `__spikeReady` lags in occluded tabs even when fully loaded.
- **Inspect without driving**: `window.__spike.setPos(x,y)` / `.goto('roadSlime')` /
  `.captureMode()`; `window.__westward3dTest.setTimeOfDay("day")` pins a palette;
  `window.__westward3dStats()` for draw calls.
- **"Game won't start" / "boots dark"**: dead local server (→ `npm run play`) or a stale save
  carrying the world clock (→ `indexedDB.deleteDatabase('westward')`).
- Parallel worktree agents can silently cwd into `.claude/worktrees/agent-*/` → gates run on the
  WRONG TREE (~541 tests instead of 833+). `cd` absolutely; check `git branch --show-current`.

## Standing guardrails (full set in CLAUDE.md)
Dusk golden baseline re-blessed deliberately only · layout floors only rise ·
`firstFrameSlabBlockers === []` · spawn wedge x[9.5–16] y[6.5–11] clear of tall buildings ·
`HERO_OBJECTS` + `FIRST_FIVE_ROUTE` untouched until M1 replaces the loop · WebGL2 fallback =
per-mesh materials until M0 demotes it · all motion multiplies by the `fdt` freeze · audio
synthesized-only · **owner priority NOW: the LOOK (Westward Believability Pass, top of handoff)** —
M0/perf is deprioritised behind it (the shadow-lag fix already landed as part of Phase A).
