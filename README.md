# WestWardRPG

![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=000)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?logo=html5&logoColor=fff)
![Playwright](https://img.shields.io/badge/Tested%20With-Playwright-2EAD33?logo=playwright&logoColor=fff)

Single-player first-person sandbox RPG built with plain HTML + JavaScript.

## Why This Repo Shines

- Fast, framework-free raycast 3D renderer.
- Crunchy melee combat: combo swings, block timing, stamina pressure.
- Full quest loop: gather, fight, craft, build your house.
- Dynamic atmosphere: day/night cycle + weather states.
- Save/load + autosave for longer play sessions.
- Built-in **multi-language support**: English, Español, Português.
- Automation hooks for deterministic testing and Playwright action runs.

## Gameplay Features

- **World & Rendering**: textured raycast walls, fog, weather overlays, minimap.
- **Combat**: attack chains, enemy pursuit, hit reactions, death/recovery flow.
- **Progression**: XP/level curve, gold economy, potions, resource harvesting.
- **Quest Arc**: 3-step progression from survey → cleanse marsh → build house.
- **Settlement Life**: NPC interactions, shop, inn vibes, bard lines, pig chaos.

## Language Support

Use the language selector in the main menu.

- `English` (`en`)
- `Español` (`es`)
- `Português` (`pt`)

Language preference is persisted in localStorage.

## Controls

- Move: `WASD` or Arrow keys
- Look: Mouse (pointer lock) or Arrow Left/Right
- Attack: Left Mouse or `Space`
- Block: Right Mouse or `C`
- Interact: `E` or `Enter`
- Use Potion: `Q`
- Quick Save / Load: `K` / `L`
- Toggle Map: `M`
- Toggle Sound: `N`
- Fullscreen: `F`

## Quick Start

### Requirements

- Node.js 16+
- Python 3

### Install

```bash
npm install
```

### Run

```bash
npm run start
```

Open: [http://127.0.0.1:5173/index.html](http://127.0.0.1:5173/index.html)

## Testing & Validation

### Syntax Check

```bash
npm test
```

### Example Playwright Scenario

```bash
node ./web_game_playwright_client.mjs \
  --url http://localhost:5173 \
  --actions-file ./test-actions/quest_flow.json \
  --click-selector "#start-btn" \
  --iterations 2 \
  --pause-ms 250 \
  --screenshot-dir output/web-game-quest
```

## Project Layout

- `index.html` - game shell, menu UI, language selector
- `game.js` - core systems (rendering, combat, AI, quests, saves)
- `web_game_playwright_client.mjs` - automation runner for scenarios/screenshots
- `test-actions/` - scripted gameplay action sets
- `output/` - captured screenshots + JSON snapshots from runs
- `progress.md` - development log and iteration notes

## Repository Links

- Repo: [https://github.com/coleyrockin/WestWardRPG](https://github.com/coleyrockin/WestWardRPG)
- Issues: [https://github.com/coleyrockin/WestWardRPG/issues](https://github.com/coleyrockin/WestWardRPG/issues)
