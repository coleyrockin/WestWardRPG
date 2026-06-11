# WestWard → RUSTWATER — Roadmap

> **Status: Active development — adopting the RUSTWATER direction (working codename).**
> The project is evolving from the WestWard western demo into **RUSTWATER**, a
> cyberpunk-western open-world RPG (design treatment:
> [`docs/rustwater-treatment.md`](docs/rustwater-treatment.md)). The shipped engine and
> the Dustward world are the substrate — re-skinned and extended progressively, playable
> at every commit. The public title stays WestWard until the cyberpunk-western vertical
> slice exists. The project is early; this document is honest about that.
>
> Engine execution plan: [`docs/roadmap.md`](docs/roadmap.md). This file is the
> GitHub-facing summary.

---

## Now

- **M0 — Performance Reset** (first, non-negotiable): foreground perf measurement →
  require WebGPU (WebGL2 fallback demoted to reduced fidelity) → batch the world
  (instancing, merged statics, material pools, shadow culling) → CI perf budget.
  The game is draw-call-bound today; this is the fix, not an engine switch.
- **M1 — Meridian Vertical Slice**: the treatment's missions 1.1–1.3 playable (the
  funeral + the Executor, the holdings reading, the first morality fork), plus Dustward's
  first Calico Flats dressing pass — neon on clapboard, nothing sleek.

## Next

- **M2 — Systems of Wealth**: Cash / Standing / Legend meters, the Trouble engine v0
  (the richer and louder you are, the more the world comes for you), businesses v1
  (saloon + bounty office) on the shipped shop/job engines.
- **M3 — Act 1 through THE SEIZURE**: missions 1.4–1.8, Providence skeleton, Director
  Vance, and the five-asset Seizure choice that branches Act 2.

## Later

- Act 2 faction lines (Helios / Tally Men / Freeholders / Circuit Riders), romance +
  marriage + family (8 courtable characters), augments ("Iron"), the five skill trees
  (GUN/IRON/WIRE/TONGUE/TRAIL), Caldera + Drift regions, the Hearing, Act 3 Water War,
  four endings.
- Design backlog owned by the owner (treatment §WHAT TO DESIGN NEXT): Act 2 beat-by-beat,
  full skill trees, romance bios, economy math, the Seizure script.

---

## Won't Build

| What | Why not |
|---|---|
| Engine switch (Unity/Godot/Babylon/…) | Evaluated 2026-06-11 when lag was diagnosed: the bottleneck is unbatched draw calls, not Three.js. M0 fixes the cause; a switch would cost months and land in the same optimization work. |
| Photoreal graphics | The committed look is stylized — cel/ink with rusted chrome. "Nothing is sleek" ≠ photoreal. |
| Multiplayer / netcode | Single player by design (treatment line one). |
| React / Vue UI | No framework. DOM shells stay thin (`createElement`/`textContent`), tested at the smoke layer. |
| Reviving the Canvas raycaster | Deleted 2026-06-10. One renderer, one game. |
| Procedural story / LLM-generated dialogue | The narrative is authored and deterministic — that's the differentiator. |
| A "framework" or engine abstraction layer | Build the game, not a framework. |

---

## Shipped (the WestWard era — now the RUSTWATER substrate)

| Milestone | Date | Notes |
|---|---|---|
| Canvas raycaster — full game | 2025 | The original prototype (since retired) |
| Three.js + NPR pipeline | 2026-05 | `WebGPURenderer` + TSL, cel ramp, ink edges, bloom, godrays |
| First-road loop (3D) | 2026-05 | spawn → board → slime bounty → wagon → return |
| Western building kit + districts | 2026-06 | Procedural false-fronts, landmarks, marsh, outskirts |
| Canvas retired — 3D-only | 2026-06-10 | Old game deleted; Blender/3D build ships at `/` |
| Daylight + hybrid look | 2026-06-10 | Day palette (the game had no daytime!), 5-step soft-cel ramp, de-orange grade, player-following shadows |
| Dustward rebuilt — dense main street | 2026-06-10 | Gate arch, continuous frontage, board plaza, anchor pair, church vista |
| Wave 1 world expansion | 2026-06-11 | Biome ground, world minimap, ranch animals, tumbleweeds + bird flocks, quest+shop engine layers, ambient audio |
| **RUSTWATER adopted as direction** | **2026-06-11** | Owner-authored treatment is canon; roadmap rebuilt around it (M0 perf → M1 slice) |

---

*This document is updated when work ships, not as aspirational planning.*
