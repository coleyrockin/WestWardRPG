# Contributing to WestWardRPG

Thanks for your interest in contributing! This guide covers how to get set up, what to expect from the codebase, and what to do before opening a pull request.

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/coleyrockin/WestWardRPG.git
cd WestWardRPG
npm install
```

### 2. Start the dev server

```bash
npm start
```

Open [http://127.0.0.1:5173/index.html](http://127.0.0.1:5173/index.html) in your browser.

### 3. Make your changes

All game logic lives in `game.js`. Atmosphere math is in `atmosphere.ts` (compiled to `atmosphere.js`). The HTML shell is `index.html`.

---

## Before Opening a Pull Request

Run the following checks locally and make sure they all pass:

```bash
# Syntax check (required)
npm test

# TypeScript type check (if you touched atmosphere.ts)
npm run typecheck:ts

# Full lint + smoke suite (recommended)
npm run qa
```

If you changed gameplay behavior, also run at least one Playwright scenario to confirm nothing regressed:

```bash
node ./web_game_playwright_client.mjs \
  --url http://localhost:5173/index.html \
  --actions-file ./test-actions/realism_smoke.json \
  --click-selector "#start-btn" \
  --iterations 1 \
  --pause-ms 200 \
  --screenshot-dir output/contrib-smoke
```

---

## Code Guidelines

- **Preserve gameplay behavior** unless your change intentionally modifies it.
- **Keep changes focused** — avoid unrelated formatting-only edits in the same PR.
- **Use clear variable names** over short abbreviations.
- **Stay compatible with the i18n system** — any new UI text must be added to all 8 language packs in `game.js` (`LANGUAGE_PACKS`).
- **Keep deterministic hooks working:**
  - `window.advanceTime(ms)` — advances the game clock without a real frame loop
  - `window.render_game_to_text()` — returns a JSON snapshot of current game state

---

## Codebase Overview

| File | What it contains |
|---|---|
| `game.js` | Entire game engine: renderer, combat, AI, quests, weather, saves, i18n |
| `atmosphere.ts` | TypeScript module for sky color math (day/night + storm blending) |
| `index.html` | Canvas mount, main menu markup, language selector |
| `web_game_playwright_client.mjs` | CLI Playwright runner for scenario-based automated testing |
| `test-actions/*.json` | Declarative action scripts consumed by the Playwright runner |
| `scripts/` | Multi-language dev and deployment utilities — see `scripts/README.md` |

---

## Reporting Issues

When filing a bug report, include:

- **Expected behavior**
- **Actual behavior**
- **Reproduction steps**
- **Browser + OS**
- Relevant output JSON from `output/` (if you ran a Playwright scenario)

Open an issue at: [https://github.com/coleyrockin/WestWardRPG/issues](https://github.com/coleyrockin/WestWardRPG/issues)
