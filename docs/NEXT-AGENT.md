# RUSTWATER — Next-Agent Handoff

**ONE handoff (this file) + ONE roadmap ([`roadmap.md`](roadmap.md)), hand-in-hand.** This file =
*where we are / pick up here*; the roadmap = *what to build and in what order*. Rewrite this each
session; delete stale/dated session docs — never accrete (owner rule). Design canon:
[`rustwater-treatment.md`](rustwater-treatment.md). Engine truths: `CLAUDE.md`.

Last updated: **2026-06-18 (late night)** · main green: **896 vitest**, tsc clean, build ok, dusk
golden PASS (~0.1%) · live: westward-rpg.vercel.app (Believability Pass deployed) · play:
`npm run play` → :5191 · dev: `npm run dev` → :5180.

---

## Where we are
The **Believability Pass** (PBR Westward, golden-hour IBL, wet street, water-tower cathedral, town
life) is **shipped + deployed**. **World-Aliveness (R1) is complete.** This session built out the
world east/west of town + the env polish (below). **M0 perf is partway** (flora batched + culled;
town batching + the CI draw-call ceiling remain). Next concrete task: the roadmap's **▶ NOW #6 —
god-file extraction** (deferred from tonight on purpose; see below).

### This session shipped (on `main`, NOT pushed — 14 commits)
- **Cleanup** (`95d7991`): dropped a stray throwaway probe + pruned 20 merged local branches.
- **World-Aliveness gaps closed**: road-verge scatter (`0c2212d`), per-biome flora tint (`bce2ab1`,
  extracted pure `biome.js`), dusk owl audio (`4009103`), cattle graze head-dip (`df0d2eb`).
- **One roadmap + one handoff consolidated** (`3159147`): refreshed `roadmap.md`, deleted the
  competing roadmaps (world-realism / art-craft / moonshot), locked tonight's plan.
- **World build-out** (all golden-safe, dusk PASS <0.13%): Drift exploration POIs (`00af151`),
  open-range road ruts (`fb960cb`), Eastwater paddock enclosure (`59fc2af`), Calico cyber dressing
  (`2b1aa5d`).
- **Polish**: per-time-of-day env intensity (`f7e5da2`).

### ⏸ Owner's pending step (deploy is your call)
The new look + content render fully only on **your** WebGPU machine (shadows/god-rays/metal gleam),
and the new world content east/west sits **outside the dusk capture frame** — so it's gate-green but
unseen by the golden gate. When you want it live: `npm run play`, ride out east (the Drift POIs +
worn roads + ranch) and west (Calico's new masts/mustang), check the night look now that env dims
after dark, tune if needed, re-bless dusk only if you deliberately move it, then push `main`.

---

## Pick up here → roadmap **▶ NOW #6: god-file extraction**
`spike.js` is ~5,300 lines. **The `claude/module-split` branch is stale — ignore it** (it splits the
long-deleted legacy `game.js`, not spike.js). Do it FRESH and **incrementally** — small batches of
`buildX(group,p)` builders → `src/render3d/build/` modules. They're coupled through `standard()` +
the grounded-material machinery + cross-calls + the `buildPlacement` dispatch, so the
grounded-`standard()` seam comes last or gets passed in explicitly. **Verify each batch byte-stable
with a BROADER capture sweep** (town + open_range + marsh + Calico via `__spike.setPos`) — the dusk
golden gate only covers the town view. Leaf builders (flora/rock/cactus) first.

Everything else agent-buildable is in the roadmap's NOW + "Next world items" list (Prospector's
Folly / Sunken Wash spurs read thin; Crossline Ranch as a distinct region; more Drift POIs; open-
range wildlife). Story/naming/economy canon stays the owner's — prompt Boyd.

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
