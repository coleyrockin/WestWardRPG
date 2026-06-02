# Experiments — archived, not the shipping path

> **Renderer decision, 2026-06-02:** the Canvas game (`index.html` → `src/main.js`) is
> the source of truth. The code under this document is **archived R&D** — it builds and
> its tests pass, but it is *not* on the critical path and no new gameplay should be
> built against it. See the README "Current Direction" and the superseding banner atop
> [`roadmap.md`](roadmap.md).

Why archived rather than deleted: the experiments are correct, tested, and may matter
later. The cost they were imposing was *ambiguity* — being framed as "the next direction"
while the actual game and its entire test suite live on Canvas. Labelling them as
experiments removes that cost without throwing away the work or its coverage.

---

## 1. Three.js look-spike — `src/render3d/`, `spikes/render3d.html`

**What it is:** a Three.js first-road slice with the target art direction (NPR cel + rim
shader, real depth/lighting, day/night, post-processing). Boots only from
`spikes/render3d.html` → `src/render3d/spike.js`. It does **not** touch the Canvas game
and the Canvas game does not import it.

**What it achieves:** the first-five-minutes loop (board → road → cache → slime → wagon →
return to Boone) as a 10-phase state machine, one enemy (the road slime) with telegraph +
dodge-i-frames, third-person camera with collision, ambient townsfolk, an ironman save
slot (`frontier-ironman`), day/night, and visual-only weather.

**The parity gap (why "promote the spike" is a from-scratch rebuild):** the spike has
~10% of the game. It lacks the other 6 enemy archetypes, inventory/loot/gear/crafting, the
companion system, the quest system beyond the first-road loop, progression/leveling/perks,
the other two regions (Ashfall, Ironlantern), fog of war/minimap, character origins, daily
seed, NG+, replay, audio, the full dialogue system, factions, and the economy. Every one of
those is shipped and tested on Canvas and would need re-authoring in 3D.

**Note:** the spike reuses `src/game/renderer/` and `src/game/world/` (its Three.js visual
infrastructure) but does **not** use the sim seam below — it mutates its own state directly,
the same pattern as the Canvas loop.

## 2. Deterministic sim core — `src/game/sim.js`, `ecs.js`, `stateHash.js`, `rng.js`

**What it is:** a clean event-sourced, fixed-timestep simulation core with a seeded PRNG
(`rng.js`, Mulberry32) and canonical state hashing (`stateHash.js`). `runSimulation(seed,
inputLog)` is genuinely deterministic and is covered by `tests/game-sim.test.ts` /
`game-rng.test.ts`.

**Status:** **orphaned.** Nothing in production imports `sim.js` or `ecs.js` — not
`main.js`, not the spike. It is the renderer seam that was never wired in. It is the right
foundation *if* deterministic replay ever becomes a product requirement, but reaching that
means porting the shipped systems through it, not adopting it as-is.

**Reality check on "deterministic gameplay":** determinism is real here and in daily-seed
*scoring* (`dailySeedMode.js`). It is **not** true of the shipped Canvas loop, which uses
unseeded `Math.random` for gameplay rolls (damage, loot, spawns, world layout) and has no
replay playback. Treat "deterministic" claims as scoped to this sim core and the daily seed
until the shipped loop is actually routed through the seam.

---

## If you pick this back up

- Don't promote the spike. Wire the shipped Canvas systems through `src/game/sim.js` first
  (deterministic core), *then* attach a renderer (Canvas or Three.js) to `toRenderState`.
- Keep the tests with the code. `tests/render3d-*`, `tests/game-*`, and `tests/world-*`
  cover these experiments and must stay green wherever the code lives.
