# WestWardRPG Execution Roadmap

Single source of truth. Do not create parallel `TODO.md`, `PLAN.md`, `ROADMAP-*.md`,
or another roadmap file.
This document is for planning and coordination only and includes no gameplay
feature implementation details.

Last updated: `2026-05-26`
Branch: `main`

## 1. Project Summary

WestWardRPG is a browser RPG prototype with a large systems backbone already in place:
job boards/quests, deterministic save/reload, gear and crafting foundations,
housing/workbench loops, NPC memory, POI/loot systems, run summaries, and
strong smoke/visual testing coverage.

Its current execution risk is no longer "core systems missing" but "presentation and
delivery polish plus maintainer readiness." The first objective is to make the
repo understandable, auditable, and safe for the next agent before new systems.

## 2. Current Product Vision

Deliver a compact, polished first five-to-ten minute frontier RPG slice with:

- Obvious first objective and road direction.
- Stable first-run UX from run start → job objective → combat encounter → meaningful
  return loop.
- Deterministic, inspectable systems for easy playtest and deterministic debugging.
- A stronger visual/polish identity without introducing unmanaged engine migration risk.

## 3. Target Users

1. Recruiters and hiring managers evaluating engineering depth.
2. Human playtesters expecting a short but coherent game loop.
3. Future agents continuing the build from a clear and stable baseline.
4. Portfolio viewers who may not understand the implementation details but
   can judge scope and quality from docs and scripts.

## 4. Current Strengths

- Strong test coverage in repository (`91` files, `1057` tests passing).
- Deterministic browser-test contract (`window.render_game_to_text`, smoke actions).
- Clear domain feature ownership across jobs, loot, gear, housing, NPC memory, save,
  and route logic.
- CI pipeline already includes typecheck/lint/tests/build/smoke/visual pass.
- Existing release artifact workflow (`npm run package:itch`) and deploy config
  (`vercel.json`).
- Solid screenshot/test evidence surface under `output/` and `tests/`.

## 5. Current Weaknesses

- Visual direction is still heavily debated and can feel inconsistent across
  commits, especially in first-minute readability.
- Documentation and code are currently denser than the actual public narrative:
  some files describe old direction and some command notes are stale.
- Smoke tests are hard to run in this environment because local server startup is
  constrained (EPERM on port binding).
- `src/main.js` is very large and is a known risk concentration point.
- Security hardening exists, but CSP and inline script posture still need tighter
  alignment for production review quality.

## 6. Current Verification Status

Executed in this repo state before documentation edits:

| Command | Result | Summary |
| --- | --- | --- |
| `npm run dev:lint` | **Pass** | JS/TS/Python syntax checks passed, dependencies found |
| `npm test` | **Pass** | `91` files, `1057` tests passed |
| `npm run test:syntax` | **Pass** | `web_game_playwright_client.mjs`, visual smoke scripts valid |
| `npm run build` | **Pass** | `vite` build successful |
| `npm run test:smoke` | **Fail** | Server failed to start on default port (`EPERM` 5173) |
| `WESTWARD_PORT=5211 npm run test:smoke` | **Fail** | Server failed to start on explicit port (`EPERM`) |

Recommended next-agent action: run smoke against an explicitly controllable
environment (or document the port-binding constraint and include pre-flight checks
in test scripts).

## 7. Current Completion Status

### Completed/Stable

- Core systems baseline + deterministic flows.
- Test framework and smoke/visual tooling.
- Three.js spike entrypoint present (`render3d.html`) while preserving Canvas as
  gameplay reference.
- Save migration v3 and run-state snapshots in code/tests.

### In-Progress / Not Finished

- Final visual quality and readability pass for first-five-minute presentation.
- Recruiter-facing presentation polish (README clarity, roadmap confidence, entry
  path).
- Playbook quality for "agent handoff without ambiguity."
- Controlled hardening of browser debug/testing global surface.

## 8. Production Readiness Scorecard

- **Code behavior:** good (existing tests pass in app scope)
- **Playability:** partial (first-road loops are present; visual quality and first
  objective hierarchy still need polish)
- **Documentation readiness:** medium (strong base docs, but drift and stale claims)
- **Security posture:** partial (no critical findings, but CSP inline script debt and
  debug surface could be tightened)
- **Operational readiness:** medium (automation exists, but smoke needs deterministic
  local startup path)

## 9. Architecture Recommendations

- Keep the current **Canvas renderer + 3D spike** model as a reference/experimental
  split until parity proof is written.
- Treat `src/main.js` as the bootstrap/orchestration file for now; avoid a full
  split until roadmap items require it.
- Preserve pure helper/testability boundaries around:
  `gameFeel`, `jobBoard`, `firstRoadMemory`, `interactionPrompt`,
  `render_game_to_text` payload, and save migration helpers.
- Add docs-level dependency maps (system → tests → file owners) in this roadmap.

## 10. Refactor Recommendations (Documentation-Led, No App Refactor Now)

1. **Do not refactor gameplay systems yet.**
   The next push is planning/housekeeping; technical refactors belong to a
   later milestone after the roadmap is stabilized.
2. **Introduce "system ownership matrix."**
   One short entry per critical subsystem with owner, tests, data contract, and
   risk notes.
3. **Create explicit documentation checkpoints.**
   Every subsystem page should list: "how it behaves", "what it depends on", and
   "what breaks if changed."
4. **Keep runtime logic untouched.**
   This roadmap commit stays on docs only.

## 11. UI and UX Recommendations (non-implementation planning)

- Define a public-facing "first-play flow" and map every required UI state to one
  text source (`HUD`, `job board`, `prompt`, `summary`, `house/job reaction`).
- Keep the opening HUD objective as the top cognitive load; avoid duplicated
  mission states.
- Validate controls and objective clarity on small viewport as part of current
  smoke/test documentation.
- Add explicit UX review checklist fields:
  1. Can a player read first objective in 10s?
  2. Can they identify next danger in 15s?
  3. Can they understand reward consequence before combat ends?

## 12. Performance Recommendations

- Keep `main.js` risk concentration documented: record hotspots and known
  non-blocking responsibilities.
- Track build size warnings (`vite` chunk >500 KB) as a long-term milestone item:
  acceptable now, but not ignored.
- Add `render3d` inclusion policy in docs: when to build it, when to ignore it in
  local runs, and expected runtime cost.

## 13. Security Recommendations

- Inline script cleanup:
  - Move inline scripts in `index.html` into external modules or add strict CSP
    and nonce strategy.
- Debug globals (`window.advanceTime`, `window.render_game_to_text`) should remain
  test-accessible but explicitly documented and gated for non-production use.
- Keep all local save migration and recovery logic defensive and reject malformed
  payloads with explicit error states.
- Keep third-party dependencies explicit and avoid adding new external runtime calls.

## 14. Accessibility Recommendations

- Document keyboard-only mission flow and focus order in README/roadmap.
- Add explicit reduced-motion and text contrast checks to verification checklist.
- Audit ARIA and control labels for mission-critical UI: board dialog, job board,
  route marker copy, and recovery controls.
- Ensure onboarding text has the same semantic meaning across locales.

## 15. SEO / Public Visibility Recommendations

- Keep Open Graph metadata consistent with deployed URL and actual features.
- Add explicit public screenshot path references that do not require local build
  assumptions.
- Update README "demo link" and deployment link only if consistently valid.

## 16. Testing Strategy

### Required before changing docs only

- `npm run dev:lint`
- `npm test`
- `npm run typecheck:ts`
- `npm run test:syntax`
- `npm run build`

### Required before code changes in next milestone

- Smoke proof at explicit port once server startup constraint is controlled.
- Visual proof checklist and `npm run test:visual:review`.
- At least one browser QA pass with first-road objective + reward + return path visible.

## 17. CI/CD and Deployment Recommendations

- Keep existing GitHub Actions but add branch protections for direct pushes after
  roadmap lock.
- Document explicit environment assumptions in QA commands (port availability, headless
  dependencies).
- Maintain release output docs for Vercel and offline package flow.

## 18. Documentation Improvements

- Make `README.md` and this roadmap the only canonical narrative layer.
- Add "what is in and out of scope" to every major section.
- Remove ambiguous claims like "no engine"/ "all new work done" unless literally true.
- Add a short "what changed last run" section in README for quick continuity.

## 19. GitHub Presentation Improvements

- Add a concise opening summary for recruiters:
  project objective, tech stack, test coverage, demo path, and current milestone.
- Add consistent badge set tied to current scripts (`vitest`, `playwright`, `build`).
- Keep screenshot gallery lean and relevant to first playable slice.

## 20. Future Feature Ideas (Not in Current Scope)

These are intentionally deferred until documentation/release baseline is stable:

- Full 3D migration.
- New world/region expansion.
- NPC LLM integration.
- New economy systems beyond proofed vertical loop.

## 21. Production Readiness Checklist

Before shipping to a portfolio-ready proof:

- [ ] Documentation and roadmap are consistent with runtime behavior.
- [ ] Test gates pass in a clean environment.
- [ ] Smoke checks are reproducible with explicit URL + port inputs.
- [ ] README tells first-run flow and known limitations clearly.
- [ ] Release package command and output location are current.
- [ ] Security posture documented with explicit known risks and mitigations.
- [ ] First five-minute loop behavior remains stable and understandable.

## 22. Suggested Milestone Order

1. **Handoff Consolidation (docs + verification first)**
   - Fix documentation drift, add explicit status checks, lock roadmap/scope.
2. **Delivery Reliability**
   - Make smoke reproducibility deterministic for the environment used by the next
     agent.
3. **First-play Clarity (non-code checks first)**
   - Define objective hierarchy and visibility checks in writing and confirm against
     existing UI behavior.
4. **Security and Accessibility Baseline Hardening**
   - Formalize risk surface and create gating checks for global debug surface/CSP.
5. **Review and Pause Gate**
   - Stop before any new gameplay feature is introduced; confirm new-doc plan quality.

## 23. Next Agent Instructions

### First 5 tasks

1. Sync branch state and confirm the docs-only change context.
2. Read this roadmap end-to-end, then verify `README.md`, `ROADMAP`, and `package.json`
   for consistency.
3. Validate that no non-doc file changes are committed.
4. Add first-play objective proof checklist to docs with explicit acceptance criteria.
5. Re-run verification commands and update the "Current Verification Status" section.

### Files likely involved

- `docs/roadmap.md` (primary)
- `README.md` (canonical public summary)
- `CONTRIBUTING.md` (only if setup steps need precision)
- `scripts/README.md` (command matrix alignment)

### Commands to run before making changes

```bash
git status --short --branch
npm run dev:lint
npm test
npm run typecheck:ts
npm run test:syntax
npm run build
```

### Commands to run after docs updates

```bash
git status --short --branch
git diff --check
```

### Tests/checks the next agent should run

- Full command suite listed in **Section 16** (or failures must be documented).
- A manual smoke attempt with explicit URL/port (if the environment permits).
- Optional visual review pass if the roadmap claims visual quality evidence.

### What must not be broken

- Do not change gameplay behavior in this planning phase.
- Do not alter `src` application logic.
- Do not expand scope beyond this documentation pass.

### When to stop and ask for human review

Stop immediately if you see:

- Any conflict between code behavior and roadmap claims.
- Any command output showing real regressions in existing tests.
- Any documentation edit that requires behavioral interpretation (those should be
  deferred to the next engineering milestone).

### Recommended first commit message

`docs: add roadmap for next agent`

## 24. Appendix: Action Template (for all roadmap items)

Use this exact template for future work packages:

- **What needs to be done**
- **Why it matters**
- **Expected impact**
- **Difficulty** (`Low` / `Medium` / `High`)
- **Risk** (`Low` / `Medium` / `High`)
- **Dependencies**
- **Files/Folders likely involved**
- **Suggested implementation order**
- **Acceptance criteria**
- **Tests/checks the next agent should run**
