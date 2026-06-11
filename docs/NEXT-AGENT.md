# WestWard — Next-Agent Handoff

Where the showable-demo push stands and exactly what to pick up next. Direction lives in
[`roadmap.md`](roadmap.md) (single source of truth) and [`world-realism-roadmap.md`](world-realism-roadmap.md)
(R1–R4 tactical spec). The approved execution plan for this push:
`~/.claude/plans/okay-this-has-been-valiant-bird.md` (11 sessions S1–S11 + a 10-beat demo script
as the acceptance test).

Last updated: 2026-06-11 · main @ `13bda67` · 693 vitest green · golden baseline UNCHANGED (2.64% pass)

## Where the push stands (S1–S11 scorecard)

| # | Session | Status |
|---|---------|--------|
| S1 | Windmill rotation + perf tuning + boot resilience | ✅ shipped `1b53012` |
| S2 | Tumbleweeds ×3 roads + reactive bird flocks + weather windSpeed | ✅ shipped `7739db1` |
| S3 | Ambient audio (wind cutoff, gusts, biome pockets, night bed) | ✅ shipped `13bda67` — **deprioritized by owner; do not polish further** |
| S4 | World minimap (5 POIs, roads, yaw cone, Digit3 toggle) | ✅ shipped `13bda67` |
| S5 | Biome ground colours + per-zone fog + 3rd FBM octave | ✅ shipped `13bda67` |
| S6 | R3 travelled roads (ruts, verge scatter, biome flora, freight) | ⬜ NEXT |
| S7 | Eastwater courier mission | 🟨 engine layer shipped (jobBoard def + questRuntime.js); **world integration remains** |
| S8 | Vendor shops | 🟨 engine layer shipped (shopCatalog + tradeWithVendor + economyServices); **UI + placements remain** |
| S9 | Chimney smoke + window glow + lamp character | ⬜ (sanctioned golden re-bless point) |
| S10 | NPC night schedules + storm deck + wind sway | ⬜ |
| S11 | Horses + cattle | ✅ shipped `13bda67` (static; breath-sway rides S10's windSway loop) |

## ⚡ Pick up next, in order

### 1. S6 — R3 travelled roads (`world-realism-roadmap.md` R3.1–R3.5, follow it verbatim)
`biomeAt(x, z)` is exported from `src/game/world/ground.js` — R3.3 needs it. Rut decals over all 7
`OPEN_RANGE_ROADS`, road-dust ribbon opacity 0.058→0.09 (`spike.js`, search `roadDust`), verge
scatter x24–62, biome flora palettes, freight on the ranch road (x≈88–98, shoulder y≈10 — clear of
the ranch tumbleweed weave band y 11.9–15.4), Folly dressing. Layout floors only rise.

### 2. S7 world integration — make the courier quest playable
The pure layer is done: `frontier_eastwater_run` in `src/jobBoard.js` (gated on the starter bounty),
`src/render3d/questRuntime.js` (questTargetEnabled / questPromptFor / questObjectiveView /
questMapTarget — already wired into the minimap's jobTarget). Remaining, all in spike.js +
frontierLayout.js + interactionSystem.js:
- Placements: `{ kind: "questPickup", x: 14.2, y: 5.9 }` (satchel near the plaza — outside the spawn
  wedge y[6.5–11]) + `{ kind: "questDropoff", x: 128.8, y: 18.6 }` (Trading Post porch). NOT in
  HERO_OBJECTS.
- `PROMPTS` entries in `interactionSystem.js` (radius ~2.2); pass `getPromptText` override through
  `questPromptFor`.
- Composite gate where `createInteractionSystem` is constructed in spike.js:
  `(t) => loopState.isTargetEnabled(t) || questTargetEnabled(game.world.jobs, t)`.
- Handlers (the `handleSmokeCache` pattern): pickup/dropoff → `recordJobEvent` + toast; extend
  `handleJobBoard`'s `survey_teaser` branch — ready job → `claimBoardReward` (fully generic), else
  board modal lists the job via the existing `buildBoardView`/`acceptJob`.
- Objective strip: when no loop objective is active, feed `questObjectiveView(game.world.jobs)` into
  `syncObjectiveDom`.
- TRIPWIRE: `tests/render3d-phase-state.test.ts` must pass with zero edits.

### 3. S8 UI — make the shops shoppable
Pure layer done: `src/shopCatalog.js` (SHOP_CATALOGS merchant/tradingPost, buildShopView,
applyTrade), `tradeWithVendor` on gameState, `src/economyServices.js` restored (vendor profiles +
reaction lines). Remaining: clone the board-modal pattern exactly — `#shop-modal` in index.html
(copy `#board-modal` CSS), `shopModal.js` (createBoardModalController shape), `shopDom.js`
(boardDom shape — createElement + textContent ONLY, the security test scans for parser sinks),
`shopCounter` placements (Quill's store in Dustward outside the spawn wedge + Eastwater Trading
Post beside the quest dropoff), `PROMPTS` entry, handler opens the modal, `syncPlayerHud()` +
`onRunMutated()` after every trade.

### 4. S9 + S10 — occupancy + drama (`world-realism-roadmap.md` R4.1–R4.5 verbatim)
S9 batches ALL spawn-frame-shifting items (smoke, window glow, lamp flickerKind split) into ONE
session → the ONE sanctioned golden re-bless (`npm run test:visual:update`, commit the new baseline
in the same commit). S10 (NPC schedules, storm deck, windSway tag loop) is golden-safe — and add the
horse head-bob + cattle breath sway to the same `userData.windSway`-style loop (spec in the S11
agent report: horses ±4° period 3.2 s seeded per placement; cattle 0.04-amplitude sway; freeze under
`?visual` like everything else).

### 5. Acceptance — the 10-beat demo script
Run the full walkthrough from the plan file in a real browser (title → bounty loop → ledger run east
→ shop at the Trading Post → night walk home → storm flourish → courier pay). Every beat must land.

## Today's hard-won gotchas (NEW — beyond CLAUDE.md's list)
- **Never edit watched files while a browser gate runs against the dev server.** Vite reloads the
  page mid-capture and the screenshot races the reboot — we caught a title-screen frame at 37.9%
  diff that was pure artifact. Finish edits, then run gates.
- **The local visual capture hangs/flakes under CPU load** (parallel agents + SwiftShader). It now
  waits for two rAF paints after hiding the HUD (fixed in `render3d_visual_capture.mjs`), but if it
  still wedges: kill it and re-run on an idle machine. Trust the diff image, not the percentage —
  HUD elements visible in the diff = stale-compositor flake, not a real regression.
- **Parallel worktree agents:** background shells can silently end up cwd'd inside
  `.claude/worktrees/agent-*/` — gates then run against the WRONG TREE (you'll see ~541 tests
  instead of 693+). Always `cd` absolutely before gate runs and sanity-check `git branch --show-current`.
- **Tumbleweed/animal placements must be path-checked.** The weed paths are deterministic seeded
  curves — simulate against placement OBBs before landing props near roads (S2's review caught 3
  roll-through bugs; the ranch weed ends at x=122 and weaves y 11.9–15.4 — keep that band clear).
- **`window.__spike.setPos` teleports can seed the camera inside props** (vista-east-road did).
  Pick capture points a few units off hero objects.
- **Blender MCP is not required** — `/Applications/Blender.app/Contents/MacOS/Blender --background
  --python tools/blender/build_animals.py` works headless; glTF addon ships with Blender.

## How to run + verify (unchanged)
```bash
npm run dev                                       # → http://127.0.0.1:5180/ — that's the game
npx vitest run && npx tsc --noEmit && npx vite build
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d   # loop smoke
WESTWARD_URL=http://127.0.0.1:5180 npm run test:visual     # golden gate (:update only at S9)
```
Controls: WASD move, Shift run, Space dodge, E use, F draw, **3 field-map route/world toggle**,
T time-of-day, G weather, M mute. Headed captures: `~/agents/tmp/westward-vista-capture.mjs` +
`westward-minimap-check.mjs` (screenshots → `~/agents/screenshots/westward/`, never the repo).

## Standing guardrails (the short list — full set in CLAUDE.md)
Dusk golden baseline (re-bless ONLY at S9, hash in commit) · layout floors only rise ·
`firstFrameSlabBlockers === []` · spawn wedge x[9.5–16] y[6.5–11] clear · WebGL2 = per-mesh
materials, no instancing/lines/points · HERO_OBJECTS + FIRST_FIVE_ROUTE untouched · all motion
multiplies by the `fdt` freeze · audio is synthesized-only, zero fetches · owner priority: VISUALS
over audio.
