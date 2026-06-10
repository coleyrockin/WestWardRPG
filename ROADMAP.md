# WestWard — Roadmap

> **Status: Active development — the 3D game IS the game.**
> The Blender/3D build ships at the site root; the legacy Canvas raycaster was deleted
> on 2026-06-10. The playable build is the authored first-road loop (Dustward → slime
> bounty → wagon salvage → return). The project is early; this document is honest about that.
>
> For the full technical execution plan (phases, port-ledger, architecture constraints),
> see [`docs/roadmap.md`](docs/roadmap.md). This file is the GitHub-facing summary.

---

## Now

Work happening this sprint, in priority order:

- **First 10 minutes polish** — per-beat scene quality review (spawn → board → sign → cache → slime → wagon) in a real browser. Smoke cache plume visibility (`dustSmokePlume.glb`), road sign text, scatter density 620→850.
- **Model quality audit** — `window.__spike.goto()` screenshot session for every beat; decide what Blender work is actually needed vs what's already good enough.
- **Blender hero models** — the gunslinger silhouette (idle + walk), a gooier weighted slime, the saloon facade. Authored via `tools/blender/` + the Blender MCP.

---

## Next

Queued for after the first-10-minutes gate passes:

- **ECS / event-sourced sim core** — fixed-timestep `stepSimulation(state, cmds, dt)` from `seed + input-log`; render-command abstraction (sim emits immutable render-state, renderer consumes it)
- **Ironman save layer** — envelope/payload split, FNV-1a integrity, `sealed` death transition, `autosaveSeq`, v1 format committed
- **Blender models** — hero character (gunslinger silhouette, idle + walk), slime (gooey, weighted), saloon facade (the dominant architecture the player visits twice). Requires Blender MCP at `localhost:9876`.
- **Port-ledger Tier A** — wire `jobBoard.js`, `lootSystem.js`, `progressionSystem.js`, `economyServices.js`, `decisionEngine.js`, `npcMemory.js` into the 3D build. All have full test coverage; port = copy, fix relative imports, wire into `spike.js`.
- **3D combat** — `combatProcessor.js` re-derived for 3D capsule hit-detection, poise/guard-break as first-class symmetric resource, 3 initial enemy archetypes on a steering substrate

---

## Later

Planned but not scheduled — Phase 3+ in [`docs/roadmap.md`](docs/roadmap.md):

- Region streaming / chunking (the spatial partition contract is already specced)
- Full narrative system: 3 ideology axes fully wired, 8-quest chain, 3 factions, 7 NPCs with memory/schedule, 10+ endings — authored through a validator-backed quest schema
- Ashfall Basin + Iron Lantern District — regions 2 and 3, each with a distinct post stack (heat-haze/bleach vs scanline/neon-rain)
- Volumetric god-rays, GPU dust motes, clustered lighting
- NG+ and run history / graveyard
- itch.io offline ZIP + Vercel release with glb/ktx2/audio MIME + CSP verified

---

## Won't Build

Explicit closed decisions — not revisited without a strong reason:

| What | Why not |
|---|---|
| Photoreal graphics (PBR, photoscanned textures) | Fights the committed cel/graphic-novel direction and is unachievable at this scale |
| Multiplayer / netcode | The event-sourced core makes it architecturally possible later; it's not a near-term goal and would inflate scope before the single-player game is done |
| React / Vue UI | No framework. The renderer is the framework. DOM shells are thin and tested at the smoke layer. |
| Reviving the Canvas raycaster | Deleted 2026-06-10 by explicit decision. One renderer, one game. Its engine modules live on inside the 3D build. |
| A Canvas → 3D "migration wrapper" / shared state bridge | Tried and reverted. One state tree, one renderer. No read-only snapshot bridge. |
| Procedural story / LLM-generated dialogue | The narrative is authored and deterministic — that's the differentiator. Procedural filler dilutes it. |
| A "framework" or engine abstraction layer | Build the game, not a framework. Prior art (starred AI game-engine repos) ships zero games. |

---

## Shipped

| Milestone | Date | Notes |
|---|---|---|
| Canvas raycaster — full game | 2025 | 7 archetypes, 8 quests, 10+ endings, 3 factions, 18 POIs, gear crafting, NG+, save migration |
| Three.js spike + NPR pipeline | 2026-05 | `WebGPURenderer` + TSL, cel ramp, Fresnel rim, Sobel ink edges, bloom, vignette, grain |
| Continuous day/night arc | 2026-05 | `sunArc()` + `lerpPalette()` — goldenHour / dusk / night smooth cycle |
| First-road loop (3D) | 2026-05 | spawn → board → sign → cache → slime fight → wagon → return, all 9 phases |
| Western building kit | 2026-06 | Procedural false-fronts: board-and-batten siding, parapet variety, shutters, porches, signs |
| goldenHour de-orange pass | 2026-06 | Deep cool split-tone (shadowTint `#0f1f48`), warm key vs cool shadow genuinely separated |
| Tier 1+2 visual pass | 2026-06 | Cel ramp `[85,145,255]`, edge strength 2.9, rim tuned, lamp flicker, cloud drift |
| Live visual tuning harness | 2026-06 | `window.__spike.setPalette/setLight/setCamera/dumpLook/captureMode/settle` |
| All hero-beat `.glb` models | 2026-06 | Wagon, slime cluster, job board, road sign, buildings — all loaded with contact shadows |
| Scatter + terrain AO | 2026-06 | 620-mote scatter, valley-AO albedo, FBM ground relief (AMP 0.48), marsh water |
| World districts | 2026-06 | Town depth + back-rank, outskirts corral, marsh reeds, board plaza, foreground frame |
| Audio layer + title screen | 2026-06 | `audioView.js` Web Audio (wind/footsteps/harmonica/slime SFX), title screen, slime breathing |
| RPG state tree + board modal | 2026-06 | `gameState.js` state tree, story-pass job board modal (boardDom/boardCopy) |
| **Canvas raycaster retired — 3D-only** | **2026-06-10** | Old game deleted (11k-line main.js + 74 modules); the Blender/3D build ships at `/`; SW kill-switch clears old caches |

---

*This document is updated when work ships, not as aspirational planning.*
