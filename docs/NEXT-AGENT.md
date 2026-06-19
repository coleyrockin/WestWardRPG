# RUSTWATER — Next-Agent Handoff

**ONE handoff (this file) + ONE roadmap ([`roadmap.md`](roadmap.md)), hand-in-hand.** This file =
*where we are / pick up here*; the roadmap = *what to build and in what order*. Rewrite this each
session; delete stale/dated session docs — never accrete (owner rule). Design canon:
[`rustwater-treatment.md`](rustwater-treatment.md). Engine truths: `CLAUDE.md`.

Last updated: **2026-06-18 (night)** · main green: **896 vitest**, tsc clean, build ok, dusk golden
PASS (~0.1%) · live: westward-rpg.vercel.app (Believability Pass deployed) · play: `npm run play` →
:5191 · dev: `npm run dev` → :5180.

---

## Where we are
The **Believability Pass** (PBR Westward, golden-hour IBL, wet street, water-tower cathedral, town
life) is **shipped + deployed**. **World-Aliveness (R1) is COMPLETE.** **M0 perf is partway** (flora
batched + culled; town batching + the CI draw-call ceiling remain). Next work is in the roadmap's
**▶ NOW — tonight** section: build out the world east of town + polish.

### This session shipped (on `main`, NOT pushed)
- **Repo cleanup** (`95d7991`) — dropped a stray throwaway probe (gitignored future ones), pruned 20
  merged local branches. Left the 3 unmerged branches + all remotes alone.
- **World-Aliveness gaps closed** — road-verge scatter (`0c2212d`), per-biome flora tint
  (`bce2ab1`, extracted pure `biome.js`), dusk owl audio cue (`4009103`), cattle graze head-dip
  (`df0d2eb`). 1.4's paddock/horses/cattle-audio were already in.
- (Earlier this session, before a `git pull` caught the repo up: a Phase-2 "First 60 Seconds" set —
  HUD melt, vista-sweep opening, goldenHour mood, foreground declutter — is in history beneath the
  Believability Pass.)

### ⏸ Owner's pending step (deploy is your call)
The new look + aliveness render fully only on **your** WebGPU machine (shadows/god-rays/metal gleam).
When you want it live: `npm run play`, eyeball it, tune if needed (`environmentIntensity` in
envLight.js / cyber emissives / `WESTERN_SPECS` hexes), re-bless dusk only if you deliberately moved
it, then push `main` → Vercel deploys. Everything above is committed locally and gate-green, waiting
on that.

---

## Pick up here → the roadmap's **▶ NOW** section
[`roadmap.md`](roadmap.md) lists tonight's ordered, agent-buildable work (all golden-safe): **(1)**
Drift exploration POIs, **(2)** road ruts, **(3)** Eastwater/Crossline ranch build-out, **(4)** Calico
dressing, **(5)** per-time-of-day env intensity, **(6)** god-file extraction. World *dressing* is
buildable; story/naming/economy canon stays the owner's — prompt Boyd, don't invent.

## How to run + verify
```bash
npm run play                                      # build + serve → :5191 (FOREGROUND for motion/perf)
npm run dev                                       # dev server :5180 (HMR broken in-game: hard-reload)
npx vitest run && npx tsc --noEmit && npx vite build         # the gate (chunk-size warning expected)
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d     # loop smoke
WESTWARD_URL=http://127.0.0.1:5180 npm run test:visual       # dusk golden gate (:update deliberately only)
```
Controls: WASD move, Shift run, Space dodge, E use, F draw, 3 field-map, T time-of-day, G weather,
M mute. Headed captures → `~/agents/screenshots/` (NEVER the repo).

## Hard-won gotchas (beyond CLAUDE.md)
- **The local visual capture flakes/hangs under CPU load** (SwiftShader). Launch it idle, do NOTHING
  else, wait for exit; kill + re-run if it wedges. Trust the diff image, not the %; ~0–4% is normal
  baseline noise (PASS threshold 10%).
- **Never edit watched files while a browser gate runs** — Vite reloads mid-capture (a 37.9% "diff"
  was pure artifact). Finish edits, then gate.
- **The dev/preview tab is THROTTLED** — screenshots show static composition only; judge motion/perf
  in a real foreground browser. `__spikeReady` lags in occluded tabs.
- **Inspect without driving:** `window.__spike.setPos(x,y)`/`.goto('roadSlime')`/`.captureMode()`;
  `window.__westward3dTest.setTimeOfDay("day")` pins a palette; `window.__westward3dStats()` = draws.
- **"Boots dark"**: stale save carrying the world clock → `indexedDB.deleteDatabase('westward')`.
- Parallel worktree agents can cwd into `.claude/worktrees/agent-*/` → gates run on the WRONG TREE.
  `cd` absolutely; check `git branch --show-current`.

## Standing guardrails (full set in CLAUDE.md)
Dusk golden baseline re-blessed deliberately only · layout floors only rise ·
`firstFrameSlabBlockers === []` · spawn wedge x[9.5–16] y[6.5–11] clear · `HERO_OBJECTS` +
`FIRST_FIVE_ROUTE` untouched until M1 replaces the loop · WebGL2 fallback = per-mesh materials until
M0 demotes it · all motion `fdt`-gated · audio synthesized-only · M0 doctrine: don't add per-mesh
mass content (batch it) until M0 lands · deploy is the owner's call.
