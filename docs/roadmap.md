# RUSTWATER — The Roadmap

> **There is ONE roadmap (this file) and ONE handoff ([`NEXT-AGENT.md`](NEXT-AGENT.md)),
> and they work hand-in-hand:** this doc owns *what gets built and in what order*; the handoff
> owns *where we are right now / pick-up-here*. The treatment owns *what the game is*. No other
> roadmap/plan/TODO files — fold and delete, never accrete (owner rule).

> **Direction (owner, 2026-06-11):** the design canon is [`rustwater-treatment.md`](rustwater-treatment.md)
> — a cyberpunk-western open-world RPG (Ezra Cross, the Meridian Territory, the Executor). The
> shipped WestWard engine + Dustward world are its **substrate**: re-skin and extend progressively,
> playable at every commit, nothing tested rewritten from scratch. Public title stays WestWard
> until the vertical slice exists.

**Companion guides (NOT roadmaps — reference, kept):** [`rustwater-treatment.md`](rustwater-treatment.md)
(design canon) · [`map-editing-guide.md`](map-editing-guide.md) (world layout/coords/`__spike` hooks) ·
[`3d-art-direction.md`](3d-art-direction.md) (composition) · [`art-bible.md`](art-bible.md) (quality bar) ·
[`water-plan.md`](water-plan.md) (the Meridian water system).

Last updated: `2026-06-18` · main green at **896 vitest** · live: westward-rpg.vercel.app (the
Believability Pass is deployed) · play: `npm run play` → :5191.

---

## Where we are (status of the milestones below)

- **Believability Pass (Westward look) — ✅ SHIPPED + DEPLOYED.** Naturalistic PBR town, golden-hour
  IBL, wet/puddle street, water-tower cathedral, cyber-aging, town life, golden-hour boot. Dusk
  golden baseline re-blessed to match.
- **M0 Performance — 🟡 IN PROGRESS.** Done: route-sage flora → `InstancedMesh`, distance-cull far
  flora, shared contact-shadow material, shadow-lag fix (`shadowMap.autoUpdate=false`). Remaining:
  merged/instanced town geometry, the **<400 draw-call ceiling in CI**, the reduced-fidelity WebGL2
  demotion. (Owner: fill the foreground perf table below.)
- **World-Aliveness (R1) — ✅ COMPLETE.** Motion + sound + biome identity + occupancy all shipped:
  windmills, tumbleweeds, bird flocks, flora sway, lamp flicker, chimney smoke, walking NPCs that go
  home after dark, the full audio layer, road-verge scatter, per-biome flora tint, the Eastwater
  cattle paddock (grazing) + horses, and the dusk owl cue. Every motion system is `fdt`-gated
  (frozen under the `?visual` capture → golden-safe).

---

## ▶ NOW — tonight: build out the world + polish it

The look + the aliveness are in; the world is still **thin east of town**. Tonight = more *place*
and more *polish*, each item its own gate-green commit, golden-safe by construction (all content is
far from the dusk frame, or `fdt`-gated, or non-dusk palette). **World DRESSING is agent-buildable;
story/naming/economy canon stays the owner's (see "owner-canon" below) — prompt Boyd, don't invent.**

**World build-out** (the open range east of town reads empty — give it landmarks + reasons to ride):
1. **The Drift — exploration POIs.** The east badlands are bounty country (treatment): place a small
   set of hero props — a downed-satellite wreck, a half-buried data-vault hatch, a feral-machine
   nest — with `discoveryRuntime`/`poiSystem` hooks so riding to them pays off (loot/lore). Single
   hero meshes or instanced (M0 doctrine); far from the dusk frame.
2. **Road ruts (R3.1).** The `roadRut` kind exists but is unplaced — lay instanced wheel ruts along
   the travelled roads so they read worn, not painted. Cheap, grounds every route.
3. **Eastwater/Crossline ranch build-out.** The paddock has cattle + horses now; give it the rest of
   a working ranch — rail fences, a water trough, a windmill, hay/feed, worn paths. Dressing only.
4. **Calico Flats dressing.** West of the Pass — more restrained cyber-western kit (neon on
   clapboard, antenna/cable, one steel-mustang) on the existing emissive/lamp systems. "Nothing is
   sleek."

**Polish:**
5. **Per-time-of-day env intensity.** The golden-hour IBL is installed static at boot; modulate
   `scene.environmentIntensity` in `atmosphere.applyPalette` (dimmer/cooler at night, warm by day)
   — **pin dusk at its current value so the golden frame is untouched.**
6. **God-file extraction.** `spike.js` is ~5,300 lines (CLAUDE.md's flagged anti-pattern). Extract
   the builder fleet into `src/render3d/build/` modules — **pure refactor, verify byte-stable** via
   the golden gate + a before/after fast-capture. (A `claude/module-split` branch exists; review it
   before redoing the work.)

Pick top-down; re-bless dusk only if a change deliberately moves it (eyeball first).

---

## The carry-over map (nothing gets rebuilt)

| Shipped WestWard system | RUSTWATER role |
|---|---|
| `src/jobBoard.js` + board modal UI | Main missions, faction chains, the **bounty office** (infinite procedural board) |
| `src/render3d/questRuntime.js` | Generic quest wiring for all mission taxonomies |
| `src/npcMemory.js` | Relationships → courtship → **marriage/family** events |
| `shopCatalog` + `tradeWithVendor` + `economyServices` | **Businesses** (saloon/stable/water-hauling/print shop…) |
| `src/gearCrafting.js` | **Augments/Iron** (slots: eyes/arms/spine/heart/neural) |
| `src/progressionSystem.js` | The five trees: **GUN / IRON / WIRE / TONGUE / TRAIL** |
| `src/render3d/gameState.js` | The three meters: **Cash / Standing / Legend** |
| `frontierLayout.js` + `biomeAt`/`biome.js` + the town kit | **Meridian regions** — Dustward → Calico Flats; Providence/Caldera/Drift/Crossline on the same tooling |
| Slime + `encounterSystem` | **Feral machines** (the Drift) — same FSM, new skin |
| `worldClock` / weather / `savePersistence` (ironman) | Unchanged |
| First-road loop (`phaseState.js`) | Playable spine until M1 missions replace it beat-for-beat (tripwire: `render3d-phase-state.test.ts`) |

---

## The milestones

### M0 — Performance reset (finish it)
Draw-call-bound: full fidelity is WebGPU-only; the WebGL2 fallback demotes to reduced mode (halved
scatter/weather, no shadow casters) instead of dictating the architecture. Batch the world
(`InstancedMesh` scatter/flora/ruts — done for flora; town geometry next), shadow + distance culling.
**Targets: ≥5× frame-time, <400 draw calls in town, locked by a CI draw-call ceiling.** Foreground
perf table (owner fills from a real Chrome tab — the preview throttles and lies):

| Pose | ms/120f | Draw calls | Shadow casters | Notes |
|------|---------|------------|----------------|-------|
| town (9.5, 8.5) | _TBD_ | _TBD_ | _TBD_ | owner: foreground Chrome |
| open_range (60, 12) | _TBD_ | _TBD_ | _TBD_ | owner: foreground Chrome |
| marsh (48, 16) | _TBD_ | _TBD_ | _TBD_ | owner: foreground Chrome |

### M1 — Meridian vertical slice (missions 1.1–1.3, playable)
Act 1 opening, replacing the first-road loop beat-for-beat. **1.1 Dust to Dust** (funeral + implant +
first Executor convo — the graveside cold-open already partly exists). **1.2 The Reading** (will +
holdings tour + holdings UI). **1.3 Lord of the Manor** (the skimming saloon manager — first
witnessed morality fork). Plus the Calico dressing pass + smart-link revolver v0. Tripwire:
`render3d-phase-state.test.ts` stays green until the mission machine replaces the loop.

### M2 — Systems of wealth
Cash / Standing / Legend on gameState (+ HUD chips) · Trouble engine v0 (events scaled by Cash ×
Legend) · Businesses v1 (saloon gossip→leads + bounty office) on shopCatalog/economyServices/jobBoard.

### M3 — Act 1 complete, through the Seizure
Missions 1.4–1.8 · Providence skeleton (the Helios spire) · Director Vance · **The Seizure** with the
five-asset choice branching Act 2's economy.

### M4+ — The wide game
Act 2 faction lines · romance chains (npcMemory) · augments (gearCrafting) · full skill trees ·
Caldera/Drift regions · the Hearing · Act 3 Water War · four endings. **Art-craft track** rides here:
art-bible as the single quality source → UV/textured `.glb` proven on the WebGL2 backend → a
Mixamo-hybrid character as the first full proof → per-region kits. Sequenced against the treatment's
owner-design backlog.

**North star (post-M4, not a sprint target):** an event-sourced `(seed, input-log)` world that
streams Elder-Scrolls-scale in a browser — radiant systems, a creation kit, optional MMO ghosts. It's
the horizon the architecture already points at, not the plan.

---

## Owner-canon vs agent-buildable (so nobody improvises the story)
- **Owner-design-required (prompt Boyd):** Act 2 mission beats, the Seizure script, all four endings,
  the Hearing verdict; economy math (the debt number, water-share prices, business income); the eight
  romance arcs; the five skill trees' perks/costs; region/character NAMES and lore.
- **Agent-buildable (just do it, golden-safe + gate-green):** regions as world dressing (POIs,
  landmarks, props, ambient life, biome identity), batching/perf, UI on existing engines, polish.

## Standing rules
- Every commit: green gate (vitest · tsc · build) + golden-safe (dusk frame held, or deliberate
  re-bless eyeballed first) + playable game.
- Engine modules extend in place; the carry-over map is binding. `HERO_OBJECTS`/`FIRST_FIVE_ROUTE`
  untouched until M1 replaces the loop. `firstFrameSlabBlockers === []`. Layout floors only rise.
- The treatment is owner-authored — design questions go to Boyd, not into improvisation.
- Deploy is the owner's call (one WebGPU verify + any dusk re-bless, then push).
