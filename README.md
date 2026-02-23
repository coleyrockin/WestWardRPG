# WestWardRPG

![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=000)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?logo=html5&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-Utility-3178C6?logo=typescript&logoColor=fff)
![Python](https://img.shields.io/badge/Python-Tooling-3776AB?logo=python&logoColor=fff)
![Playwright](https://img.shields.io/badge/Tested%20With-Playwright-2EAD33?logo=playwright&logoColor=fff)
![License](https://img.shields.io/badge/License-ISC-blue)

**WestWardRPG** is a browser-first, single-player 3D RPG sandbox set in the frontier world of *Dustward*. It features a DDA raycaster renderer, first-person sword combat, a three-quest progression arc, dynamic day/night weather, and a cast of comically chaotic western pigs — all built with zero frameworks so the logic stays transparent and hackable.

> *"A first-person browser RPG where steel clashes, quests chain together, and outlaw pigs occasionally steal the spotlight."*

## Gameplay Preview

<p align="center">
  <img src="docs/images/gameplay-preview.jpg" alt="WestWardRPG gameplay preview in first-person mode" width="960">
</p>

*In-game valley scene showing HUD, minimap, first-person sword, and textured raycasted walls.*

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Controls](#controls)
- [Quick Start](#quick-start)
- [Testing & Validation](#testing--validation)
- [Project Layout](#project-layout)
- [Language Support](#language-support)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

## Features

| Category | Details |
|---|---|
| **Rendering** | DDA raycaster, procedural textures (stone, water, timber, plaster), fog, weather overlays, minimap |
| **Combat** | 3-hit combo chains, block timing, stamina drain, enemy stagger & knockback, death/recovery |
| **Progression** | XP/level curve, gold economy, health potions, resource harvesting (crystals, wood, stone) |
| **Quest Arc** | Three-act chain: Valley Survey → Marsh Cleansing → Raise Your House |
| **Settlement** | Seven NPCs (quest givers, merchant, innkeeper, bard, cat), eight western pig roles with flocking AI |
| **Atmosphere** | Dynamic weather (clear/mist/rain/storm), day/night cycle, lightning, ambient sounds via Web Audio API |
| **Persistence** | Quick save/load (`K`/`L`), 30-second autosave, `Continue Journey` button on the main menu |
| **i18n** | Eight languages selectable from the main menu; preference saved in `localStorage` |
| **Automation** | `window.advanceTime(ms)` and `window.render_game_to_text()` hooks for deterministic Playwright testing |

## Tech Stack

| Language | Role |
|---|---|
| **JavaScript** | Core game loop, DDA renderer, combat, AI, quest logic, save/load (`game.js`) |
| **TypeScript** | Typed atmosphere math module (`atmosphere.ts`) compiled to `atmosphere.js` |
| **HTML5 / CSS** | Canvas shell, first-person menu, HUD structure, responsive styling (`index.html`) |
| **Python** | Scenario state snapshot reports (`scripts/state_report.py`) |
| **Shell** | Dev automation — dependency check, lint, full pipeline (`scripts/dev_tools.sh`) |
| **Ruby** | Asset bundling and manifest generation with checksums (`scripts/asset_bundler.rb`) |
| **Perl** | Output log analysis and statistics (`scripts/log_analyzer.pl`) |
| **PHP** | Web server config generator (nginx / Apache / Caddy) (`scripts/config_generator.php`) |
| **Go** | High-performance map JSON validation (`scripts/map_validator.go`) |
| **Rust** | Texture data analysis tool (`scripts/texture_analyzer.rs`) |
| **JSON** | Deterministic test-action scripts for Playwright automation (`test-actions/*.json`) |

## Controls

| Action | Key / Input |
|---|---|
| Move | `WASD` or Arrow keys |
| Look | Mouse (pointer lock) or `←` / `→` |
| Sprint | `Shift` (drains stamina) |
| Attack | Left Mouse or `Space` (3-hit combo) |
| Block | Right Mouse or `C` |
| Interact / Shop | `E` or `Enter` |
| Use Potion | `Q` |
| Quick Save / Load | `K` / `L` |
| Toggle Map | `M` |
| Toggle Sound | `N` |
| Fullscreen | `F` |
| Recover (after death) | `R` |

## Quick Start

### Requirements

- Node.js 16+
- Python 3 (used as the local dev server)

### Install

```bash
npm install
```

### Run

```bash
npm run start
```

Open in your browser:

- [http://127.0.0.1:5173/index.html](http://127.0.0.1:5173/index.html)
- [http://localhost:5173/index.html](http://localhost:5173/index.html) *(alias)*
- [http://[::1]:5173/index.html](http://[::1]:5173/index.html) *(IPv6 fallback)*

## Testing & Validation

### One-Command QA Gate

```bash
npm run qa
```

Runs lint/type/syntax checks and a multi-scenario functional smoke suite (movement, quest pathing, combat/block flow). Artifacts are saved under `output/qa-smoke-<timestamp>/`.

### Individual Commands

```bash
# JS/TS syntax check
npm test

# TypeScript type check
npm run typecheck:ts

# Functional smoke suite only
npm run test:smoke

# Scenario state report (Python)
npm run report:states
```

### Development Pipeline (Shell)

```bash
npm run dev:check    # verify required dependencies
npm run dev:lint     # syntax + type checks
npm run dev:full     # check → lint → build → test
```

### Scripting Utilities

```bash
# Asset manifest with checksums (Ruby)
npm run bundle:assets
npm run verify:assets

# Log analysis (Perl)
npm run analyze:logs

# Server config generation (PHP)
npm run config:nginx
npm run config:apache

# Map validation (Go — requires Go installed)
go run scripts/map_validator.go <map-file.json>

# Texture analysis (Rust — requires Rust installed)
rustc scripts/texture_analyzer.rs -o texture_analyzer
./texture_analyzer <texture-data-file>
```

### Example Playwright Scenario

```bash
node ./web_game_playwright_client.mjs \
  --url http://localhost:5173/index.html \
  --actions-file ./test-actions/quest_flow.json \
  --click-selector "#start-btn" \
  --iterations 2 \
  --pause-ms 250 \
  --screenshot-dir output/web-game-quest
```

## Project Layout

```
WestWardRPG/
├── index.html                  # Game shell, main menu, HUD, language selector
├── game.js                     # All core systems: renderer, combat, AI, quests, saves
├── atmosphere.ts               # TypeScript source for sky/weather math module
├── atmosphere.js               # Compiled atmosphere module loaded by the game
├── web_game_playwright_client.mjs  # Playwright automation runner for scenario testing
├── tsconfig.json               # TypeScript compiler configuration
├── package.json                # npm scripts and dependency manifest
├── scripts/
│   ├── smoke_suite.sh          # End-to-end multi-scenario QA smoke runner
│   ├── dev_tools.sh            # Dev automation (check, lint, build, test pipeline)
│   ├── state_report.py         # Python scenario snapshot report generator
│   ├── asset_bundler.rb        # Ruby asset manifest builder with checksums
│   ├── log_analyzer.pl         # Perl output log statistics tool
│   ├── config_generator.php    # PHP web server config generator
│   ├── map_validator.go        # Go map JSON structure validator
│   └── texture_analyzer.rs     # Rust texture data analysis tool
├── test-actions/               # JSON scripted gameplay action sets for automation
├── docs/                       # Repository documentation assets
└── output/                     # Playwright screenshots and JSON state snapshots (gitignored)
```

## Language Support

Select a language from the in-game main menu. Your preference is saved in `localStorage`.

| Code | Language |
|---|---|
| `en` | English |
| `es` | Español |
| `pt` | Português |
| `fr` | Français |
| `de` | Deutsch |
| `it` | Italiano |
| `ja` | 日本語 |
| `tr` | Türkçe |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code guidelines, and how to run gameplay scenarios before opening a pull request.

Quick contribution workflow:

```bash
npm install          # install dependencies
npm run dev:lint     # verify your changes pass syntax and type checks
npm test             # run the baseline syntax gate
```

Please keep changes focused, preserve existing gameplay behavior, and ensure the deterministic hooks (`window.advanceTime`, `window.render_game_to_text`) remain functional.

## Roadmap

Potential improvements and next steps for the project:

- **Sprite art pass** — replace abstract billboard sprites with pixel-art character art for NPCs, enemies, and pigs.
- **Additional quest content** — expand beyond the 3-quest arc with side quests, bounty board, and repeatable content.
- **Inventory UI** — dedicated inventory screen with item tooltips rather than HUD-only counters.
- **Expanded shop** — more item types, weapon upgrades, and equipment slots.
- **Enemy variety** — add enemy types beyond slimes with distinct behaviors (e.g., ranged, armored).
- **Sound design** — replace procedural Web Audio tones with sampled sound effects and background music.
- **Mobile support** — touch controls for tablet/phone play.
- **Difficulty settings** — configurable enemy speed, damage multipliers, and stamina drain.

## License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

---

- Repo: [https://github.com/coleyrockin/WestWardRPG](https://github.com/coleyrockin/WestWardRPG)
- Issues: [https://github.com/coleyrockin/WestWardRPG/issues](https://github.com/coleyrockin/WestWardRPG/issues)
