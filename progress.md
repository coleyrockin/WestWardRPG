Original prompt: Build a 3D role playing game, sandbox, thats single player

## Progress
- Created a complete single-player 3D sandbox RPG prototype in plain HTML/JS (`index.html`, `game.js`).
- Implemented first-person raycast 3D renderer, RPG systems (HP/XP/level), quests, NPC interaction, enemy AI/combat, harvesting, loot chest, HUD/minimap, and text-state hooks.
- Added required automation hooks: `window.render_game_to_text` and deterministic `window.advanceTime(ms)`.

## TODO / Next Iteration
- Run Playwright action loop and inspect screenshots + state JSON for correctness.
- Tune movement feel, sprite visibility, and any rendering or interaction bugs found during test runs.
- Fixed canvas resize behavior to keep stable coordinate scaling across devices.
- Attempted automated Playwright loop via skill client; blocked by missing `playwright` package and no network access to install from npm.
- Added fallback favicon to eliminate browser 404 noise during automated runs.
- Tuned sprite projection scale so nearby NPC/enemy billboards no longer dominate most of the viewport.
- Added `Enter` as alternate interact key so automated action payloads can trigger NPC dialogue/quests.

## Test Runs
- Installed local Playwright automation dependencies and Chromium browser assets.
- Local bundled Chromium crashes in this environment, so the local Playwright client copy now prefers installed Google Chrome and falls back to bundled Chromium.
- Automated scenarios executed successfully via Playwright client copy:
  - `output/web-game-quest` (quest activation + interaction flow)
  - `output/web-game-combat` (movement/combat + HP changes)
  - `output/web-game-smoke-final` (default controls smoke)
- No console error artifacts were generated in the successful runs.

## Next Agent Suggestions
- Add a proper sprite art pass (currently abstract billboards).
- Expand action payload mappings to test `Q`, `M`, and `F` directly via automation.
- Add save/load of player progression to localStorage.

## Graphics Overhaul Pass (Realistic RPG Feel)
- Replaced coarse step-raycasting with DDA-based ray hits for cleaner wall projection and stable texture sampling.
- Added procedural wall textures (stone + water) with side-based darkening, distance fog, and water shimmer.
- Reworked environment lighting with dynamic sky gradient, sun glow, layered mountain ridges, and subtle ground depth lines.
- Replaced flat rectangle sprites with shaped billboards for NPCs, slimes, trees, crystals, and cache chest.
- Added first-person sword overlay with movement bob and attack swing response.
- Updated UI typography toward a classic RPG tone (`Palatino`/`Georgia`).

## Validation
- Automated smoke render run completed with no console errors:
  - `output/web-game-graphics-final/shot-0.png`
  - `output/web-game-graphics-final/state-0.json`

## Major Gameplay Rewrite (Sword + House + 3 Quests)
- Rebuilt combat feel for first-person sword play: chained 3-hit combo, stamina-costed swings, lunge, stagger, knockback, hit pulse, and blocking with reduced incoming damage.
- Added dedicated house ownership flow: third quest unlocks player house, enterable interior, bed rest interaction, and workbench/stash interaction.
- Expanded and clarified the 3-quest progression:
  - `1) Valley Survey` (collect Crystal Shards)
  - `2) Marsh Cleansing` (defeat slimes)
  - `3) Raise Your House` (collect Wood + Stone)
- Added more in-world NPCs and interaction roles (quest givers, merchant, innkeeper) with roaming idle behavior.
- Added Stone resource nodes and integrated resource/quest requirements for house construction.
- Upgraded environment and rendering integration for world + interior maps while keeping deterministic hooks (`advanceTime` and `render_game_to_text`).
- Adjusted NPC placement so first interact naturally starts Quest 1 with Elder Nira.
- Fixed pointer-lock request to be safe in headless/automation contexts (no `WrongDocumentError` pageerror).

## Validation (Post-Refactor)
- `output/web-game-realism-smoke2`: no console/page errors.
- `output/web-game-realism-queststart`: Quest 1 activates (`crystal.status = active`) from initial Elder interaction.
- `output/web-game-realism-combat2`: combat/block scenario executes without console/page errors.

## Save/Load Safety Pass (Current)
- Added player-facing save/load controls:
  - New menu `Continue Journey` button (shown only when a compatible save exists).
  - New quick-save (`K`) and quick-load (`L`) keybinds during play.
- Implemented guarded localStorage persistence (`dustward-save-v1`) with:
  - Versioned payload format.
  - Validation/clamping on load for player stats, inventory, quest progress, and positions.
  - Safe fallback behavior when storage is unavailable or save data is missing/incompatible.
- Added 30-second silent autosave timer while actively playing.
- Extended `render_game_to_text` payload with save metadata (`has_save`, `last_saved_at`).

## Realism Upgrade Pass (Atmosphere + World Feel)
- Added dynamic weather simulation that transitions between `clear`, `mist`, `rain`, and `storm`.
- Integrated weather into rendering:
  - Sky now blends day/night + storm shading.
  - Night stars and moon glow appear at low daylight.
  - Fog density now varies with weather and affects distant wall haze.
  - Rain streaks and storm lightning overlays added for outdoor scenes.
- Integrated weather into gameplay feel:
  - Heavy rain slightly reduces player sprint effectiveness.
  - Heavy rain slightly slows enemy pursuit speed.
- HUD now displays active weather state.
- `render_game_to_text` now reports weather telemetry (`kind`, `rain`, `fog`, `wind`) for deterministic validation.

## Validation (Atmosphere Pass)
- Ran Playwright gameplay loop successfully:
  - `output/web-game/shot-0.png`
  - `output/web-game/shot-1.png`
  - `output/web-game/shot-2.png`
  - `output/web-game/state-0.json`
  - `output/web-game/state-1.json`
  - `output/web-game/state-2.json`
- New run produced no fresh `errors-*.json` artifacts.

## Visual Polish Pass (Current)
- Increased texture resolution from `64` to `96` for crisper wall/water sampling.
- Reworked procedural wall/water textures:
  - Stone now has varied block tone, mortar lines, cracks, and subtle moss tinting.
  - Water now has richer ripple/eddy contrast and occasional foam highlights.
- Added foreground world richness:
  - Horizon tree-line silhouette for layered depth.
  - Ground detail pass with grass tufts + pebble speckle tied to weather/wind.
  - Stronger wall base occlusion for improved depth/weight.
- Reworked first-person weapon presentation:
  - Clear two-hand grip around the hilt (fingers/thumbs visible).
  - Sleeve/forearm layering for stronger first-person character presence.
  - Refined blade/guard/grip shading for better material readability.

## Validation (Polish Pass)
- Smoke capture rerun passed:
  - `output/web-game/shot-0.png`
  - `output/web-game/shot-1.png`
  - `output/web-game/shot-2.png`
- Quest-flow regression rerun passed:
  - `output/web-game-quest/shot-0.png`
  - `output/web-game-quest/shot-1.png`
  - `output/web-game-quest/state-0.json`
  - `output/web-game-quest/state-1.json`
- No fresh quest-run `errors-*.json` files were produced.

## Western Refactor + Pig AI Pass (Current)
- Refactored pig simulation into a richer steering model with weighted behaviors:
  - flock separation/alignment/cohesion,
  - role/temperament-driven motion,
  - stampede mode triggered by nearby danger/weather,
  - velocity blending + collision bounce for stable movement.
- Added western pig role system (`Marshal`, `Outlaw`, `Deputy`, `Prospector`, `Gambler`, `Bandit`, `Rodeo`, `Sheriff`) with per-role hat/bandana styling and behavior hints.
- Added pig interaction flavor updates and bandit pickpocket behavior with cooldowns.
- Extended sprite payload + rendering for pigs (hat, bandana, gait animation, sheriff badge).
- Reduced HUD footprint and top message panel footprint to declutter gameplay view.
- Added westernized intro/menu text and updated key quest/NPC flavor lines.
- Refined billboard projection scaling so close NPCs no longer dominate the viewport.
- Extended `render_game_to_text` pig telemetry to include `role`, `speed`, and `stampeding`.

## Validation (Western Refactor)
- `npm test` passed after each major edit (`node --check` for `game.js` and `web_game_playwright_client.mjs`).
- Automated Playwright runs completed:
  - `output/web-game-western-pigs/` (3 iterations, realism smoke actions)
  - `output/web-game-western-pigs-quest/` (2 iterations, quest flow)
  - `output/web-game-western-pigs-show/` (targeted camera-turn run)
- Visual/manual screenshot review completed for:
  - `output/web-game-western-pigs/shot-2.png`
  - `output/web-game-western-pigs-show/shot-0.png`
- Dev server was stopped after validation.

## Codebase Polish Pass (Current)
- Standardized storage/namespace branding while preserving backward compatibility:
  - Save key now uses `westward-save-v1` with legacy fallback/migration from `dustward-save-v1`.
  - Locale key now uses `westward-locale-v1` with legacy fallback/migration from `dustward-locale-v1`.
  - Added shared storage helpers (`readStorageWithFallback`, `migrateStorageValue`) to remove duplicated localStorage handling paths.
- Atmosphere TypeScript/JavaScript bridge now publishes `window.WestWardTS` and keeps `window.DustwardTS` as a compatibility alias.
- Game bootstrap now prefers `window.WestWardTS` and falls back to `window.DustwardTS`.

## Validation (Polish Storage/Namespace Pass)
- Local checks passed:
  - `npm test`
  - `npm run dev:lint`
- Playwright skill client run passed against local project server:
  - `output/web-game-polish-storage-rpg/shot-0.png`
  - `output/web-game-polish-storage-rpg/shot-1.png`
  - `output/web-game-polish-storage-rpg/shot-2.png`
  - `output/web-game-polish-storage-rpg/state-0.json`
  - `output/web-game-polish-storage-rpg/state-1.json`
  - `output/web-game-polish-storage-rpg/state-2.json`
- Manual screenshot inspection completed for:
  - `output/web-game-polish-storage-rpg/shot-0.png`
  - `output/web-game-polish-storage-rpg/shot-2.png`
- No `errors-*.json` artifact was emitted for this run.

## Reliability + Docs Polish Pass (Current)
- Added an end-to-end smoke suite runner: `scripts/smoke_suite.sh`.
  - Runs three gameplay scenarios (`realism_smoke`, `quest_flow`, `combat_block_flow`).
  - Detects/uses a running local server or starts one automatically when needed.
  - Validates that each scenario emits state snapshots and no `errors-*.json` artifacts.
  - Writes timestamped artifacts to `output/qa-smoke-<timestamp>/` for auditability.
- Improved browser-launch resilience in `web_game_playwright_client.mjs`:
  - Added retry-based launcher that prioritizes Chrome channel and falls back to bundled Chromium.
- Added npm quality gates:
  - `npm run test:smoke`
  - `npm run qa` (lint + smoke suite).
- Upgraded README quality/testing guidance:
  - Added one-command QA section.
  - Documented local URL fallbacks (`127.0.0.1`, `localhost`, `[::1]`).
  - Updated Playwright example URL path to `/index.html`.

## Validation (Reliability + Docs Polish Pass)
- `npm test` passed.
- `npm run dev:lint` passed.
- `npm run test:smoke` passed (multi-scenario functional suite):
  - `output/qa-smoke-20260222-202319/smoke/*`
  - `output/qa-smoke-20260222-202319/quest/*`
  - `output/qa-smoke-20260222-202319/combat/*`
- Manual screenshot review completed for:
  - `output/qa-smoke-20260222-202319/smoke/shot-2.png`

## Pig Visibility Tuning Pass (Current)
- Updated pig spawn behavior to keep the entire "funny pig" cast easy to find near town:
  - Expanded fixed near-town pig spawn points from 5 to 8 (all pig roles now start in the same local area).
  - Reduced pig wander radius spread so pigs roam less aggressively away from their home positions.
  - Increased home/herd steering weights and added an explicit leash force when pigs drift beyond their wander radius.
  - Reduced close-range panic burst intensity so pigs do not scatter as far during normal interaction.

## Validation (Pig Visibility Tuning Pass)
- `npm test` passed.
- `npm run dev:lint` passed.
- Start-state Playwright check passed:
  - `output/web-game-pigs-visible-check/shot-0.png`
  - `output/web-game-pigs-visible-check/state-0.json`
- Verified `nearby_pigs` includes all 8 pigs at start in `state-0.json`.
