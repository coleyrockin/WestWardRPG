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
