# Tier 2 Unfinished Work

## Still pending

1. Full `gradientCache` validation with both paths:
   - `gradientCache = false` smoke run completed previously.
   - `gradientCache = true` needs a dedicated scripted scenario pass and baseline screenshot diff capture.
2. Accessibility modal/workflow completion:
   - Settings modal parity (shop-style UX) is not implemented yet.
   - Automated scenarios for colorblind mode, font scale, and motion reduction toggles are not added yet.
3. Mini-boss Tier 2 deliverable closure:
   - Dedicated `mini_boss_flow.json` scenario is not added.
   - Persistence-focused test coverage for region mini-boss completion flags still needs expansion.
4. Visual regression capture step:
   - `scripts/visual_regression_capture.sh` has not been run for this Tier 2 pass.

## Notes

- Current Tier 2 code in this branch includes:
  - Gradient cache flag plumbing and cache invalidation on resize.
  - Cached post-process and selected sprite gradients.
  - Decorative particle throttling from `visualMood.particleMultiplier` while preserving combat hit feedback particles.
