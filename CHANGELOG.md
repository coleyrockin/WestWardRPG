# Changelog

All notable changes to WestWardRPG are documented here.

---

## [Unreleased]

See [ROADMAP.md](ROADMAP.md) for planned features.

---

## [1.0.0] — Wall Projection Stability + Pig Visibility

### Added
- Player-vs-wall collision sampling via `PLAYER_COLLISION_RADIUS` to prevent camera clipping.
- Rendering guards for extreme-near rays: near clip plane, texture-coordinate safety clamps, and environment-aware wall height caps.
- Expanded pig spawn points from 5 to 8 (all pig roles now spawn near town).
- Pig leash force to prevent pigs from wandering too far from their home positions.

### Changed
- Disabled image smoothing for wall-column sampling to reduce blurry horizontal banding.
- Reduced close-range pig panic burst intensity to prevent excessive scattering.
- Reduced pig wander radius spread for tighter clustering around town.

### Fixed
- Half-screen close-wall strip artifact in first-person view.
- Giant striped wall bands caused by near-wall rendering instability.

---

## [0.9.0] — Reliability & Docs Polish

### Added
- End-to-end smoke suite runner (`scripts/smoke_suite.sh`): runs three gameplay scenarios and validates state/error output.
- `npm run test:smoke` and `npm run qa` (lint + smoke) quality gates.
- Retry-based browser launcher in `web_game_playwright_client.mjs` (Chrome preferred, bundled Chromium fallback).

### Changed
- Updated README with one-command QA section and local URL fallback guidance.

---

## [0.8.0] — Codebase Polish (Storage & Namespace)

### Added
- Shared storage helpers: `readStorageWithFallback` and `migrateStorageValue`.

### Changed
- Save key migrated to `westward-save-v1` with legacy fallback from `dustward-save-v1`.
- Locale key migrated to `westward-locale-v1` with legacy fallback from `dustward-locale-v1`.
- Atmosphere module now publishes `window.WestWardTS`; `window.DustwardTS` kept as compatibility alias.
- Game bootstrap prefers `window.WestWardTS` and falls back to `window.DustwardTS`.

---

## [0.7.0] — Western Refactor + Pig AI

### Added
- Rich pig steering model: flock separation/alignment/cohesion, role/temperament-driven motion, stampede mode, velocity blending, and collision bounce.
- Western pig role system: `Marshal`, `Outlaw`, `Deputy`, `Prospector`, `Gambler`, `Bandit`, `Rodeo`, `Sheriff` — each with per-role hat/bandana styling.
- Pig interaction flavor and bandit pickpocket behavior with cooldowns.
- Extended `render_game_to_text` pig telemetry: `role`, `speed`, `stampeding`.

### Changed
- Reduced HUD and top message panel footprint for a cleaner gameplay view.
- Added westernized intro/menu text and updated NPC flavor lines.
- Refined billboard projection scaling to prevent close NPCs from dominating the viewport.

---

## [0.6.0] — Realism Upgrade (Atmosphere & Weather)

### Added
- Dynamic weather simulation cycling through `clear`, `mist`, `rain`, and `storm`.
- Night stars, moon glow, and storm-darkened sky blending.
- Rain streaks and storm lightning overlays for outdoor scenes.
- HUD weather state display.
- Weather telemetry in `render_game_to_text`: `kind`, `rain`, `fog`, `wind`.

### Changed
- Fog density now varies with weather and affects distant wall haze.
- Heavy rain lightly reduces player sprint speed and enemy pursuit speed.

---

## [0.5.0] — Save/Load Safety

### Added
- `Continue Journey` menu button (shown only when a compatible save exists).
- Quick-save (`K`) and quick-load (`L`) keybinds during play.
- Versioned save payload with validation/clamping on load.
- 30-second autosave timer.
- Save metadata in `render_game_to_text`: `has_save`, `last_saved_at`.

### Changed
- Safe fallback behavior when storage is unavailable or save is missing/incompatible.

---

## [0.4.0] — Visual Polish Pass

### Added
- Higher-resolution procedural textures (96px): richer stone/water contrast, moss tinting, foam highlights.
- Horizon tree-line silhouette, ground detail pass (grass tufts, pebble speckle).
- Stronger wall base occlusion for improved depth.
- First-person sword with two-hand grip, sleeve/forearm layering, and refined blade shading.

---

## [0.3.0] — Major Gameplay Rewrite (Combat + Quests + House)

### Added
- First-person sword combat: 3-hit combo, stamina costs, lunge, stagger, knockback, blocking with damage reduction.
- Player house: third quest unlocks a house with an enterable interior, bed rest, and workbench/stash.
- Three-quest arc:
  1. **Valley Survey** — collect Crystal Shards.
  2. **Marsh Cleansing** — defeat Slimes.
  3. **Raise Your House** — collect Wood + Stone.
- Stone resource nodes.
- More in-world NPCs: quest givers, merchant, innkeeper with roaming idle behavior.

### Changed
- NPC placement adjusted so the first interact naturally triggers Quest 1 with Elder Nira.

### Fixed
- Pointer-lock request guarded for headless/automation contexts (no `WrongDocumentError`).

---

## [0.2.0] — Graphics Overhaul

### Added
- DDA-based raycasting for cleaner wall projection and stable texture sampling.
- Procedural stone and water wall textures with side-based darkening and distance fog.
- Dynamic sky gradient with sun glow, layered mountain ridges, and ground depth lines.
- Shaped billboard sprites for NPCs, slimes, trees, crystals, and cache chest.
- First-person sword overlay with movement bob and attack swing response.

### Changed
- Switched UI typography to classic RPG fonts (`Palatino`/`Georgia`).

---

## [0.1.0] — Initial Prototype

### Added
- Single-player 3D sandbox RPG in plain HTML/JS (`index.html`, `game.js`).
- First-person raycast 3D renderer.
- RPG systems: HP, XP, leveling, inventory, potions.
- Quest system, NPC interaction, enemy AI, combat, and resource harvesting.
- Loot chest, HUD, minimap, and text-state hooks.
- Automation hooks: `window.render_game_to_text` and `window.advanceTime(ms)`.
- Multi-language support: `en`, `es`, `pt`, `fr`, `de`, `it`, `ja`, `tr`.
