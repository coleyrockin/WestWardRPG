# WestWardRPG Roadmap

Single planning source for future agents. Update this file; do not create new roadmap/tier/unfinished docs.

## Current State

`main` ships v3 Shattered Frontier + four full upgrade pillars (closeout, engine foundations, combat identity, world life). 198 vitest cases green; smoke 9/9; typecheck clean.

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
- `npm test` → 198 passing across 19 test files.
- `npm run typecheck:ts` → clean.
- `npm run test:smoke` → 9/9 scenarios (`smoke`, `quest`, `combat`, `boss-fight`, `weather-heavy`, `upgrade-equip`, `settings-modal`, `mini-boss`, `codex`).
- v1/v2/v3 save fixtures all migrate cleanly with backfilled defaults.

## Next Work — Pillar 5: Narrative depth

1. **Branching quest outcomes** — extend `questDefinitions.js` with optional `outcomes: { a, b }` per quest. At completion, modal 2-button choice routes to outcomes that apply axis/rep/flag deltas via `applyMajorDecision`. Persist in `state.narrative.questOutcomes`.
2. **Companion follower (1 slot)** — new `src/companion.js`. NPCs follow when affinity ≥60. Companion uses simplified pursuit AI to attack enemies near player. Save adds `world.companionId`, `world.companionHp`. Death → returns to home cell, -15 affinity.
3. **Four endings driven by thematic axes** — at chapter 3 final beat, resolve dominant axis from `narrative.thematicAxes`, render ending text + epilogue. Tie-breakers via `globalFlags`.
4. **Lite dialogue choices** — per-NPC stateless 2–3 choice prompts per chapter. Modal applies axis/rep deltas. Not a tree — flat menu, gated by chapter + flag.

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

## Future Ideas — Beyond the Current Plan

These are stretch concepts only worth considering after pillars 5–7 ship.

### Combat depth round 2
- **Weapon affixes** — once status effects prove out, layer prefix/suffix mods on weapon drops (e.g. "Searing Saber" forces +1 burn magnitude on hit). Start with three suffix tiers.
- **Block stamina chip** — currently block consumes 11 stamina per hit. Add chip damage for blocked hits and a true guard-break stagger when stamina hits 0 mid-block.
- **Aerial / mounted combat** — only worth it if traversal expands to verticality. Skip unless map system gets a Z axis.
- **Boss phase transitions** — bosses currently respawn flat; add 50% HP threshold transition that swaps moveset (e.g. Scrap Tyrant: brute → charger at half HP).

### World layer round 2
- **Seasonal events** — long real-time cycle (4 in-game weeks per season). Festival in Frontier with vendor-only items, dust storm in Ashfall with reduced visibility, blackout in Iron Lantern with patrol pause. Layered on top of `timeOfDay` with `state.world.calendarDay`.
- **Patrol entities** — civic-council patrols actually spawn as friendly NPCs that engage hostiles in your area when rep is allied. Driven off `resolvePatrolModifier`.
- **POIs round 2** — expand from 3 per region to 6+, add randomized POI loot with seeded RNG so daily-seed runs share placement. Add a "treasure-hunter" POI kind: cryptic clue → another POI.
- **Procedural region variants** — seed-driven layout reshuffle of region tile maps. Highest-risk save-migration item from the original plan; revisit only after NG+ ships.

### Narrative round 2
- **Companion combat synergy** — when companion uses a quick utility (smoke/flare/tonic), it stacks with player utility for a layered effect. Companion barks tied to `state.combat` events.
- **NPC schedules** — NPCs have day/night home cells (already a hook in `applyDynamicRegionProgression`). Tie schedules to faction rep — allied factions' NPCs leave doors unlocked at night.
- **Endings expansion** — from 4 to 8 by adding `globalFlags`-modulated variants per axis (e.g. "Solidarity ending: Hopeful" vs "Solidarity: Pyrrhic" depending on `ledgerPublished` + companion alive).
- **Letters / journal entries** — picked up at POIs, viewable in codex. Hand-written paragraph per entry; reveals lore not exposed via dialogue.

### Engine round 2
- **Web Worker pathfinding** — current AI is line-of-sight pursuit. Move A* path planning off-thread for any new enemy archetype that needs route awareness (mounted, ranged-with-cover).
- **OffscreenCanvas pre-render** — bake static minimap layer + biome ground tiles to off-canvas; saves redundant per-tile fills.
- **Sprite atlas** — current `makeTexture` builds per-kind canvases on demand. Atlas everything once at session start; pre-render the bands the gradient cache tracks.
- **Save schema bump (v4)** — once narrative/replay state grows, do a v3→v4 with explicit field additions (`world.companionId`, `world.ngPlusLevel`, `world.calendarDay`, `narrative.questOutcomes`). Keep the backfill helper pattern from saveMigration.

### Polish & meta
- **Visual regression diffing** — current `scripts/visual_regression_capture.sh` archives baselines; add pixelmatch-based pass/fail CI step.
- **Telemetry / dev overlay** — toggle key for FPS, particle count, grid bucket count, ambient drone state, status-effect summary on hovered enemy.
- **Replay system** — record input + RNG seed per run for bug repro and shareable death replays.
- **Localization expansion** — extend the 8-language pack to cover codex entries + new combat subtitles.
- **Mobile touch overlay** — investigation only; combat is fast enough that touch-only would need rebalanced timings.

## Verification Gates

```bash
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
