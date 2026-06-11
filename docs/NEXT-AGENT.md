# RUSTWATER — Next-Agent Handoff

The project changed direction on 2026-06-11: the owner authored
[`rustwater-treatment.md`](rustwater-treatment.md) (cyberpunk-western open-world RPG) and it
is now canon. Read, in order: the treatment → [`roadmap.md`](roadmap.md) (M0–M4 execution
plan + the binding carry-over map) → `CLAUDE.md` (engine truths). The old WestWard push
(S1–S11) is **superseded as a priority queue but preserved as patterns** — details below.

Last updated: 2026-06-11 · main green (693 vitest, CI incl. loop smoke + golden) ·
live: westward-rpg.vercel.app · local play: `npm run play` → http://127.0.0.1:5191/

## What the last session shipped
- RUSTWATER adopted at the root: treatment committed verbatim, CLAUDE.md + roadmap.md +
  ROADMAP.md rebuilt around it. Decisions locked: **progressive re-skin** (Dustward →
  Calico Flats; engines extend in place; game playable at every commit) and **codename
  now, public rename only at the vertical slice**.
- `npm run play` — one-command build+serve on :5191 (the owner's "game won't start" fix —
  the answer to that report is almost always: the server died with a reboot; run this).
- Perf verdict (owner asked about switching engines): **no switch** — the lag is unbatched
  draw calls (~3k+ meshes, per-mesh materials, a WebGL2-fallback constraint). M0 fixes it.

## ⚡ Pick up next, in order

### 1. M0 — Performance Reset (roadmap.md M0, follow it verbatim)
Nothing else lands first; the owner has flagged lag twice.
- Measure in a real FOREGROUND tab (the preview/occluded tab throttles rAF and lies):
  `perf.now` over 120 frames + `window.__westward3dStats()` at town (9.5,8.5) / open range
  (~60,12) / marsh (~48,16). The probe pattern is `scripts/_boot_probe_tmp.mjs` (untracked
  throwaway — recreate if gone). Record numbers in roadmap.md M0.
- The WebGPU decision: `createRenderer.js` already resolves `backend` ("webgpu"|"webgl");
  full fidelity becomes WebGPU-only, the WebGL2 fallback drops to reduced mode (halve
  scatter + weather pools, castShadow off). The fallback bans (no instancing/shared
  materials/lines/points/hand-built indexed geometry — documented in `scatter.js`,
  `weatherView.js`, `ground.js` comments) then apply ONLY to the reduced path.
- Batch on WebGPU: `InstancedMesh` for scatter/flora/tumbleweeds/road ruts; merged static
  town geometry; shared material pools; shadow-caster + distance culling. Targets: ≥5×
  frame time, <~400 draws in town. CI: smoke wall-time budget + draw-call ceiling via the
  stats probe.

### 2. M1 — mission 1.1 "Dust to Dust" (the Funeral + the Executor)
The treatment's opening, replacing the first-road loop's spawn beat. Build on the existing
machinery — the S7 courier-quest wiring below is the exact integration pattern:
- Scene: a funeral beat at a new `gravesite` placement (frontierLayout + interactionSystem
  PROMPTS + a spike.js handler, the `handleSmokeCache` pattern).
- The Executor: speaks through the prompt-bar/npc-speech channel (`npcSpeechMsg` pattern in
  spike.js) with a distinct visual treatment; first lines authored in the treatment §Opening.
- TRIPWIRE: `tests/render3d-phase-state.test.ts` must pass UNTOUCHED until the new mission
  machine replaces the loop beat-for-beat; extend, don't break.

### 3. Old S6–S10 queue — superseded, but these two are M1/M2 templates
- **S7 courier quest world-integration** (engine layer already shipped:
  `frontier_eastwater_run` in jobBoard.js + `questRuntime.js` wired into the minimap):
  placements `questPickup` (14.2, 5.9) + `questDropoff` (128.8, 18.6), PROMPTS entries,
  composite gate `(t) => loopState.isTargetEnabled(t) || questTargetEnabled(game.world.jobs, t)`,
  handlers → `recordJobEvent` + toast, objective strip falls back to
  `questObjectiveView(game.world.jobs)`. **Do this as M1's warm-up — it IS the mission
  pattern.**
- **S8 shop UI** (engine shipped: shopCatalog/tradeWithVendor/economyServices): clone the
  board-modal pattern (`#shop-modal` CSS from `#board-modal`, shopModal.js + shopDom.js —
  createElement/textContent ONLY, the security test scans for parser sinks). This becomes
  M2's business UI.
- S6 travelled roads + S9 smoke/glow + S10 schedules/storm: fold into M1's Calico dressing
  pass; S9 remains the sanctioned golden re-bless point.

### 4. Design backlog (owner sessions — do NOT improvise these)
The treatment's §WHAT TO DESIGN NEXT: Act 2 beat-by-beat, full skill trees, the eight
romance characters, economy math, the Seizure script. Prompt Boyd; don't invent canon.

Also pending: a one-line README note that the project is evolving toward RUSTWATER
(deferred — README still markets WestWard, which stays the public name for now).

## Hard-won gotchas (all still true — beyond CLAUDE.md's list)
- **Never edit watched files while a browser gate runs against the dev server.** Vite
  reloads mid-capture and the screenshot races the reboot — a 37.9% "diff" was pure
  artifact. Finish edits, then run gates.
- **The local visual capture hangs/flakes under CPU load** (parallel agents + SwiftShader).
  It waits two rAF paints after hiding the HUD (fixed in `render3d_visual_capture.mjs`);
  if it still wedges, kill and re-run idle. Trust the diff image, not the percentage.
- **Parallel worktree agents:** background shells can silently cwd into
  `.claude/worktrees/agent-*/` — gates then run against the WRONG TREE (~541 tests instead
  of 693+). `cd` absolutely; sanity-check `git branch --show-current`.
- **Tumbleweed/animal placements must be path-checked** against placement OBBs (the ranch
  weed ends at x=122, weaving y 11.9–15.4 — keep that band clear).
- **`window.__spike.setPos` can seed the camera inside props** — pick capture points a few
  units off hero objects.
- **Blender MCP is not required** — headless works:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/blender/build_animals.py`.
- **`__spikeReady` lags in occluded tabs** even when the module is fully loaded — don't
  diagnose "boot hang" from a background tab; check `typeof window.__spike`.
- **"The game won't start" / "boots dark"**: dead local server (→ `npm run play`) or a
  stale save carrying the world clock (→ `indexedDB.deleteDatabase('westward')`).

## How to run + verify
```bash
npm run play                                      # build + serve → http://127.0.0.1:5191/
npm run dev                                       # dev server (HMR broken in-game: hard-reload)
npx vitest run && npx tsc --noEmit && npx vite build
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d   # loop smoke
WESTWARD_URL=http://127.0.0.1:5180 npm run test:visual     # golden gate (:update deliberately only)
```
Controls: WASD move, Shift run, Space dodge, E use, F draw, 3 field-map toggle, T time-of-day,
G weather, M mute. Headed captures → `~/agents/screenshots/` (never the repo).

## Standing guardrails (short list — full set in CLAUDE.md)
Dusk golden baseline re-blessed deliberately only · layout floors only rise ·
`firstFrameSlabBlockers === []` · spawn wedge x[9.5–16] y[6.5–11] clear · WebGL2 fallback =
per-mesh materials until M0 demotes it · HERO_OBJECTS + FIRST_FIVE_ROUTE untouched until M1
replaces the loop · all motion multiplies by the `fdt` freeze · audio synthesized-only ·
owner priority: PERFORMANCE first, then the M1 slice.
