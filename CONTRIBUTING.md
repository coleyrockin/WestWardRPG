# Contributing to WestWardRPG

Thanks for taking the time to contribute! Please read this guide before opening a PR.

---

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/coleyrockin/WestWardRPG.git
   cd WestWardRPG
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local server:**
   ```bash
   npm run start
   ```

4. **Open in your browser:**
   - [http://127.0.0.1:5173/index.html](http://127.0.0.1:5173/index.html)
   - Alternatives: `localhost:5173` or `[::1]:5173`

---

## Before Opening a PR

Run all checks and make sure they pass:

```bash
npm test         # JavaScript & Playwright client syntax check
npm run dev:lint # JS + TS + Python linters
```

Or run everything at once:

```bash
npm run qa       # lint + multi-scenario functional smoke suite
```

- Keep changes focused and small.
- Avoid unrelated formatting-only edits.
- Update `CHANGELOG.md` under `[Unreleased]` with a brief description of your change.

---

## Code Guidelines

- **Preserve gameplay behavior** unless your change intentionally modifies it.
- **Keep UI text compatible** with the language system. String additions should be added to all `LANGUAGE_PACKS` keys in `game.js` (`en`, `es`, `pt`, `fr`, `de`, `it`, `ja`, `tr`).
- **Prefer clear variable names** over short abbreviations.
- **Keep deterministic hooks working** — these are relied on by the automation test suite:
  - `window.advanceTime(ms)`
  - `window.render_game_to_text()`

---

## Testing Gameplay Changes

Run a single scenario to visually validate your change:

```bash
node ./web_game_playwright_client.mjs \
  --url http://localhost:5173/index.html \
  --actions-file ./test-actions/realism_smoke.json \
  --click-selector "#start-btn" \
  --iterations 1 \
  --pause-ms 200 \
  --screenshot-dir output/web-game-smoke
```

Screenshots and state JSON are saved to the `output/` directory for review.

For a full multi-scenario QA run:

```bash
npm run test:smoke
```

---

## Reporting Issues

When filing an issue, please include:

- **Expected behavior**
- **Actual behavior**
- **Reproduction steps**
- **Browser + OS**
- Relevant output JSON from `output/` if available

