# Contributing to WestWardRPG

Thank you for contributing to WestWardRPG! This guide covers how to set up the project, what to check before opening a PR, and how to run gameplay scenarios for validation.

## Development Setup

1. **Clone the repo and install dependencies:**
   ```bash
   git clone https://github.com/coleyrockin/WestWardRPG.git
   cd WestWardRPG
   npm install
   ```

2. **Start the local dev server:**
   ```bash
   npm run start
   ```

3. **Open the game in your browser:**
   - http://127.0.0.1:5173/index.html
   - http://localhost:5173/index.html *(alias)*

## Before Opening a PR

Run all checks to confirm your changes don't break anything:

```bash
# Syntax and type check
npm test
npm run typecheck:ts

# Full lint pipeline
npm run dev:lint

# End-to-end smoke suite (requires Playwright + a running browser)
npm run test:smoke
```

Keep changes focused and small when possible. Avoid unrelated formatting-only edits.

## Code Guidelines

- Preserve existing gameplay behavior unless your change intentionally modifies it.
- Keep all UI text compatible with the i18n system — add new strings to every language pack in `game.js` (keys: `en`, `es`, `pt`, `fr`, `de`, `it`, `ja`, `tr`).
- Use the `fmt()` helper (with `{key}` tokens) for template strings in `npcDialogue` entries — do not use JavaScript template literal syntax (`${}`).
- Prefer clear variable names over short abbreviations.
- Keep the deterministic automation hooks working:
  - `window.advanceTime(ms)` — advances the game clock by `ms` milliseconds.
  - `window.render_game_to_text()` — returns a JSON string snapshot of game state.

## File Overview

| File | Purpose |
|---|---|
| `game.js` | All core systems: DDA renderer, combat, AI, quest logic, save/load |
| `atmosphere.ts` / `atmosphere.js` | TypeScript sky/weather math module; edit `.ts`, then run `npm run typecheck:ts` |
| `index.html` | Canvas shell, main menu HTML/CSS |
| `web_game_playwright_client.mjs` | Playwright automation runner |
| `test-actions/*.json` | Scripted action sequences for smoke testing |
| `scripts/` | Supporting tooling in Python, Ruby, Perl, PHP, Go, Rust, Shell |

## Testing Gameplay Changes

Run a quick scenario before submitting:

```bash
node ./web_game_playwright_client.mjs \
  --url http://localhost:5173/index.html \
  --actions-file ./test-actions/realism_smoke.json \
  --click-selector "#start-btn" \
  --iterations 1 \
  --pause-ms 200 \
  --screenshot-dir output/web-game-smoke
```

Check that:
- No `errors-*.json` file appears in the output directory.
- At least one `state-*.json` snapshot is produced.
- Screenshots look correct.

## Reporting Issues

When filing an issue, include:

- **Expected behavior** — what should happen.
- **Actual behavior** — what happened instead.
- **Reproduction steps** — minimal steps to reproduce the bug.
- **Browser + OS** — e.g., Chrome 124 / macOS 14.
- **State snapshot** — the relevant `output/*/state-*.json` file if available.
