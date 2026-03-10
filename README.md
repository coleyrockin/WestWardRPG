# WestWardRPG

![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=000)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?logo=html5&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-Utility-3178C6?logo=typescript&logoColor=fff)
![Python](https://img.shields.io/badge/Python-Tooling-3776AB?logo=python&logoColor=fff)
![Playwright](https://img.shields.io/badge/Tested%20With-Playwright-2EAD33?logo=playwright&logoColor=fff)
![License](https://img.shields.io/badge/License-ISC-blue)

A browser-first, first-person RPG sandbox built on plain web technology — no frameworks, no build step required.
Explore a dusty western world with raycast 3D rendering, melee sword combat, dynamic weather, a three-quest story arc, save/load persistence, and eight languages.
Pigs roam freely and occasionally cause chaos.

> *"A first-person browser RPG where steel clashes, quests chain together, and pigs occasionally steal the spotlight."*

---

## Gameplay Preview

<p align="center">
  <img src="docs/images/gameplay-preview.jpg" alt="WestWardRPG action scene with sword combat HUD, minimap, NPCs, and roaming outlaw pigs" width="960">
</p>

<p align="center">
  <img src="docs/images/pig-herd.png" alt="Western-themed pig herd near town" width="460">
  <img src="docs/images/pig-chaos.png" alt="Pig stampede chaos scene" width="460">
</p>

---

## Features

| Category | Highlights |
|---|---|
| **Rendering** | DDA raycast engine, procedural stone/water textures, fog, weather overlays, minimap |
| **Combat** | First-person sword, 3-hit combo, stamina costs, block/parry, enemy pursuit AI |
| **Progression** | XP/leveling, gold economy, potions, resource harvesting |
| **Quests** | Three-step arc: Valley Survey → Marsh Cleansing → Build Your House |
| **World** | Day/night cycle, dynamic weather (clear/mist/rain/storm), interior spaces |
| **Persistence** | Manual save/load (`K`/`L`), `Continue Journey` menu button, 30-second autosave |
| **Localization** | 8 languages: English, Español, Português, Français, Deutsch, Italiano, 日本語, Türkçe |
| **Testing** | Playwright automation client, deterministic action scripts, multi-scenario smoke suite |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Core game | Vanilla JavaScript (ES2020) |
| Rendering | HTML5 Canvas 2D API |
| Atmosphere module | TypeScript (`atmosphere.ts`) compiled to `atmosphere.js` |
| Dev server | Python 3 `http.server` |
| Automation testing | Node.js + Playwright |
| Dev tooling | Bash, Python, Ruby, Perl, PHP, Go, Rust (all optional) |

---

## Quick Start

### Requirements

- **Node.js** 16+
- **Python 3** (used as the local dev server)

### Install

```bash
npm install
```

### Run

```bash
npm run start
```

Open your browser to [http://127.0.0.1:5173/index.html](http://127.0.0.1:5173/index.html)

> **Tip:** If `127.0.0.1` is unavailable, try [http://localhost:5173/index.html](http://localhost:5173/index.html) or [http://[::1]:5173/index.html](http://[::1]:5173/index.html).

---

## Controls

| Action | Keys |
|---|---|
| Move | `WASD` or Arrow keys |
| Look | Mouse (pointer lock) or `←` / `→` |
| Attack | Left Mouse or `Space` |
| Block | Right Mouse or `C` |
| Interact | `E` or `Enter` |
| Use Potion | `Q` |
| Quick Save | `K` |
| Quick Load | `L` |
| Toggle Map | `M` |
| Toggle Sound | `N` |
| Fullscreen | `F` |

---

## Testing & Validation

### One-Command QA Gate

```bash
npm run qa
```

Runs syntax/type/lint checks plus a multi-scenario functional smoke suite (movement, quest pathing, combat/block flow).
Artifacts are saved under `output/qa-smoke-<timestamp>/`.

### Syntax Check

```bash
npm test
```

### TypeScript Check

```bash
npm run typecheck:ts
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

### Other Dev Scripts

```bash
npm run dev:check      # Check required dependencies
npm run dev:lint       # Run all linters (JS, TS, Python)
npm run dev:full       # Full pipeline: check → lint → build → test

npm run report:states  # Scenario state report (Python)
npm run bundle:assets  # Generate asset manifest with checksums (Ruby)
npm run verify:assets  # Verify asset integrity (Ruby)
npm run analyze:logs   # Analyze output logs (Perl)
npm run config:nginx   # Generate nginx config (PHP)
npm run config:apache  # Generate Apache config (PHP)
```

See [`scripts/README.md`](scripts/README.md) for full documentation on each utility script.

---

## Project Layout

```
WestWardRPG/
├── index.html                    # Game shell, menu UI, language selector
├── game.js                       # Core systems: rendering, combat, AI, quests, saves
├── atmosphere.ts                 # TypeScript source for atmosphere/sky math module
├── atmosphere.js                 # Compiled JS atmosphere module (loaded by index.html)
├── web_game_playwright_client.mjs # Playwright automation runner for scenario testing
├── tsconfig.json                 # TypeScript compiler config
├── package.json                  # npm scripts and dependencies
├── docs/
│   └── images/                   # Screenshots and gameplay previews
├── scripts/                      # Utility scripts (Python, Go, Rust, Ruby, Shell, Perl, PHP)
│   └── README.md                 # Per-script usage documentation
├── test-actions/                 # Scripted gameplay action sets (JSON) for automation
├── test-data/                    # Sample data files for script testing
├── CHANGELOG.md                  # Version history and notable changes
├── ROADMAP.md                    # Planned features and future improvements
└── CONTRIBUTING.md               # Contribution guide
```

---

## Future Improvements

See [ROADMAP.md](ROADMAP.md) for a full list. Highlights:

- Ranged combat (bow/throwables) and additional enemy types.
- Sprite art pass to replace abstract billboards.
- Background music and ambient sound effects.
- Procedurally generated dungeons.
- PWA support for offline play.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code guidelines, and how to run test scenarios before opening a PR.

---

## License

[ISC](https://opensource.org/licenses/ISC) © [coleyrockin](https://github.com/coleyrockin)

---

## Links

- Repository: [https://github.com/coleyrockin/WestWardRPG](https://github.com/coleyrockin/WestWardRPG)
- Issues: [https://github.com/coleyrockin/WestWardRPG/issues](https://github.com/coleyrockin/WestWardRPG/issues)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
