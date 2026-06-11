# RUSTWATER — Engine & Execution Roadmap

> **Direction (owner decision 2026-06-11):** the project's design canon is
> [`rustwater-treatment.md`](rustwater-treatment.md) — a cyberpunk-western open-world RPG
> (Ezra Cross, the Meridian Territory, the Executor). The shipped WestWard engine + Dustward
> world are its **substrate**: we re-skin and extend progressively, the game stays playable
> at every commit, and nothing tested gets rewritten from scratch. Public title stays
> WestWard until the vertical slice exists.

**This is the single source of truth for execution.** The treatment owns *what the game is*;
this doc owns *how it gets built*. No parallel TODO/PLAN files.

**Companion guides (tactical how-to):**
- [`rustwater-treatment.md`](rustwater-treatment.md) — the design canon (story, systems, world).
- [`map-editing-guide.md`](map-editing-guide.md) — world layout: coordinates, guardrails, `__spike` hooks.
- [`3d-art-direction.md`](3d-art-direction.md) — composition fundamentals (now bending toward "nothing is sleek").
- [`world-realism-roadmap.md`](world-realism-roadmap.md) — R1–R4 world-aliveness spec (R3/R4 fold into M1's Calico dressing).
- [`NEXT-AGENT.md`](NEXT-AGENT.md) — pick-up-here state for the next session.

Last updated: `2026-06-11` · main green at 693 vitest · live: westward-rpg.vercel.app

---

## The carry-over map (nothing gets rebuilt)

| Shipped WestWard system | RUSTWATER role |
|---|---|
| `src/jobBoard.js` + board modal UI | Main missions, faction chains, the **bounty office** (the treatment's infinite procedural board) |
| `src/render3d/questRuntime.js` | Generic quest wiring for all mission taxonomies |
| `src/npcMemory.js` | Relationships → courtship → **marriage/family** events |
| `src/shopCatalog.js` + `tradeWithVendor` + `src/economyServices.js` | **Businesses** (saloon/stable/water-hauling/print shop…) |
| `src/gearCrafting.js` | **Augments/Iron** (slots: eyes/arms/spine/heart/neural) |
| `src/progressionSystem.js` | The five trees: **GUN / IRON / WIRE / TONGUE / TRAIL** |
| `src/render3d/gameState.js` | Grows the three meters: **Cash / Standing / Legend** |
| `frontierLayout.js` + biome ground (`biomeAt`) + the town kit | **Meridian regions** — Dustward → Calico Flats; Providence/Caldera/Drift/Crossline are new zones on the same tooling |
| Slime + `encounterSystem` | **Feral machines** (the Drift) — same FSM, new skin |
| `worldClock` / weather / `savePersistence` (ironman) | Unchanged |
| First-road loop (`phaseState.js`) | Stays the playable spine until M1 missions replace it beat-for-beat (tripwire: `render3d-phase-state.test.ts`) |
| Old S6–S10 queue (travelled roads / courier quest / shop UI…) | Superseded as priorities; **preserved as patterns** — S7's courier wiring is M1's mission template, S8's shop UI is M2's business UI template |

---

## M0 — PERFORMANCE RESET (first, non-negotiable)

The game is laggy because it is draw-call-bound: ~3k+ individual meshes with per-mesh
materials — a constraint imposed by the WebGPURenderer's WebGL2 *fallback*, which bans
instancing/shared materials/merged geometry. The engine is not the problem; the ban is.
**The owner has flagged lag twice — nothing else lands until this does.**

1. **Measure** — foreground-tab protocol (the throttled preview lies): `perf.now` over 120
   frames + `window.__westward3dStats()` at town / open range / marsh. Record the numbers
   here. (Probe pattern: `scripts/_boot_probe_tmp.mjs`.)
2. **The WebGPU decision** — require WebGPU for full fidelity; demote the WebGL2 fallback to
   a reduced mode (halved scatter/weather, no shadow casters) instead of letting it dictate
   the architecture. CI smoke keeps running the fallback path — green by design.
3. **Batch the world** (WebGPU path): `InstancedMesh` for scatter/flora/tumbleweeds/road
   ruts (thousands of draws → ~10), merged static town geometry, shared material pools,
   shadow-caster culling, distance culling. Targets: ≥5× frame-time improvement; draw calls
   under ~400 in town.
4. **Lock it in CI** — smoke wall-time budget + a draw-call ceiling assertion via the stats
   probe, so perf regressions fail the gate.

## M1 — MERIDIAN VERTICAL SLICE (missions 1.1–1.3, playable)

The treatment's Act 1 opening, real and playable, replacing the first-road loop beat-for-beat:
- **1.1 Dust to Dust** — the funeral, the implant, first Executor conversation. Reuses the
  title→beat machinery (beatToast/phaseState patterns); the Executor speaks through the
  prompt-bar/npc-speech channel with its own visual treatment.
- **1.2 The Reading** — the will + holdings tour + holdings UI (seeded from gameState +
  shopCatalog; boardDom's createElement/textContent pattern).
- **1.3 Lord of the Manor** — the skimming saloon manager: fire / forgive / make-an-example —
  first witnessed morality fork (npcMemory + decision pattern); seeds Legend.
- **Calico dressing pass** — Dustward main street starts reading cyberpunk-western: neon
  signage on the existing emissive/lamp systems, antenna/cable dressing, one steel-mustang
  prop. Rule: **nothing is sleek**.
- **"Westward" town — DECIDED (owner, 2026-06-11):** the free town the slice opens in (the
  treatment's **Calico Flats**) wears **WESTWARD** on its gate sign — the codename lives on
  as the place you start. The gate board already reads WESTWARD (`buildTownGate`); the rest
  of the town-name reconciliation (Dustward → Calico Flats in the HUD + the "DUSTWARD ½ MI"
  road sign) happens in this M1 reskin pass.
- **Smart-link revolver v0** — re-skin playerCombat's draw/attack with a slow-mo hook (the
  GUN tree's Deadeye Protocol seed).

## M2 — SYSTEMS OF WEALTH

- **Cash / Standing / Legend** on gameState (+ HUD chips); Standing gates in interaction/
  dialogue; Legend feeds bounty prices and Trouble frequency.
- **Trouble engine v0** — event scheduler scaled by Cash × Legend (lawsuits, kidnap
  attempts, con artists), delivered through the existing job/encounter systems.
- **Businesses v1** — saloon (gossip→quest leads) + bounty office (procedural board) on
  shopCatalog/economyServices/jobBoard; staffing via the board-modal pattern.

## M3 — ACT 1 COMPLETE, THROUGH THE SEIZURE

Missions 1.4–1.8 · Providence region skeleton (the Helios spire on the landmark tooling) ·
Director Vance · **The Seizure** with the five-asset choice branching Act 2's economy
(savePersistence already handles divergent run state).

## M4+ — THE WIDE GAME

Act 2 faction lines (questRuntime) · romance chains (npcMemory) · augments (gearCrafting) ·
full skill trees · Caldera/Drift regions · the Hearing · Act 3 Water War · four endings.
Sequenced after M3 against the treatment's **"WHAT TO DESIGN NEXT"** backlog (Act 2
beat-by-beat, skill trees, romance bios, economy math, the Seizure script — owner design
sessions, not agent improvisation).

---

## Standing rules

- Every milestone = green gate (vitest · tsc · build · loop smoke · golden) + a playable
  game at every commit.
- The golden baseline re-blesses deliberately (eyeball first), never accidentally.
- Engine modules extend in place; the carry-over map above is binding.
- The treatment is owner-authored: design questions go to Boyd, not into improvisation.
