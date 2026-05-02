# WestWardRPG Roadmap

This is the single planning source for future agents. Do not create separate roadmap, playbook, tier, or unfinished-work files; update this file instead.

## Current State

- `main` contains the v3 Shattered Frontier expansion and the first Tier 2 performance/accessibility pass.
- Tier 1 system wiring is complete: enemy behaviors, region resources/events, progression UI, Smith upgrades, quick utility effects, mini-boss spawning, and save migration backfills.
- Tier 2 code exists for gradient caching, settings/accessibility controls, particle throttling, mini-boss scenarios, and migration tests.

## Completed Tier 2 Work

1. Gradient cache implementation:
   - `graphics.performance.gradientCache` exists and defaults off.
   - Post-process and selected sprite gradients use cache lookups when enabled.
   - Smoke suite supports `WESTWARD_GRADIENT_CACHE=1`.
2. Settings/accessibility modal:
   - Open with `O`.
   - Rows cover graphics preset, gradient cache, colorblind mode, font scale, motion reduction, and camera shake.
   - `test-actions/settings_modal_flow.json` exercises the modal.
3. Mini-boss workflow:
   - Region mini-boss flags are in the default region state.
   - Save migration backfills missing mini-boss flags and preserves defeated flags.
   - `test-actions/mini_boss_flow.json` exists.
4. Automation cleanup:
   - `web_game_playwright_client.mjs` maps all keys used by current scripted flows.
   - `scripts/visual_regression_capture.sh` uses real mapped controls for presets and region cycling.

## Next Work

1. Run and archive a full gradient-cache smoke pass:
   - `WESTWARD_PORT=5183 WESTWARD_GRADIENT_CACHE=1 npm run test:smoke`
2. Run and archive visual regression captures:
   - `WESTWARD_PORT=5183 scripts/visual_regression_capture.sh`
3. Add pass/fail screenshot diffing if visual regression needs automation beyond capture artifacts.
4. Continue polish only after verification is green:
   - Mini-boss encounter tuning.
   - Accessibility copy and modal spacing on mobile.
   - Renderer cache expansion only if profiling shows remaining gradient churn.

## Verification Gates

Run these after gameplay or renderer changes:

```bash
npm test
npm run typecheck:ts
npm run test:syntax
WESTWARD_PORT=5183 npm run test:smoke
```

Run the cache-on smoke before claiming Tier 2 complete:

```bash
WESTWARD_PORT=5183 WESTWARD_GRADIENT_CACHE=1 npm run test:smoke
```

Run visual capture before visual-signoff work:

```bash
WESTWARD_PORT=5183 scripts/visual_regression_capture.sh
```

## Agent Rules

- Keep this file current when roadmap scope changes.
- Prefer small, tested gameplay slices over broad rewrites.
- Do not rewrite the renderer or move to WebGL unless explicitly requested.
- Preserve v1/v2/v3 save migration compatibility.
- Leave unrelated local artifacts alone unless the user asks for cleanup.
