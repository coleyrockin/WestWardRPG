# WestWardRPG — Vision & Execution Roadmap

> **Direction (confirmed 2026-06-02, reaffirmed 2026-06-03):** the Three.js 3D renderer is the
> product. An early audit argued for shipping the Canvas game and shelving the 3D work — the owner
> overrode it. The 3D look *is* the game. Canvas is frozen as the behavioral oracle.
> **Migration rule:** renderer-agnostic systems are *ported* (test-first), never rewritten from
> scratch and never deleted. The Canvas raycaster retires only when the 3D build reaches parity.

**This is the single source of truth.** No parallel `TODO.md`, `PLAN.md`, or competing roadmaps.

**Companion guides (tactical how-to, not competing direction):**
- [`map-editing-guide.md`](map-editing-guide.md) — the world layout: coordinates, the beat route, guardrail tests, the `window.__spike` hooks.
- [`3d-art-direction.md`](3d-art-direction.md) — the look target, the impact×effort punch-list, the progress log.
- [`world-realism-roadmap.md`](world-realism-roadmap.md) — the open range from *rendered scene* to *place*: motion/sound (R1), biome ground (R2), travelled roads (R3), occupancy (R4).

Last updated: `2026-06-10` · Branch: `main`

---

## 1. The vision — one game, three commitments

**WestWard is a story-first western RPG you walk through like a moving graphic novel.**

Three commitments separate it from everything else and decide every call we make:

**① Story is the engine, not the garnish.** Almost every AI-assisted RPG is a *systems* demo —
procedural dungeons, a combat sandbox, loot tables — with a thin story bolted on at the end.
WestWard inverts that. The three ideology axes (*controlVsFreedom · truthVsComfort ·
solidarityVsStatus*), the 8-quest chain, faction reputation, NPC memory, and 10+ endings are the
**product**. Combat and economy exist to put *pressure* on decisions — they are the stakes, not the
point. This is the moat: a narrative RPG of this depth is rare, and it plays to our strengths.

**② The look is illustration, not realism.** A stylized NPR cel-shader — *Oblivion × Weird West ×
a low-poly inked comic*. This is a strategic advantage, not a compromise: a confident graphic-novel
world is achievable at our scale where photoreal never will be. **Every render decision leans into
the illustration and away from realism.** When unsure, do the thing that looks more like a painted
panel and less like an untextured game-jam.

**③ Hardcore means consequence, not a slider.** Permadeath / ironman, lethal-by-default combat, a
brutal scarce economy. Difficulty is the *identity*, not a menu option. The event-sourced sim
(state = pure fn of `seed + input-log`) makes ironman saves tamper-evident, replays first-class, and
determinism testable headless — the architecture and the hardcore posture are the same decision.

**The near-term mission:** get the **5-minute opening** from "working prototype" to "unmistakably a
real game." The engine, loop, and pipeline already work — what's missing is *built and tuned*, not
*broken*. Nail the opening, then scale that quality across the full 7-phase game.

---

## 1.5 What the field shows — and our response

A 101-agent deep-research survey of Claude/AI-coded RPGs (Three.js showcases, itch.io, practitioner
postmortems, skeptical writeups — 18 sources, 84 claims, 20 confirmed under adversarial 3-vote
verification) produced five conclusions that directly shape this roadmap:

1. **Story-first 3D + Claude-coded is essentially unprecedented.** Nearly every surveyed "Claude RPG"
   is a tech demo, tactics game, arcade title, or multiplayer arena; the story-first narrative 3D RPG
   is absent from the landscape. → *Our moat (§1 ①) — we lean into narrative depth, not another
   systems sandbox.*
2. **The stack is the proven, repeatable path.** AI-coded 3D browser games converge on Three.js +
   Vite + JS/TS — exactly ours. → *Validated; no stack pivot (§3 Bet 3, §6).*
3. **The binding constraint is architecture specification, not feature-coding.** Claude nails bounded
   domain logic from general knowledge (Risk rules "without being told"), but cannot invent
   architecture the human hasn't specified — *"spend your specification budget on architecture, not
   only features."* → *Why the §5 decide-it-now checklist, the §3 bets, and `ARCHITECTURE.md` are
   written **before** delegating; why the port-ledger (§8) rides Claude's domain-logic strength while
   the human owns the event-sourced/ECS architecture.*
4. **Visual/shader iteration is materially slower** — LLMs are weak at visual-spatial reasoning, and
   turning visual intent into language is a lossy bottleneck. → *Why the live tuning harness
   (§3.6 T1a) is the #1 near-term priority + a Phase-1 deliverable, why golden-image is a standing
   gate (§2), and why visual work budgets extra human time (§3.6).*
5. **A screenshot-in-the-loop QA agent is the reusable best practice** — build → headless runtime →
   gameplay → architecture → visual-review-via-screenshots, with a bounded autofix loop. → *Folded
   into the verification protocol (§7) on top of the perf + golden-image gates.*

*Caveats honored:* source quality skews to self-report, and the "visual gap" is described as a
frontier actively (not yet) closing — so we treat the harness as **risk reduction, not a fix**, and
re-evaluate as multimodal tooling improves. Branded "AI game studio" framework repos with big star
counts ship zero games — **we build the game, not a framework** (judge by artifacts, not feature
lists).

---

## 2. Principles that bind every phase

**Pure / shell discipline (non-negotiable).** Every module = a pure exported function (unit-tested
in Node, no WebGL/DOM) + an optional thin Three.js/DOM shell (smoke-covered). Logic living in a
shell is rejected in review. Vitest stays `environment: "node"`. The seeds already model it:
`playerController.stepPlayer`, `worldProxies.resolveCollision`, `phaseState.transitionLoopPhase`.

**Story-first from day one.** Narrative state — quest flags, the three ideology axes, NPC memory,
faction rep — is a **first-class save-payload field in format v1**, not a Phase-5 retrofit. Build
the container early; pour the content in later. Every combat and economy interaction should be able
to push or pull these values.

**Own the architecture, then delegate.** The research is unambiguous: Claude implements bounded
domain logic well, but the binding wall is *architecture the human hasn't specified* — absent a spec,
it defaults to a generic best-guess that breaks. So the human owns and writes down the architecture
(the §3 bets, the §5 decide-it-now seams, `ARCHITECTURE.md`) **before** delegating implementation.
Spec budget goes to architecture first, features second. The port-ledger (§8) is the inverse lever —
it rides Claude's domain-logic strength on the renderer-agnostic rules.

**Event-sourced, render-decoupled core.** The whole game state reconstructs from `seed + input-log`.
From that one commitment fall replay, time-travel debugging, the determinism gate, the ironman
anti-cheat posture (save = seed + input tail), and netcode-readiness. The renderer is a *pure
consumer* of an immutable render-state — swappable, headless-skippable.

**Signature over fidelity.** The NPR uber-shader, ink edges, and per-region post stack are *core
architecture*, not late polish. They carry the product's identity **and** gameplay readability
(parry flash, stamina halftone, hazard tint). Never trade them for perf headroom — cut polygons
instead.

**Three standing gates, every phase.**
- **Determinism** — a recorded `(seed, input-log)` replays to an identical state hash, headless.
- **Perf** — draw-call / frame-time / triangle / light-count asserted in the render smoke; build fails on regression.
- **Golden-image** — per-shader and per-region pixelmatch snapshots; the look can't silently drift.

**Preserve the gate stack & infra.** `npm test` · `typecheck:ts` · `test:syntax` · `dev:lint` ·
`build` · `test:smoke` · `test:render3d` · `test:visual`. Keep Vite dual-entry, Vercel + itch.io
offline ZIP, the multi-language maintenance scripts.

---

## 3. The four bets (visual + architecture are one decision)

**Bet 1 — A signature NPR look ("a moving graphic novel").** The *core* render path is
non-photoreal: a **TSL uber-shader** (cel/toon ramp + rim light + **ink edges from depth/normal
discontinuity** — a real edge-detect pass that retires the backface-expansion hack + cross-hatch /
halftone shadow fills + paper grain). **Per-region post identity:** Frontier = golden dust + bloom +
grain; Ashfall = heat-haze refraction + bleached LUT + chromatic edges; Ironlantern = scanline/CRT
vignette + neon-rain. Graphics serve the game — ink-edge flare on a parry, halftone deepening as
stamina drains.

**Bet 2 — Event-sourced, data-oriented core.** Fixed-timestep, command/event-sourced sim. ECS
(archetype-based, fixed-order systems) for cache-friendly hardcore swarms / projectiles / particles.
A render-command abstraction: the sim emits an immutable render-state; the renderer consumes it.

**Bet 3 — WebGPU + TSL, WebGL2 fallback.** Three's `WebGPURenderer` + TSL (shaders authored once in
JS → WGSL *and* GLSL). Unlocks compute shaders (GPU particles, GPU culling) and a single authoring
path for the uber-shader. A Phase-1 decision — the material system sits on it. The WebGL2 fallback
keeps itch.io / Vercel / older GPUs running.

**Bet 4 — Atmosphere & lighting as the western's soul.** Clustered/forward+ lighting retires the
"keep the light budget tight" constraint — lanterns, the watchtower beacon, muzzle flashes, slime
glow coexist, and **carried light becomes a night-survival resource** (darkness = danger).
Volumetric god-rays through the mesas, height fog + aerial-perspective desaturation, GPU dust motes,
heat shimmer, embers. The continuous sun/moon arc (`lerpPalette` + `sunArc`) already seeds it.

**Guardrail:** "no shortcuts" must not curdle into "never ships." The signature look has to be
proven in **one region** (the Phase-3 *fun-AND-beautiful* gate) before any mass production.

---

## 3.5 Where we actually are (2026-06-03)

### ✅ Shipped to `main` (Vercel production)

**Render & light**
- NPR path: `WebGPURenderer` + TSL, cel+rim uber-material, depth-discontinuity ink edges, bloom, vignette, film grain.
- Continuous day/night arc (`timeOfDay.js`): dusk → goldenHour → night, `lerpPalette`, `sunArc`.
- **goldenHour de-orange pass (today):** exposure 1.27, sun 2.5, deep cool split-tone (shadowTint `#15264f`, strength 0.40), cooler hemi sky, bloom 0.44 — warm key vs cool shadow now genuinely separates.
- Palette-driven camera-side fill light (`atmosphere.js`); `DEFAULT_FILL` matches the constructed default so dusk/night render bit-identical (the `?visual` baseline stays safe).
- Exploration camera preset (`playerController.js`): distance 8.4, height 4.5, lookHeight 1.35.

**World & terrain**
- FBM ground relief (masked flat in the road corridor + marsh), valley-AO albedo, 96×88 segments, pure `groundHeight(x,z)`.
- Districts pass: back-rank town depth, four interior buttes for landmark silhouettes, an outskirts district (corral + wagons + scrub), a marsh district (reeds + snags + mud road), a board plaza, an opening foreground frame.
- Scatter: cracked-mud + dry-grass motes on a road-density gradient.

**Loop & tooling**
- The 9-phase first-road loop: spawn → board → sign → bark → cache → slimeTell → fight → wagon → return → survey teaser. `boardModal`, `phaseState`, `encounterSystem`, `hitFx` all live.
- `window.__spike` dev hook: `setPos`, `goto('roadSlime')`, `waypoints`.

**Gates**
- 1252 tests green, `tsc` clean, `vite build` clean. The `?visual` golden-image baseline pins **DUSK** — do **not** touch tone mapping, output color space, or the dusk palette without re-blessing `npm run test:visual:render3d`.

### ⚠️ The honest gap to "amazing"

The engine is real. What still reads as *prototype*, and the fix tier:

| Gap | What it costs | Tier |
|---|---|---|
| Placeholder hero + box buildings | the #1 "prototype" tell — silhouettes have no character | L · Blender |
| Monochrome amber | no depth, no drama, no focal hierarchy | S · palette (started) |
| Everything floats — no contact shadows | props/hero sit *on* the ground, not *in* it | S · extend `addContactShadow` |
| NPR too timid | hedges between stylized and plain | S · push ink/cel/grain |
| Static world | nothing moves — no life | M · dust/flicker/tumbleweed |
| No audio | half of "amazing" is simply absent | M · thin audio layer |

**The fast jump:** cool-shadow palette + contact shadows everywhere + bolder ink/cel + a paper-grain
pass. Four S/M moves, **zero new art**, and together they move the build from "prototype" to
"intentional" — the biggest visible gain per hour. Models, character, and audio take it from
"intentional" to "amazing."

---

## 3.6 The path to "amazing" — the priority queue

This is the authoritative near-term queue for visual/feel work; the full per-pillar spec lives in
[`3d-art-direction.md`](3d-art-direction.md).

### Tier 1 — no new art (do these first)

**T1a · Live tuning harness** — *small effort, unlocks everything after it.* The binding constraint
on visual iteration is the **reload-and-screenshot loop**: every palette/light tweak costs a full
page reload. Break the wall. Extend `window.__spike` with `setPalette({…})`, `setLight({…})`,
`setCamera({…})`, `dumpLook()` (apply instantly, no reload) plus `captureMode()` (freeze the push-in
+ weather) and `settle(ms)` (await a stable frame) for deterministic capture. ~1-file change to
`spike.js`. Every visual session after this is multiples faster.
*Plan: [`docs/superpowers/plans/2026-06-03-live-tuning-harness.md`](superpowers/plans/2026-06-03-live-tuning-harness.md).*

**T1b · Contact shadows everywhere** — *highest grounding impact.* `addContactShadow` already exists
(`spike.js:129`). Call it on every loaded `.glb` and inside every landmark builder +
`buildWalkInSaloon`. Bump opacity 0.38→0.5, Y-offset 0.012→0.018.

**T1c · Bolder palette — cool shadows + led accents.** Push goldenHour shadowTint further
(`#15264f`→`~#0d1f3c`), splitStrength 0.40→0.48. Add *led* saturated accents only where they matter:
slime green on the tell/fight, danger red on enemies, lantern amber on lamp pools. Accents lead the
eye; they're not decoration. *Files: `timeOfDay.js`, `postStacks.js`.*

**T1d · Commit to the inked-comic render.** Ink outlines: `edgeStrength` 2.65 → push, tune lo/hi for
clean consistent weight. Cel banding: fewer, harder steps (`[55,100,255]`→`[50,95,255]`) for flat
ink fills. A paper/halftone whisper as a final post pass. *Files: `nprMaterial.js`, `postStacks.js`.*

**T1e · Establishing push-in polish.** A 2–3s eased push-in from a wide hero angle settling into
gameplay framing (the camera already lerps). A foreground depth element + rule-of-thirds hero
placement. *File: `playerController.js`.*

### Tier 2 — motion & sound (no new models)

**T2a · Make the world breathe.** Drifting dust + heat shimmer in the low sun; lantern flicker
(intensity noise on lamp lights); exaggerate the existing flora wind-sway; one slow tumbleweed across
the road; distant circling birds (billboard sprites). *Files: `atmosphere.js`, `weatherView.js`,
lamp lights in `spike.js`.*

**T2b · A thin audio layer** — *half of "amazing," currently at zero.* Wind bed, boot footsteps,
lantern hum, a lonely harmonica sting on the spawn reveal, a wet *thwack* + splatter on slime hits, a
chime on the map-scrap. Canvas `audio.js` is a reference, not a port. *New: `src/render3d/audioView.js`.*

### Tier 3 — Blender models (biggest lifts, highest ceiling)

Need Blender + the MCP addon (`localhost:9876`). The pipeline is ready (`assetManifest.js` +
`assetLoader.js`).
- **T3a · Hero character** — you stare at it every second: a readable gunslinger silhouette (wide hat, long coat, sword on back), then idle breathing, a weighted walk, dust-kick footfalls, a draw flourish. Integration points: `character.js`, `animatedCharacter.js`.
- **T3b · Key buildings** (saloon · store · assay) — the 3–4 nearest shapes the eye lands on first; distinctive rooflines/porches, false-front *tall-not-wide*. One great saloon beats ten boxes.
- **T3c · Slime** — a gooey, wobbling silhouette with weight; the fight juice (`hitFx.js`) is already good, the model is the missing piece.

---

## 4. The 7 phases

> Critical path: **P1 → P2 → P3 (slice gate) → P5 → P6 → P7.** P4a runs parallel to P2/P3.
> Per phase: **Goal · Deliverables · Exit criteria (testable) · Dependencies.**

### Phase 1 — Foundation, engine spine & hardcore substrate *(active)*

**State:** renderer + visual pipeline ✅ shipped; first-road loop ✅ live. The §3.6 Tier-1 visual
wins are the immediate queue — they don't block the ECS/save work, but they should land **before**
Phase 2 so the game reads as intentional rather than a prototype.

**Goal:** promote `src/render3d/` from spike to *the* engine — a fixed-timestep, save-backed,
input-complete, perf-budgeted runtime with the asset pipeline and every hardcore *state contract* in
place, so no pillar is retrofitted later.

**Deliverables**
- **Live tuning harness** (§3.6 T1a) — lands first; the visual-iteration accelerator.
- **Event-sourced fixed-timestep sim:** pure `stepSimulation(state, cmds, dt)` from `seed + input-log`; thin RAF shell. Replaces the RAF-driven `spike.js` loop.
- **ECS / data-oriented store** (archetype-based; systems in fixed, deterministic order).
- **Render-command abstraction:** sim emits an immutable render-state; the renderer is a pure, swappable, headless-skippable consumer.
- **Renderer = `WebGPURenderer` + TSL + WebGL2 fallback** — chosen now; the material system depends on it. Seed the NPR uber-shader (cel + rim + ink-edge post) in TSL.
- **Story-first data model:** narrative state (quest flags, the 3 ideology axes, NPC memory, faction rep) as a first-class save-payload field — the container before the content.
- World manager with an explicit **spatial-partition contract** (the seam P3 streaming plugs into; single-cell impl is fine now).
- **Ironman-native save layer:** envelope/payload split + FNV-1a integrity + slots/backups + versioned migration from v1; immutable `runRules {permadeath, saveScummable}` set at character creation; death = a `sealed` transition (not delete, not recover-at-camp); `autosaveSeq`; autosave on-event + on-quit, single ironman slot, no manual save. Payload carries the `seed + input-log` tail.
- **Seeded RNG:** all combat/loot randomness through one injected seedable RNG.
- **Input:** pointer-lock primary (drag-look degrades with WASD) + gamepad + touch, behind a rebindable action-map (`keybinds.js`).
- Camera rig (1st/3rd-person decided + abstracted) with collision vs world proxies.
- Asset pipeline: glTF / material / texture / audio loaders + manifest convention; **assets fetched, not bundled**; KTX2/draco path.
- Perf budget documented + perf HUD (`renderer.info`); seed the in-engine inspector (entity browser, live knob tuning, time-of-day scrubber, AABB/threat-field viz, replay scrubber).
- Directory restructure (`src/render3d/` → `src/game/`); freeze Canvas to `legacy/`; collapse to **one ID namespace / one state tree** (kills the Boone↔warden split + read-only bridge).
- **`ARCHITECTURE.md`** — the authoritative doc for the event-sourced core, ECS store, render-command abstraction, and module-boundary rules. Written *with* Phase 1, not after.

**Exit criteria**
- Determinism: `(seed, input-log)` → identical state hash, **headless**.
- Save round-trips (write→reload→identical hash); corrupted envelope recovers from backup; ironman death → slot sealed + run-summary emitted (node tests on pure logic).
- Pointer-lock engages on canvas click; WASD+look works locked.
- One real `.glb` + texture loads through Vite dev *and* Vercel CSP; WebGPU renders the uber-shader, WebGL2 renders the same scene.
- Perf HUD reports the budget; frozen legacy Canvas tests still green.
- `__spike.setPalette({})` applies instantly, no reload; `captureMode()` yields a settled frame.

**Dependencies:** none. Reuses *design* from `savePersistence`, `saveMigration`, `keybinds`, `phaseState`, `playerController`, `worldProxies`.

### Phase 2 — Hardcore combat, feel & enemy AI

**Goal:** a 3D melee/ranged core that *feels* punishing, all 7 archetypes as native 3D behavior
trees on a steering substrate, and the difficulty architecture in place.

**Deliverables**
- Re-derive combat math as pure tested modules (port `combatProcessor` structure; rewrite hit-detection for 3D — capsule/sphere + 3-space swing arcs; re-tune so identity tuning is lethal). *Note:* poise/guard-break/parry live in the 11.3k-line `main.js`, not the clean `combatProcessor.js` — budget time to mine the monolith.
- **Symmetric poise/posture** on player *and* enemies (first-class, day one); **committal, scarce healing** (interruptible animation + cost — never the instant Canvas `Q`); stamina economy; parry / guard-break / dodge.
- Hit reactions: stagger, hitstop, knockback, screen shake (port `gameFeel` + `animationHelpers`).
- Combat VFX in TSL + GPU particles; NPR ink-edge flare on a successful parry; halftone deepening as stamina drains.
- Ranged + multi-enemy groups + lock-on; damage model (armor / resist / poise / status DoT).
- **Enemy steering substrate** (obstacle avoidance vs the AABB proxies) — not full navmesh yet; ships P2 enemies before P3.
- 7 archetypes as native 3D behavior trees (`ENEMY_ARCHETYPES` + `BEHAVIOR_TUNING`; `behaviorTree.js` JSON-safe BT runtime).
- Death wired to P1 run-rules.
- **Difficulty architecture:** `{ runRules, lethality, pressure, assists }` knob-struct resolved at character creation. Tiers (Hardcore/Standard/Story) are *presets over the spine*, never a different combat. Assists (aim-assist, parry-window widening, telegraph emphasis) are *allowed in ironman* — they aid execution, not consequence.
- **One real combat-art slice** (player + 1 enemy + 1 weapon: real model/anim/SFX) through the P1 pipeline — proves the pipeline before mass art.

**Exit criteria**
- Combat math pure + node-tested; **differential tests vs `combatProcessorLegacy`** (identical where intended; lethality invariants where re-tuned — e.g. "player dies to 3 unblocked brute hits at identity tuning").
- All 7 archetypes spawn distinct; a charger dashing at a wall avoids/stops.
- Player death → correct per-mode behavior.
- One real asset animates a full idle→attack→hit→death cycle at perf budget.
- **Named subjective checkpoint:** a playtester confirms combat "feels good and dangerous."

**Dependencies:** P1 (loop, input, camera, save run-state, asset pipeline, seeded RNG).

### Phase 3 — World, survival & the vertical-slice gate

**Goal:** one **complete, shippable-quality, hardcore-survivable** region (Frontier/Dustward) —
streaming-capable, navmeshed, with the systemic survival layer — that is *fun*. **Ends in a hard
gate that can fail and block Phases 4–7.**

**Deliverables**
- Region streaming/chunking (implements the P1 partition contract).
- Navmesh (upgrades P2 steering) + collision at scale.
- POI discovery + interiors (`poiSystem`; `wfcInteriors`).
- **Survival/hardcore layer:** one composed **`threat` scalar** (region × time-of-day × weather × faction × difficulty) the encounter system reads; resource scarcity; day/night *danger* (not just lighting); weather *hazards*.
- Frontier to full shippable quality in the signature look — uber-shader + ink edges + Frontier post stack (golden dust / bloom / grain), **volumetric god-rays** through the mesas, height fog, **GPU dust motes**, the continuous day/night arc.
- **Clustered/forward+ lighting** so lanterns + beacon + slime glow coexist; at night, carried light is a survival resource.
- 2–3 archetypes forcing different tactics + **one mini-boss phase transition**; permadeath actually wired and *felt*.

**Exit criteria — the vertical-slice gate (*fun AND beautiful*, hard stop)**
- Frontier streams without hitches at perf budget; navmesh agents path around interiors/obstacles.
- A full hardcore mini-loop is survivable-but-punishing: spawn → gear up → fight → survive a night/weather hazard → bank progress (or die and lose it under ironman). The first-road loop runs end-to-end in the new engine.
- 60fps on a target integrated GPU **with the real lethality model AND the full NPR post stack**; Frontier golden-image baseline committed.
- **Sign-off (named, can fail):** a naive player dies, learns, and *chooses to retry*; a skilled player clears the mini-boss by mastery not grind; losing a permadeath run produces "one more run"; **and the region reads unmistakably as the graphic-novel signature.** If it fails, iterate P1/P2 tuning or the shader stack — **do not proceed.** (A Frontier-only hardcore release is a viable fallback ship — this gate is also a scope circuit-breaker.)

**Dependencies:** P1 (partition, perf), P2 (combat, steering → navmesh). Hard gate before P4–P7.

### Phase 4 — RPG systems & art-pipeline scale-up

**Goal:** the full character/economy/progression backbone (brutal-economy-tunable, faction-rep ready
for P5) and the art pipeline scaled now that the loop is proven worth dressing.
*Run 4a parallel to P2/P3; 4b after the world exists.*

**Deliverables**
- **4a (parallel, early):** port near-verbatim with tests — inventory/equipment, affixes (`weaponAffixes`), crafting tiers (`gearCrafting`, `craftingStation`), leveling + skill tree + capstones (`progressionSystem`), loot tables (`lootSystem`), durability/repair, character creation (`characterIdentity`). **Faction-rep data model + 3 ideology axes as a neutral-default container** (fixes the pricing-needs-factions inversion).
- **4b (here):** 3D-integrate — visible equipped gear, world loot pickups, vendor/crafting UI; vendor pricing reading the (neutral-until-P5) faction-rep model (`economyServices`); **brutal-economy as data knobs** (deficit-biased base, modifiers multiply a scarce base, death a primary sink, no easy sell-everything valve).
- Art/material scale-up: the **TSL uber-shader matures into the shared material system** (cel/rim/ink as material data, triplanar terrain, detail maps); GPU-instanced props with wind; LOD policy; clustered lighting matured; **perf budget gated with real assets**; 3D positional audio (parry/hit/guard-break audio is readability-critical).

**Exit criteria**
- All ported systems pass node tests **unchanged in behavior**.
- Equip a weapon → appears on the model + changes combat stats.
- Vendor price responds to a manually-set faction-rep value (proving the P5 seam).
- Perf budget gated with real assets loaded.

**Dependencies:** P1 (save container). 4b needs P2 (combat stats) + P3 (world pickups). 4a needs nothing — start early.

### Phase 5 — Narrative, quests, factions & content tooling

**Goal:** the complete story spine + living NPC cast — **built on authoring formats + CI validators
created before the content flood**, so the content phases have an objective done-condition.
**This phase is the differentiator; the story-first identity lives or dies here.**

**Deliverables**
- **Tooling first:** a declarative **quest schema + validator** (every `branchTag` a real axis; every `outcome.effects` references real factions/flags; every quest reachable); a **dialogue/reaction coverage checker** (`storyContent`, `dialogueChoices`, `questOutcomeEchoes`, vendor reactions); **encounter-sets-as-data** validated vs perf budget + archetype existence; **region-dressing data packs**; an **ending reachability/coverage fuzzer** (fuzz the axis/rep/flag space — assert every ending reachable, no predicate ordering shadows one out). Validators run in CI.
- Then author *through* the tools: job board + 8 main quests + side jobs; 3 factions + rep reactions wired to the 3 axes (`decisionEngine`, `influenceMap`, `factionEffects`); 7 NPCs with memory/affinity/dialogue/schedules (`npcMemory`); branching outcomes; 10+ endings (port `decisionEngine` **verbatim** as the regression oracle); run summary; NG+; **narrative state fully persisted + migratable**.
- **Content = a fixed manifest with a coverage test** (can't drift infinite).

**Exit criteria**
- Quest state machine, ending resolution, faction-axis math pass ported node tests; the ending resolver **differential test vs legacy** yields identical ending IDs for the same `{axes, rep, flags}` vectors.
- Quest completion moves a faction axis → changes a vendor price → changes spawn tint (P4↔P5 seam).
- Save/reload mid-quest preserves exact narrative state; an old-version save migrates forward.
- ≥2 distinct endings reachable end-to-end in the Frontier slice; single canonical NPC id (grep gate — no dangling Boone/warden).

**Dependencies:** P3 (world/interiors, proven loop), P4 (faction-rep model, rewards = gear/economy).

### Phase 6 — Content build-out (Ashfall + Ironlantern) & hardcore tuning

**Goal:** scale the proven slice to the full game.

**Deliverables**
- Ashfall + Ironlantern authored **through P5 tooling:** dressing / POIs / enemies / quests / hazards / mini-bosses.
- Complete cross-region story (acts 1–3); full roster + mini-bosses; biome audio mass pass + music (→ `PositionalAudio`); art mass pass to slice quality across all regions.
- **Per-region shader + post identity ships:** Ashfall heat-haze + bleached LUT + chromatic edges; Ironlantern scanline/CRT vignette + neon-rain — each region's hazard *rendered*, with a per-region golden-image baseline.
- Full difficulty ladder validated coherent end-to-end (Story beatable, Hardcore brutal-but-fair); permadeath/ironman × NG+ policy; brutal-economy balance vs real content; accessibility audit (assists allowed in ironman *by design*).

**Exit criteria**
- All 3 regions stream at budget; full story completable → ending; full roster + mini-bosses spawn correctly per region/weather.
- Ironman: new-game → death → sealed; separate run → ending → NG+ verified.
- Economy balance documented; content-manifest coverage test green; accessibility checklist passes.

**Dependencies:** P5 (story/faction systems), P3 (streaming proven on Frontier).

### Phase 7 — Polish, optimization & ship

**Goal:** hit perf/quality/QA bars at full content and ship to itch.io + Vercel.

**Deliverables**
- Perf at scope: LOD, instancing, draw-call batching, **bundle split** (render3d ~549KB → code-split Three.js + lazy-load regions).
- Full QA: smoke across all regions/quests, golden-image per region + per shader, save-migration across versions, soak/perf; **replay-determinism as a release gate** (a recorded `(seed, input-log)` that diverges = a rules regression); ending-reachability + content-manifest as release gates.
- **Ironman edge-case hardening:** crash-during-autosave (`autosaveSeq` pays off), quit-during-combat, tab-close mid-fight; anti-tamper posture.
- Tutorial/onboarding, settings, save-slot UX, **run-summary / graveyard / leaderboard** (`runSummary`, `runHistory`, `dailySeedMode`), PWA/offline.
- Release: itch.io offline ZIP + Vercel (verify glb/ktx2/audio MIME + CSP); RC → launch.

**Exit criteria**
- Perf budget met on a mid-range integrated GPU at full content; bundle under target + regions lazy-loaded.
- Full smoke + visual + migration + soak + replay suites green.
- itch ZIP runs offline; Vercel build passes CSP; RC sign-off.

**Dependencies:** all prior.

---

## 5. Phase-1 "decide-it-now" checklist

One schema field / one seam now; a cross-cutting rewrite later. Each maps to a P1 deliverable.

1. `runRules {permadeath, saveScummable}` = immutable save-payload field from format v1.
2. Death = a `sealed` transition (not delete, not recover-at-camp respawn).
3. One ID namespace, one state tree; the renderer reads *and writes* the authoritative save.
4. Autosave = on-event + on-quit, single ironman slot, no manual save; `autosaveSeq` in envelope.
5. Poise/posture is a first-class symmetric resource (player + enemies).
6. Healing is committal + scarce (interruptible animation + cost), never instant.
7. All combat/loot randomness flows through one injected seedable RNG.
8. Identity (un-multiplied) tuning IS the lethal tuning; assists multiply toward survivability.
9. Difficulty = `{ runRules, lethality, pressure, assists }` knob-struct — not a global scalar.
10. Encounter system reads one composed `threat` scalar.
11. Economy base is deficit-biased; modifiers multiply a scarce base; death is a primary sink.
12. Perf budget documented now; gated at P3, P4, P7.
13. P3 ends at a fun-gate that can fail and block P4–P7.
14. Content authoring formats + CI validators built at the *start* of P5; content = fixed manifest.
15. Renderer = `WebGPURenderer` + TSL with a WebGL2 fallback.
16. Sim is event-sourced — state = pure fn of `(seed, input-log)`; ECS store + render-command abstraction.
17. Save payload carries the `(seed, input-log)` tail (replay-reconstructable, tamper-evident).
18. The NPR uber-shader (cel + ink edges + per-region post) is the *core render path*, not late polish.
19. **Narrative state** (quest flags, ideology axes, NPC memory, faction rep) is a first-class save field from Phase 1 — not a Phase-5 afterthought.
20. The `window.__spike` **live tuning harness** ships in Phase 1; every visual session runs through it.

---

## 6. Architecture constraints

- **One renderer, one state tree.** The 3D game reads *and writes* the authoritative save. No read-only bridge, no parallel phase machine, no dual naming.
- **All game code under `src/game/`** (the promoted `src/render3d/`). Canvas frozen under `legacy/` — reference-only, never imported.
- **Pure / shell split** for every module. Tests `environment: "node"` — no jsdom, no WebGL.
- **Event-sourced + render-decoupled.** State = pure fn of `(seed, input-log)`; the sim emits an immutable render-state. Renderer = `WebGPURenderer` + TSL (WebGL2 fallback); the NPR uber-shader is the *core* path, not a filter.
- **Determinism, perf, golden-image are gates, not aspirations.** All three run every phase.
- **Coordinate convention:** world `(x, y)` → 3D `(X=x, Z=y, Y=up)`. `yaw=0` looks −Z; `yaw=−π/2` looks +X (east). Player stored as `{ x, z }`.
- **Visual tooling is first-class.** The live tuning harness (`window.__spike`) is maintained with production discipline. Break it = block visual iteration.
- **`ARCHITECTURE.md` is the contract.** Any change to the event-sourced boundary, ECS store shape, or render-command abstraction updates `ARCHITECTURE.md` in the same commit.

---

## 7. Verification gates

Before every commit:

```bash
npm test && npm run typecheck:ts && npm run test:syntax && npm run dev:lint && npm run build
```

With a dev server running:

```bash
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d     # loop smoke (3D)
npm run test:smoke                                            # semantic invariants
npm run test:visual                                           # pixelmatch baselines (dusk pinned)
```

New standing gates: **determinism** (`(seed, input-log)` → stable hash, headless), **perf budget**
(draw-call / frame-time / triangle / light-count in the render smoke), **golden-image** (per-shader /
per-region snapshots extending `test:visual`).

**Visual-session protocol:** confirm `__spike.captureMode()` is available before any tuning session;
call `dumpLook()` to persist the values before closing the browser.

**Screenshot-in-the-loop QA agent (the research's reusable best-practice loop).** For substantive
render/loop changes, run a dedicated QA pass that mirrors the verified five-phase pattern, with a
bounded autofix loop (≤3 attempts per failing step before surfacing to a human):
1. **Build** — `npm run build` clean.
2. **Headless runtime** — boot `spikes/render3d.html` headless; no console errors, `__spikeReady` set.
3. **Gameplay** — drive the loop via `__spike.goto(...)`; assert each beat's phase transition.
4. **Architecture** — the determinism + perf gates above hold.
5. **Visual review** — `captureMode()` + `settle()` screenshots vs the golden-image baseline.
This closes (partially) the visual-spatial gap the research flagged — it does not eliminate it; treat
it as risk reduction and keep a human in the aesthetic loop.

---

## 8. Port-ledger (correctness lifeline)

The Canvas suite (97 files, 1101 tests) is the behavioral spec. Re-derive against it, tier by tier.
**Port the test first, then make it pass.** Update `ported?`/`green?` as the rebuild progresses.

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

> Remaining Canvas *pure* modules (`combatLoadout`, `combatMilestones`, `seasonalEvents`, `journalLetters`, `cursedItems`, `codex`) default to Tier A — list here as scheduled.

### Tier B — re-derive against ported test *intent* (spatial / re-tuned)

| Module | Canonical test(s) | Note | Ported? | Green? |
|---|---|---|:--:|:--:|
| `combatProcessor` | `combat-processor.test.ts` | rewrite 2D `isInSwingArc` for 3D; re-tune lethal; differential vs `…Legacy` | ☐ | — |
| `enemyArchetypes` | `enemy-archetypes.test.ts` | behavior tuning ports; movement → 3D steering | ☐ | — |
| `behaviorTree` / `npcBehaviors` / `patrolSystem` | `behavior-tree.test.ts`, `patrol-system.test.ts` | BT runtime ports; nav adapts to navmesh in P3 | ☐ | — |
| `combatAccessibility` / `combatReadability` | `combat-accessibility.test.ts`, `combat-readability.test.ts` | becomes the orthogonal `assists` bank | ☐ | — |

### Tier C — rebuild fresh (engine / renderer / shell)

New code, new tests, same discipline: sim loop, camera rig, region streaming, navmesh, asset
pipeline. **Do NOT carry over** the Canvas renderer (`render.js`/sprite/HUD/minimap/fog-of-war/
post-process/particle modules), the recover-at-camp death model, the instant `Q` heal, the read-only
`stateSnapshot` bridge + parallel `phaseState`, or the 11.3k-line `main.js` composition root.

The existing `src/render3d/` seed already follows the discipline and is **kept and evolved**:
`playerController`, `worldProxies`, `interactionSystem`, `phaseState`, `encounterSystem`,
`animationHelpers`, `objectiveDom`, `boardModal`, `atmosphere`, `timeOfDay` (`render3d-*.test.ts`).

---

## 9. Critical files (reference / oracle / architecture)

- `src/render3d/spike.js` — scene assembly, render loop, all building/prop builders, the `window.__spike` hook.
- `src/render3d/frontierLayout.js` — the world map. `+x` east, `+y` south. Don't move `HERO_OBJECTS` without updating `FIRST_FIVE_ROUTE`.
- `src/render3d/timeOfDay.js` — palettes. goldenHour is the demo's opening; dusk is the `?visual` baseline — don't touch dusk without re-blessing.
- `src/render3d/atmosphere.js` — sun / hemi / camera-side fill / fog (palette-driven).
- `src/render3d/postStacks.js` — bloom / Sobel ink / grade / split-tone.
- `src/render3d/nprMaterial.js` — the cel shader (toon ramp, rim, ink params).
- `src/render3d/playerController.js` — camera rig, exploration preset, `captureMode`.
- `src/game/world/ground.js` — FBM terrain, valley-AO, pure `groundHeight(x,z)`.
- `src/game/renderer/assetManifest.js` + `assetLoader.js` — the GLB pipeline (scale × size, heightMul/scaleY).
- `src/render3d/worldProxies.js` — collision AABBs (`null` footprint = walk-through).
- `src/savePersistence.js` + `src/saveMigration.js` — envelope/integrity/migration to re-aim for ironman (P1).
- `src/difficultyTuning.js` + `src/dailySeedMode.js` — the tier model to invert into the P2 knob-struct.
- `src/combatProcessor.js` — Tier-B lift + lethality re-tune + differential oracle (P2). Poise/guard-break also in `src/main.js`.
- `src/decisionEngine.js` — crown-jewel pure ending resolver: re-derive verbatim, use as regression oracle (P5).
- `src/replayRecorder.js` — existing replay capture to fold into the event-sourced core (Bet 2).
- `scripts/smoke_suite.sh` — the semantic-invariant spec whose assertions must be ported.

---

## 10. Legacy appendix — Canvas prototype (superseded)

The prototype this rebuild draws on as design reference and oracle. Its migration milestone framing
(spike → migrate Canvas → 3D parity → retire Canvas) is **superseded** by the 7 phases above; kept so
the history isn't lost.

- **M0 — Rewrite prep & repo hygiene** ✅ — clean repo, CI gates, Vite build, Canvas smoke.
- **M1 — Three.js spike** ✅ — `render3d.html` entry; purple-dusk scene; `spike_compare.mjs`.
- **M2 — State adapter** ✅ — `stateSnapshot.js` (Canvas → read-only 3D snapshot). *Now obsolete:* one state tree, not a bridge.
- **M3A — Art proof** ✅ (`PR #19 / 4c30262`) — 3-stop dusk sky, hero camera, outlines, blob shadows, vignette, emissive slime, smoke plume.
- **M3B — First gameplay loop** 🟡 — the 9-phase first-road loop (`phaseState.js`), board modal, Road Slime encounter, animation helpers, objective strip, day/night system. This code is the **seed** the rebuild's Phase 1/3 builds on — kept, not discarded.
- **M4–M9 (superseded):** art pipeline → combat/feel → UI rebuild → system parity → retire Canvas → release MVP. Replaced by Phases 1–7.

The Canvas game (`src/main.js` + `index.html`) remains a **feature-complete playable reference:**
deterministic combat, 7 enemy archetypes, 8-quest chain + 10+ endings, 3 factions, gear / crafting /
affixes, 3 regions, 18 POIs, 7 NPCs with memory, save/migration, time-of-day, weather, NG+. Frozen as
the behavioral oracle for the port-ledger (§8).
