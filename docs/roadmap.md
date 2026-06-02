# WestWardRPG Execution Roadmap — 3D Hardcore Rebuild

> **Direction confirmed 2026-06-02: this 3D rebuild is the single direction.** An
> architecture audit briefly recommended the opposite — ship the Canvas game and
> archive this 3D work — on the grounds that ~100% of the systems and the ~1,250-test
> suite live on Canvas while the 3D build is ~10% complete. After reviewing both
> builds side by side, the product owner **overrode that recommendation**: the 3D look
> is the product, and the project will not carry two renderers.
>
> The audit's one durable caveat is folded in as the **migration rule**: the Canvas
> build is the *behavioral oracle*, and its renderer-agnostic systems + tests are
> **ported** into the 3D game (not reimplemented, not deleted) — the Canvas raycaster
> is retired only once the 3D build reaches parity. See §8 port-ledger.

Single source of truth. Do not create parallel `TODO.md`, `PLAN.md`, `ROADMAP-*.md`,
or another roadmap file.

Last updated: `2026-06-02`
Branch: `main`

---

## 1. Summary — what we are building and why

WestWard is being **rebuilt from scratch as a full 3D hardcore western RPG** in Three.js.
The Three.js renderer (`src/render3d/`, today a placeholder-geometry spike) becomes **the
game**. The previous plan — keep the Canvas game as the reference and *migrate* it to 3D
parity over Milestones 4–9 — is **superseded** (kept for the record in the Legacy appendix).

Four decisions define this roadmap:

1. **Game identity** — the new game *is* WestWard: Dustward frontier, three factions
   (workers' guild / civic council / market cartel), the 8-quest story chain, 10+ endings
   driven by three ideology axes (controlVsFreedom, truthVsComfort, solidarityVsStatus).
2. **Rebuild fresh in 3D** — the Canvas `src/main.js` (11.3k lines, ~100 modules, 1101 tests)
   is a **design reference and behavioral oracle**, not code to port wholesale. Native 3D
   systems replace it; Canvas is frozen as `legacy/`.
3. **"Hardcore" = both** — the *game* is hardcore (permadeath/ironman, survival stakes,
   brutal/scarce economy, punishing deterministic combat) **and** the *build* is ambitious,
   no-shortcuts quality.
4. **Full game** — all three regions (Frontier, Ashfall, Ironlantern), the complete story,
   mini-bosses, NG+, commercial-scope content.

The two non-negotiables carried over from the prototype: the **pure-logic + thin-shell
testing discipline** and the **layered quality-gate stack**. The biggest risk of a fresh
rebuild — losing the correctness encoded in 1101 tests — is managed by the **port-ledger**
(§8) and by using the Canvas build as a **golden oracle**.

---

## 2. Cross-cutting principles (apply to every phase)

### Three axes of "hardcore," independently tunable
Keep this vocabulary so every later decision lands in the right bank:

- **Run-rules (meta-permanence)** — ironman / permadeath / save-scummability. A *save-model*
  property; immutable for the life of a run.
- **Lethality (combat math)** — time-to-die, poise/posture, stamina economy, healing scarcity.
  A *combat-model* property; continuous.
- **Pressure (world/economy)** — survival drain, scarcity, danger-scaling by region/time/weather.
  A *world+economy* property; continuous.

The **identity (un-multiplied) tuning IS the lethal one**; "assists" multiply *toward*
survivability. This inverts the Canvas default (forgiving base + difficulty multipliers) — which
is precisely why a fresh build, not a port, is correct.

### Pure / shell discipline (non-negotiable)
Every module = a pure exported function (unit-tested in node, no WebGL/DOM) + an optional thin
Three.js/DOM shell (covered by smoke). Logic living in a shell is rejected in review. Vitest stays
`environment: "node"`. The seed modules already model this: `playerController.stepPlayer`,
`worldProxies.resolveCollision`, `phaseState.transitionLoopPhase`.

### Correctness via port-ledger + golden oracle
Maintain the §8 ledger (`module · canonical test · tier · ported? · green?`). **Port the test
file first, then make it pass.** Where rules are re-tuned (Tier B), keep the Canvas module as
`…Legacy` in the test harness and write **differential/characterization tests** — identical where
behavior should match, lethality invariants where it diverges.

### Signature over fidelity (the look is the engine's identity)
The render path is **non-photorealistic by design** — a stylized "moving graphic novel," not a race
toward realism we can't win solo (see §3). The NPR uber-shader, ink edges, and per-region post stack
are *core architecture*, not late polish, and they serve gameplay readability (parry / stamina /
hazard), not decoration.

### Three new standing gates (enforced every phase)
- **Determinism gate** — because the sim is event-sourced (§3, Bet 2), a recorded `(seed, input-log)`
  replays to an identical state hash, headless (no renderer). This *is* the architecture, not an
  add-on test.
- **Perf gate** — draw-call / frame-time / triangle / light-count budget asserted in the render
  smoke; build fails on regression.
- **Golden-image gate** — per-shader and per-region post-stack snapshots (extends the pixelmatch
  `test:visual`) so the signature look can't silently regress.

### Preserve the existing gate stack & infra
`npm test` (vitest) · `typecheck:ts` · `test:syntax` · `dev:lint` · `build` · `test:smoke`
(Playwright + its *semantic* state assertions — port those invariants) · `test:render3d` (loop
smoke) · `test:visual` (pixelmatch). Keep Vite dual-entry, Vercel (CSP-strict) + itch.io offline
ZIP, and the multi-language maintenance scripts.

---

## 3. Graphics Engine & Code Architecture (the elevated layer)

The throughline: **an event-sourced, render-decoupled core is what makes a GPU-heavy stylized
look testable, deterministic, and hardcore-anti-cheat-friendly at once.** Architecture and
aesthetic are one decision here, not two. Four committed bets, threaded into the phases below.

### Bet 1 — A signature NPR look ("a moving graphic novel")
The engine's *core render path* is non-photorealistic, not a post-hoc filter:
- A **TSL uber-shader**: cel/toon ramp + rim light + **ink edges from depth/normal discontinuity**
  (a real edge-detect post pass — retires the backface-expansion hack) + cross-hatch / halftone
  shadow fills + paper grain.
- **Per-region post identity** (promote each palette's `grade` to a full stack): Frontier = golden
  dust + bloom + grain; Ashfall = heat-haze refraction + bleached LUT + chromatic edges;
  Ironlantern = scanline/CRT surveillance vignette + neon-rain.
- **Graphics serve the hardcore design:** ink-edge flare on a successful parry; halftone darkens as
  stamina drains — the look *is* combat readability and hazard pressure, not decoration.

### Bet 2 — Event-sourced, data-oriented core (game = pure fn of `(seed, input-log)`)
- **Fixed-timestep, command/event-sourced simulation.** Entire game state is reconstructable from
  seed + input-log. From this one commitment fall: first-class **replay** (building on
  `replayRecorder`), time-travel debugging, a trivial **determinism gate**, **save = seed + input
  tail** (tiny, tamper-evident → the ironman anti-cheat posture), and netcode-readiness.
- **ECS** (archetype-based, systems in fixed order) for cache-friendly hardcore swarms / projectiles
  / particles and deterministic ordering — composition over the 11.3k-line monolith.
- **Render-command abstraction:** the sim emits an immutable render-state; the renderer is a *pure
  consumer*. The pure/shell split at macro scale — the sim is fully node-testable and
  **headless-runnable** (balance/soak with no GPU); the renderer is swappable.

### Bet 3 — WebGPU + TSL (with a WebGL2 fallback)
Build on Three's **WebGPURenderer + TSL** (shaders authored in JS → WGSL *and* GLSL). Unlocks
**compute shaders** (GPU particles, GPU culling, slices of sim) and a single authoring path for the
uber-shader. A **Phase-1 decision** — the material system sits on it. Keep the WebGL2 fallback so
itch.io / Vercel / older GPUs still run.

### Bet 4 — Atmosphere & lighting as the western's soul
- **Clustered / forward+ lighting** — retire the "keep light budget tight" constraint; lanterns, the
  watchtower beacon, muzzle flashes, slime glow coexist. **Light becomes a night-survival resource**
  (darkness = danger → hardcore pillar).
- **Volumetric god-rays** through mesa silhouettes, height fog + aerial-perspective desaturation,
  **GPU dust motes** in light beams, heat shimmer, embers.
- Evolve `atmosphere.js` / `timeOfDay.js` from 3 discrete palettes to a **continuous sun/moon arc**
  with color-temperature scattering.

**Guardrail:** "no shortcuts" must not curdle into "never ships." The signature look has to be
provable in **one region** (the Phase-3 slice gate, now a *fun AND beautiful* gate) before mass
production.

---

## 3.5 Current Status & Immediate Queue

### ✅ Shipped to main (Vercel Production)
- **NPR render path** — WebGPURenderer + TSL, cel+rim uber-material, depth-discontinuity ink edges, bloom, vignette, film grain, continuous day/night arc.
- **Terrain relief** — FBM displacement on the ground plane (masked flat in the road corridor + marsh so props don't float), valley-AO albedo, 96×88 segments.
- **Hero capture camera** — elevated SE→NW 3/4 angle, FOV 54, `?visual` only. Composition now reads: town, road, depth, warm lamp pool visible.
- **Golden-hour lighting pass** — low amber sun (y 2.5, intensity 2.2), deep cel ramp `[55,135,255]`, strong cool rim (0.9/pow2), tightened shadow cam.
- **Scatter × 3.5** — 320 motes, cracked-mud + dry-grass variety, road-density gradient; motes seated on terrain.
- **Milk-kill** — fog 0.0075 + bloom threshold 0.9; pink haze gone.
- **6A/6B/6C** — prop detail, hero rig (Run/Turn/Draw), interactive NPCs (Mabel/Cole/Rosa/Hank/Pearl).

### 🟢 Merged opening polish — first five-minute 3D slice
Goal: make the first five minutes read like a playable RPG instead of a static beauty shot.

Merged scope:
1. Exploration camera is tuned to the requested third-person RPG range and smoothed through named presets in `src/render3d/playerController.js`.
2. Player readability is reinforced with a subtle in-world ring and overhead marker attached to the character.
3. Boone's job board gains an in-world objective ring, floating pointer, and road beads so the route is visible without relying only on the DOM objective strip.
4. Foreground props between camera and player fade down instead of fully swallowing the character.
5. The first road is wider, less cluttered, and visually calmer under the dusk lighting stack.
6. Screenshot comparison now validates the actual `Follow the Road` opening loop state.

### 🟡 Active max-mode branch — make the first five minutes actually good
The current 3D slice is a proof, not a finished opening. The next work must prioritize playable
truth over more decoration: readable world shape, verbs, pacing, and validation that matches what a
player sees.

Active branch: `codex/first-five-minutes-max-mode`

Implemented in this recovery pass:
- Longer S-shaped first-road route with explicit phases from spawn through Old Road Survey teaser.
- Board choice with `accept_bounty`, `ask_danger`, and `inspect_survey` follow-up copy.
- Required road micro-beats: marshal sign, Pearl's warning, slime tell before combat.
- Blender mini-kit registered through `assetManifest.js` for board, planks, lamps, saloon facade,
  wagon salvage, mesa silhouettes, and slime tell.
- Click-focus pointer-lock, Escape release, camera reset, and camera avoidance for major world
  proxies.
- Route metrics and visual gates for first-frame player/board visibility, 4-6 minute pacing, HUD
  footprint, road readability, and overbright highlights.

Added in the max-mode polish pass:
- Second Blender mini-kit for Boone board awning detail, road rut strips, broken fence/scrap
  silhouettes, marsh slime trail cluster, hero wagon wreck, town facades, and mesa skyline pieces.
- Cleaner first-frame composition: player + board pool of light, open road, town edge, distant mesa
  and marsh-threat lane, with slab-like foreground masses moved out of the playable frame.
- Beat-specific visual payoffs: Pearl's down-road cue, pulsing slime tell before aggro, Map Scrap
  reveal, and a changed Boone board state after return.
- Second-pass art lift for the branch: more detailed facade silhouettes, stepped mesa skyline assets,
  road dust ribbons, local light pools, warmer road/terrain colors, and less red foreground wash.
- Third-pass feel/readability lift: compact route-progress HUD, transient beat feedback for each
  interaction payoff, a visible slime combat cue/defeat splash, and darker road/light-pool material
  tuning so the first frame no longer reads as a washed-out debug runway.
- Shared GLB material reskin now uses a warmer, lower rim so authored assets keep the graphic-novel
  outline without bleaching road planks, fences, or facade faces.
- New-art-direction map pass: a compact Three.js-route field map in `spikes/render3d.html` now shows
  the authored road, Boone board, Smoke Cache, marsh threat, wagon salvage, return path, and survey
  upgrade state without falling back to the legacy Canvas presentation.
- Debug probes and visual gates for composition blockers, controlled dusk lighting, beat visibility,
  and route-frame target readability.

#### P0 — Cut the visual mud
- Replace the flat box-town foreground with a cleaner composition: one saloon facade, one board
  corner, open road, marsh reveal, and distant mesa silhouettes.
- Author a small Blender asset set for the opening: road planks/ruts, Boone board, two lamp posts,
  one wagon, one saloon porch, one mesa kit, one slime-readable marsh prop cluster.
- Set hard lighting budgets: no blown white lamps, no giant screen-wide shafts, no opaque foreground
  blocker, no objective UI covering the walking lane.
- Exit gate: first screenshot must show player, road, board, next landmark, and threat space within
  two seconds with no explanation text.

#### P1 — Turn it into five minutes of play
- Expand the loop from "walk to four targets" into a paced route:
  spawn orientation → board choice → road walk → cache clue → slime ambush → wagon salvage →
  return to Boone → next-job teaser.
- Add one real choice at the board: accept bounty, ask about road danger, or inspect old survey.
  The choice should change one prompt, one reward line, and one follow-up objective.
- Add three micro-beats on the road: a sign read, a short NPC bark, and a visible slime tell before
  combat starts.
- Exit gate: a fresh player can spend 4-6 minutes without repeating content or wondering where to go.

#### P2 — Fix camera and input feel
- Move from drag-look to click-to-focus / pointer-lock with an explicit escape path.
- Add camera collision, wall avoidance, and a shoulder swap so buildings cannot swallow the hero.
- Add sprint stamina feedback and a one-button camera reset behind the player.
- Exit gate: WASD + mouse feels natural for 60 seconds in town, road, and marsh spaces.

#### P3 — Replace placeholders with authored assets
- Use Blender for low-poly western silhouettes with consistent scale, pivots, and material names.
- Ship GLB assets through the existing `assetManifest.js`, not one-off procedural replacements.
- Keep primitives only for debug helpers, collision proxies, and temporary blockers.
- Exit gate: the opening screenshot looks intentionally art-directed, not like debug boxes with bloom.

#### P4 — Proof-quality validation
- Add a visual acceptance script that checks more than nonblank pixels: player silhouette, road width,
  board visibility, HUD footprint, and lamp overexposure.
- Record a deterministic 60-second route video or frame strip for GitHub review.
- Keep `npm test`, typecheck, syntax, build, render3d smoke, and `spike_compare` as required gates.
- Exit gate: a reviewer can compare before/after from artifacts without running the game.

#### Do not do next
- Do not add more fog, bloom, particles, or god rays until the road, camera, and first loop are good.
- Do not expand the world boundary before the opening route is readable.
- Do not write more roadmap language unless it changes what ships or what gets validated.

### 🟡 Ready to merge — PART 7 atmosphere (`feature/part7-atmosphere`, local only)
- `dustMotes.js` — sun-shaft ambient specks, hidden under `?visual`
- `heatShimmer.js` + test — horizon-weighted horizontal resample wobble; amp=0 under capture
- GTAO opt-in via `?ao` — de-risk PASSED on SwiftShader WebGL2 (not black, no errors, correct darkening). Left off-by-default pending golden re-baseline + user sign-off.

Merge after grade is approved: `git merge feature/part7-atmosphere && git push origin main`.

---

## 4. The 7 Phases

> Per phase: **Goal · Deliverables · Exit criteria (testable) · Dependencies.**
> Critical path: **P1 → P2 → P3 (slice gate) → P5 → P6 → P7.** P4's pure half (4a) runs
> *parallel* to P2/P3.

### Phase 1 — Foundation, Engine Spine & Hardcore Substrate *(in progress)*
**Current:** Renderer + visual pipeline ✅ shipped. ECS sim-wiring, save layer, input rework are next.

**Goal:** Promote `src/render3d/` from spike to *the* engine — a fixed-timestep, save-backed,
input-complete, perf-budgeted runtime with the asset pipeline and all hardcore *state contracts*
in place, so no pillar is retrofitted later.

**Deliverables**
- **Event-sourced fixed-timestep sim** (§3, Bet 2): pure `stepSimulation(state, cmds, dt)` driven by
  a seed + command/input-log so the whole game state is reconstructable; thin RAF shell. Replaces the
  RAF-driven `spike.js` loop.
- **ECS / data-oriented store** (archetype-based; systems run in fixed, deterministic order).
- **Render-command abstraction:** the sim emits an immutable render-state; the renderer is a *pure,
  swappable, headless-skippable* consumer.
- **Renderer = Three `WebGPURenderer` + TSL, with a WebGL2 fallback** (§3, Bet 3) — chosen now; the
  material system depends on it. Seed the **NPR uber-shader** (cel + rim + ink-edge post) in TSL.
- System/world manager with an explicit **spatial-partition contract** (the seam P3 streaming
  plugs into; single-cell impl is fine now).
- **Ironman-native save layer:** envelope/payload split + FNV-1a integrity + slots/backups +
  versioned **migration path from v1**; immutable `runRules {permadeath, saveScummable}` set at
  character creation; **death = a `sealed` state transition** (not a delete, not recover-at-camp
  respawn — preserves run-summary/NG+ data); `autosaveSeq`; autosave on-event + on-quit, single
  ironman slot, no manual save. Payload carries **seed + input-log tail** (replay-reconstructable,
  tamper-evident — the ironman anti-cheat posture).
- **Seeded-RNG architecture** — all combat/loot randomness flows through one injected seedable RNG.
- Input: **pointer-lock primary** (current drag-look degrades with WASD) + gamepad + touch, behind
  a rebindable action-map (`keybinds.js` design).
- Camera rig (1st/3rd-person decision made + abstracted) with collision vs world proxies.
- Asset-pipeline foundation: glTF / material / texture / audio loaders + asset-manifest convention;
  **assets fetched, not bundled** (bundle discipline starts here); KTX2/draco path.
- Perf budget documented in `docs/` + perf HUD (`renderer.info`); seed the **in-engine inspector**
  (entity browser, live hardcore-knob tuning, time-of-day scrubber, AABB/`threat`-field viz, replay
  scrubber).
- Directory restructure (`src/render3d/` → `src/game/`); freeze Canvas to `legacy/`; collapse to
  **one ID namespace / one state tree** (kills the Boone↔warden split and the read-only bridge —
  there is only one renderer now).

**Exit criteria**
- Determinism: a recorded `(seed, input-log)` replays to an identical state hash, **headless** (no
  renderer attached).
- Save round-trips (write→reload→identical hash); corrupted envelope recovers from backup; ironman
  death → slot sealed + run-summary emitted (node tests on pure logic).
- Pointer-lock engages on canvas click; WASD+look works locked (render smoke).
- One real `.glb` + texture loads through Vite dev *and* Vercel CSP (verify `connect-src`); the
  **WebGPU path renders the NPR uber-shader and the WebGL2 fallback renders the same scene**.
- Perf HUD reports the budget; frozen legacy Canvas tests still green.

**Dependencies:** none. Reuses *design* from `savePersistence`, `saveMigration`, `keybinds`,
`phaseState`, `playerController`, `worldProxies`.

### Phase 2 — Hardcore Combat, Feel & Enemy AI
**Goal:** A 3D melee/ranged core that *feels* punishing, all 7 archetypes as native 3D behavior
trees on a steering substrate, and the difficulty architecture in place. The "prove the fun"
engine work.

**Deliverables**
- Re-derive combat math as **pure tested modules** (port `combatProcessor` structure; rewrite
  hit-detection for 3D — capsule/sphere + 3-space swing arcs; re-tune magnitudes so identity tuning
  is lethal). *Archaeology note:* poise/guard-break/parry rules live in the 11.3k-line `main.js`,
  not the clean `combatProcessor.js` — budget time to mine the monolith.
- **Symmetric poise/posture** on player *and* enemies (first-class, day one — not a perk);
  **committal, scarce healing** (interruptible animation + cost — never the instant Canvas `Q`
  potion); stamina economy; parry / guard-break / dodge.
- Hit reactions: stagger, hitstop, knockback, screen shake (port `gameFeel` + `animationHelpers`).
- **Combat VFX in TSL + GPU particles** (impacts, dust, muzzle flash); NPR **ink-edge flare on a
  successful parry** and **halftone deepening as stamina drains** — graphics as combat readability
  (§3, Bet 1).
- Ranged + multi-enemy groups + lock-on; damage model (armor / resist / poise / status DoT —
  `statusEffects`, `difficultyTuning`).
- **Enemy steering substrate** (obstacle avoidance vs the same AABB proxies the player uses) —
  *not* full navmesh yet. Fixes the AI-needs-navigation inversion so P2 enemies ship before P3.
- 7 archetypes as native 3D behavior trees (`ENEMY_ARCHETYPES` + `BEHAVIOR_TUNING` +
  `resolveBehaviorMove`; `behaviorTree.js` JSON-safe BT runtime).
- Death wired to P1 run-rules (ironman seal / penalty).
- **Difficulty architecture:** spine + assists as a knob-struct
  `{ runRules, lethality, pressure, assists }`, resolved at character creation, stored in the
  immutable save block. Tiers (Hardcore/Standard/Story) are **presets over the spine**, never a
  different combat. Assists (aim-assist, parry-window widening, telegraph emphasis) are *allowed in
  ironman* — they aid execution, not consequence.
- **One real combat-art slice** (player + 1 enemy + 1 weapon: real model/anim/SFX) through the P1
  pipeline — proves the pipeline before mass art.

**Exit criteria**
- Combat math pure + node-tested (mirror `combat-processor.test`, `status-effects.test`);
  **differential tests vs `combatProcessorLegacy`** (identical where intended; lethality invariants
  where re-tuned — e.g. "player dies to 3 unblocked brute hits at identity tuning").
- All 7 archetypes spawn with distinct behavior; a charger dashing at a wall avoids/stops
  (steering proven, render smoke).
- Player death → correct per-mode behavior (node test).
- One real asset animates a full idle→attack→hit→death cycle at perf budget.
- **Named subjective checkpoint:** a playtester confirms combat "feels good and dangerous."

**Dependencies:** P1 (loop, input, camera, save run-state, asset pipeline, seeded RNG).

### Phase 3 — World, Survival & the Vertical-Slice Gate
**Goal:** One **complete, shippable-quality, hardcore-survivable** region (Frontier/Dustward) —
streaming-capable, navmeshed, with the systemic survival layer — that is *fun*. **Ends with a hard
fun-gate that can fail and block Phases 4–7.**

**Deliverables**
- Region streaming/chunking (implements the P1 partition contract; prove load/unload).
- Navmesh (upgrades P2 steering to real pathing) + collision at scale.
- POI discovery + interiors (Frontier POIs from `poiSystem`; `wfcInteriors` scales interiors
  without hand-building each).
- **Survival/hardcore systemic layer:** a single composed **`threat` scalar**
  (region × time-of-day × weather-hazard × faction-influence × difficulty) the encounter system
  reads; resource scarcity; day/night *danger* (not just lighting); weather *hazards* (the
  `chooseEnemyType` weather→archetype coupling).
- Frontier built to **full shippable quality now in the signature NPR look** — uber-shader + ink
  edges + the Frontier post stack (golden dust / bloom / grain), **volumetric god-rays** through the
  mesas, height fog, **GPU dust motes**, and the **continuous day/night arc** (§3, Bets 1 & 4).
- **Clustered / forward+ lighting** so lanterns, the watchtower beacon, and slime glow coexist; at
  night, **carried light is a survival resource** (darkness = danger).
- 2–3 archetypes that force different tactics + **one mini-boss phase transition**
  (`combatMilestones`); permadeath actually wired and *felt*.

**Exit criteria — the Vertical-Slice Gate, *fun AND beautiful* (hard stop)**
- Frontier streams without hitches at perf budget; navmesh agents path around interiors/obstacles.
- A full hardcore mini-loop is survivable-but-punishing: spawn → gear up → fight → survive a
  night / weather hazard → bank progress (or die and lose it under ironman). The first-road
  9-phase loop runs end-to-end in the new engine (port `render3d_loop_smoke` assertions).
- 60fps on target integrated GPU **with the real lethality model AND the full NPR post stack
  running**; golden-image snapshot of the Frontier look committed as the baseline.
- **Sign-off (named, can fail):** a naive player dies, learns, and *chooses to retry*; a skilled
  player clears the mini-boss via mastery not grind; losing a permadeath run produces "one more
  run"; **and the region reads unmistakably as the graphic-novel signature**. **If it fails, iterate
  P1/P2 tuning or the shader stack — do NOT proceed.** (A Frontier-only hardcore release is a viable
  fallback ship — this gate is also a scope circuit-breaker.)

**Dependencies:** P1 (partition, perf), P2 (combat, steering → navmesh). Hard gate before P4–P7.

### Phase 4 — RPG Systems & Art-Pipeline Scale-Up
**Goal:** The full character/economy/progression backbone (brutal-economy-tunable, faction-rep
ready for P5) and the art pipeline scaled now that the loop is proven worth dressing.
*Run 4a parallel to P2/P3; 4b after the world exists.*

**Deliverables**
- **4a (parallel, early):** port near-verbatim (with tests) — inventory/equipment, affixes
  (`weaponAffixes`), crafting tiers (`gearCrafting`, `craftingStation`), leveling + skill tree +
  capstones (`progressionSystem`), loot tables (`lootSystem`), durability/repair, character
  creation (`characterIdentity`). **Faction-reputation data model + 3 ideology axes as a
  neutral-default container** (fixes the pricing-needs-factions inversion).
- **4b (here):** 3D-integrate — visible equipped gear, world loot pickups, vendor/crafting UI;
  economy/vendor pricing reading the (neutral-until-P5) faction-rep model (`economyServices`);
  **brutal-economy as data knobs** (deficit-biased base, faction/event modifiers multiply a scarce
  base, death a primary sink, no easy "sell-everything" valve).
- Art/material scale-up: the **TSL uber-shader matures into the shared material system** (cel / rim /
  ink params as material data, triplanar terrain, detail maps); GPU-instanced repeated props with
  wind; LOD policy; **clustered lighting** matured; **perf budget enforced as an acceptance gate with
  real assets**; 3D positional audio (parry/hit/guard-break audio is combat-readability-critical).

**Exit criteria**
- All ported systems pass their node tests **unchanged in behavior** (`gear-crafting`,
  `progression-system`, `loot-system`, `economy-services`, `crafting-station`).
- Equip a weapon → appears on the model + changes combat stats (smoke).
- Vendor price responds to a manually-set faction-rep value (node) — proving the P5 seam.
- Perf budget gated with real assets loaded.

**Dependencies:** P1 (save container). 4b needs P2 (combat stats) + P3 (world pickups). 4a needs
nothing — start early.

### Phase 5 — Narrative, Quests, Factions & Content Tooling
**Goal:** The complete story spine + living NPC cast, built on **authoring formats + CI validators
created before the content flood** so the content phases have an objective done-condition.

**Deliverables**
- **Build tooling first:** declarative **quest schema + validator** (every `branchTag` a real axis;
  every `outcome.effects` references real factions/flags; every quest reachable);
  **dialogue/reaction coverage checker** (`storyContent`, `dialogueChoices`, `questOutcomeEchoes`,
  vendor-reaction tables); **encounter-sets-as-data** validated vs perf budget + archetype
  existence; **region-dressing data packs**; **ending reachability/coverage fuzzer** (fuzz
  axis/rep/flag space — assert every ending reachable, predicate ordering doesn't shadow one out).
  Validators run in CI.
- Then author *through* the tools: job board + 8 main quests + side jobs (`jobBoard`,
  `questDefinitions`, `sideJobGenerator`); 3 factions + rep reactions wired to the 3 axes
  (`decisionEngine`, `influenceMap` rep→spawn/tint, `factionEffects`); 7 NPCs with
  memory/affinity/dialogue/schedules (`npcMemory`); branching outcomes; 10+ endings (port
  `decisionEngine` **verbatim** as the regression oracle); run summary; NG+; **narrative state fully
  persisted + migratable**.
- **Content = a fixed manifest with a coverage test** (can't drift infinite).

**Exit criteria**
- Quest state machine, ending resolution, faction-axis math pass ported node tests
  (`quest-definitions`, `decision-engine`, `endings-expansion`, `npc-memory`, `job-board`);
  ending-resolver **differential test vs legacy** yields identical ending IDs for the same
  `{axes, rep, flags}` vectors.
- Quest completion moves a faction axis → changes a vendor price → changes spawn tint (integration
  smoke across the P4↔P5 seam).
- Save/reload mid-quest preserves exact narrative state (hash); old-version save migrates forward.
- ≥2 distinct endings reachable end-to-end in the Frontier slice; single canonical NPC id (grep
  gate — no dangling Boone/warden references).

**Dependencies:** P3 (world/interiors, proven loop), P4 (faction-rep model, rewards = gear/economy).

### Phase 6 — Content Build-Out (Ashfall + Ironlantern) & Hardcore Tuning
**Goal:** Scale the proven slice to the full game — 3 regions, complete cross-region story, full
roster + mini-bosses, the real art/audio mass pass, and the hardcore balance pass.

**Deliverables**
- Ashfall + Ironlantern authored **through P5 tooling**: dressing / POIs / enemies / quests /
  hazards / mini-bosses (`ashfall_*` / `ironlantern_*` POI data, region job boards, resources).
- Complete cross-region story (acts 1–3 from `decisionEngine`); full enemy roster + mini-bosses
  (`regionSystem.miniBosses`); biome audio mass pass + music (`audio`, `musicReactivity` →
  Three.js `PositionalAudio`); art mass pass to slice quality across all regions.
- **Per-region shader + post identity ships** (§3, Bet 1): Ashfall heat-haze refraction + bleached
  LUT + chromatic edges; Ironlantern scanline/CRT surveillance vignette + neon-rain — each region's
  hazard *rendered*, with a golden-image baseline per region.
- Full difficulty ladder (presets) validated coherent end-to-end (Story beatable, Hardcore
  brutal-but-fair); permadeath/ironman × NG+ interaction policy; brutal-economy balance pass vs real
  content; accessibility audit (assists allowed in ironman *by design*; canvas `aria-label`, modal
  focus-trap, prompt `aria-live`).

**Exit criteria**
- All 3 regions stream at budget; full story completable → ending; full roster + mini-bosses spawn
  correctly per region/weather (port `enemy-archetypes` spawn-table assertions).
- Ironman: new-game → death → sealed verified; separate run → ending → NG+ verified.
- Economy balance documented ("brutal but fair"); content-manifest coverage test green;
  accessibility checklist passes.

**Dependencies:** P5 (story/faction systems), P3 (region template/streaming proven on Frontier).

### Phase 7 — Polish, Optimization & Ship
**Goal:** Hit perf/quality/QA bars at full content and ship to itch.io + Vercel.

**Deliverables**
- Perf optimization at scope: LOD, instancing, draw-call batching, **bundle split** (render3d is
  already ~549KB — code-split Three.js + lazy-load regions); enforce budget.
- Full QA: smoke across all regions/quests, **golden-image baselines per region + per shader**
  (pixelmatch), save-migration across versions, soak/perf; **replay-determinism as a release gate** —
  native now that the sim is event-sourced (§3, Bet 2): a recorded `(seed, input-log)` that diverges
  = a rules regression; ending-reachability + content-manifest as release gates.
- **Ironman edge-case hardening:** crash-during-autosave (`autosaveSeq` pays off), quit-during-
  combat, tab-close mid-fight; anti-tamper posture for ironman saves.
- Tutorial/onboarding, settings, save-slot UX, **run-summary / graveyard / leaderboard** (the
  hardcore meta-layer that makes permadeath *rewarding* — `runSummary`, `runHistory`,
  `dailySeedMode`), PWA/offline.
- Release: itch.io offline ZIP (`scripts/itch_package.sh`) + Vercel (verify glb/ktx2/audio
  MIME + CSP); RC → launch.

**Exit criteria**
- Perf budget met on mid-range integrated GPU at full content; bundle under target + regions
  lazy-loaded.
- Full smoke + visual + migration + soak + replay suites green.
- itch ZIP runs offline; Vercel build passes CSP; RC sign-off.

**Dependencies:** all prior.

---

## 5. Phase-1 "decide-it-now" checklist

One schema field / one seam now; a cross-cutting rewrite later. Each maps to a P1 deliverable.

1. `runRules {permadeath, saveScummable}` = immutable save-payload field from format v1.
2. Death = a `sealed` state transition (not delete, not recover-at-camp respawn).
3. One ID namespace, one state tree; the renderer reads *and writes* the authoritative save
   (no read-only bridge, no parallel phase state, no Boone/warden split).
4. Autosave = on-event + on-quit, single ironman slot, no manual save; `autosaveSeq` in envelope.
5. Poise/posture is a first-class symmetric resource (player + enemies).
6. Healing is committal + scarce (interruptible animation + cost), never instant.
7. All combat/loot randomness flows through one injected seedable RNG.
8. Identity (un-multiplied) tuning IS the lethal tuning; assists multiply toward survivability.
9. Difficulty = a knob-struct across runRules / lethality / pressure + orthogonal assists — not a
   global scalar.
10. Encounter system reads one composed `threat` scalar.
11. Economy base is deficit-biased; modifiers multiply a scarce base; death is a primary sink.
12. Perf budget documented now; gated at P3, P4, P7.
13. P3 ends at a fun-gate that can fail and block P4–P7.
14. Content authoring formats + CI validators built at the *start* of P5; content = fixed manifest.
15. Renderer = Three `WebGPURenderer` + TSL with a WebGL2 fallback (the material system depends on it).
16. Sim is event-sourced — state = pure fn of `(seed, input-log)`; ECS store + render-command
    abstraction (renderer is a pure, swappable, headless-skippable consumer).
17. Save payload carries the `(seed, input-log)` tail (replay-reconstructable, tamper-evident).
18. The NPR uber-shader (cel + ink edges + per-region post) is the *core render path*, not late polish.

---

## 6. Architecture constraints

- **One renderer, one state tree.** The 3D game reads *and writes* the authoritative save. No
  read-only bridge, no parallel phase machine, no dual naming.
- **All game code lives under `src/game/`** (the promoted `src/render3d/`). Canvas is frozen under
  `legacy/` and is reference-only — never imported by the new game.
- **Pure / shell split** for every module (see §2). Tests are `environment: "node"` (vitest) — no
  jsdom, no WebGL. Three.js/DOM shells are covered by smoke, not unit tests.
- **Event-sourced + render-decoupled** (see §3). State = pure fn of `(seed, input-log)`; the sim
  emits an immutable render-state the renderer consumes. Renderer = Three `WebGPURenderer` + TSL
  (WebGL2 fallback); the NPR uber-shader is the *core* path, not a filter.
- **Determinism, perf, and golden-image are gates, not aspirations** (see §2). All three run every
  phase.
- **Coordinate convention:** world `(x, y)` → 3D `(X=x, Z=y, Y=up)`. `yaw=0` looks toward −Z;
  `yaw=−π/2` looks +X (east). Player position stored as `{ x, z }`.

---

## 7. Verification gates

Run before every commit:

```bash
npm test && npm run typecheck:ts && npm run test:syntax && npm run dev:lint && npm run build
```

Plus, with a dev server running:

```bash
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d     # loop smoke (3D)
npm run test:smoke                                            # semantic invariants
npm run test:visual                                           # pixelmatch baselines
```

New standing gates introduced by this roadmap: **determinism** (a recorded `(seed, input-log)`
replays to a stable state hash, headless), **perf budget** (draw-call / frame-time / triangle /
light-count, asserted in the render smoke), and **golden-image** (per-shader / per-region post-stack
snapshots extending `test:visual`).

---

## 8. Port-ledger (correctness lifeline)

The Canvas test suite (97 files, 1101 tests) is the behavioral spec. Re-derive against it,
tier-by-tier. **Port the test first, then make it pass.** Update `ported?`/`green?` as the rebuild
progresses.

### Tier A — port near-verbatim (renderer-agnostic pure rules)

| Module | Canonical test(s) | Ported? | Green? |
|---|---|:--:|:--:|
| `decisionEngine` (endings, ideology axes) | `decision-engine.test.ts`, `endings-expansion.test.ts` | ☐ | — |
| `questDefinitions` | `quest-definitions.test.ts` | ☐ | — |
| `jobBoard` / `sideJobGenerator` | `job-board.test.ts`, `side-job-generator.test.ts` | ☐ | — |
| `lootSystem` / `weaponAffixes` | `loot-system.test.ts`, `weapon-affixes.test.ts` | ☐ | — |
| `gearCrafting` / `craftingStation` | `gear-crafting.test.ts`, `crafting-station.test.ts` | ☐ | — |
| `progressionSystem` (+ capstones) | `progression-system.test.ts`, `capstone-perks.test.ts` | ☐ | — |
| `statusEffects` (+ synergies) | `status-effects.test.ts`, `status-synergies.test.ts` | ☐ | — |
| `economyServices` | `economy-services.test.ts` | ☐ | — |
| `regionSystem` (hazard/event model) | `region-system.test.ts` | ☐ | — |
| `influenceMap` / `factionEffects` | `influence-map.test.ts`, `faction-effects.test.ts` | ☐ | — |
| `npcMemory` / `dialogueChoices` / `questOutcomeEchoes` | `npc-memory.test.ts`, `dialogue-choices.test.ts`, `quest-outcome-echoes.test.ts` | ☐ | — |
| `newGamePlus` / `runSummary` / `runHistory` | `new-game-plus.test.ts`, `run-summary.test.ts`, `run-history.test.ts` | ☐ | — |
| `savePersistence` / `saveMigration` / `saveStateManager` | `save-persistence.test.ts`, `save-migration.test.ts`, `save-state-manager.test.ts` | ☐ | — |
| `difficultyTuning` / `dailySeedMode` (→ knob-struct) | `difficulty-tuning.test.ts`, `daily-seed-mode.test.ts` | ☐ | — |
| `characterIdentity` / `inventoryState` / `poiSystem` / `weatherSystem` | `character-identity.test.ts`, `inventory-state.test.ts`, `poi-system.test.ts`, `weather-system.test.ts` | ☐ | — |

> Remaining Canvas *pure* modules (e.g. `combatLoadout`, `combatMilestones`, `seasonalEvents`,
> `journalLetters`, `cursedItems`, `codex`) default to Tier A — list them here as they are scheduled.

### Tier B — re-derive against ported test *intent* (spatial / re-tuned)

| Module | Canonical test(s) | Note | Ported? | Green? |
|---|---|---|:--:|:--:|
| `combatProcessor` | `combat-processor.test.ts` | rewrite 2D `isInSwingArc` for 3D; re-tune lethal; differential vs `…Legacy` | ☐ | — |
| `enemyArchetypes` | `enemy-archetypes.test.ts` | behavior tuning ports; movement → 3D steering | ☐ | — |
| `behaviorTree` / `npcBehaviors` / `patrolSystem` | `behavior-tree.test.ts`, `patrol-system.test.ts` | BT runtime ports; nav adapts to navmesh in P3 | ☐ | — |
| `combatAccessibility` / `combatReadability` | `combat-accessibility.test.ts`, `combat-readability.test.ts` | becomes the orthogonal `assists` bank | ☐ | — |

### Tier C — rebuild fresh (engine / renderer / shell)

New code with new tests, same discipline: sim loop, camera rig, region streaming, navmesh, asset
pipeline. **Do NOT carry over** the Canvas-specific renderer (`render.js`/`render.test.ts`, sprite /
HUD / minimap / fog-of-war / post-process / particle modules), the recover-at-camp death model, the
instant `Q` heal, the read-only `stateSnapshot` bridge + parallel `phaseState`, or the 11.3k-line
`main.js` composition root.

The existing `src/render3d/` seed already follows the discipline and is **kept and evolved** into
the engine: `playerController`, `worldProxies`, `interactionSystem`, `phaseState`, `encounterSystem`,
`animationHelpers`, `objectiveDom`, `boardModal`, `atmosphere`, `timeOfDay` (tests:
`render3d-*.test.ts`).

---

## 9. Critical files (reference / oracle / architecture)

- `src/savePersistence.js` (+ `src/saveMigration.js`) — envelope/integrity/migration mechanism to
  re-derive and **re-aim** for ironman (P1).
- `src/difficultyTuning.js` + `src/dailySeedMode.js` (`CHALLENGE_FLAGS.ironman`) — the tier model to
  **invert** into the P2 knob-struct; ironman concept to promote from score-flag to structural.
- `src/combatProcessor.js` — Tier-B lift + lethality re-tune + the differential-testing oracle (P2).
  Poise/guard-break also live in `src/main.js`.
- `src/decisionEngine.js` — crown-jewel pure ending resolver: re-derive **verbatim**, use as a
  regression oracle (P5).
- `src/regionSystem.js` — hazard tags + `resolveRegionEventModifiers` severity model = the shape of
  the composed `threat` scalar + scarce-economy modifiers (P3/P4).
- `src/questDefinitions.js` (+ `src/enemyArchetypes.js`, `src/behaviorTree.js`,
  `src/sideJobGenerator.js`) — data-shaped content to promote into the P5 validated authoring schema.
- `src/render3d/playerController.js` (+ `phaseState.js`, `worldProxies.js`, `atmosphere.js`,
  `timeOfDay.js`) — canonical pure+shell examples and the seed code P1 promotes to engine;
  `atmosphere.js`/`timeOfDay.js` are the seed for the continuous day/night arc (§3, Bet 4) and the
  backface-outline pass in `spike.js` is the placeholder the NPR ink-edge shader (§3, Bet 1) retires.
- `src/replayRecorder.js` — existing replay capture to fold into the event-sourced core (§3, Bet 2);
  a recorded `(seed, input-log)` is simultaneously a feature and the determinism gate.
- `scripts/smoke_suite.sh` — the **semantic-invariant spec** whose assertions must be ported to guard
  behavioral correctness across the rebuild.

---

## 10. Legacy appendix — Canvas prototype (superseded)

The prototype that this rebuild draws on as a design reference and oracle. Its milestone framing
(prove a spike → migrate Canvas → 3D parity → retire Canvas) is **superseded** by the 7-phase
rebuild above. Recorded here so the history isn't lost.

- **Milestone 0 — Rewrite Prep & Repo Hygiene** ✅ — clean repo, CI gates, Vite build, Canvas smoke.
- **Milestone 1 — Three.js Spike** ✅ — `render3d.html` entry; purple-dusk scene; `spike_compare.mjs`.
- **Milestone 2 — State Adapter** ✅ — `src/bridge/stateSnapshot.js` (Canvas state → read-only 3D
  snapshot). *Now obsolete:* the rebuild has one state tree, not a bridge.
- **Milestone 3A — Art Proof** ✅ (`PR #19 / 4c30262`) — 3-stop dusk sky, hero camera, outlines, blob
  shadows, vignette, emissive slime, smoke plume.
- **Milestone 3B — First Gameplay Loop** 🟡 — the 9-phase first-road loop (`phaseState.js`), board
  modal, Road Slime encounter, animation helpers, objective strip, and the day/night
  atmosphere/time-of-day system (`atmosphere.js` + `timeOfDay.js`). This code is the **seed** the
  rebuild's Phase 1/3 builds on (kept, not discarded).
- **Milestones 4–9 (planned, now superseded):** art pipeline → combat/feel → UI rebuild → system
  parity (write bridge) → retire Canvas → release MVP. Replaced by Phases 1–7.

The Canvas game itself (`src/main.js` + `index.html`) remains a **feature-complete playable
reference**: deterministic combat, 7 enemy archetypes, 8-quest chain + 10+ endings, 3 factions, gear
/ crafting / affixes, 3 regions, 18 POIs, 7 NPCs with memory, save/migration, time-of-day, weather,
NG+. It is frozen as the behavioral oracle for the port-ledger (§8).
