# WestWardRPG Roadmap

> **Single source of truth.** This is the only roadmap document for WestWardRPG. Do not create parallel `tier-*.md`, `TODO.md`, `PLAN.md`, or `ROADMAP-*.md` files. Update this file when scope shifts.

## How to use this roadmap

- **Pillars are ordered.** Pillars 1–4, Pillar 5.5, and Pillar 8 Items 1–5 are shipped. Pillar 5's remaining dialogue/narrative depth items are active, and Pillars 6–7 plus 9–27 are planned. Don't skip ahead — each pillar depends on the foundations of the previous one.
- **Each pillar item is a thin, testable slice** scoped so a single agent can ship it in one session: file paths, helpers, and acceptance signals are spelled out.
- **Save migration is non-negotiable.** New top-level state requires a `backfill*` helper in `saveMigration.js` and a fixture round-trip test.
- **Never rewrite the renderer or move to WebGL** unless the user explicitly requests it.
- **Keep test gates green at every commit.** The verification block at the bottom is the contract.

## Current State

`main` ships v3 Shattered Frontier + four full upgrade pillars (closeout, engine foundations, combat identity, world life), the first Pillar 5 narrative/companion upgrades, **Pillar 5.5 story-to-run payoff**, **Pillar 8 Items 1-5** as combat depth round 2, **Pillar 21/22 open-world RPG foundation** (character identity, attributes, origin selection, region visual identity), **Pillar 23 gear loop foundation** (weapon families, armor slots, Craft-driven repair/refine prices, regional loot tables, POI/mini-boss gear finds, selectable workbench actions), **Pillar 25 workstation foundation**, **Pillar 27 deterministic NPC memory foundation**, and a **fully redesigned Apple-grade title screen**. Narrative state already tracks axes, factions, affinity, flags, decisions, quest outcomes, companion state, endings, POIs, codex unlocks, quest progression, build identity, gear state, loot history, workstation state, and NPC memory. The next highest-value work is making these foundations deeper: equipment inventory display, housing upgrades, pets, economy, and fuller living-world dialogue.

Open-world RPG target: push the game toward a compact Skyrim/Oblivion feel within the existing canvas engine. The world should have stronger visual identity, character builds, loot, pets, owned spaces, regional economy, and NPCs that remember enough context to feel alive. Keep everything local-first and deterministic by default; optional network/LLM features must have handcrafted fallback content and never block core play.

Latest local verification:
- `git diff --check` → clean.
- `npm test` → **278 passing across 30 test files**.
- `npm run typecheck:ts` → clean.
- `npm run test:syntax` → clean.
- `npm run dev:lint` → clean.
- Browser smoke covered new-run state surfaces plus a partial-save house workbench flow: load save, open stash workbench, list craft/potion/armor/token/refine actions, and equip Salvage Gloves. Smoke and visual-regression artifacts are generated under ignored `output/`; rerun the Verification Gates before gameplay commits.

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
- Current baseline is the "Latest local verification" block above: `git diff --check` clean, `npm test` at 278 passing across 30 files, `npm run typecheck:ts` clean, `npm run test:syntax` clean, and `npm run dev:lint` clean.
- v1/v2/v3 save fixtures all migrate cleanly with backfilled defaults.

## Next Work — Pillar 5: Narrative depth

1. **Branching quest outcomes** — implemented foundation. `questDefinitions.js` now supports optional `outcomes` per quest, `decisionEngine.js` has `applyQuestOutcome`, save migration backfills `state.narrative.questOutcomes`, and `main.js` opens a small consequence modal for Crystal, House, Archive, Ashfall, and Lantern turn-ins. Ashfall/Lantern resource objectives now progress from regional harvesting, and town-circle turn-in advances the next regional quest. Next: add a Playwright flow that completes one turn-in and confirms the modal choice persists.
2. **Companion follower (1 slot)** — implemented foundation plus recovery. `src/companion.js` selects eligible NPCs at affinity ≥60, activates a one-slot follower, moves them toward the player, lets them strike nearby enemies on cooldown, lets nearby enemies threaten them, downs them at 0 HP, applies -15 affinity, and recovers them after a timer. `main.js` renders active companions, updates recovery/threat state in the loop, exposes it in smoke state JSON, and persists `world.companionId/world.companionHp/world.companionDowned/world.companionRecoveryTimer`. `saveMigration.js` backfills companion fields for existing v3 saves. Next: add companion barks and utility synergy.
3. **Four endings driven by thematic axes** — at chapter 3 final beat, resolve dominant axis from `narrative.thematicAxes`, render ending text + epilogue. Tie-breakers via `globalFlags`.
4. **Lite dialogue choices** — per-NPC stateless 2–3 choice prompts per chapter. Modal applies axis/rep deltas. Not a tree — flat menu, gated by chapter + flag.

## Next Work — Pillar 5.5: Story-to-run payoff

1. **Final beat trigger** ✅ shipped — Lantern Revolt turn-in resolves chapter 3 through `completeFinalBeat()`, stores the resolved ending, locks the run into `mode: "victory"`, saves immediately, and reloads as victory instead of restarting.
2. **Ending screen polish** ✅ shipped — victory overlay shows ending title, summary, dominant axes, latest decisions, companion status, and run summary using the existing soft-panel canvas rendering.
3. **Run summary data** ✅ shipped — `world.runStats` tracks started/ended time, victory, ending id, kills, mini-boss kills, harvested resources, and quest outcome count. Save migration backfills the shape for old v3 saves.
4. **Quest outcome smoke coverage** — add a deterministic Playwright flow that forces a quest-ready state, confirms a modal choice, saves, reloads, and asserts `narrative.questOutcomes` persists in `render_game_to_text`.
5. **Companion smoke coverage** — add a deterministic debug hook for high affinity, then verify companion spawn/down/recover in a short browser scenario.

## Next Work — Pillar 6: Replayability

1. **Run summary screen** — death/victory shows time played, kills, gold, ideology snapshot, ending if reached. "Continue → New Game+" button on victory.
2. **New Game+** — `state.world.ngPlusLevel` carries forward `progression.upgradePoints`/`skillTree`/`weaponTier`/`armorMods`. Resets quests/inventory/regions. Enemy HP×(1+0.25·ngPlusLevel).
3. **Daily seed mode** — main-menu button. Seed = YYYY-MM-DD hash drives spawn order, POI placement, region-event severity. Score = `kills*5 + gold + dayDepth*100`.
4. **Challenge runs** — new-game checkboxes: ironman (no reload after death), no-shop, no-skill. Each modestly multiplies score.

## Next Work — Pillar 7: QoL & accessibility

1. **Pause menu** — Esc pauses, scales game time to 0, opens menu (Resume / Settings / Codex / Quit).
2. **Keybind remap** — settings modal sub-menu, persisted in `state.input.keybinds`.
3. **Save slots (3)** — prefix `westward_save_<slot>`. Title-screen UI for slot select; existing key migrates to slot 1.
4. **Subtitle system** — combat events ("hit", "crit", "low HP", "regen") via accessibility flag.
5. **Difficulty selector** — Easy/Normal/Hard at new-game. Disjoint from NG+ scaling — multiplicative.

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

1. **Corruption recovery UI** — JSON parse failures should surface a canvas/menu message with fresh-start and backup-restore options instead of silently falling back.
2. **Auto-backup rotation** — keep the last three successful saves under timestamped backup keys; rotate after successful primary save writes only.
3. **Export/import** — add local JSON export/import from the title or pause flow for cloudless portability. Import validates version and payload shape before writing storage.
4. **Schema mismatch messaging** — unsupported future versions should explain that the save is newer than the game build; older versions should show successful migration when useful.
5. **Save resilience tests** — cover malformed JSON, unsupported version, v1/v2/v3 migration, backup restore, and export/import round trips.

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
2. **Landmarks and travel readability** — add visible towers, mines, shrines, roads, outposts, gates, and region borders so players navigate by place instead of coordinates.
3. **Interior variety** — extend the existing house/interior rendering into caves, watchtowers, smithy, inn, shrine, and Iron Lantern office spaces. Keep interiors canvas-only and reuse collision maps.
4. **Character silhouettes** — add player/NPC/companion visual layers for outfit, weapon, cloak/hat, faction accent, and combat stance. Persist cosmetic selections separately from stats.
5. **Combat readability polish** — upgrade smoke, flare, parry, phase transition, bleed/burn/frost/shock, and boss death visuals with colorblind-safe variants and snapshot coverage.

## Next Work — Pillar 22: Character progression & role identity

1. **Character sheet** ✅ foundation shipped — KeyI opens a canvas character sheet with origin, role label, attributes, RPG hooks, current region identity, gear, faction lean/rep, companion state, and house state. It is exposed through `character_sheet_open` in `render_game_to_text`.
2. **Attributes** ✅ foundation shipped — `src/characterIdentity.js` adds Might, Grit, Cunning, Craft, Speech, and Lore with origin presets, safe normalization, derived RPG hooks, and v3 save migration preservation under `progression.identity`. Speech now affects shop prices through `resolveIdentityShopPriceMultiplier`; next hooks should affect dialogue, crafting, and combat reserve.
3. **Skill-use leveling** — track repeated play actions locally: one-handed attacks, block/parry, harvesting, crafting, speech choices, lock/repair actions. Convert usage into small XP nudges without grinding requirements.
4. **Origins/classes** ✅ foundation shipped — title-screen new-run selection now supports Exiled Marshal, Ash Salvager, Guild Errandhand, and Lantern Defector. The selected origin writes `progression.identity`, changes the character sheet, and is verified through smoke state. Next: one starting perk, reputation tilt, and small visual/codex differences.
5. **Respec and build repair** — add an in-world trainer who can respec attributes/perks for gold/resources, with tests proving save persistence and combat recalculation.

## Next Work — Pillar 23: Weapons, armor, loot, and crafting

1. **Weapon families** ✅ foundation shipped — `src/gearCrafting.js` formalizes Saber, Axe, Spear, and Hammer families. Shop refitting cycles the family, Might changes heavy weapon stamina/damage feel, and combat now consumes gear damage/stamina/reach/stagger modifiers. Next: bow/crossbow, lantern-tool class, unique windups, and upgrade branches per family.
2. **Armor slots** ✅ foundation shipped — head/body/hands/feet/trinket slots backfill through save migration. Shop fitting installs heavier armor pieces, Grit absorbs weight, armor affects stamina regen/block/weather movement, and the character sheet/debug state exposes armor line, weight, and crafting economy. Next: silhouette changes, stealth, elemental resistance, and inventory-driven equip choices.
3. **Loot tables** ✅ foundation shipped — `src/lootSystem.js` rolls deterministic regional drops with injectable RNG tests. POIs, mini-bosses, and some regional resource harvests can now grant gear-relevant finds such as armor pieces and weapon-family tokens in addition to resources.
4. **Crafting stations** ✅ foundation shipped — `src/craftingStation.js` defines pure workstation actions. The house stash now opens a selectable workbench overlay that can craft potions with Craft yield, fit owned Salvage Gloves, spend weapon-family tokens, or prepare a refine kit from resources.
5. **Balance tests** — pure tests for DPS, stamina economy, block breakpoints, loot rarity, and upgrade costs so new gear does not trivialize Pillar 8 combat.

## Next Work — Pillar 24: Pets, companions, and mounts

1. **Pet adoption/taming** — add one active pet slot separate from human companions. Early pets: trail cat, dust hound, lantern moth, pack pig. Each has a passive and one triggered behavior.
2. **Pet bond system** — pets gain bond through travel, feeding, survival, and quest choices. Bond unlocks utility instead of raw combat domination.
3. **Pet gear and care** — collars, packs, charms, and stable/kennel upgrades. Persist pet identity, name, skin, bond, gear, and recovery state.
4. **Companion personalities** — extend one-slot companions with barks, likes/dislikes, loyalty thresholds, and quest reaction memory. Companions should comment on major choices and locations.
5. **Mount/travel prototype** — evaluate a rideable mount or fast-travel stable after pathing is stable. Acceptance: no clipping through collision, no combat exploit, no camera sickness.

## Next Work — Pillar 25: Housing, settlements, and ownership

1. **House expansion stages** — shack to homestead to safehouse to small guild hall. Each stage changes interior layout, storage, workstations, NPC visits, and exterior silhouette.
2. **Storage and displays** — stash tabs for resources/gear, trophy display for boss kills, pet bed, companion bunk, and weapon rack. Must persist and survive save migration.
3. **Functional upgrades** ✅ foundation shipped — house stash now backfills/persists `house.workstation` and supports initial workbench crafting. Next: visible station UI, forge/alchemy/map table upgrade levels, passive trickle, bounties, and fast-travel hooks.
4. **Settlement influence** — player choices shift town services, vendor stock, patrol presence, house visitors, and ambient dialogue.
5. **Home defense event** — optional attack/raid event after major story beats. Uses existing combat systems and rewards preparation instead of punishing casual play.

## Next Work — Pillar 26: Economy, jobs, and bounties

1. **Regional pricing** — prices respond to faction reputation, region events, scarcity, and player quest outcomes. Keep it simple, visible, and testable.
2. **Vendor identities** — separate merchant, smith, apothecary, stablekeeper, fence, trainer, and house steward inventories. Stock refreshes by day/region, not every frame.
3. **Gold sinks** — repairs, housing upgrades, pet care, crafting, trainers, transport, cosmetics, and bounty licenses so gold remains meaningful.
4. **Radiant jobs** — small deterministic jobs: bounty, courier, salvage, rescue, escort, patrol, supply run. Each uses existing map/entity systems and has clear success/fail states.
5. **Trade and consequence hooks** — quest outcomes can open/close vendors, change prices, and reroute supplies. Smoke JSON exposes economy state for playtest debugging.

## Next Work — Pillar 27: NPC communication and living-world dialogue

1. **Dialogue memory model** ✅ foundation shipped — `src/npcMemory.js` tracks per-NPC greetings, last origin, last region, house state, recent quest outcome, and notable gear milestone. Major NPC idle/reactive lines can now respond deterministically before any LLM provider exists.
2. **Text conversation UI** — add a compact modal for 2–4 choice dialogue plus a short free-text style prompt surface for flavor questions. The first implementation should use handcrafted response tables, not network calls.
3. **LLM provider interface** — define an optional `dialogueProvider` boundary that can call a local/free/game-oriented model later, but the shipped game must run fully offline with deterministic fallback responses.
4. **Safety and tone filters** — constrain generated or provider-backed replies to NPC persona, known game facts, current quest state, and short in-world responses. No arbitrary code, no unbounded prompts, no save writes from generated text.
5. **Conversation smoke coverage** — deterministic tests for NPC memory, fallback dialogue, affinity changes, quest gating, and `render_game_to_text` exposure. Optional provider tests stay mocked/off by default.

## Next Agent Handoff

Current shipped direction after `7e9ac52`: open-world RPG foundation is now moving from data to playable systems. Character identity, attributes, title-screen origin selection, region visual profiles, save migration, KeyI character sheet, region tinting, shop barter from Speech, gear family refitting, armor-slot fitting, Craft repair/refine price hooks, loot tables, selectable house workbench, NPC memory, and smoke/debug text fields are in scope. Fast verification is 278 tests across 30 files plus typecheck, syntax, dev lint, and focused browser smoke. Next functional slice should make earned equipment more visible and add house upgrade levels.

### User signal to respect

The user is not asking for a prettier TODO list. They want the game to start feeling like a compact open-world RPG: Skyrim/Oblivion energy, but scoped to this canvas engine. They value visible systems, larger coherent chunks, and forward motion. They are sensitive to tiny commits that look like bookkeeping. Do not answer a build request with a long proposal unless blocked; pick the next playable slice and ship it.

### What should have been better today

1. **I treated planning as progress for too long.** Roadmap cleanup was useful, but the user needed to see combat/story systems land sooner. Future agents should make the roadmap serve the build, not replace it.
2. **I let verification strategy become drag.** The slow smoke attempt cost momentum. Use fast gates continuously; reserve full smoke for UI/visual/release moments or when a browser-visible regression is plausible.
3. **I under-communicated the slice boundary.** The correct boundary was "combat payoff and ending payoff now; open-world identity next." Say this kind of boundary up front, then keep working.
4. **I optimized for safe smallness before visible ambition.** Safety matters, but the user is right that a game improves through complete loops: state, UI, persistence, tests, and player-facing feedback in the same chunk.
5. **I left `main.js` debt alive.** That was pragmatic, but every new feature should start with pure helpers and tests before touching `main.js`; otherwise the next big RPG systems will make the file harder to control.

### Next build target

Ship **Gear Loop 4: equipment inventory display + house upgrade levels.** The current foundation makes loot/workstations real and selectable. The next slice should make earned gear easier to inspect and expand the house into upgradeable stations.

Player-facing result:
- Earned armor pieces and weapon-family tokens appear clearly in the character sheet and workbench.
- House workstation upgrades unlock forge/alchemy/map-table actions.
- Might/Grit/Craft should remain visible in outcomes: heavy weapons feel different, armor weight matters, and Craft changes cost/yield.
- Saves preserve new gear/crafting state through v3 backfill unless a real schema bump becomes necessary.

Concrete build order:
1. Add owned gear inventory lines to the character sheet and workbench.
2. Add `house.workstation.level` upgrade costs and visible station labels.
3. Unlock one new action per level: forge, alchemy, map table.
4. Expose station level/action inventory in `render_game_to_text` for smoke automation.
5. Update this roadmap and verification counts after the slice lands.

Quality bar:
- This is not a cosmetic-only pass. Attributes must have at least small derived effects or clear future hooks surfaced in data.
- This is not a giant rewrite. Keep `main.js` edits narrow and let pure modules carry the logic.
- This is not a fake gear system. If equipment cannot be earned outside the shop, the next chunk is not finished.
- This is not a network feature. LLM/NPC conversation waits until the game has local NPC memory and deterministic dialogue first.
- This is not a line-count contest. The slice is successful if the player can see identity, the world reads more distinctly, saves survive, and tests prove the shape.

Next after that:
1. **Pillar 23 gear loop** — loot tables, crafting stations, and inventory-driven equipment choices that reference attributes.
2. **Pillar 25 housing utility** — storage/workstations that use economy/crafting resources.
3. **Pillar 24 pet slot** — one pet with bond and one utility behavior, after attributes and housing hooks exist.
4. **Pillar 27 NPC memory** — local memory and choice surfaces before any optional LLM provider.

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
