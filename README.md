# WestWardRPG

Single-player first-person sandbox RPG prototype built in plain HTML + JavaScript.

## What It Includes

- First-person raycast renderer with dynamic weather and day/night lighting
- Sword combat with combo swings, block, stamina, and enemy AI
- Quest progression with NPC interactions, harvesting, and rewards
- House unlock flow with interior interactions (rest, stash/workbench)
- Save/load support via localStorage
- Deterministic test hooks: `window.advanceTime(ms)` and `window.render_game_to_text()`

## Controls

- Move: `WASD` or Arrow keys
- Look: Mouse (after click/pointer lock) or Arrow Left/Right
- Attack: Left Mouse or `Space`
- Block: Right Mouse or `C`
- Interact: `E` or `Enter`
- Potion: `Q`
- Quick Save / Load: `K` / `L`
- Toggle Minimap: `M`
- Fullscreen: `F`

## Quick Start

Requirements:

- Node.js 16+ (project uses Playwright dependency)
- Python 3 (for local static server)

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run start
```

Open:

- [http://127.0.0.1:5173/index.html](http://127.0.0.1:5173/index.html)

## Validation

Syntax check:

```bash
npm test
```

Playwright automation client (example):

```bash
node ./web_game_playwright_client.mjs \
  --url http://localhost:5173 \
  --actions-file ./test-actions/quest_flow.json \
  --click-selector "#start-btn" \
  --iterations 2 \
  --pause-ms 250 \
  --screenshot-dir output/web-game-quest
```

## Repo Info

- Repository: [https://github.com/coleyrockin/WestWardRPG](https://github.com/coleyrockin/WestWardRPG)
- Issues: [https://github.com/coleyrockin/WestWardRPG/issues](https://github.com/coleyrockin/WestWardRPG/issues)

## Project Structure

- `/index.html` UI shell and menu
- `/game.js` main game logic, rendering, AI, quests, and state hooks
- `/web_game_playwright_client.mjs` automation driver for game actions/screenshots
- `/test-actions/` canned action payloads used by automation runs
- `/output/` generated screenshots and state captures
- `/progress.md` development log and handoff notes
