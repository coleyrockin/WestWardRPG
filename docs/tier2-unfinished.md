# Tier 2 Unfinished Work

## Still pending

1. Runtime validation pass in Node-enabled environment:
   - Run full smoke suite (including new Tier 2 scenarios) with `node`/Playwright available.
   - Run `scripts/visual_regression_capture.sh` to capture baseline comparison outputs.

## Completed in this pass

1. Accessibility modal/workflow completion:
   - Added dedicated settings overlay with shop-style parity controls in HUD render path.
   - Added controls for:
     - high contrast
     - hit marker strength
     - camera shake
     - motion reduction
     - font scale
     - colorblind mode
     - gradient cache toggle
2. Automated accessibility scenarios:
   - Added `test-actions/accessibility_toggles_flow.json`.
   - Expanded `test-actions/upgrade_purchase_equip_flow.json` with colorblind/font/motion interactions.
3. Mini-boss Tier 2 deliverable closure:
   - Added `test-actions/mini_boss_flow.json`.
   - Added mini-boss persistence test coverage:
     - `tests/main-mini-boss-persistence.test.ts`
     - extended `tests/region-system.test.ts`
4. Smoke suite integration:
   - Updated `scripts/smoke_suite.sh` to run:
     - `mini-boss`
     - `accessibility`

## Notes

- Current Tier 2 code in this branch includes:
  - Gradient cache flag plumbing and cache invalidation on resize.
  - Cached post-process and selected sprite gradients.
  - Decorative particle throttling from `visualMood.particleMultiplier` while preserving combat hit feedback particles.
  - Settings/accessibility modal workflow and automation scenarios.
