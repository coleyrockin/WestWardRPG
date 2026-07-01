# RUSTWATER — Next-Agent Handoff

**ONE handoff (this file) + ONE roadmap ([`roadmap.md`](roadmap.md)), hand-in-hand.** This file =
*where we are / pick up here*; the roadmap = *what to build and in what order*. Rewrite this each
session; delete stale/dated session docs — never accrete (owner rule). Design canon:
[`rustwater-treatment.md`](rustwater-treatment.md). Engine truths: `CLAUDE.md`.

Last updated: **2026-07-01** · branch `stabilize/player-world-camera-foundation` · local gates:
focused foundation vitest clean, tsc clean, build ok · live: westward-rpg.vercel.app · play:
`npm run play` → :5191 · dev: `npm run dev` → :5180.

---

## Where we are
The **Player / World / Camera Foundation Stabilization** pass is ready to hand off after
shelving the prior mixed dialogue/stats work. Scope stayed narrow: make one playable slice feel
better before adding RPG systems. This pass added a real `__westward3dStats()` helper, kept legacy
stat aliases for smoke scripts, made the WebGL weather fallback reuse shared particle materials,
removed visible outdoor NPC population, tuned Ezra's default camera/movement/animation read, and
added a dev-only `?foundation` boot that skips save loading and mission seeding for clean free-roam
testing.

The **Believability Pass** (PBR Westward, golden-hour IBL, wet street, water-tower cathedral, town
life) remains the shipped baseline. **M0 perf is still partway** (flora batched + culled; town
batching + the CI draw-call ceiling remain). Do not add world/content scope until walking, camera,
readability, and measured performance are good enough.

### Current stabilization changes
- `src/render3d/renderStats.js`: extracted debug/perf stats from `spike.js`; reports backend,
  reduced fidelity, frame timing, draw calls, triangles, geometries, textures, mesh/material/
  instanced/shadow/visible/scene object counts, plus legacy aliases.
- `scripts/perf_baseline_probe.mjs`: samples town `{ x: 9.5, z: 8.5 }`, open range
  `{ x: 60, z: 12 }`, and marsh `{ x: 48, z: 16 }` with the richer stat payload.
- Outdoor NPCs are visually paused: `npcSilhouette` placements were removed from the authored
  layout and the animated `createTownsfolk` / `addTownLife` load path is disabled in `spike.js`.
  NPC systems/data remain intact.
- `src/render3d/playerController.js`: default shoulder camera is closer/lower; walk/run speeds and
  sprint FOV boost are reduced to cut floatiness; camera collision skips the blocker when the hero
  is already inside a broad inflated facade proxy.
- Ezra readability: rigged hero now gets a darker, wider hat/neck silhouette, darker dress tones,
  explicit walk/run animation time scales, and the model yaw offset keeps him from walking backward.
- `?foundation` now starts at the real spawn, facing the first-road route, with HUD chrome hidden
  and save/mission persistence bypassed.
- World readability: first-road lane clutter was reduced, early dark mud strips were removed,
  several small prop blockers became walk-through, day lighting was de-yellowed, and glow/sign
  assets were scaled/dimmed. The town still reads too much like an unfinished movie set.
- `src/game/world/weatherView.js`: WebGL fallback rain/dust pools now share one material per
  weather type instead of cloning every particle material.

## Pick up here
Use `npm run play`, then inspect `http://127.0.0.1:5191/?foundation&n=...` in a foreground browser.
The latest in-app-browser capture is materially better: no outdoor NPC crowd, cleaner HUD-free
spawn frame, Ezra facing correctly, darker hat/neck silhouette, and a closer playable camera.

The next problem is visual composition, not systems. The town still has oversized flat colored
panels and stage-set-like building fronts. The next smallest high-impact branch should be
`world/opening-town-composition-pass`: replace/reshape those billboard-like building details,
reduce prop spam further, strengthen the main road silhouette, and make the first 30 seconds feel
like a believable place. Do not add missions or NPCs yet.

If checking movement, walk: spawn → Boone board → road sign → smoke cache / marsh direction → turn
around → starting area. Judge only load, frame stability, character readability, movement, camera
clipping/framing, collision feel, road readability, lighting, clutter, and composition.

## How to run + verify
```bash
npm run play                                      # build + serve → :5191 (FOREGROUND for motion/perf)
npm run dev                                       # dev server :5180 (HMR broken in-game: hard-reload)
npx vitest run && npx tsc --noEmit && npx vite build         # the gate (chunk-size warning expected)
WESTWARD_URL=http://127.0.0.1:5180 npm run test:visual       # dusk golden gate (:update deliberately only)
```
Controls: WASD move, Shift run, Space dodge, E use, F draw, 3 field-map, T time-of-day, G weather,
M mute. Headed captures → `~/agents/screenshots/` (NEVER the repo).

## Hard-won gotchas (beyond CLAUDE.md)
- **The local visual capture flakes/hangs under CPU load** (SwiftShader). Launch it idle, do NOTHING
  else, wait for exit; kill + re-run if it wedges. Trust the diff image, not the %; ~0–4% is normal
  baseline noise (PASS threshold 10%).
- **Re-exports don't create local bindings:** `export { x } from "./y"` does NOT let this module
  *call* `x` — import it too if you use it locally (bit me on `biomeAt`; tsc/tests catch it).
- **JS modules touched by tests need a sibling `.d.ts`** kept in sync (new exports/fields → update
  the `.d.ts`, e.g. `timeOfDay.d.ts` Palette gained `envIntensity`).
- **Never edit watched files while a browser gate runs** — Vite reloads mid-capture. Finish edits,
  then gate.
- **The dev/preview tab is THROTTLED** — judge motion/perf in a real foreground browser.
- **"Boots dark"**: stale save carrying the world clock → `indexedDB.deleteDatabase('westward')`.

## Standing guardrails (full set in CLAUDE.md)
Dusk golden baseline re-blessed deliberately only · layout floors only rise ·
`firstFrameSlabBlockers === []` · spawn wedge x[9.5–16] y[6.5–11] clear · `HERO_OBJECTS` +
`FIRST_FIVE_ROUTE` untouched until M1 replaces the loop · WebGL2 fallback = per-mesh materials until
M0 demotes it · all motion `fdt`-gated · audio synthesized-only · M0 doctrine: batch mass content,
don't emit per-mesh swarms · deploy is the owner's call.
