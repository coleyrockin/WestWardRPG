# WestWardRPG Roadmap

> **Single source of truth.** This is the only roadmap document for WestWardRPG. Do not create parallel `tier-*.md`, `TODO.md`, `PLAN.md`, or `ROADMAP-*.md` files. Update this file when scope shifts.

## How to use this roadmap

- **Pillars are ordered.** Pillars 1-4, Pillar 5.5, Pillar 8 Items 1-5, and foundations from Pillars 21-23 and 25-27 are shipped. Pillar 5's remaining dialogue/narrative depth items are active, and Pillars 6-7 plus the unshipped later-pillar slices remain planned. Don't skip ahead -- each pillar depends on the foundations of the previous one.
- **Each pillar item is a thin, testable slice** scoped so a single agent can ship it in one session: file paths, helpers, and acceptance signals are spelled out.
- **Save migration is non-negotiable.** New top-level state requires a `backfill*` helper in `saveMigration.js` and a fixture round-trip test.
- **Never rewrite the renderer or move to WebGL** unless the user explicitly requests it.
- **Keep test gates green at every commit.** The verification block at the bottom is the contract.

## Current State

`main` ships v3 Shattered Frontier + four full upgrade pillars (closeout, engine foundations, combat identity, world life), the first Pillar 5 narrative/companion upgrades, **Pillar 5.5 story-to-run payoff**, **Pillar 8 Items 1-5** as combat depth round 2, **Pillar 21/22 open-world RPG foundation** (character identity, attributes, origin selection, region visual identity), **Pillar 23 gear loop foundation** (weapon families, armor slots, Craft-driven repair/refine prices, regional loot tables, POI/mini-boss gear finds, selectable workbench actions, earned gear visibility), **Pillar 25 workstation foundation** (save-safe workbench levels, level-gated benefits, map-table project), **Pillar 26 jobs/job-board foundation plus Jobs 7 rescue/escort pass** (deterministic bounty, salvage, courier, patrol, supply-run, rescue, and escort jobs; active progress; timed bonuses; failure/report-back states; Ashfall/Iron Lantern non-combat job depth; Boone job-board modal; in-world board prop; route markers; reward payout; save-safe state; HUD/minimap/debug visibility), **Pillar 27 deterministic NPC memory foundation**, and a **fully redesigned Apple-grade title screen**. Narrative state already tracks axes, factions, affinity, flags, decisions, quest outcomes, companion state, endings, POIs, codex unlocks, quest progression, build identity, gear state, loot history, workstation state, station projects, job-board state, and NPC memory. The next highest-value work is player-facing: stronger visual open-world feel, deeper gear/housing/economy loops, pets, richer job variety, and fuller living-world dialogue.

Open-world RPG target: push the game toward a compact Skyrim/Oblivion feel within the existing canvas engine. The world should have stronger visual identity, character builds, loot, pets, owned spaces, regional economy, and NPCs that remember enough context to feel alive. Keep everything local-first and deterministic by default; optional network/LLM features must have handcrafted fallback content and never block core play.

Latest local verification:
- `git diff --check` → clean.
- `npm test` -> **337 passing across 35 test files**.
- `npm run typecheck:ts` → clean.
- `npm run test:syntax` → clean.
- `npm run dev:lint` → clean.
- Browser/visual smoke should cover the current Phase A view: fixed first-minute pressure marker, map-validated region landmark/prop placement, readable minimap dots, and no narrow-width HUD overlap. Prior smoke coverage also includes new-run state surfaces plus a partial-save house workbench flow: load save, open stash workbench, list craft/potion/armor/token/refine actions, and equip Salvage Gloves. Smoke and visual-regression artifacts are generated under ignored `output/`; rerun the Verification Gates before gameplay commits.

## Current Build Phases

This section is the practical build order for the next sessions. It does not replace the pillar list below; it groups the active pillars into player-visible chunks.

### Phase A — Visual open-world feel + first-minute pressure

Goal: make the game read more like a compact open-world RPG the moment the player leaves the menu.

Build slices:
1. **First-minute pressure** — within the first 15-30 seconds, place a readable nearby objective, threat, and reward: a smoking cache, wounded NPC callout, patrol marker, or small resource trail that pulls the player into movement and combat.
2. **Landmark composition** — give each region a horizon identity: Frontier watchtower/road posts, Ashfall plume/mine ribs, Iron Lantern signal mast/gate lights. The player should navigate by place, not only by minimap.
3. **Roads, props, and traversal dressing** — add non-blocking roads, fences, crates, carts, grasses, lamps, signs, ash drifts, pipes, rails, and shrine markers with deterministic placement and no collision surprises.
4. **Enemy readability** — make aggro, windup, stagger, phase transition, and death states obvious from silhouettes, color-safe VFX, hit-stop, screen feedback, and animation posture.
5. **HUD clarity pass** — keep opening objectives, minimap, region label, loot popups, and workbench prompts from overlapping on narrow browser widths.
6. **Acceptance** — a human tester can start a new run, understand where to go, see why a region is distinct, identify enemy intent, earn a reward, and describe one visible landmark after two minutes.

### Phase B — Narrative payoff + visible consequence

Goal: make story choices show up in the world instead of living only in debug state.

Build slices:
1. **Quest outcome smoke** — finish deterministic coverage for one quest turn-in, modal choice, save/reload, and `narrative.questOutcomes` exposure.
2. **Companion barks** — add short lines for low HP, first kill, boss phase, region entry, house unlock, and important quest outcomes.
3. **Town reaction layer** — major NPC idle/reactive lines should reference origin, recent quest outcome, house state, current region, and notable gear milestone through `npcMemory.js`.
4. **Choice-visible services** — one or two quest outcomes should alter shop text, stock, price notes, patrol presence, or house visitors so decisions are visible in play.
5. **Ending variants** — expand endings from thematic axes plus key flags only after the above consequences are visible during the run.
6. **Acceptance** — after one consequential quest, at least one NPC, one service, and one run-summary/ending surface acknowledge what happened.

### Phase C — RPG loops: gear, crafting, housing, economy

Goal: make attributes, loot, workbench levels, and resources form a repeatable loop.

Build slices:
1. **Earned upgrade path** — POIs, mini-bosses, resource finds, and region rewards should drop materials that unlock armor, weapon family upgrades, affixes, repairs, and workbench projects outside the shop.
2. **Workbench depth** — Workbench II/III benefits should become obvious: better potion/tonic yield, cheaper repair/refine prep, forge/alchemy/map-table actions, and visible station project progress.
3. **Armor and weapon choices** — armor slots and weapon families should change stamina, protection, movement, reach, windup, and role identity enough for the character sheet to matter.
4. **House utility** — the house should become a hub with stash tabs, station previews, trophy display, pet bed, companion bunk, map table, and cheaper Craft-heavy upgrades.
5. **Economy pressure** — Boone's job-board foundation is now playable: deterministic bounty, salvage, courier, patrol, supply-run, rescue, and escort listings; one active job; kill/collect/pickup/delivery/checkpoint/dropoff/rescue/escort progress; reward payout; failure/report states; save migration; HUD/minimap prompts; vendor service notes; and `render_game_to_text` exposure. Next: stock refresh, regional board props, and gold sinks for repair, housing, pet care, trainers, transport, and cosmetics.
6. **Acceptance** — a tester can explain why they want one attribute, one weapon family, one armor piece, one workstation level, and one resource route.

### Phase D — NPC life + local conversation

Goal: make NPCs feel aware without requiring network calls.

Build slices:
1. **Memory-first reactions** — continue using deterministic memory for origin, region, house, quest result, faction stance, greeting history, and gear milestones.
2. **Compact choice UI** — add a 2-4 choice dialogue modal for major NPCs using handcrafted response tables and existing affinity/faction/axis deltas.
3. **Free-text style prompt surface** — later, allow a short "ask about..." flavor prompt that still resolves through local tables first.
4. **Optional provider boundary** — only after local dialogue works, define a mockable `dialogueProvider` interface for future local/free LLM experiments.
5. **Safety rules** — generated/provider-backed text must stay short, in-world, persona-bounded, fact-bounded, and unable to execute code or mutate saves directly.
6. **Acceptance** — the shipped game works fully offline, and an NPC can visibly respond to at least three current-run facts.

### Phase E — Playtest readiness, replayability, and resilience

Goal: make the game easier to test, replay, recover, and share without derailing the core RPG loop.

Build slices:
1. **Pause/settings path** — Esc pause, resume, settings, codex, quit, and a path to difficulty selection without breaking combat timing.
2. **Save reliability** — save slots, backup rotation, corruption recovery UI, export/import, and future-schema messaging.
3. **Replay hooks** — run summary screen, New Game+, daily seed, challenge flags, and run history after the core two-minute loop feels good.
4. **Playtest instrumentation** — optional local metrics for time-to-first-kill, chapter reached, boss kills, run end cause, setting changes, and first-session friction.
5. **Distribution** — offline itch package first; Steam wrapper feasibility only after input, fullscreen, save path, and controller support are stronger.
6. **Acceptance** — a human tester can start, pause, save, reload, recover from a bad save, finish or die, and send useful feedback from one play session.

## Shipped Pillars

### Pillar 1 — Tier 2 closeout
- Colorblind palettes (deuteranopia/protanopia/tritanopia) wired into mini-map dots, floating damage colors, NPC + enemy sprite glows.
- Settings modal (KeyO, shop-style) — preset, gradient cache, colorblind mode, font scale, motion reduction, camera shake. Pure `stepSetting`/`readSettingValue` helpers in `graphicsSettings.js`.
- Mini-boss persistence — save migration backfill so v3 saves missing `regions.miniBosses` get all four flags defaulted.
- Gradient-cache-on smoke pass via `WESTWARD_GRADIENT_CACHE=1`; `?gradientCache=1` and `?colorblind=...` query-params parsed at boot.

### Pillar 2 — Engine foundations
- **Particle pool** (`src/particlePool.js`) — pre-allocated 1500-slot ring buffer, no per-frame alloc; clears on session reset.
- **Spatial hash** (`src/spatialHash.js`) — uniform grid, cell size 4, rebuilt once per tick. Powers `applySmokeBlind`, `applyFlareSlow`, perfect-dodge proximity check.
- **Audio bus + ambient drone** (`src/audio.js`) — 3-bus graph (master → sfx/ambient/music), per-region procedural drones (frontier=warm, ashfall=mid, ironlantern=metallic) with crossfade on region change. Shift+M toggles ambient.
- **Render module split** (`src/render.js`) — pure helpers (`hexToRgba`, `gradientBucket`, `createGradientCache`) + ctx-bound factory `createRenderHelpers(ctx)` for panel/text/rect helpers.

### Pillar 3 — Combat identity
- **Status effect stack** (`src/statusEffects.js`) — burn/bleed/shock/frost with DoT, slow, and frost shatter on max-magnitude expiry. Bleed on charged attacks, burn while flare active, shock chance on Relic-tier, frost on tonic+heavy combos. Speed multiplier feeds enemy pursuit.
- **Enemy telegraph windups** — `charge`/`tank`/`shield`/`control` archetypes wind up 0.55–0.95s before striking. Sprite glow pulses red. Player hit during windup fires INTERRUPT, zeroes the timer, and adds +0.95 stagger.
- **Perfect dodge** — dodge within 1.2 tiles of imminent enemy attack refunds 12 stamina, brief slow-mo (`state.player.timeScale = 0.45` for 0.32s), PERFECT pop.
- **Perfect parry** — block within 0.15s of starting block negates damage, doubles stagger to 1.5s, refunds 8 stamina, spawns PARRY pop + riposte particles.
- **Weapon archetype movesets** (`MOVESET_DEFINITIONS`) — Common=light (wide arc, fast recovery), Refined=heavy (narrow arc, more reach + stagger), Relic=spear (longest reach, narrowest arc).

### Pillar 4 — World life
- **Day/night cycle** (`src/timeOfDay.js`) — `state.world.timeOfDay` advances over ~10 real minutes; four phases (dawn/day/dusk/night) drive a multiplicative phase-tint LUT applied on top of biome grading. Night doubles hostile spawn density. KeyU fast-forwards 10% for testing. Save-migration backfills `world.timeOfDay` on v3 saves.
- **Faction reputation effects** (`src/factionEffects.js`) — `marketCartel` rep scales shop prices (-15% allied / +30% hostile), `workersGuild` rep gates smith Refine (any) and Relic (≥0). `civicCouncil` rep modulates patrol density (foundation for future patrol entities).
- **POIs + cache discovery** (`src/poiSystem.js`) — 3 POIs per region (cache/shrine/camp), data-driven loot + buffs. Mini-map ping when within 4 tiles of an undiscovered POI. Interaction radius routed through existing `interact()` (E key). `regions.poisDiscovered` persists.
- **Codex / lore browser** (`src/codex.js`) — KeyZ opens a tabbed lore screen (regions / enemies / items / factions / ideology). Entries unlock on first encounter (region unlock, first kill of an enemy archetype). Shows `???` + "(undiscovered)" until unlocked. Progress count in header.

## Test + Build Status
- Current baseline is the "Latest local verification" block above: `git diff --check` clean, `npm test` at 337 passing across 35 files, `npm run typecheck:ts` clean, `npm run test:syntax` clean, and `npm run dev:lint` clean.
- v1/v2/v3 save fixtures all migrate cleanly with backfilled defaults.

## Next Work — Pillar 5: Narrative depth

1. **Branching quest outcomes** — implemented foundation. `questDefinitions.js` now supports optional `outcomes` per quest, `decisionEngine.js` has `applyQuestOutcome`, save migration backfills `state.narrative.questOutcomes`, and `main.js` opens a small consequence modal for Crystal, House, Archive, Ashfall, and Lantern turn-ins. Ashfall/Lantern resource objectives now progress from regional harvesting, and town-circle turn-in advances the next regional quest. Next: add a Playwright flow that completes one turn-in and confirms the modal choice persists.
2. **Companion follower (1 slot)** — implemented foundation plus recovery. `src/companion.js` selects eligible NPCs at affinity ≥60, activates a one-slot follower, moves them toward the player, lets them strike nearby enemies on cooldown, lets nearby enemies threaten them, downs them at 0 HP, applies -15 affinity, and recovers them after a timer. `main.js` renders active companions, updates recovery/threat state in the loop, exposes it in smoke state JSON, and persists `world.companionId/world.companionHp/world.companionDowned/world.companionRecoveryTimer`. `saveMigration.js` backfills companion fields for existing v3 saves. Next: add companion barks and utility synergy.
3. **Visible consequence layer** — after at least one quest outcome, alter a world-facing surface: NPC greeting, shop note, vendor stock, patrol presence, house visitor, town banner, or run-summary line. Acceptance: the result is visible without opening debug JSON.
4. **Four endings driven by thematic axes** — at chapter 3 final beat, resolve dominant axis from `narrative.thematicAxes`, render ending text + epilogue. Tie-breakers use `globalFlags`, companion state, and at least one quest outcome.
5. **Lite dialogue choices** — per-NPC stateless 2–3 choice prompts per chapter. Modal applies axis/rep deltas. Not a tree — flat menu, gated by chapter + flag.
6. **Narrative feedback tests** — one deterministic browser or pure-helper flow proves a quest choice changes memory, a visible line, and saved outcome state after reload.

## Next Work — Pillar 5.5: Story-to-run payoff

1. **Final beat trigger** ✅ shipped — Lantern Revolt turn-in resolves chapter 3 through `completeFinalBeat()`, stores the resolved ending, locks the run into `mode: "victory"`, saves immediately, and reloads as victory instead of restarting.
2. **Ending screen polish** ✅ shipped — victory overlay shows ending title, summary, dominant axes, latest decisions, companion status, and run summary using the existing soft-panel canvas rendering.
3. **Run summary data** ✅ shipped — `world.runStats` tracks started/ended time, victory, ending id, kills, mini-boss kills, harvested resources, and quest outcome count. Save migration backfills the shape for old v3 saves.
4. **Quest outcome smoke coverage** — add a deterministic Playwright flow that forces a quest-ready state, confirms a modal choice, saves, reloads, and asserts `narrative.questOutcomes` persists in `render_game_to_text`.
5. **Companion smoke coverage** — add a deterministic debug hook for high affinity, then verify companion spawn/down/recover in a short browser scenario.

## Next Work — Pillar 6: Replayability

1. **Run summary screen** — death/victory shows time played, kills, gold, ideology snapshot, boss kills, resources harvested, gear milestones, pet/companion status, and ending if reached. "Continue → New Game+" button on victory.
2. **New Game+** — `state.world.ngPlusLevel` carries forward `progression.upgradePoints`/`skillTree`/`weaponTier`/`armorMods` plus a small earned badge/history entry. Resets quests/inventory/regions. Enemy HP×(1+0.25·ngPlusLevel) and reward quality nudges up modestly.
3. **Daily seed mode** — main-menu button. Seed = YYYY-MM-DD hash drives spawn order, POI placement, region-event severity, first-minute pressure event, and reward order. Score = `kills*5 + gold + dayDepth*100 + endingBonus`.
4. **Challenge runs** — new-game checkboxes: ironman (no reload after death), no-shop, no-skill, harsh weather, companion required. Each modestly multiplies score and changes summary labels.
5. **Run history archive** — persist last 20 local runs with origin, build role, ending, score, duration, boss kills, and challenge flags. View from title screen after save slots exist.

## Next Work — Pillar 7: QoL & accessibility

1. **Pause menu** — Esc pauses, scales game time to 0, opens menu (Resume / Settings / Codex / Character / Save / Quit). Acceptance: pausing during combat cannot advance enemy attacks.
2. **Keybind remap** — settings modal sub-menu, persisted in `state.input.keybinds`, with conflict detection and a reset-to-default action.
3. **Save slots (3)** — prefix `westward_save_<slot>`. Title-screen UI for slot select; existing key migrates to slot 1. Slot card should show origin, chapter, region, time played, and last save time.
4. **Subtitle system** — combat/story/interaction events ("hit", "crit", "low HP", "regen", NPC bark, companion warning) via accessibility flag and ARIA live region where possible.
5. **Difficulty selector** — Easy/Normal/Hard at new-game. Disjoint from NG+ scaling, multiplicative, and visible in run summary. Avoid changing save schema unless difficulty needs persistence beyond `world`.
6. **HUD responsive pass** — prevent minimap, objective strip, status bars, loot toasts, and workbench prompts from overlapping at narrow viewport sizes.

## Next Work — Pillar 8: Combat depth round 2

1. **Weapon affixes** ✅ shipped — `src/weaponAffixes.js` exposes `AFFIXES` (Searing/Counterweighted/Bleeding prefixes, Resonant/Hungering/Ironbound suffixes) plus `rollAffix`, `attachAffix`, `buildAffixModifiers`, `describeAffixes`. Persisted in `progression.equipment.affixes[]` with v3 backfill (`backfillEquipmentDefaults`). Smith shop has Inscribe Prefix / Inscribe Suffix actions (80g + 2 Cipher Lens, replaces existing slot). `applySwingLoadout` consumes `context.affixMods` (arc / reach / stagger). Attack pipeline applies affix on-hit statuses + lifesteal heal. Tests: `tests/weapon-affixes.test.ts` (11) + new affix cases in combat-loadout / save-migration suites.
2. **Block chip + guard-break** ✅ shipped — even on a clean block, 8% of incoming damage chips through. Stamina to 0 mid-block triggers a guard-break stagger (`state.player.guardBroken`) with a CRACK pop and disables blocking until recovery.
3. **Boss phase transitions** ✅ shipped — each mini-boss has a `phaseTwo` profile. At 50% HP, bosses swap behavior, show `PHASE 2`, gain a short i-frame, and expose phase/invulnerability in `render_game_to_text`.
4. **Parry chain bonus** ✅ shipped — `state.player.parryChainTimer` tracks the chain window. A second perfect parry within 2.5s triggers `CHAIN!`, stronger stagger/interruption, and a larger stamina refund. Taking damage resets the chain.
5. **Charge-cancel** ✅ shipped — charged attack now has a windup. Dodging during windup cancels and refunds stamina; successful release fires the existing combo-3 strike.

## Next Work — Pillar 9: World systems round 2

1. **Seasonal calendar** — `src/seasonSystem.js` with `state.world.calendarDay` (4 in-game weeks per season). Festival in Frontier (vendor-only flag), dust season in Ashfall (visibility −30%), blackout in Iron Lantern (patrols pause). Layered on `timeOfDay`. Backfill in save migration. Pillar 8 must land first.
2. **Patrol entities** — civic-council allied → friendly patrol NPCs spawn and engage hostiles in player radius. Hostile rep → patrols target the player. Density driven off `resolvePatrolModifier`. Reuse companion movement.
3. **POIs round 2** — expand each region from 3 to 6+ POIs. New `treasure-hunter` POI kind: cryptic clue → reveals next POI on minimap. Seeded placement so daily-seed runs share maps.
4. **Journal lore drops** — letters/notes picked up at POIs surface in a new codex tab `letters`. One hand-written paragraph each. Persist in `codex.unlocked.letters`.
5. **Weather hazards round 2** — sandstorms apply temporary `weather_blind` status (view distance −40%); neon rain reduces enemy aggro range. Tied to `state.weather.kind`, expires when weather changes.

## Next Work — Pillar 10: Narrative round 2

1. **Eight endings** — expand `resolveNarrativeEnding` from 3 to 8 by combining dominant axis × `globalFlags` variants (e.g. Solidarity-Hopeful vs Solidarity-Pyrrhic depending on `ledgerPublished` + companion alive). Codex unlock per ending seen.
2. **Lite dialogue choice surfaces** — per major NPC, 2–3 stateless choices per chapter using the existing quest-outcome modal pattern. Apply axis/rep deltas. Gated by chapter + flag.
3. **Companion barks + utility synergy** — companion lines in `storyContent.js`, triggered on combat events (low HP, kill streak, status apply, region change). Companion-side smoke/flare/tonic stacks with player utility for layered effects.
4. **NPC schedules** — wire day/night home cells per NPC. Allied factions' NPCs leave doors unlocked at night; hostile factions' NPCs vanish indoors after dusk.
5. **Decision recap screen** — KeyP opens a timeline of all decisions with axis arrows showing cumulative drift. Reuse soft-panel rendering.

## Next Work — Pillar 11: Engine round 2

1. **Sprite atlas + OffscreenCanvas** — bake all `makeTexture` outputs to one offscreen atlas at session start. Pre-render minimap base + biome ground bands. Cache invalidation on `resize`.
2. **Web Worker AI** — move A* (new) and pursuit lookup off-thread for archetypes with `behavior: "ranged"|"control"|"flank"`. Boot from `src/aiWorker.js`; postMessage shape documented.
3. **Save schema v4** — bump to v4 once Pillars 8–10 land. New fields: `progression.equipment.affixes`, `world.calendarDay`, `world.ngPlusLevel`, `narrative.endingHistory[]`, `codex.unlocked.letters`. Keep `migrateSaveToV{2,3}` chains; add `migrateSaveToV4`.
4. **Dev telemetry overlay** — Shift+T toggles HUD with FPS, frame ms, particle active count, grid bucket count, ambient drone state, hovered-enemy status summary.
5. **Visual regression CI** — pixelmatch-based pass/fail on `scripts/visual_regression_capture.sh` baselines; wire into `npm run qa`.

## Next Work — Pillar 12: Roguelite layer

1. **Procedural region variants** — seeded reshuffle of region tile maps. Same room schema, randomized POI/resource placement. Daily-seed shares layout across runs. Gated behind v4 save schema.
2. **Run mutators** — pre-run modifiers picked at start: `glassCannon` (+30% damage / −50% HP), `stormSeason` (always storm), `solidarityFlame` (companion required for boss kills). Stack to a score multiplier.
3. **Prestige meta-progression** — across-run currency `frontier_marks` earned per ending. Unlocks permanent passive perks at meta shop (start with +1 potion, +5g, etc.). Lives in `state.meta.*` with a separate localStorage key.
4. **NG+ scaling round 2** — beyond `1+0.25·ngPlusLevel` HP, archetype mix shifts toward heavies, mini-bosses gain Phase 3, region events trigger 2× faster.
5. **Run history archive** — last 20 runs persisted (seed, ending, mutators, time, kills). Viewable from main menu. Local-only.

## Next Work — Pillar 13: Live ops & social

1. **Daily seed leaderboard** — score = `kills*5 + gold + dayDepth*100 + endingBonus`. Submit via `api/score` (Vercel function, append-only JSON store). Show top 100. Player handle stored locally.
2. **Ghost replay** — record `(timestamp, input, rng)` per run; replay top daily run as a translucent ghost alongside the player. Local first, cloud second.
3. **Weekly community modifier** — server-driven mutator broadcast each Monday. Cached in localStorage, expires Sunday. No auth.
4. **Share codes** — encode `(seed, mutators, score)` into a base36 share code with sha-1 prefix. Pasting at main menu loads identical run.
5. **Cosmetics season pass** — purely cosmetic palettes / hat colors / bandana variants unlocked by daily completion streak. No gameplay impact, no monetization.

## Next Work — Pillar 14: Platform & accessibility round 2

1. **Touch overlay** — virtual D-pad + action buttons for mobile. Detect `pointerType === "touch"`. Combat timings rebalanced via per-platform `state.input.profile`.
2. **Gamepad support** — Standard mapping via Gamepad API. Settings sub-menu shows live binding. Persists in `state.input.gamepad`.
3. **Full keybind remap UI** — graphical remap built on the settings modal pattern; rebind any default action. Persisted in `state.input.keybinds`. Conflict detection.
4. **Screen-reader subtitle layer** — combat / story / interaction events as ARIA live region (canvas is opaque to ATs). Toggleable. Pairs with motionReduction.
5. **Localized codex + letters** — extend the 8-language pack to cover codex entries, letters, dialogue choices. Audit all string-table uses to ensure no hard-coded English remains.

## Next Work — Pillar 15: Project health & folder hygiene

1. **Stale command repair** — `scripts/dev_tools.sh` still checks `game.js`; change it to validate `src/main.js` plus current syntax gates. Acceptance: `npm run dev:lint` no longer fails from a missing legacy file.
2. **Docs drift cleanup** — README save docs still mention `westward.save.v1`, while `src/constants.js` owns `SAVE_KEY = "westward-save-v3"`. Update README and CONTRIBUTING so save keys, language-pack location, and QA commands match current code.
3. **Ignored artifact policy** — keep `output/`, `coverage/`, generated manifests, compiled helper binaries, and `__pycache__/` ignored. Acceptance: a full smoke/QA run leaves no generated files in `git status --short` except intentional tracked artifacts.
4. **Roadmap source discipline** — keep this file as the single roadmap; fold accepted notes from `.claude/IMPROVEMENT_BRIEF.md` into this file instead of creating parallel TODO/PLAN docs.
5. **QA script alignment** — make `npm run qa` represent the real contract: unit tests, TypeScript, syntax check, and smoke coverage that matches the Verification Gates below.

## Next Work — Pillar 16: Code findings & `main.js` decomposition

1. **Save/session split** — extract `readSaveData`, `captureSaveData`, `applySaveData`, `saveGame`, `loadGame`, `beginSession`, and autosave flow from the 6.5k-line `src/main.js` into a focused session module. Acceptance: save-migration tests and a save/load smoke flow remain green.
2. **Input routing split** — move keyboard, pointer-lock, modal navigation, and control gating into an input controller module while preserving deterministic hooks (`window.advanceTime`, `window.render_game_to_text`).
3. **Combat runtime split** — isolate attack resolution, incoming damage, mini-boss defeat rewards, parry/dodge timing, and utility status effects behind pure helpers before adding more Pillar 8 combat work.
4. **Overlay render split** — move gameover, quest outcome, settings, codex, shop, and skill overlays into render-facing helpers so `render()` stops owning every UI branch.
5. **Characterization-first refactors** — before each split, add focused tests or smoke assertions for the behavior being moved; no gameplay or save-schema changes in the decomposition commits.

## Next Work — Pillar 17: Onboarding & first-run

1. **First 90 seconds** — script the opening path from title screen to movement, resource pickup, NPC prompt, first fight, and first reward. Acceptance: a non-RPG player can reach their first kill in <=2 minutes without reading external docs.
2. **Contextual tutorial prompts** — canvas-native prompts for move/look/interact/block/attack that disappear after demonstrated use and stay quiet for returning players.
3. **Skip-to-content** — continue/new-run paths bypass tutorial prompts when a save exists or when the user chooses an explicit "skip guidance" option.
4. **Demo/embed mode** — `?demo=1` starts a short curated scenario; `?embed=1` strips page chrome for partner sites and portfolio embeds.
5. **Onboarding smoke flow** — add a deterministic Playwright action file that verifies tutorial prompt order and first-kill completion.

## Next Work — Pillar 18: Save resilience

1. **Corruption recovery UI** — JSON parse failures should surface a canvas/menu message with fresh-start, backup-restore, and export-bad-save options instead of silently falling back.
2. **Auto-backup rotation** — keep the last three successful saves under timestamped backup keys; rotate after successful primary save writes only. Store slot-aware backups once save slots land.
3. **Export/import** — add local JSON export/import from the title or pause flow for cloudless portability. Import validates version, payload shape, slot target, and future-schema compatibility before writing storage.
4. **Schema mismatch messaging** — unsupported future versions should explain that the save is newer than the game build; older versions should show successful migration when useful.
5. **Human-test recovery path** — add a visible "Reset current slot" and "Copy save debug" path so playtesters can recover or send useful state without devtools.
6. **Save resilience tests** — cover malformed JSON, unsupported version, v1/v2/v3 migration, backup restore, export/import round trips, and corrupted slot fallback.

## Next Work — Pillar 19: Playtest telemetry & distribution

1. **Privacy-respecting events** — optional local/remote events for `run_start`, `chapter_advance`, `boss_kill`, `run_end` with cause, and `setting_changed`; no account IDs or raw input logs.
2. **Success metrics** — define a successful run numerically as chapter reached, time-to-first-kill, time-to-completion, boss kills, and ending reached.
3. **Itch.io package** — add a build/checklist target that zips an offline-playable `index.html` package with required assets and a clean README excerpt.
4. **Steam wrapper feasibility** — document whether a lightweight web wrapper is worth it, including save path, controller support, fullscreen, and offline constraints.
5. **Release cadence** — maintain a minimal release checklist: tags, screenshots, itch tags, Steam page draft notes, and devlog bullets tied to shipped pillars.

## Next Work — Pillar 20: Data-only mod / UGC hooks

1. **Quest schema** — formalize the existing data-driven quest format into a JSON schema with objective, reward, outcome, and localization fields.
2. **Region pack schema** — define custom region packs for map metadata, weather pools, resources, POIs, and mini-boss references without executable code.
3. **Skin pack schema** — allow palette and sprite-overrides metadata for player/NPC/enemy presentation while keeping gameplay stats locked.
4. **Safe loader** — validate data-only packs, reject function strings or unknown fields, and surface readable errors in development mode.
5. **Sample pack + validator** — ship one tiny sample mod and a validator command that proves custom content can load without changing core code.

## Next Work — Pillar 21: Visual world upgrade

1. **Region art pass** ✅ foundation shipped — `src/regionVisualIdentity.js` defines Frontier/Ashfall/Iron Lantern mood, sky tint, ground palette, landmark hints, prop palette, danger identity, and debug identity lines. `main.js` applies profile sky/ground/trail tinting, shows region labels in the HUD, and exposes `region_visual_identity` in `render_game_to_text`. Next: landmark silhouettes, interactable props, and enemy presentation.
2. **First-view composition pass** — when a run starts, the camera should show a road, landmark hint, nearby action marker, and one readable route choice. Keep the first screen playable, not a static title-card moment.
3. **Landmarks and travel readability** — add visible towers, mines, shrines, roads, outposts, gates, region borders, smoke stacks, signal lights, and directional signposts so players navigate by place instead of coordinates.
4. **Prop and dressing layer** — deterministic non-blocking props by region: Frontier fences/carts/barrels/grass tufts, Ashfall bones/ash drifts/mine rails, Iron Lantern pipes/cables/lamps/checkpoints. Expose active prop profile in `render_game_to_text` for smoke debugging.
5. **Interior variety** — extend the existing house/interior rendering into caves, watchtowers, smithy, inn, shrine, and Iron Lantern office spaces. Keep interiors canvas-only and reuse collision maps.
6. **Character silhouettes** — add player/NPC/companion visual layers for outfit, weapon, cloak/hat, faction accent, pet marker, and combat stance. Persist cosmetic selections separately from stats.
7. **Combat readability polish** — upgrade smoke, flare, parry, phase transition, bleed/burn/frost/shock, and boss death visuals with colorblind-safe variants and snapshot coverage.
8. **Visual QA path** — add focused screenshot capture for start view, near-wall view, landmark view, combat windup, and workbench UI. Store generated artifacts under ignored `output/`.

## Next Work — Pillar 22: Character progression & role identity

1. **Character sheet** ✅ foundation shipped — KeyI opens a canvas character sheet with origin, role label, attributes, RPG hooks, current region identity, gear, faction lean/rep, companion state, and house state. It is exposed through `character_sheet_open` in `render_game_to_text`.
2. **Attributes** ✅ foundation shipped — `src/characterIdentity.js` adds Might, Grit, Cunning, Craft, Speech, and Lore with origin presets, safe normalization, derived RPG hooks, and v3 save migration preservation under `progression.identity`. Speech now affects shop prices through `resolveIdentityShopPriceMultiplier`; next hooks should affect dialogue, crafting, and combat reserve.
3. **Attribute hooks round 2** — Might affects heavy windup/recovery, Grit affects armor burden and guard break, Cunning affects dodge/reward reveals, Craft affects workbench yield/costs, Speech affects dialogue/services, Lore affects codex/region clue surfaces.
4. **Skill-use leveling** — track repeated play actions locally: one-handed attacks, block/parry, harvesting, crafting, speech choices, lock/repair actions. Convert usage into small XP nudges without grinding requirements.
5. **Origins/classes** ✅ foundation shipped — title-screen new-run selection now supports Exiled Marshal, Ash Salvager, Guild Errandhand, and Lantern Defector. The selected origin writes `progression.identity`, changes the character sheet, and is verified through smoke state. Next: one starting perk, reputation tilt, starting visual accent, and small codex differences.
6. **Respec and build repair** — add an in-world trainer who can respec attributes/perks for gold/resources, with tests proving save persistence and combat recalculation.
7. **Role identity summary** — add a compact role sentence to the character sheet and `render_game_to_text` such as "Grit-heavy hammer defender" or "Speech/Craft salvage diplomat."

## Next Work — Pillar 23: Weapons, armor, loot, and crafting

1. **Weapon families** ✅ foundation shipped — `src/gearCrafting.js` formalizes Saber, Axe, Spear, and Hammer families. Shop refitting cycles the family, Might changes heavy weapon stamina/damage feel, and combat now consumes gear damage/stamina/reach/stagger modifiers. Next: bow/crossbow, lantern-tool class, unique windups, and upgrade branches per family.
2. **Armor slots** ✅ foundation shipped — head/body/hands/feet/trinket slots backfill through save migration. Shop fitting installs heavier armor pieces, Grit absorbs weight, armor affects stamina regen/block/weather movement, and the character sheet/debug state exposes armor line, weight, and crafting economy. Next: silhouette changes, stealth, elemental resistance, and inventory-driven equip choices.
3. **Loot tables** ✅ foundation shipped — `src/lootSystem.js` rolls deterministic regional drops with injectable RNG tests. POIs, mini-bosses, and some regional resource harvests can now grant gear-relevant finds such as armor pieces and weapon-family tokens in addition to resources.
4. **Crafting stations** ✅ foundation shipped — `src/craftingStation.js` defines pure workstation actions. The house stash now opens a selectable workbench overlay that can craft potions with Craft yield, fit owned Salvage Gloves, spend weapon-family tokens, prepare a refine kit from resources, upgrade the workbench through save-safe levels, gain Workbench II potion/refine benefits, and draft a persistent Region Map at Workbench III.
5. **World-earned upgrade branches** — each weapon family gets a simple branch: Saber precision, Axe cleave, Spear reach/control, Hammer stagger/guard break. Branch materials should drop from POIs, mini-bosses, and regional resource finds.
6. **Inventory-driven equipment choices** — let owned armor pieces and refit tokens be selected from house/smith UI instead of instantly replacing gear. Acceptance: the player can own more than one valid piece and choose what to equip.
7. **Crafting recipe visibility** — character sheet/workbench should show missing resources, Craft discounts/yield, station level benefits, and why an action is blocked.
8. **Balance tests** — pure tests for DPS, stamina economy, block breakpoints, loot rarity, upgrade costs, and station benefits so new gear does not trivialize Pillar 8 combat.

## Next Work — Pillar 24: Pets, companions, and mounts

1. **Pet adoption/taming** — add one active pet slot separate from human companions. Early pets: trail cat, dust hound, lantern moth, and pack pig. Each has a passive and one triggered behavior.
2. **First pet slice** — ship one pet first, likely dust hound or lantern moth: visible follower, passive resource/POI hint, one cooldown utility, bond persistence, and a house pet-bed surface.
3. **Pet bond system** — pets gain bond through travel, feeding, survival, and quest choices. Bond unlocks utility instead of raw combat domination.
4. **Pet gear and care** — collars, packs, charms, stable/kennel upgrades, food costs, and recovery after defeat. Persist pet identity, name, skin, bond, gear, and recovery state.
5. **Companion personalities** — extend one-slot companions with barks, likes/dislikes, loyalty thresholds, and quest reaction memory. Companions should comment on major choices, gear milestones, house upgrades, and locations.
6. **Mount/travel prototype** — evaluate a rideable mount or fast-travel stable after pathing is stable. Acceptance: no clipping through collision, no combat exploit, no camera sickness.

## Next Work — Pillar 25: Housing, settlements, and ownership

1. **House expansion stages** — shack to homestead to safehouse to small guild hall. Each stage changes interior layout, storage, workstations, NPC visits, exterior silhouette, and nearby town dressing.
2. **Storage and displays** — stash tabs for resources/gear, trophy display for boss kills, pet bed, companion bunk, map table, armor stand, and weapon rack. Must persist and survive save migration.
3. **Functional upgrades** ✅ foundation shipped — house stash now backfills/persists `house.workstation`, supports initial workbench crafting, exposes level 2/3 workbench upgrades, improves potion/refine output at level 2, and unlocks a level 3 map-table project. Next: forge/alchemy station depth, passive trickle, bounties, and fast-travel hooks.
4. **Station-specific benefits** — forge improves weapon/armor prep, alchemy improves potion/tonic yield, map table reveals POI clues, bunk improves companion recovery, pet bed improves bond/recovery, trophy wall unlocks boss reward recollection.
5. **Settlement influence** — player choices shift town services, vendor stock, patrol presence, house visitors, bounties, and ambient dialogue.
6. **Home defense event** — optional attack/raid event after major story beats. Uses existing combat systems and rewards preparation instead of punishing casual play.
7. **Housing acceptance** — a tester should want to return home because it is cheaper, clearer, and more personal than using the shop alone.

## Next Work — Pillar 26: Economy, jobs, and bounties

1. **Regional pricing** — prices respond to faction reputation, region events, scarcity, house station level, Speech, Craft, and player quest outcomes. Keep it simple, visible, and testable.
2. **Vendor identities** — separate merchant, smith, apothecary, stablekeeper, fence, trainer, and house steward inventories. Stock refreshes by day/region, not every frame.
3. **Gold sinks** — repairs, housing upgrades, pet care, crafting, trainers, transport, cosmetics, bounty licenses, and special job permits so gold remains meaningful.
4. **Radiant jobs** ✅ Jobs 7 rescue/escort pass shipped — `src/jobBoard.js` defines deterministic regional job data, save-safe job state, active progress, matching kill events, collection/salvage events, courier pickup/delivery events, patrol checkpoint events, supply-run pickup/dropoff events, rescue find/safe-return events, escort meet/finish events, timed bonus eligibility, late bonus misses, deadline failure states, and one-time reward claims. The current non-kill jobs are Frontier roadside salvage, Sealed Orders Run, Town Watch Patrol, Forge Supply Run, Missing Scout Rescue, Settler Road Escort, Ashfall Cooling Well Patrol, and Iron Lantern Quiet Signal Courier. Next: regional rescue/escort variants, optional bonus objectives beyond timers, and broader job failure causes.
5. **Bounty board** ✅ Jobs 7 rescue/escort pass shipped — Marshal Boone opens a selectable job-board modal with up to 7 choices, threat/reward/progress previews, board notes, regional availability lines, bonus/failure notes, active-job status, ready reward claiming, failed-job report-back clearing, and scroll-safe visible rows on smaller screens. Accepted jobs now resolve route markers for nearest salvage target, bounty enemy target, courier pickup/delivery, patrol checkpoints, supply pickup/dropoff, rescue find/safe-return, escort meet/finish, return-to-Boone turn-in, or failed-job report state. Frontier, Ashfall, and Iron Lantern now expose distinct in-world board props plus region-aware board titles, subtitles, empty states, 3D sprites, minimap dots, direct interaction, and `render_game_to_text` prop exposure. HUD/live objective text, minimap dots, 3D route pings, and debug text expose job-board choices/state/route markers for smoke automation. Next: stronger first-minute reward staging and deeper regional board stock.
6. **Trade and consequence hooks** — quest outcomes can open/close vendors, change prices, reroute supplies, add contraband risk, or unlock house visitors. Smoke JSON exposes economy state for playtest debugging.
7. **Economy acceptance** — after a short session, the player should understand one way to earn gold, one reason to spend it, and one reason prices changed.

## Next Work — Pillar 27: NPC communication and living-world dialogue

1. **Dialogue memory model** ✅ foundation shipped — `src/npcMemory.js` tracks per-NPC greetings, last origin, last region, house state, recent quest outcome, and notable gear milestone. Major NPC idle/reactive lines can now respond deterministically before any LLM provider exists.
2. **Text conversation UI** — add a compact modal for 2-4 choice dialogue plus a short free-text style prompt surface for flavor questions. The first implementation should use handcrafted response tables, not network calls.
3. **Dialogue content packs** — create small local response tables per major NPC for origin, region, faction stance, house, gear milestone, active quest, and recent outcome. Keep lines short and replay-safe.
4. **Choice consequences** — some dialogue choices should alter affinity, faction rep, thematic axes, service access, job availability, or local memory. Keep deltas small and visible.
5. **LLM provider interface** — define an optional `dialogueProvider` boundary that can call a local/free/game-oriented model later, but the shipped game must run fully offline with deterministic fallback responses.
6. **Safety and tone filters** — constrain generated or provider-backed replies to NPC persona, known game facts, current quest state, and short in-world responses. No arbitrary code, no unbounded prompts, no save writes from generated text.
7. **Conversation smoke coverage** — deterministic tests for NPC memory, fallback dialogue, affinity changes, quest gating, provider-off behavior, and `render_game_to_text` exposure. Optional provider tests stay mocked/off by default.

## Next Agent Handoff

Current shipped direction: open-world RPG foundation is now moving from data to playable systems. Character identity, attributes, title-screen origin selection, region visual profiles, save migration, KeyI character sheet, region tinting, shop barter from Speech, gear family refitting, armor-slot fitting, Craft repair/refine price hooks, loot tables, selectable house workbench, earned gear inventory lines, workbench levels, level-gated station benefits, Boone job-board choices, salvage/courier/patrol/supply/rescue/escort jobs, timed job bonuses, failed-job report states, richer job route markers, regional in-world board props, NPC memory, vendor service notes, first-pass enemy readability cues, first-pass gameplay-feel helpers, near-wall projection repair, and smoke/debug text fields are in scope. Fast verification is 337 tests across 35 files plus typecheck, syntax, dev lint, and focused browser smoke. Next functional slice should keep pushing player-visible loops: pet/house utility, local dialogue UI, and stronger visual open-world composition.

### User signal to respect

The user is not asking for a prettier TODO list. They want the game to start feeling like a compact open-world RPG: Skyrim/Oblivion energy, but scoped to this canvas engine. They value visible systems, larger coherent chunks, and forward motion. They are sensitive to tiny commits that look like bookkeeping. Do not answer a build request with a long proposal unless blocked; pick the next playable slice and ship it.

### What should have been better today

1. **I treated planning as progress for too long.** Roadmap cleanup was useful, but the user needed to see combat/story systems land sooner. Future agents should make the roadmap serve the build, not replace it.
2. **I let verification strategy become drag.** The slow smoke attempt cost momentum. Use fast gates continuously; reserve full smoke for UI/visual/release moments or when a browser-visible regression is plausible.
3. **I under-communicated the slice boundary.** The correct boundary was "combat payoff and ending payoff now; open-world identity next." Say this kind of boundary up front, then keep working.
4. **I optimized for safe smallness before visible ambition.** Safety matters, but the user is right that a game improves through complete loops: state, UI, persistence, tests, and player-facing feedback in the same chunk.
5. **I left `main.js` debt alive.** That was pragmatic, but every new feature should start with pure helpers and tests before touching `main.js`; otherwise the next big RPG systems will make the file harder to control.

### Next build target

Ship **Phase C / Jobs 8 + Phase A visual pressure.** The current foundation makes loot/workstations/jobs real and selectable, shows earned gear and active jobs in player-facing surfaces, lets Boone present up to seven job choices, adds salvage/courier/patrol/supply/rescue/escort jobs, resolves richer route markers, gives Boone's board an in-world sprite/minimap/interact presence, adds timed bonuses, late bonus misses, failed-job report states, Ashfall/Iron Lantern non-combat job depth, vendor service notes, validated road dressing, workbench levels, level 2 crafting, a level 3 Region Map project, and first-pass hit feedback/opening-objective/enemy readability helpers. The next slice should add regional board props, local dialogue UI, pet/house utility, or stronger starting-view reward feel.

Player-facing result:
- First 60 seconds have a clear action target, visible route, landmark hint, and nearby reward/threat.
- Marshal Boone shows multiple deterministic jobs with readable rewards, region, threat, and progress state.
- The starting view contains roads/props/signage or a region-specific landmark, not empty-feeling space.
- Enemy windups, hit reactions, and reward drops read better without opening debug state.
- HUD elements do not overlap when the game is played in the in-app browser.
- Mini-boss smoke completes deterministically or produces a focused failure artifact.
- Saves preserve new gear/crafting state through v3 backfill unless a real schema bump becomes necessary.

Concrete build order:
1. Add optional bonus/failure conditions for timed supply runs, safe patrol completion, and no-damage courier delivery.
2. Add broader regional job sets for Ashfall and Iron Lantern using the same route-marker interface.
3. Add deeper visual composition: more road bands, signposts, fences, carts, lamps, ash drifts, rails, pipes, and horizon silhouettes.
4. Expand enemy readability into boss-specific silhouettes, phase VFX, death smoke, and reward-drop callouts.
5. Fix HUD/objective/minimap overlap at narrow browser widths.
6. Shorten/fix `test-actions/mini_boss_flow.json` so the smoke does not hang.
7. Keep `render_game_to_text` exposing gameplay-feel, visual-world, and job-board state for smoke automation.
8. Update this roadmap and verification counts after the slice lands.

Quality bar:
- This is not a cosmetic-only pass. Attributes must have at least small derived effects or clear future hooks surfaced in data.
- This is not a giant rewrite. Keep `main.js` edits narrow and let pure modules carry the logic.
- This is not a fake gear system. If equipment cannot be earned outside the shop, the next chunk is not finished.
- This is not a network feature. LLM/NPC conversation waits until the game has local NPC memory and deterministic dialogue first.
- This is not a line-count contest. The slice is successful if the player can see identity, the world reads more distinctly, saves survive, and tests prove the shape.

Next after that:
1. **Phase B narrative payoff** — quest outcome smoke, companion barks, NPC/town reactions, visible service changes.
2. **Phase C RPG loops** — job-board choices, inventory-driven gear choices, deeper workbench/stations, housing utility, economy pressure.
3. **Phase D NPC life** — local dialogue UI, handcrafted memory-aware lines, optional provider boundary only after fallback works.
4. **Phase E playtest readiness** — pause/save slots/recovery, run history, daily seed, distribution packaging.

## Verification Gates

```bash
git diff --check
npm test
npm run typecheck:ts
npm run test:syntax
WESTWARD_PORT=5183 npm run test:smoke
WESTWARD_PORT=5183 WESTWARD_GRADIENT_CACHE=1 npm run test:smoke
WESTWARD_PORT=5183 scripts/visual_regression_capture.sh
```

## Agent Rules
- Update this file when scope shifts; never spawn parallel roadmap docs.
- Prefer small, tested gameplay slices over broad rewrites.
- Do not rewrite the renderer or move to WebGL unless explicitly requested.
- Preserve v1/v2/v3 save migration compatibility.
- New top-level state must come with a `backfill*` helper in `saveMigration.js` and a fixture round-trip test.
- Keep `npm test` and `npm run test:smoke` green at every commit.
