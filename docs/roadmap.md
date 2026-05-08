# WestWardRPG Roadmap

A compact Elder Scrolls inspired frontier RPG built in the browser.

WestWardRPG is a story first browser RPG built on a custom Canvas raycasting engine. The goal is to turn the current systems heavy prototype into a dense, readable, memorable RPG that feels handcrafted, playable offline, and impressive as a portfolio project.

This roadmap is the single source of truth. Do not create parallel TODO, PLAN, or extra roadmap files. Update this file when scope changes.

## Creative North Star

WestWardRPG should chase the feeling of a compact Elder Scrolls style RPG built for the browser.

The game should not try to compete with Skyrim or Oblivion in size, budget, graphics, or content volume. It should compete in atmosphere, player freedom, world readability, meaningful choices, and the feeling that every road might lead to a story.

The dream version is simple:

The player leaves town, follows a road, finds danger, takes jobs, builds a character, earns gear, returns home, hears NPCs react to what happened, and slowly shapes the region through choices.

The game should feel like:

1. Skyrim's road wandering
2. Oblivion's strange NPC charm
3. Morrowind's handcrafted weirdness
4. A western frontier survival RPG
5. A lightweight browser game that punches above its weight

The goal is not massive scale.

The goal is density.

Every town, road, job board, cave, ruin, faction, NPC, and reward should feel intentional.

## Product Vision

WestWardRPG should feel like a small frontier RPG with Skyrim and Oblivion energy, built with simple web technology instead of a heavy engine.

The finished version should prove that a browser game can have:

1. A clear first minute
2. A readable 3D world
3. Combat with timing and feedback
4. Character builds that matter
5. Loot, gear, jobs, and housing loops
6. NPCs that react to what the player has done
7. Story choices that show visible consequences
8. Save, pause, reload, and recovery paths that are safe for playtesting

The game must remain local first. Optional AI, network, or LLM features may come later, but the full game must work offline with handcrafted fallback content.

## Roadmap Rules

1. Player visible progress beats hidden complexity.
2. Do not rewrite the renderer.
3. Do not move to WebGL unless the project owner explicitly chooses that direction.
4. New top level save state requires a migration helper and fixture test.
5. Every gameplay change must keep the verification gates green.
6. Finish one playable slice before starting the next.
7. The roadmap should make the project easier to ship, not harder to understand.
8. Do not clone Skyrim, Oblivion, Bethesda assets, names, UI, quests, or lore. Chase the feeling only.

## Main Design Goal

The first public version should not try to be a huge RPG.

It should be a dense vertical slice of a huge RPG.

The player should be able to play for 20 to 40 minutes and feel like they touched a larger world.

The slice should include:

1. One memorable town
2. Three roads
3. Three region flavored danger zones
4. One cave, mine, ruin, or hideout
5. One faction conflict
6. One real quest choice
7. One boss or elite enemy
8. One home upgrade loop
9. One NPC who remembers the player
10. One ending or run summary that reflects what happened

If this slice feels good, the whole project becomes expandable.

## The Elder Scrolls Feeling Checklist

### 1. The Road Is the Game

The player should always have a reason to follow a road.

Roads should lead to:

1. Towns
2. Camps
3. Mines
4. Ruins
5. Bandit hideouts
6. Shrines
7. Strange NPCs
8. Resource spots
9. Regional events
10. Optional danger

The player should feel like they can say, "I was heading to a job, but then I saw something."

### 2. Every Region Has a Personality

Each region should have its own visual identity, danger profile, jobs, enemy types, resources, rumors, and faction pressure.

Dustward should not feel like Ashfall.
Ashfall should not feel like Iron Lantern.
Iron Lantern should not feel like a reskinned version of the first area.

Each region needs:

1. A visual palette
2. A common threat
3. A rare threat
4. A resource identity
5. A faction presence
6. A town rumor
7. A unique job type
8. A memorable landmark
9. A small local mystery
10. A reason to return later

### 3. NPCs Should Feel Weird, Useful, and Memorable

The game does not need hundreds of NPCs. It needs a small cast that players remember.

Each important NPC should have:

1. A job
2. A personality hook
3. A useful service
4. A personal problem
5. A reaction to player origin
6. A reaction to player reputation
7. A reaction to one major quest outcome
8. A short memorable line
9. A reason to revisit them
10. A small secret, rumor, or agenda

The target is not AI chatbot NPCs.

The target is handcrafted NPCs that feel alive because they remember enough.

### 4. The Player Build Should Matter

The player should be able to become a recognizable type of character.

Examples:

1. Outlaw gunslinger
2. Heavy armored bounty hunter
3. Survivalist scout
4. Silver tongued trader
5. Relic hunter
6. Alchemist drifter
7. Faction loyalist
8. Cursed wanderer
9. Local hero
10. Greedy opportunist

Stats, gear, jobs, faction reactions, and dialogue should reinforce the chosen identity.

### 5. Loot Should Tell a Story

Loot should not only be numbers.

Good loot should feel like it came from somewhere.

Examples:

1. A rusted pistol from a dead outlaw
2. A branded rifle from a faction patrol
3. A strange charm found in a ruined shrine
4. A miner's helmet from an abandoned shaft
5. A map scrap from a bounty target
6. A house trophy from a boss
7. A rare crafting part from a regional beast
8. A cursed item with a tradeoff
9. A faction badge that changes dialogue
10. A letter that unlocks a job

Every important reward should answer:

1. Where did this come from?
2. Why does it matter?
3. What can I do with it?
4. Does anyone notice I have it?

### 6. Small Consequences Matter

The game does not need huge branching campaigns at first.

It needs visible consequences.

Examples:

1. A shopkeeper changes prices
2. A job board updates
3. A town guard says something new
4. A faction patrol appears
5. A house visitor arrives
6. A road becomes safer
7. A region becomes more dangerous
8. A rumor changes
9. An NPC refuses service
10. A new ending flag is unlocked

The player should feel like the world noticed them.

### 7. The Home Base Should Feel Like Your Place

The player's house should become the emotional anchor.

It should support:

1. Storage
2. Crafting
3. Resting
4. Trophies
5. Workbench upgrades
6. Companion visits
7. Job planning
8. Map planning
9. Letters or rumors
10. Visual proof of progress

The house should slowly change from shelter into identity.

### 8. The World Should Have Mystery

WestWardRPG should include strange, slightly unsettling, memorable discoveries.

Examples:

1. A locked shrine in the desert
2. A ghost town rumor
3. A mine where workers disappeared
4. A faction symbol carved into stone
5. A cursed relic
6. A talking prisoner
7. A repeating dream
8. A bounty that was not human
9. A house visitor who knows too much
10. A final region secret tied to the ending

This is where the game can feel more Oblivion and less generic western.

## Current Build Summary

The current build already includes the Shattered Frontier v3 foundation, story progression, thematic axes, quest outcomes, ending and run summary logic, combat depth, region events, POIs, faction reputation, character origins, attributes, gear, armor, loot tables, housing, workbench upgrades, Boone job boards, deterministic NPC memory, visual identity work, and early open world pressure.

The next goal is polish, readability, and payoff.

The project does not need more scattered systems yet.

It needs the existing systems to feel connected in the player's first short session.

## Shipped Foundations (audit)

Latest audit (2026-05-05, post Track-A1+A5+A2): `npm test` → **482 passing across 45 test files**; 46 source modules (added `savePersistence.js`); 14 Playwright scripted-replay scenarios; **CI live** (`.github/workflows/qa.yml`, two-job pipeline). `main.js` is **~9,225 lines** (extraction debt — see below). README test count refreshed to 457/44 then 482/45 as A2 landed.

### Phase 1 open-road slice (latest local)
- **Discovery Reward Banner 1** (`src/discoveryRewardFeedback.js`) — discoveries now trigger a compact reward banner with title, reward line, story hook, codex unlock, and route/renown payoff lines. `render_game_to_text` exposes the active banner for browser smoke and human-test auditing.
- **Roadside Discovery 1** (`src/poiSystem.js`) — the first Dustward roads now include a broken wagon, wayside shrine, and abandoned lunchfire near Boone. They are deterministic, one-shot, codex-backed, minimap-visible, render-text-visible, and small enough to stumble into before the bigger POI loop.

### Phase 2 + Phase 3 payoff slice
- **Job reward feedback** (`src/jobRewardFeedback.js`) — job payouts now use a pure feedback helper, story-loot jobs point back to house trophy proof, bonus pay is surfaced consistently, and generic jobs no longer say "bounty" when they are patrols, deliveries, or surveys.

### Phase 4 + Phase 5 partial closeouts (latest)
- **Lite dialogue choices** (`src/dialogueChoices.js`) — chapter-gated 2–3 choice modal for Elder, Warden, Smith, Trader, Innkeeper. Each choice applies axis / faction-rep / NPC-affinity deltas, records a `narrative.dialogueChoicesTaken` flag, and feeds run summary. Modal hooked into existing E-key NPC interact path.
- **Difficulty selector** (`src/difficultyTuning.js`) — Beginner / Standard / Hard scales enemy HP × 0.7/1.0/1.5, enemy damage × 0.7/1.0/1.35, reward × 1.1/1.0/1.2. Surfaced as a settings-modal row driven by `state.world.difficulty`. Save migration backfills.
- **Companion barks** (`src/companionBarks.js`) — per-companion personality lines (Cogwheel / Nora / Boone) for low-HP, first-kill, mini-boss, region-entry, house-unlock, perfect-dodge, perfect-parry, level-up, boss-phase. Global cooldown + per-event cooldown keep them rare. `Infinity` cd marks once-per-run events.

### Engine and rendering
- `src/render.js` — pure helpers (`hexToRgba`, `gradientBucket`, `createGradientCache`) plus ctx-bound factory `createRenderHelpers(ctx)`; raycaster math helpers `resolveWallProjection`, `resolveNearWallVisualTreatment`, and `resolveObjectiveStripLayout` so the wall renderer stays testable.
- `src/particlePool.js` — pre-allocated 1500-slot ring buffer with no per-frame alloc, cleared on session reset.
- `src/spatialHash.js` — uniform grid (cellSize 4) rebuilt once per tick, powers AoE queries (smoke, flare, perfect-dodge proximity).
- `src/audio.js` — three-bus graph (master / sfx / ambient / music) with per-region procedural drones (frontier=warm, ashfall=mid, ironlantern=metallic) and crossfade on region change. Shift+M toggles ambient.
- `src/timeOfDay.js` — `state.world.timeOfDay` advances over ~10 real minutes; phase-tint LUT layered on biome grading; night doubles hostile spawn density. KeyU fast-forwards 10% for testing.
- `src/regionVisualIdentity.js` — per-region palette, prop list, signage, vista composition.
- `src/gameFeel.js` — first-fight VFX polish, boss flash beats, chunked screen-shake easing.
- `src/combatReadability.js` — windup outline pulse, INTERRUPT/PARRY/PERFECT pop sizing, hit-flash duration ramps so timing reads at speed.

### Combat identity
- `src/statusEffects.js` — burn / bleed / shock / frost stack with DoT, slow, and frost shatter on max-magnitude expiry. Speed multiplier feeds enemy pursuit.
- `src/combatLoadout.js` — perfect dodge (0.15s window, slow-mo + stamina refund), perfect parry (0.15s window, doubled riposte + 1.5s stagger), weapon archetype movesets (light / heavy / spear shape arc + reach + stagger).
- `src/combatMilestones.js` — mini-boss phase-two transitions (Scrap Tyrant: brute → charger; Iron Chanter: control → ranged) at 50% HP.
- `src/weaponAffixes.js` — additive prefix + suffix mods on weapon drops, three suffix tiers; affix selection seeded by region + drop source.
- Enemy telegraph windups (`charge` / `tank` / `shield` / `control` archetypes) with INTERRUPT reward when struck mid-windup.

### Character, gear, economy
- `src/characterIdentity.js` — six attributes (might / grit / cunning / craft / speech / lore) drive damage, stamina, prices, dialogue gates, and crafting yield.
- `src/gearCrafting.js` — weapon families (saber / pistol / rifle / hammer) and armor pieces (head / chest / legs / cloak) with branch progression.
- `src/craftingStation.js` — workbench projects: forge upgrades, alchemy, map table, repair, refining; previews + cost summaries.
- `src/inventoryState.js` — single source of truth for inventory; story loot fields preserved on save.
- `src/economyServices.js` — vendor service catalog (repair, courier, bounty permits, training, regional cosmetics) keyed off region identity.
- `src/lootSystem.js` — region + danger weighted loot tables, attribute-modulated rarity rolls.
- `src/storyLootReactions.js` — handcrafted reactions for notable loot picked up (badge, sealed note, map scrap) — feeds NPC memory + job board + dialogue.

### World and exploration
- `src/poiSystem.js` — 17 hand-placed POIs across three regions (cache / shrine / camp / mine / ruin / hideout / stranger) with regionHint, roadHook, dangerHint, mysteryLine, returnReason copy on every record. `resolvePOILead`, `resolveRoadDiscoveryLead`, `resolveExplorationRenownReward`, `resolveExplorationRenownStatus`.
- `src/roadRoutes.js` — readable road signs that pin POI routes; sign placement; route-completion XP + upgrade payoff.
- `src/factionEffects.js` — `marketCartel` shop prices (-15% allied / +30% hostile), `workersGuild` smith-tier gates, `civicCouncil` patrol density.
- `src/regionSystem.js` — region unlocks, region events, mini-boss flag set.
- `src/codex.js` — six tabs (regions / enemies / items / factions / ideology / letters); POI letters auto-unlock via `resolveCodexUnlockForPOI`.

### Narrative and progression
- `src/decisionEngine.js` — thematic axes, faction rep, NPC affinity, decisions log, `applyMajorDecision`, `applyQuestOutcome`, `resolveNarrativeEnding`.
- `src/questDefinitions.js` — branching quest outcomes (`outcomes: { a, b }`); region-resource turn-ins drive Ashfall / Lantern advancement.
- `src/companion.js` — one-slot follower at affinity ≥ 60; pursuit AI; downed state; recovery timer; affinity penalty on death.
- `src/storyContent.js` — chapter beats, NPC story lines.
- `src/jobBoard.js` — Boone's selectable job board (courier, rescue/escort, bounty), regional copy, route markers, completed-route reward gates.
- `src/npcMemory.js` — deterministic NPC reactions to origin, region, recent quest outcomes, gear identity, story loot, current job.
- `src/runSummary.js` — kills, mini-boss kills, jobs taken/completed/failed, resources harvested, quest outcome count, time played, ending cause.

### Save resilience
- `src/saveMigration.js` — v1 / v2 / v3 fixtures all migrate cleanly; backfill helpers for `regions.miniBosses`, `regions.poisDiscovered`, `world.timeOfDay`, `world.companionId / Hp / Downed / RecoveryTimer`, `narrative.questOutcomes`, story loot inventory keys, codex unlocks.

### UI / accessibility
- Settings modal (KeyO) — preset, gradient cache, colorblind mode, font scale, motion reduction, camera shake.
- Codex modal (KeyZ) — five-tab tabbed lore browser, undiscovered entries masked.
- Skill tree, shop, smith tabs, quest outcome modal — shop-pattern modal idiom.
- Colorblind palette wired into mini-map dots, floating damage colors, NPC + enemy sprite glows.
- First-minute objective HUD strip; opening route guide; first-view vista composition.

## Audit (2026-05-05): Wired-But-Invisible Inventory

Three deep audits ran on the engine, the system coupling, and the test suite. Findings are concrete and broken into "do this week," "do this month," and "do this quarter" buckets.

### Engine debt — main.js is the elephant

- `src/main.js` is 9,210 lines. Approximate composition: ~30% rendering (`render3D` ≈ lines 6652–8296), ~25% update loop (`update` ≈ lines 4953–6651), ~20% input + modal handling, ~15% save/load + state init, ~10% setup + language packs.
- Top extraction targets (each one is a small PR):
  1. **`InputManager`** — centralize keydown/keyup/mousemove/pointer-lock; gamepad-ready scaffold; replace 8 modal-aware keydown branches with one dispatcher.
  2. **`ModalStack`** — `dialogueSelection`, `questOutcomeSelection`, `jobBoardSelection`, `codexTab`, `settingsSelection` are currently **module-globals**, which means save/load can't preserve them and reopening a modal can land on a stale index. Move into `state.ui.modals[]`.
  3. **`HudRenderer`** — every `draw*` HUD function (mini-map, bars, floating text, objective strip).
  4. **`CombatProcessor`** — attack / block / parry / combo / stamina / guard-break logic currently mixed into `update`.
  5. **`NPCBehavior`** — `updateNPCs`, `updatePigs`, companion AI (~lines 4667–4951).
  6. **`SaveStateManager`** — save/load handlers, autosave ticker, storage sync.
  7. **`WeatherSystem`** — `updateWeather`, mood, rain/lightning physics (~lines 4597–4666).
  8. **`LanguageManager`** — `LANGUAGE_PACKS` (~360 lines of inline locale strings, lines 339–700) → JSON files, lazy-loaded per language.
- `src/jobBoard.js` is 1,434 lines and crosses concerns: `JOB_BOARD_PROPS` belongs in `poiSystem.js`; `JOB_BOARD_PRESENTATION` belongs in `storyContent.js`; `COMPLETED_JOB_BOARD_LINES` belongs in `npcMemory.js`.
- `index.html` has 600+ lines of inline menu CSS (`<style>` block, ~lines 26–641). Extract to `menu.css`; lazy-load on title.
- ~~`atmosphere.js` is loaded in `index.html` but never called from `main.js`~~ — **correction (2026-05-05)**: the initial audit was wrong; `main.js:322` reads `window.WestWardTS.computeAtmosphere` and `main.js:5583` calls it. The IIFE is live. As of A1 it lives in `public/atmosphere.js` and is served as-is by Vite.
- Per-frame allocations in the render hot path: `new Float32Array(width)` allocated every frame for the depth buffer; per-pixel `rgba(...)` template-string interpolation in the inner column loop. Pre-allocate the depth buffer once; pool color strings or pre-compute lighting LUTs.
- `update()` runs full physics / AI / weather while modals are open. Gate non-essential update on `state.mode === "playing" && !modalStack.any()`.
- No gamepad support. No update-while-paused gating. No music tracks loaded (the `music` audio bus exists at `audio.js:21` but is never populated).
- Renderer ceiling: textured walls, distance fog, distance-based shading, sprite billboards — all good. **No dynamic lights, no per-entity glow, no flashlight, no parallax ground detail.** This is the single biggest visual upgrade for atmosphere (see Track B2 below).

### Systems debt — "shipped but not wired"

Cross-checked against `decisionEngine`, `factionEffects`, `economyServices`, `npcMemory`, `dialogueChoices`, `jobBoard`, `companionBarks`, `houseProgress`, `runSummary`, `questDefinitions`, `lootSystem`.

- **`economyServices.buildEconomySnapshot`** is exported but **never called** in `main.js`. Either wire it into a vendor-context modal or delete the file.
- ~~**`factionRep` → shop prices** invisible during play.~~ **Shipped:** `tickFactionRepBands` runs in `update`, fires `showHudNotice(createFactionRepNotice(...))` on every band crossing.
- ~~**Codex unlocks are silent.**~~ **Shipped:** `unlockCodexAndPing` calls `showHudNotice(createCodexUnlockNotice(...))` on every newly unlocked entry.
- ~~**Quest outcomes ↛ job board.**~~ **Shipped 2026-05-07:** `passesNarrativeGate` in `jobBoard.js` gates listings by `globalFlags`, `questOutcomes`, and `factionRep`. Three outcome-gated frontier jobs (Council Fallout, Guild Pressure Run, Archive Stragglers) appear on Boone's board only after the matching quest choice. `acceptJob` re-validates the gate.
- **`npcAffinity` vs `npcMemory.byNpc[id].greetings`** — both track "does this NPC know the player." Pick one as authoritative; the other becomes a derived view. Today it's unclear which to read.
- **`narrative.factionRep` vs `narrative.npcAffinity`** — semantics are conflated. Decide: faction = political, affinity = personal. Then test both surfaces.
- ~~**`houseProgress` trophies ↛ run summary.**~~ **Shipped 2026-05-07:** `runSummary.houseTrophyHighlights` is rendered into the victory panel under "Home Trophies" with cursor-driven layout that fits compact and full modes.
- **`companionBarks` ↛ quest outcomes.** Barks fire on combat events only. Add quest-outcome bark variants per companion personality (Cogwheel sardonic, Nora warm, Boone laconic).
- **`dialogueChoices` ↛ identity gates.** Choices are not gated by origin or attributes. Add `Speech` gate + origin-flavor gates per the "ten-flavor identity reactions" stretch (existing future-idea).
- **Endings.** Only 3 distinct outcomes in `decisionEngine.js:198–219`; most runs fall through to "Elite Rotation" fallback. Add `globalFlags` + companion-state modulation per the existing 8-ending stretch.
- **Quest outcomes are the master keystone of the world's reactivity, and the world barely reads them back.** This is the single biggest gap in the project right now: the player makes choices, the choices are recorded, and the world doesn't notice.

### Test debt — confidence is overstated

- README claims **337 / 35**. Roadmap claimed **456 / 44**. Reality: **457 / 44**. README is stale.
- Test pyramid is healthy at the bottom (~250 unit) and middle (~200 state-machine), **thin at the top** (~7 integration; 0 real E2E with assertions).
- Zero tests for: `main.js` render loop lifecycle, input layer, Canvas/DOM rendering contract, save corruption fallback (despite the README's claim), pause/resume.
- `test-actions/*.json` are **scripted input replays without assertions** — they prove the loop didn't throw, not that any state value is correct. A silently-broken state passes.
- `security-best-practices.test.ts` is a single string-scan for `.innerHTML` in `main.js`. Necessary, not sufficient.
- A few false-confidence tests exist (e.g., `weapon-affixes.test.ts:11–13` asserts `length >= 4`; `economy-services.test.ts:28` asserts a fixed array order). These pass forever without proving anything substantive.
- **No CI.** No `.github/workflows/`. Tests only run on the developer's machine. This is the easiest risk to fix; see Track A5.

### Quick-win cleanup (each is < 1 day, do them this week)

1. ~~README: update test count `337 / 35` → `457 / 44`.~~ **Shipped 2026-05-07:** README now reads 548 / 52, matching reality.
2. ~~Delete or wire `atmosphere.js`~~ — already wired (corrected 2026-05-05); served from `public/atmosphere.js` by Vite.
3. Wire or delete `economyServices.buildEconomySnapshot`.
4. ~~Add codex-unlock HUD ping (small floating-text + icon flash).~~ **Shipped:** `unlockCodexAndPing` already fires `showHudNotice(createCodexUnlockNotice(...))`.
5. ~~Add price-shift HUD ribbon when faction rep crosses ±10 / ±25 / ±50.~~ **Shipped:** `tickFactionRepBands` fires `showHudNotice(createFactionRepNotice(...))` on band crossings (with Market Cartel price-line variant).
6. ~~Move `JOB_BOARD_PROPS` → `poiSystem.js`; `JOB_BOARD_PRESENTATION` → `storyContent.js`; `COMPLETED_JOB_BOARD_LINES` → `npcMemory.js`.~~ **Shipped:** `jobBoard.js` already imports them from those modules.
7. Pre-allocate the raycaster depth buffer (move `new Float32Array(width)` out of the per-frame path).
8. Add `state.ui.modals[]` and migrate `dialogueSelection` / `questOutcomeSelection` / etc. into it (saved with v3; bumps to v4 only when other v4 items land).
9. Update Anti-goals (see Track-section near the bottom of this file) to reflect the project-owner directive of 2026-05-05.

## Definition of Done

WestWardRPG is roadmap finished when a new player can:

1. Start the game and understand where to go within 60 seconds.
2. Fight an enemy and clearly read danger, timing, damage, stagger, death, and reward feedback.
3. Complete at least one job or quest loop.
4. Earn loot or resources that lead to a real upgrade decision.
5. Visit the house and understand why it matters.
6. Talk to NPCs who react to current run facts.
7. See at least one visible consequence from a story choice.
8. Pause, save, reload, recover, and continue without developer help.
9. Finish or fail a run and understand the summary.
10. Launch the game from a clean local or packaged build.

## Phase 1: First 10 Minutes Must Feel Finished

Goal: The opening session should feel intentional, readable, and rewarding.

### Required Work

1. Opening direction
   1. Add a clear first route marker.
   2. Show the nearest useful objective.
   3. Show distance, reward, threat level, and reason to care.
   4. Make Boone's board visible and understandable early.

2. Starting town readability
   1. Improve roads, signs, fences, props, crates, camp silhouettes, and landmarks.
   2. Make Dustward Frontier feel like a place, not an empty test map.
   3. Make the player understand town, danger, shelter, and road direction at a glance.

3. First combat clarity
   1. Enemy aggro must be obvious.
   2. Windup, stagger, hit, block, parry, death, and reward drops must be visible.
   3. Combat feedback should feel punchy even with simple visuals.

4. First reward loop
   1. Within 10 minutes, the player should earn one useful reward.
   2. That reward should connect to gear, crafting, jobs, or the house.
   3. The game should explain why the reward matters.

### Acceptance Test

A tester can play for 10 minutes and explain:

1. Where they went
2. What was dangerous
3. What they earned
4. What they want to upgrade next
5. One thing they remember visually

## Phase 2: Make the Core RPG Loop Real

Goal: Jobs, loot, gear, crafting, housing, and economy should connect into one repeatable loop.

### Required Work

1. Gear choice pressure
   1. Weapon families should feel different.
   2. Armor should affect movement, stamina, protection, or role identity.
   3. Attribute choices should change how the player approaches combat, prices, crafting, or dialogue.

2. Earned upgrades
   1. POIs, mini bosses, region rewards, and jobs should drop useful materials.
   2. Some upgrades should be earned outside shops.
   3. Loot should help the player tell a story about their build.

3. Workbench depth
   1. Workbench levels should have visible benefits.
   2. Add clearer previews for forge, alchemy, map table, repairs, refining, and station projects.
   3. The player should understand why upgrading the house matters.

4. Gold sinks
   1. Add useful spending choices such as repairs, housing upgrades, pet care, trainers, cosmetics, travel, bounty permits, or rare crafting services.
   2. Gold should feel helpful, not decorative.

### Acceptance Test

After one short session, a tester can name:

1. Their build direction
2. Their best weapon or armor choice
3. One resource they want more of
4. One reason to return home
5. One thing worth spending gold on

## Phase 3: Make the World Feel Alive Offline

Goal: NPCs and services should react to the player without needing AI or network calls.

### Required Work

1. Dialogue UI
   1. Add a compact 2 to 4 choice dialogue modal for major NPCs.
   2. Keep responses short and handcrafted.
   3. Dialogue should be fast, readable, and game like.

2. NPC memory reactions
   1. NPCs should reference origin, current region, house state, recent quest outcome, active job, faction stance, and notable gear.
   2. Reactions should be deterministic and save safe.

3. Visible consequences
   1. At least one quest outcome should change a service, shop note, town line, patrol presence, job board listing, house visitor, or regional dressing.
   2. Consequences should show during play, not only in debug or end screens.

4. Regional identity
   1. Dustward, Ashfall, and Iron Lantern should each have distinct jobs, props, language, hazards, resources, and reward flavor.

### Acceptance Test

A tester can identify at least three current run facts that appear in NPC dialogue, service text, job board copy, or world state.

## Phase 4: Complete the Story Loop

Goal: The player should be able to finish a run and understand why the ending happened.

### Required Work

1. Quest outcome coverage
   1. Major quest choices should write to narrative state.
   2. Save and reload must preserve outcomes.
   3. Tests should cover at least one full quest choice path.

2. Companion barks
   1. Add short lines for low health, first kill, boss phase, region entry, house unlock, and key quest outcomes.
   2. Keep lines short and rare enough that they feel special.

3. Ending variants
   1. Endings should reflect thematic axes, factions, quest outcomes, companion state, gear identity, and key flags.
   2. Avoid too many endings until the core ones are clear.

4. Run summary
   1. Show kills, jobs completed, jobs failed, resources found, bosses defeated, origin, gear highlights, quest outcomes, ending cause, and time played.

### Acceptance Test

After a completed run, a tester can explain:

1. What ending they got
2. Why they got it
3. Which choices mattered
4. What they would do differently next time

## Phase 5: Playtest Readiness

Goal: The game should be stable enough for someone else to test without you standing over their shoulder.

### Required Work

1. Pause and settings
   1. Escape pause
   2. Resume
   3. Settings
   4. Codex
   5. Quit to title
   6. New run
   7. Difficulty selection

2. Save resilience
   1. Multiple save slots
   2. Backup rotation
   3. Corruption recovery screen
   4. Export and import
   5. Clear future schema messaging

3. Local run history
   1. Track past runs locally.
   2. Show ending, build identity, major choices, and best stats.

4. Playtest feedback
   1. Add a simple post run feedback prompt or local notes export.
   2. Track local metrics such as time to first kill, first job accepted, first reward, death cause, chapter reached, and setting changes.

### Acceptance Test

A tester can start, pause, save, reload, recover from a bad save, finish or die, and send useful feedback from one session.

## Phase 6: Portfolio Ready Release

Goal: Package the project so it looks serious to employers, recruiters, and other developers.

### Required Work

1. README polish
   1. Keep the README honest and impressive.
   2. Explain the game in one strong sentence.
   3. Include screenshots or GIFs.
   4. Show controls, quick start, systems, tests, architecture, and roadmap link.

2. Visual proof
   1. Add a short gameplay GIF or video.
   2. Add screenshots for title screen, combat, job board, housing, region identity, and run summary.

3. Release package
   1. Create an offline itch style package.
   2. Include clear launch instructions.
   3. Include known limitations.
   4. Do not require Codex, local agents, or repo knowledge to play.

4. Final audit
   1. Remove stale docs.
   2. Confirm ignored output artifacts are not committed.
   3. Confirm scripts match the README.
   4. Confirm roadmap status matches the actual build.
   5. Confirm license and contribution docs are clean.

### Acceptance Test

A non developer can open the repo, understand the project, run the game, see proof of quality, and understand why the project is technically impressive.

## Future Ideas — Beyond the Phase Plan

Stretch concepts. Only worth scheduling after Phases 1–6 are honestly green.

### Combat round 2
- **Boss multi-phase choreography** — extend `src/combatMilestones.js` from a 50% HP swap to a real second phase: arena hazards (kiln burst on Scorch Engine), summon waves (chanter call-down on Iron Chanter), or terrain reshape. Keep gating on existing `mini_boss_flow` scenario.
- **Counter-windup baits** — enemy occasionally cancels its own windup mid-swing and re-commits later, training the player to read the second telegraph.
- **Stamina chip + guard-break** — blocked hits chip stamina; guard-break stagger when stamina hits 0 mid-block.
- **Status synergies** — burn + frost cracks for a small AOE ice-burst; bleed + shock chains a second jump on the chained target.
- **Aimable charged attacks** — current charged attack uses comboStep 3 only; let the player aim a wider sweep vs. a directed thrust.
- **Companion combat synergy** — companion smoke/flare/tonic stack with the player utility; companion barks tied to `state.combat` events (low HP, perfect dodge, kill streak).

### World round 2
- **Patrol entities** — civic-council patrols actually spawn as friendly NPCs that engage hostiles when allied; hostile patrols turn on the player when `civicCouncil` rep tanks.
- **Seasonal events** — long real-time cycle (4 in-game weeks per season) layered on top of `timeOfDay` with `state.world.calendarDay`. Festival in Frontier (vendor-only items), dust storm in Ashfall (reduced visibility, more spawns), blackout in Iron Lantern (patrol pause, stealth window).
- **NPC schedules** — NPCs walk to home cells at night; allied factions leave doors unlocked; hostile factions lock the road earlier.
- **Procedural region overlays** — keep handcrafted POI placement, but seed-randomize a small set of overlay encounters (ambush, wandering trader, downed traveler) along the road every in-game day. Bound by daily-seed RNG.
- **POI round 2** — 6+ POIs per region, treasure-hunter POIs that point to other POIs via map-scrap clues, time-locked POIs that only appear at dusk or in storms.
- **Cave / mine / ruin interiors** — currently surface-only; even a single one-room interior per region would multiply the "I followed a road and found a place" moment.

### Narrative round 2
- **Lite dialogue** — per-NPC stateless 2–3 choice prompts per chapter. Modal applies axis/rep deltas via `applyMajorDecision`. Not a tree; flat menu gated by chapter + flag. Already drafted; needs UI + scenarios.
- **Companion barks** — short lines for low HP, first kill, boss phase, region entry, house unlock, key quest outcomes. Save the more memorable ones for repeat playthroughs.
- **Endings expansion** — go from 4 axis endings to 8 by adding `globalFlags`-modulated variants per axis (Solidarity Hopeful vs Solidarity Pyrrhic depending on `ledgerPublished` + companion alive + workersGuild rep).
- **Letters / journal entries** — hand-written paragraphs picked up at POIs, viewable in codex letters tab; some letters reference each other and reveal lore not exposed via dialogue.
- **Cursed item tradeoffs** — relics that buff one stat and debuff another, plus a hidden NPC reaction line that names the curse.

### Player build round 2
- **Ten-flavor identity reactions** — extend `src/characterIdentity.js` so each of the ten archetype labels (outlaw gunslinger, heavy bounty hunter, survivalist scout, silver-tongued trader, relic hunter, alchemist drifter, faction loyalist, cursed wanderer, local hero, greedy opportunist) has at least one NPC who reacts and one job-board listing that opens up.
- **Skill tree round 2** — beyond the three trunk branches, add a small set of capstone perks gated by attribute thresholds + faction allegiance, so a character feels stamped by their build.
- **Build-mark equipment** — when a build crosses a threshold (e.g., relic-tier weapon + 60+ marketCartel rep), Trader Nyx or the Smith hands the player a build-flavored cosmetic item that registers in run summary.

### Engine round 2
- **OffscreenCanvas pre-render** — bake static minimap layer + biome ground tiles to off-canvas; cuts redundant per-tile fills on Low preset.
- **Sprite atlas** — atlas every `makeTexture` output once per session start; pre-render the bands the gradient cache tracks.
- **Web Worker pathfinding** — A* off-thread for any new enemy archetype that needs route awareness (mounted, ranged-with-cover).
- **Save schema bump v4** — narrative + replay state has grown; do an explicit v3→v4 with new fields (`world.companionId`, `world.ngPlusLevel`, `world.calendarDay`, `narrative.questOutcomes`). Keep the `backfill*` helper pattern.
- **Replay system** — record input + RNG seed per run for bug repro and shareable death replays.
- **Telemetry / dev overlay** — toggle key for FPS, particle count, grid bucket count, ambient drone state, and status-effect summary on hovered enemy.

### Replayability round 2
- **New Game+** — `state.world.ngPlusLevel` carries forward `progression.upgradePoints` / `skillTree` / `weaponTier` / `armorMods` / cosmetic identity items. Resets quests / inventory / regions. Enemy HP × (1 + 0.25 · ngPlusLevel).
- **Daily seed mode** — main-menu button. Seed = YYYY-MM-DD hash drives spawn order, POI overlay placement, region-event severity. Score = `kills × 5 + gold + dayDepth × 100`. Local leaderboard.
- **Challenge runs** — new-game checkboxes: ironman (no reload after death), no-shop, no-skill, no-companion. Each modestly multiplies score.
- **Run history** — track past N runs locally; show ending, build, choices, time-to-first-kill metric.

### Polish + meta
- **Visual regression diffing** — current `scripts/visual_regression_capture.sh` archives baselines; add pixelmatch-based pass/fail CI step.
- **Localization expansion** — extend the 8-language pack to cover codex letters, job board copy, and combat subtitles.
- **Accessibility round 2** — combat subtitles ("hit", "crit", "low HP", "regen") via accessibility flag; audio cues on perfect dodge/parry; text-scale-aware modal layout.
- **Keybind remap** — settings sub-menu, persisted in `state.input.keybinds`.
- **Save slots (3)** — prefix `westward_save_<slot>`. Title-screen UI for slot select; existing key migrates to slot 1.
- **Mobile touch overlay** — investigation only; combat is fast enough that touch-only would need rebalanced timings.
- **Itch packaging** — single zip with `index.html`, hashed asset paths, offline service worker, no Codex/agent dependency to launch.

### Anti-goals (revised 2026-05-05 — see "Tech Modernization Tracks" below for the full statement)

The original anti-goals were tightened *and* loosened by project-owner directive on 2026-05-05. The short version:

- ❌ Still anti-goal: WebGL world rewrite, three.js / Babylon.js port, full procedural region regeneration, realtime multiplayer, LLM-generated *major* dialogue.
- ✅ Now allowed (under strict scope): WebGL2 *post-process layer only*, WebAssembly hot paths, opt-in WebLLM *non-canon ambient flavor* with handcrafted fallback, async ghost replays.

The full table — including kill-switches, gates, and migration units — is in **Tech Modernization Tracks** below.

## Tech Modernization Tracks (project-owner approved 2026-05-05)

These tracks run **in parallel** with Phases 1–6. They exist because the project owner explicitly directed (2026-05-05) that WestWardRPG should now use modern web technology to push past the current ceiling, while keeping the raycaster identity, the offline-first promise, and handcrafted main content.

Each track names: the technology, why it matters, scope, the migration unit, a kill-switch, and the verification gate it must pass. Track D requires explicit re-approval per item.

### Track A: Engine foundations (low-risk, high-leverage)

**A1. Build pipeline (Vite). ✅ Shipped 2026-05-05.**
- Why: replace `python3 -m http.server` with a real dev server (HMR), production build (minification, code splitting, hashed assets, CSP), and a manifest. Today every change requires a hard reload; that's not the 2026 dev loop.
- Shipped: `vite@^6.4.2` devDep; `vite.config.js` at root; `npm run dev` → Vite; `npm run dev:py` → python static fallback; `npm run build` → `dist/`; `npm run preview` → serves built bundle. `vercel.json` updated to `framework: vite` + `buildCommand: npm run build` + `outputDirectory: dist`. `atmosphere.js` moved to `public/` so Vite serves it as-is. `index.html` script tags updated to absolute `/atmosphere.js` and `/src/main.js`.
- Gate result: `npm run build` produces 374.9 KB raw → **122.84 KB gzipped** (under 300 KB gate). 457/457 tests still passing. Typecheck + lint + syntax all clean.
- Kill-switch: revert `package.json` scripts; remove `vite.config.js`; revert `vercel.json`; move `public/atmosphere.js` back to root. Static `index.html` still works against the python fallback.

**A2. IndexedDB-backed saves with export/import + corruption recovery. ✅ Shipped 2026-05-05 (Phase 1).**
- Why: localStorage is a 5–10 MB hard cap and not transactional. Save corruption was undetected on load.
- Shipped:
  - New `src/savePersistence.js` (+ `.d.ts`) — IDB wrapper with `writeSave` / `readSave` / `listBackups` / `readBackup` / `restoreFromBackup` / `deleteSave` / `exportSaveBlob` / `exportSaveJson` / `importSaveFromText` / `migrateFromLocalStorage` / `findMostRecentValidBackup`.
  - **Storage envelope (storageVersion 1):** `{ storageVersion, payloadVersion, savedAt, hash, payload }`. Hash is FNV-1a 32-bit over the JSON serialization (cheap, deterministic, accident-detection grade — not adversarial integrity).
  - **Backup rotation:** automatic on every write — current primary moves to backups, last 3 retained per slot.
  - **Corruption recovery (no UI yet):** on init, hash mismatch triggers `findMostRecentValidBackup` and auto-restores; player sees a one-line message ("Save was corrupted; restored from a recent backup") on next session start.
  - **Cache-fed sync facade:** `main.js` keeps its existing sync `saveGame` / `loadGame` API. Reads serve from a memory cache populated asynchronously; writes update cache + fire async IDB write-through.
  - **localStorage migration:** one-shot drain on init via `migrateFromLocalStorage` reads `westward-save-v3` (and the three legacy keys), writes to IDB, then clears all legacy keys. Idempotent.
  - **Export/import:** portable `westward-save` JSON format with full envelope; round-trip tested.
  - **Test polyfill:** `fake-indexeddb` devDep + `tests/setup-idb.ts` setup file (also polyfills `localStorage` and `structuredClone` for the node test env). DB is wiped between tests via `beforeEach`.
- **Tests added: 25** (test count 457 → 482; file count 44 → 45). Coverage:
  - `hashJson` determinism, distinctness, raw-string handling.
  - `makeEnvelope` / `validateEnvelope`: shape, hash mismatch, unknown storage version, null/missing/non-object input.
  - `writeSave` / `readSave`: round-trip, empty slot, multi-slot independence.
  - Backup rotation: cap to MAX_BACKUPS_PER_SLOT, newest-first ordering.
  - Corruption: tampered-payload detection, `findMostRecentValidBackup`, `restoreFromBackup`.
  - Export/import: round-trip, malformed JSON, format mismatch, hash-mismatch envelope.
  - Legacy migration: drains legacy key + clears all four legacy keys, returns null when none, ignores malformed legacy JSON, idempotent on second run, prefers `westward-save-v3` over older keys.
- Gate: 482/482 tests pass; build 124.69 KB gzipped (+1.8 KB for IDB layer; under 300 KB gate); typecheck clean.
- Schema-bump deferred: the **payload** schema stays at v3 (no field changes); only the **storage envelope** is new. A v3→v4 payload bump will land with the next item that adds save fields (likely Track A4 typed UI state or B2 light entities).
- Kill-switch: revert main.js wiring (`initSavePersistenceAsync` + `idbWriteSave` calls); old localStorage path is still in `readSaveDataLegacy` as the sync seed and can be re-promoted to primary by deleting the IDB-cache pair.
- **Future polish (not blocking):** corruption-recovery modal that lets the player pick which backup to restore, instead of auto-rolling-back; UI buttons for export/import; IndexedDB quota-exceeded handling.

**A3. Service Worker + PWA manifest.**
- Why: installable offline-first build is core to the "playable offline" promise. Also enables update messaging.
- Scope: precaching strategy (Workbox or hand-rolled); PWA manifest; install prompt UI on title.
- Gate: Lighthouse PWA score 90+; works offline after first load; "update available" toast on new SW.

**A4. Strict TypeScript over the state shape.**
- Why: `state` is a god object with no type boundary. Save migration patches by hand. Modal selections are module-globals (non-serializable). Type-safety is the cheapest insurance against the next refactor breaking saves.
- Scope: write `gameState.d.ts` (or convert the relevant modules to `.ts`) declaring `PlayerState`, `WorldState`, `NarrativeState`, `RegionsState`, `UiState` (modal selections live here); `npm run typecheck:ts` becomes a hard gate.
- Migration unit: per subtree (start with `UiState`); refactor modules one at a time.
- Gate: `tsc --noEmit` clean; existing tests still green.

**A5. CI on GitHub Actions. ✅ Shipped 2026-05-05.**
- Why: there was zero automated gate. Anyone could ship broken code.
- Shipped: `.github/workflows/qa.yml` with two jobs:
  - **`fast`** — Node 22, runs typecheck → syntax check → lint → vitest → vite build → uploads `dist/` artifact (10-min timeout).
  - **`smoke`** — needs `fast`; installs Playwright chromium with deps; runs `npm run test:smoke`; uploads `output/` on failure (20-min timeout).
- Triggers: push to `main`, PRs targeting `main`. Concurrency group `qa` cancels superseded runs.
- Gate: the workflow itself is the gate. CI is now the source of truth for "is this branch shippable."

### Track B: Render & audio next-level

**B1. Hybrid renderer — Canvas raycaster + WebGL2 post-process.**
- Why: the existing raycaster *is* the project's identity. WebGL2 only as a *post-process* layer keeps that look while unlocking bloom, CRT/dust-haze, screen-space fog, color grading, vignette, film grain, and a real god-rays pass.
- Scope: blit the 2D canvas to a WebGL2 RGBA8 texture per frame; FBO chain runs ~5–10 ms of fragment shaders; back to a screen quad. The raycaster code is untouched.
- Anti-goal note: this is **not** a WebGL world rewrite. The raycaster image stays. Only the *image* is post-processed.
- Kill-switch: graphics setting "Post-FX: Off" disables the FBO chain; render goes straight to screen.
- Gate: visual regression (pixelmatch) suite passes a curated baseline; FPS budget on Low preset stays at 60 on a 2018 MacBook.

**B2. Dynamic point lights in the raycaster (highest-impact visual upgrade).**
- Why: today, all shading is distance + side-of-wall fade. Enemies, lanterns, fires, and the player's flashlight have zero light influence. This is *the* single biggest visual-atmosphere upgrade for the smallest tech risk.
- Scope: per-column light accumulation. Each light contributes distance-attenuated tint; cap at 8 active lights per scene; spatial-hash query for "lights affecting column X." Pure JS Canvas, no shaders required (B1 not a prerequisite).
- Migration unit: add `state.lights` (entities with type / position / color / radius / flicker). Existing torches, neon signs, and campfires in regions become lights.
- Gate: 8-light scene at 60 fps on Low preset; visual regression.

**B3. Raycaster column loop in WebAssembly.**
- Why: the inner column loop is the main FPS ceiling. Rust → wasm gives 5–20× headroom, which is what pays for B1+B2 once both ship.
- Scope: write `raycaster_step(state_ptr, depth_buffer_ptr) → void` in Rust; build to wasm; preserve identical pixel output.
- Migration unit: 1 PR, 1 wasm module, behind a `useWasm` graphics flag for A/B comparison.
- Kill-switch: `useWasm: false` falls back to the JS path.
- Gate: pixel-identical output to the JS path on a curated set of test frames; faster on every preset.

**B4. Procedural adaptive music (the empty music bus). ✅ Shipped 2026-05-05.**
- Why: `audio.js` defined a music bus that was never populated. Region ambience existed; music did not.
- Shipped: hand-rolled WebAudio scheduler, **zero audio assets** (stays offline-first):
  - **Three voices per region:** pad (dual detuned oscillators through a soft lowpass), melody (oscillator with per-note envelopes scheduled via WebAudio time), tension stem (filtered sawtooth, normally silent).
  - **Per-region motifs** (`MUSIC_REGION_PROFILE`): frontier in A2 minor pentatonic at 72 BPM (warm, sparse), ashfall in F#2 at 64 BPM (duskier sawtooth pad), iron lantern in C3 at 88 BPM (colder, square pad with bluesy 6th).
  - **Look-ahead scheduler** (`scheduleMelodyAhead`) with a 0.6 s horizon, re-armed every 250 ms via setTimeout. Stops when the music node's `active` flag flips.
  - **Cross-fade on region change** via `setMusicRegion` — 2 s default, mirrors the ambient drone cadence.
  - **Combat tension fader** (`setCombatTension`, clamped to [0,1]) — `main.js`'s `updateCombatMusicTension(dt)` polls enemy proximity each frame, computes the closest enemy's threat, eases the tension control toward target (faster up, slower down). Music module applies an audio-rate ramp; the eased frame-rate signal stays smooth.
  - **Settings respect:** N (sound off) and Shift+M (ambient/music off) both call `stopMusic` alongside `stopAmbient`. Music re-starts when toggled back on while in a session.
  - **Pure helper `previewMelody(profile, beats)`** — returns the next N scheduled notes deterministically; used by tests instead of mocking the WebAudio scheduler.
- Tests added: 11 (test count 482 → 493). Coverage: profile presence, scale/melody coherence (every non-rest index lies in the scale), tempo sanity range, melody preview shape + loop alignment, music-bus connect, cross-fade behavior, tension clamp, stop, fallback to frontier profile for unknown regions.
- Gate: 493/493 pass; build 126.00 KB gzipped (under 300 KB gate); typecheck clean.

**B5. Web Animations API for all UI feedback.**
- Why: CLAUDE.md gotcha already notes WAAPI is the only way to bypass the `prefers-reduced-motion` UA stylesheet override. Standardize on it instead of mixing CSS keyframes.
- Scope: replace any remaining CSS-keyframe animations on game canvas with `element.animate()` calls; centralize in a `ui/animation.js` helper.
- Gate: motion-reduction setting still suppresses non-essential animation; combat readability hits unaffected.

### Track C: Smarter living world

**C1. Behavior Trees for NPC AI.**
- Why: ad-hoc state machines in `updateNPCs` get unwieldy. NPC schedules (existing future-idea: townspeople walk to homes at dusk; allied factions leave doors unlocked) need a real planner, not nested ifs.
- Scope: small in-house BT library (~200 lines); each NPC has a tree; trees are JSON-serializable for hot-reload; companion uses a separate tree (pursuit + utility + bark hooks).
- Migration unit: companion first; then town NPCs; then patrols.
- Gate: existing companion behavior preserved by tree; new "townspeople walk to homes at dusk" demo runs deterministically.

**C2. Influence maps for faction territory.**
- Why: patrol density, ambient encounters, and "the world reacts to your rep" all want a heatmap, not a per-NPC check.
- Scope: low-resolution grid (e.g., 32×32) per region per faction; rep-driven blend; consumed by spawn density and route-marker tinting.
- Gate: rep change → patrol density visibly changes within one in-game day.

**C3. Event-sourced narrative state.**
- Why: every player action becomes an event; world state is a pure fold over events. Trivializes save migration, replay, "what changed because of me?" UI, and ending generation. This is the cleanest fix for the audit's biggest gap (quest outcomes don't sync back to the world).
- Scope: append-only `narrative.events` log; reducer composes current state; existing `applyMajorDecision` / `applyQuestOutcome` become event emitters.
- Migration unit: schema v4 (parallel to A2); reducer tested against fixtures.
- Gate: replaying the event log from a v3 save reproduces the same narrative state byte-for-byte; new event types are additive.

**C4. Constraint-satisfaction side-job generator.**
- Why: handcrafted main quests stay handcrafted (Roadmap Rule #8). Side jobs from world state — faction tension × region heat × player rep — give density without scope explosion.
- Scope: small CSP that picks job type, target region, faction angle, and reward band given current world state. All seeded.
- Anti-goal note: this does **not** generate dialogue or rewrite handcrafted jobs. It selects + composes from a handcrafted pool.
- Gate: deterministic seed reproduces the same job; never produces a job that contradicts current quest state.

**C5. Wave-Function-Collapse for cave/mine/ruin interiors.**
- Why: future-idea explicitly calls for one-room interiors per region. WFC is bounded, seeded, and tiny.
- Scope: one tile-set per region; WFC runs once per interior on first entry; cached for the run.
- Anti-goal note: interior-only. The world map and POI placement remain handcrafted.
- Gate: deterministic seed reproduces; 100% generation success on the test fixture set.

**C6. Tile-based fog of war.**
- Why: exploration tension. The road becomes a real choice when you can't see what's past the next ridge.
- Scope: per-region discovery grid (32×32 bool); minimap reveals as you discover; renders as soft falloff.
- Gate: full grid reveal works; clear-on-region-enter respects existing world layer.

### Track D: Optional AI boundary (each item requires explicit per-item go-ahead)

These items override the previous "no LLM" anti-goal under strict scope. Each is opt-in, has a strict scope, and a hand-crafted fallback. Verifying them is the entire test of "did we keep the project's identity."

**D1. WebLLM ambient flavor (TinyLlama or Llama-3.2-1B in-browser via WebGPU).**
- Why: ambient barks ("the wind's bad today"; "that scrap heap moves at night") give density without inflating the handcrafted dialogue file.
- Scope: strictly *non-canon* ambient lines, never major dialogue, never quest-relevant. Allowlist of intents (greet, weather-comment, region-mood); LLM output is sanity-checked against a regex/length filter; failure falls back to a handcrafted line. WebGPU only; CPU fallback disables the feature.
- Anti-goal note: replaces the previous "no LLM" rule under strict non-canon scope. **Major dialogue stays handcrafted (Roadmap Rule #8 stands.)**
- Kill-switch: settings toggle "Ambient AI: Off" — handcrafted lines only.
- Gate: a) every LLM output passes the filter; b) median latency < 300 ms on WebGPU; c) a 30-minute play session with the LLM disabled is indistinguishable in *core experience* from one with it enabled.

**D2. Speech synthesis for accessibility.**
- Why: codex letters, run summary, and major dialogue read aloud via Web Speech API for accessibility.
- Scope: opt-in setting; uses platform TTS (no model download). Does not change game behavior.
- Gate: works on macOS/Windows/Linux Chrome; respects audio settings.

**D3. Voice command for companion (Whisper-tiny via wasm, optional).**
- Why: distinctive — whistle/shout to recall companion. Anti-goal-stretching but extremely thematic for a frontier RPG.
- Scope: small wake-word + 3 fixed verbs ("come", "stay", "go"). Local-only; mic permission gated; no audio leaves the device.
- Gate: 95%+ recognition rate on the verb set in a quiet environment; mic permission denial cleanly disables.

**D4. WebRTC ghost replays.**
- Why: existing daily-seed mode (future-idea) is single-player. Async ghost replays — record run, share file, watch a friend's path on the road as a translucent ghost — give the social hook without realtime multiplayer.
- Scope: replay system from existing future-idea; sharing is *file-based* (no server). Optional: WebRTC DataChannel peer-to-peer share via a free signaling service. Strictly opt-in.
- Anti-goal note: this is async ghost data, not realtime co-op. The realtime-multiplayer anti-goal stays in force.
- Gate: file-share path works fully offline; WebRTC path is gated behind a feature flag.

### Revised anti-goals (full table, 2026-05-05)

| Item | Status | Notes |
|------|--------|-------|
| WebGL world rewrite | ❌ Anti-goal | The raycaster look is the project. |
| Three.js / Babylon.js port | ❌ Anti-goal | Same reason. |
| Full procedural region regeneration | ❌ Anti-goal | POI placement and road layout stay handcrafted. |
| Realtime multiplayer / online leaderboards / cloud saves | ❌ Anti-goal | Async ghost replays (D4) are the limit. |
| LLM-generated *major* dialogue / quest content / named-NPC speech | ❌ Anti-goal | Handcrafted is the contract; D1 is non-canon flavor only. |
| WebGL2 *post-process layer only* (B1) | ✅ Allowed | Project-owner directive 2026-05-05. Strict scope: post-process only. |
| WebAssembly hot paths (B3, C5) | ✅ Allowed | Project-owner directive 2026-05-05. |
| Opt-in WebLLM *non-canon ambient flavor* with handcrafted fallback (D1) | ✅ Allowed | Project-owner directive 2026-05-05. Strict allowlist + filter. |
| Async ghost replays (D4) | ✅ Allowed | Project-owner directive 2026-05-05. Realtime stays anti-goal. |

### Track sequencing recommendation (lowest-risk-first)

1. **A1, A5** (build pipeline + CI) — pays for itself the moment the next regression is caught.
2. **A4** (typed state) — unlocks safe extraction work in `main.js`.
3. **A2** (IndexedDB saves + export/import + corruption recovery) — eliminates the largest data-loss risk.
4. **B5** (WAAPI standardization) — small, high-clarity cleanup.
5. **B4** (procedural music) — fills an empty bus; immediate audible impact.
6. Audit Quick-Win Cleanup items 1–9 (above; each < 1 day).
7. **B2** (dynamic lights) — biggest perceived visual jump for the smallest tech risk.
8. **C1, C2** (BT NPCs + influence maps) — make the world feel alive between scripted beats.
9. **C3, C4** (event-sourced narrative + CSP side jobs) — give the player density without breaking handcrafted content. C3 directly fixes the audit's biggest gap.
10. **B3** (wasm raycaster) — only after dynamic lights ship; this buys the next wave of perf budget.
11. **B1** (WebGL2 post-process) — only after wasm. The raycaster image quality at this point will be CPU-budget-limited; post-process is worth it.
12. **C5, C6** (WFC interiors + fog of war) — content tracks; ship after the engine is stable.
13. **A3** (PWA + Service Worker) — once content is dense enough that "install offline" is a real selling point.
14. **D1–D4** — only after Phases 1–6 are honestly green. Each requires explicit per-item re-approval.

## Verification Gates

Run these before meaningful commits:

```bash
npm test
npm run typecheck:ts
npm run test:syntax
npm run dev:lint
npm run test:smoke
npm run qa
```
