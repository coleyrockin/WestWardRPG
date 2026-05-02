# WestWardRPG Roadmap

This is the single planning source for future agents. Do not create separate roadmap, playbook, tier, or unfinished-work files; update this file instead.

## Current State

- `main` contains the v3 Shattered Frontier expansion, the full Tier 2 pass, and the first engine-foundations pass.
- Tier 1 system wiring is complete: enemy behaviors, region resources/events, progression UI, Smith upgrades, quick utility effects, mini-boss spawning, and save migration backfills.
- Tier 2 closed: gradient caching, settings modal (KeyO), accessibility controls, colorblind palettes wired into HUD/sprites/damage numbers, mini-boss scenarios + persistence, gradient-cache-on smoke run validated.
- Engine foundations (Pillar 2): particle pool (1500-cap ring buffer, no per-frame alloc), uniform-grid spatial hash for enemy radius queries, 3-bus audio graph with per-region procedural ambient drone (Shift+M toggle), and surgical render-helpers module split (`src/render.js` factory).
- Combat identity (Pillar 3): per-enemy status stack (burn/bleed/shock/frost) with DoT, slow, and frost-shatter; heavy archetypes (`charge`/`tank`/`shield`/`control`) wind up before striking and can be interrupted mid-windup with a stagger reward; perfect-dodge window (0.15s) refunds stamina + brief slow-mo; perfect-parry window (0.15s of block start) negates damage, doubles stagger, and refunds stamina; weapon archetype movesets (light/heavy/spear) shape arc + reach + stagger geometry beyond raw stat tweaks.

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

Pillar 4 — World Life:
1. Day/night cycle — `state.world.timeOfDay` 0..1 advancing on a real-time
   schedule. Phase LUT applied as a multiplicative tint on biome grading.
   Night doubles spawn density on hostile pool.
2. Faction reputation actually changes shop prices, smith-tier gates, and
   patrol density (data already in `narrative.factionRep`).
3. POIs + cache discovery — 3–5 POIs per region, mini-map ping when player
   approaches, persistent `regions.poisDiscovered` set.
4. Codex — KeyL opens a tabbed lore browser (regions / enemies / items /
   factions / ideology); entries unlock on first encounter.

Outstanding verification:
- Add pass/fail screenshot diffing if visual regression needs automation
  beyond capture artifacts.

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
