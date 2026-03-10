# Changelog

All notable development milestones for WestWardRPG are documented here.

---

## [Unreleased]

### Planned
- Proper sprite art pass (currently abstract billboards)
- Additional combat scenarios in the test automation suite
- Expanded action payload mappings for `Q`, `M`, and `F` key testing

---

## Wall Projection Stability Pass

### Fixed
- Near-wall rendering instability that produced giant striped wall bands in first-person view
- Player-vs-wall movement collision sampling with `PLAYER_COLLISION_RADIUS` to prevent camera clipping

### Changed
- Added rendering guards for extreme-near rays: wall projection near clip, texture-coordinate safety clamp, and environment-aware wall height cap
- Disabled image smoothing for wall-column sampling; restored for sprite/UI passes to reduce blurry horizontal banding

---

## Pig Visibility Tuning Pass

### Changed
- Expanded fixed near-town pig spawn points from 5 to 8 (all roles now start in the same area)
- Reduced pig wander radius spread to keep pigs near town
- Increased home/herd steering weights; added explicit leash force when pigs drift too far
- Reduced close-range panic burst intensity to prevent wide scatter

---

## Reliability & Docs Polish Pass

### Added
- End-to-end smoke suite runner (`scripts/smoke_suite.sh`) covering three gameplay scenarios
- Automatic server detection/start in the smoke suite
- Timestamped artifact output under `output/qa-smoke-<timestamp>/`
- `npm run test:smoke` and `npm run qa` quality gates
- Retry-based browser launcher in `web_game_playwright_client.mjs` (Chrome channel first, bundled Chromium fallback)

### Changed
- README updated with one-command QA section and local URL fallback documentation

---

## Codebase Polish Pass

### Changed
- Standardized storage namespace to `westward-save-v1` and `westward-locale-v1`
- Legacy `dustward-save-v1` / `dustward-locale-v1` keys automatically migrated on load
- Atmosphere TypeScript/JavaScript bridge now publishes `window.WestWardTS`; `window.DustwardTS` kept as compatibility alias
- Added shared storage helpers (`readStorageWithFallback`, `migrateStorageValue`) to deduplicate localStorage handling

---

## Western Refactor & Pig AI Pass

### Added
- Western pig role system: `Marshal`, `Outlaw`, `Deputy`, `Prospector`, `Gambler`, `Bandit`, `Rodeo`, `Sheriff`
- Per-role hat/bandana styling and temperament-driven behavior
- Pig bandit pickpocket behavior with cooldowns
- Extended `render_game_to_text` pig telemetry: `role`, `speed`, `stampeding`

### Changed
- Refactored pig simulation to use weighted steering: flock separation/alignment/cohesion, stampede mode, velocity blending, and collision bounce
- Reduced HUD footprint and top message panel to declutter gameplay view
- Westernized intro/menu text and quest flavor lines
- Refined billboard projection scaling so close NPCs no longer dominate the viewport

---

## Visual Polish Pass

### Changed
- Increased texture resolution from 64 → 96 for crisper wall/water sampling
- Stone texture: varied block tone, mortar lines, cracks, subtle moss tinting
- Water texture: richer ripple/eddy contrast and occasional foam highlights
- Horizon tree-line silhouette for layered depth
- Ground detail pass with grass tufts and pebble speckle tied to weather/wind
- Reworked first-person weapon: two-hand grip, sleeve/forearm layering, refined blade shading

---

## Realism Upgrade Pass — Atmosphere & Weather

### Added
- Dynamic weather simulation transitioning between `clear`, `mist`, `rain`, and `storm`
- Night stars and moon glow at low daylight levels
- Rain streaks and storm lightning overlays for outdoor scenes

### Changed
- Sky now blends day/night + storm shading
- Fog density varies with weather and affects distant wall haze
- Heavy rain slightly reduces player sprint speed and enemy pursuit speed
- HUD now displays active weather state
- `render_game_to_text` reports weather telemetry: `kind`, `rain`, `fog`, `wind`

---

## Save/Load Safety Pass

### Added
- `Continue Journey` button in main menu (shown only when a compatible save exists)
- Quick-save (`K`) and quick-load (`L`) keybinds during play
- 30-second silent autosave timer

### Changed
- Versioned payload format (`westward-save-v1`) with validation and clamping on load
- Safe fallback when storage is unavailable or save data is missing/incompatible
- Extended `render_game_to_text` with save metadata: `has_save`, `last_saved_at`

---

## Major Gameplay Rewrite — Sword, House & 3 Quests

### Added
- 3-hit combo sword combat with stamina-costed swings, lunge, stagger, knockback, and blocking
- Player house ownership: third quest unlocks house, enterable interior, bed rest, and workbench/stash
- Stone resource nodes integrated into house construction requirements
- 3-quest progression arc:
  - Quest 1: **Valley Survey** (collect Crystal Shards)
  - Quest 2: **Marsh Cleansing** (defeat slimes)
  - Quest 3: **Raise Your House** (collect Wood + Stone)
- More in-world NPCs: quest givers, merchant, innkeeper with roaming idle behavior

---

## Graphics Overhaul Pass

### Added
- Procedural wall textures (stone + water) with side-based darkening, distance fog, and water shimmer
- Dynamic sky gradient, sun glow, layered mountain ridges, and ground depth lines
- Shaped NPC/slime/tree/crystal/chest billboard sprites
- First-person sword overlay with movement bob and attack swing response

### Changed
- Replaced coarse step-raycasting with DDA-based ray hits for cleaner wall projection and stable texture sampling
- Updated UI typography to classic RPG tone (Palatino/Georgia)

---

## Initial Prototype

### Added
- First-person raycast 3D renderer
- RPG systems: HP, XP, leveling
- Quest framework, NPC interaction, enemy AI and combat
- Resource harvesting, loot chest, HUD, and minimap
- Deterministic automation hooks: `window.render_game_to_text` and `window.advanceTime(ms)`
- Fallback favicon to eliminate 404 noise during automated runs
- `Enter` as alternate interact key for automated action payloads
