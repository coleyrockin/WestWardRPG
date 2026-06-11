# Contributing to WestWard

Thanks for contributing.

## Development Setup

1. Use Node.js 22, matching CI.
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   Then open the printed URL — the game boots at `/`. (HMR is broken in the game
   page; hard-reload with `location.href = '/?n=' + Date.now()`.)

## Before Opening a PR

- Run the gate:
  ```bash
  npx vitest run
  npx tsc --noEmit
  npx vite build
  ```
- With a dev server running, the browser gates:
  ```bash
  WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d   # first-road loop smoke
  WESTWARD_URL=http://127.0.0.1:5180 npm run test:visual     # golden-image gate
  ```
- Keep changes focused and small when possible; avoid formatting-only edits.

## Code Guidelines

- Preserve existing gameplay behavior unless your change intentionally modifies it.
- Prefer clear variable names over short abbreviations.
- Build DOM UI with `createElement`/`textContent` only — the security test scans
  for parser sinks (`boardDom.js` is the pattern).
- Engine modules in `src/` are pure and unit-tested — extend them, don't
  reimplement. See `CLAUDE.md` for the full guardrail list (layout floors, the
  golden baseline, HERO_OBJECTS).

## Reporting Issues

Include: expected behavior, actual behavior, reproduction steps, browser + OS.
