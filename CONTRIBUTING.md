# Contributing to WestWardRPG

Thanks for contributing.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start local server:
   ```bash
   npm run start
   ```
3. Open:
   - http://127.0.0.1:5173/index.html

## Before Opening a PR

- Run the full QA gate (lint + functional smoke suite):
  ```bash
  npm run qa
  ```
- Or at minimum run syntax checks:
  ```bash
  npm test
  ```
- Keep changes focused and small when possible.
- Avoid unrelated formatting-only edits.

## Code Guidelines

- Preserve existing gameplay behavior unless your change intentionally modifies it.
- Keep UI text compatible with the language system (`en`, `es`, `pt`, `fr`, `de`, `it`, `ja`, `tr`).
- When adding user-facing strings, add translations for all 8 supported languages in the `LANGUAGE_PACKS` object in `game.js`.
- Prefer clear variable names over short abbreviations.
- Keep deterministic hooks working:
  - `window.advanceTime(ms)`
  - `window.render_game_to_text()`

## Testing Gameplay Changes

You can run a scenario with:

```bash
node ./web_game_playwright_client.mjs \
  --url http://localhost:5173/index.html \
  --actions-file ./test-actions/realism_smoke.json \
  --click-selector "#start-btn" \
  --iterations 1 \
  --pause-ms 200 \
  --screenshot-dir output/web-game-smoke
```

## Reporting Issues

When filing an issue, include:

- Expected behavior
- Actual behavior
- Reproduction steps
- Browser + OS
- Relevant output JSON from `output/` when available
