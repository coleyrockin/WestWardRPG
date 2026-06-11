# MOONSHOT — The Territory: an Elder-Scrolls-scale open world, in a browser tab

> **Status: aspirational north-star. Not the execution plan.**
> `docs/roadmap.md` is the real, sane, shippable 7-phase roadmap. *This* document is the
> impossible version — the thing we point the telescope at. Every line here is "we probably
> can't, but here's precisely how we'd try." Read it for direction, not for sprint planning.

The dream in one sentence: **boot a URL, and 30 seconds later you're standing on a mesa
overlooking a hand-and-procedurally-built weird-west province the size of Skyrim — no install,
no loading screens, every door openable, every NPC living their own day, every container
lootable, and the whole simulated world persists and is *shareable by a single seed string*.**

Oblivion's pitch was "go anywhere, be anyone, do anything." Ours adds the impossible clause:
**"…in a tab, on a mid-range laptop, streamed over HTTP."**

---

## Why this is impossible (be honest first)

Four hard walls. Everything below is how we climb each one anyway.

1. **Memory.** A browser tab gets ~2–4 GB before it dies. Skyrim's world data alone dwarfs
   that. → *We never hold the world; we stream and evict it.*
2. **Bandwidth.** Tens of GB of meshes/textures/audio can't download up front. → *Range-request
   asset streaming from a CDN, aggressive LOD/impostors, and procedural generation that ships as
   code, not gigabytes.*
3. **Persistence.** A fully-simulated world (every NPC, every dropped sword) is gigabytes of
   mutable state per save. A browser can't hold a Bethesda `.ess`. → *The event-sourced core we
   already built: the world IS a pure function of `(seed, input-log)`. The save is the seed plus a
   compressed command journal — kilobytes, not gigabytes. Reconstruct on load.*
4. **Content scale.** Bethesda had hundreds of people for years. We have a tiny team and a robot
   named Claude (Claude VI, by family count). → *Leveled lists + radiant systems + a web Creation
   Kit + generative content. Author the rules, not every rock.*

The unlock that makes the impossible merely *very hard*: **the deterministic, event-sourced
engine spine (`src/game/`) + WebGPU.** Determinism turns "persist a giant world" into "persist a
seed," "share a world" into "share a string," and "server-authoritative MMO sim" into "replay the
same pure function on a server." That one architectural bet is the whole ballgame.

---

## The pillars (what makes it Elder-Scrolls-class, not just "a 3D game")

- **Seamless province.** One continuous exterior; no cell-load stutter. Interiors stream in
  behind doors.
- **Radiant life.** Hundreds of NPCs with schedules, needs, jobs, homes, ownership, factions,
  grudges, and a crime/bounty system that actually remembers.
- **Go anywhere, be anyone.** Classless, use-based skills. Every container has loot. Every NPC can
  die — and the world notices. Physics on everything.
- **Deep, interlocking craft.** Alchemy, smithing, enchanting/hexcraft, gunsmithing, cooking,
  lockpicking, a player economy that simulates supply and scarcity.
- **A thousand stories.** A main quest, joinable faction questlines, infinitely-generated radiant
  jobs, hundreds of readable books/letters, and dungeons both handcrafted and procedural.
- **A living world.** Wildlife ecology, weather and seasons, dynamic world events, settlements
  that grow or burn based on what you do.
- **The Forge.** An in-browser world editor (our Creation Kit) and a mod/world marketplace —
  because Elder Scrolls is immortal *because of mods*.

---

## The Eras (expansive — this is a decade arc, not a quarter)

Era 0 is the real roadmap (`docs/roadmap.md`): the deterministic engine, hardcore combat, the
one beautiful region, shipped. Everything below stands on it.

### Era I — The Seamless Territory
**Dream:** Walk from the Dustward frontier to the Ironlantern megacity to the Ashfall wastes with
no loading screen, ~40 km² of explorable ground.
**Impossible part:** You can't fit or download that world.
**The cheat:**
- **Quadtree world streaming** — the map is tiles; load a ring around the player, evict the rest.
  Each tile is *generated from a seed* (terrain, roads, rock scatter) and only *hand-authored
  overrides* (towns, dungeons, set-pieces) ship as data.
- **GPU-driven rendering** (WebGPU compute): GPU frustum + occlusion culling, `InstancedMesh` /
  indirect draws for the millions of props, mesh-shader-style LOD.
- **Distant-LOD impostors** — far terrain/cities render as billboards or **gaussian splats**;
  swap to real meshes as you approach. (This is literally how Skyrim's "LOD meshes" fake the
  horizon — we just do it on a GPU 15 years newer.)
- **Asset streaming** — meshes (meshopt/Draco) and textures (KTX2/Basis) fetched on demand via
  HTTP Range requests from a CDN; cached in **OPFS** so a second visit is instant.
**Signature deliverable:** stand on the north mesa, see the Ironlantern skyline 8 km away, walk to
it without a single hitch or load screen.

### Era II — Radiant Life
**Dream:** Marshal Boone wakes, opens his store, eats at noon, drinks at the saloon at dusk, walks
home, sleeps. Steal from him and he files a bounty. The town remembers.
**Impossible part:** Simulating hundreds of agents every frame in JS.
**The cheat:**
- **Tiered simulation** — full AI only for NPCs near the player; everyone else runs a cheap
  **statistical "off-screen" sim** (schedules advance, shops restock, factions shift) on the sim
  thread. Bethesda's exact trick.
- **The AI Director** — a behavior-tree + utility-AI hybrid (we already have `behaviorTree.js`):
  needs (hunger/sleep/work/safety), ownership, faction allegiance, crime witnessing, bounty.
- **Determinism makes it cheap to persist:** off-screen NPC state is reconstructed from
  `(worldSeed, gameClock)` rather than stored per-entity.
**Signature deliverable:** a 200-NPC town that runs a believable day/night cycle at 60 fps, with a
working crime/bounty/jail loop.

### Era III — Go Anywhere, Be Anyone
**Dream:** Classless. Pick any lock, pick any pocket, climb any mesa, kill any NPC (and live with
it), haul a corpse, stack ten buckets and physics-launch yourself over a wall.
**Impossible part:** Havok-grade physics + "everything is interactive" in a browser.
**The cheat:**
- **Rapier or Jolt compiled to WASM + SIMD**, running on a worker — rigid bodies, ragdolls,
  character controller, thrown objects. Determinism-friendly (fixed-step, seeded).
- **Use-based skills** (the Elder Scrolls soul): you level a skill by *doing* it — sneaking,
  shooting, haggling, hexing. Skills feed perks; perks feed playstyles. No classes.
- **Universal interaction model**: every object is an entity with ownership + value + physics;
  "take" is "transfer ownership," and theft is "transfer witnessed by an owner's ally."
**Signature deliverable:** rob a moving train by sneaking car-to-car, get spotted, and escape on a
spooked horse — all emergent from systems, not scripted.

### Era IV — Deep, Interlocking Craft
**Dream:** Forage a desert bloom, distill it into a tonic, drink it for night-vision, enchant your
revolver with a frost hex you learned from a dead witch's grimoire, and sell the surplus when the
Ironlantern market price spikes.
**The cheat:** all pure, deterministic, node-testable rule modules — some already shipping in the
3D build (`gearCrafting`, `economyServices`), others to be authored fresh (alchemy, hexcraft,
status effects):
- Alchemy (combinatorial ingredient→effect discovery), smithing/gunsmithing (tiers + tempering),
  **hexcraft** (our magic system — sigils + reagents), cooking, lockpicking minigame.
- A **simulated economy**: regional supply/demand, caravans, market crashes (the `market_crash`
  event already exists), faction-controlled pricing.
**Signature deliverable:** an economy a player can *break* by cornering a market — and the world
reacts with shortages and banditry.

### Era V — A Thousand Stories
**Dream:** A 30-hour main quest, four joinable factions each with a full questline and a ladder to
guild-master, hundreds of books and letters with real lore, and dungeons you'll never run out of.
**The cheat:**
- **Authored spine + radiant infinity**: handcrafted main + faction quests (built in The Forge,
  Era VII), plus a **radiant quest generator** that composes objectives from world state
  (the `sideJobGenerator` grown up) so the board is never empty.
- **Branching that matters**: the ideology-axis ending engine (`decisionEngine.js`) scaled to a
  province — your choices reshape faction power and the world map.
- **Dungeons**: handcrafted set-pieces + **WFC/graph-grammar procedural dungeons** (we have
  `wfcInteriors.js`) with leveled-list loot.
- **Voice (the wild swing):** on-device or edge **TTS** for NPC barks and even dynamic dialogue,
  so a procedurally-generated quest can still be *spoken*.
**Signature deliverable:** finish a faction questline, become its leader, and watch that faction's
banners replace a rival's across the province.

### Era VI — The Living World
**Dream:** Wolves hunt deer; a drought pushes wildlife toward town; a faction war flares while
you're away and a settlement is gone when you return.
**The cheat:** ecology + weather + season as systems layered on the off-screen sim; **dynamic
world events** driven by the AI Director; settlement state (population, prosperity, control) that
evolves from aggregate player + faction actions. Determinism means "what happened while I was
away" is *computed*, not stored.
**Signature deliverable:** leave a town for ten in-game days; return to find it changed in ways no
one scripted.

### Era VII — The Forge (a Creation Kit for the web)
**Dream:** Open an editor *in the browser*, place a town, write a quest, define a creature, hit
publish, and share it by link.
**The cheat:** the engine is already data-driven and event-sourced, so the editor is "just" a UI
over the same content schemas + validators (Era-V tooling). A **world/mod marketplace**; worlds
shared as **seed + content-pack**. This is the immortality layer — Elder Scrolls lives forever
because of mods; ours is moddable from day one because it has no other choice.
**Signature deliverable:** a stranger's hand-built town, loaded into your game from a URL.

### Era VIII — The Shared Frontier
**Dream:** Optional: see another player's ghost ride past; leave a message at a grave; a
persistent shared province.
**The cheat:** the deterministic core is **netcode-ready by construction** — a server replays the
same `(seed, input-log)` authoritatively; clients send commands, receive the canonical stream.
**WebTransport/WebRTC** for transport; async "ghosts" first (cheap), live co-op later (hard).
**Signature deliverable:** two players, one persistent town, server-authoritative, cheat-resistant
because the sim is deterministic and the server owns truth.

### Era IX — The Infinite Territory
**Dream:** The province never ends; ride past the mesas and there's always more, and it's
*coherent*, not noise.
**The cheat:** generative expansion — constraint-based procedural regions + **AI-assisted content
authoring** that writes lore, names, and quests *into the validated schemas* (never raw into the
game). Infinite, but always passing the Era-V validators.
**Signature deliverable:** ride for an hour in one direction and never hit a wall or a copy-paste.

---

## The four impossibilities & our cheats (the cheat-sheet)

| Wall | Bethesda's answer | Our web cheat |
|---|---|---|
| **Memory** | cell system, load on demand | quadtree streaming + evict; world is generated, not stored |
| **Bandwidth** | ship a 60 GB disc | Range-request CDN + KTX2/meshopt + procedural-as-code + OPFS cache |
| **Persistence** | a giant `.ess` save | **save = seed + compressed input-log** (the event-sourced core) |
| **Content scale** | hundreds of devs | leveled lists + radiant systems + The Forge + generative authoring |

## What we steal from Bethesda (directly)
- **The cell/streaming model** → our quadtree tile streamer.
- **Leveled lists** → loot/encounter difficulty scales to the player, authored as data.
- **Radiant AI + Radiant Story** → the AI Director + radiant quest generator.
- **The Creation Kit** → The Forge (Era VII).
- **"Persistent but reconstructable" world** → we go further: fully reconstructable from a seed.

## Why *our* engine makes the impossible merely brutal
- **Event-sourced `(seed, input-log)` core** → tiny saves, server-authoritative MMO sim, shareable
  worlds, free replay/debugging, cheat resistance. *This is the keystone.*
- **WebGPU + TSL** → GPU-driven culling/instancing/compute; the NPR "moving graphic novel" look
  that lets us fake fidelity we can't afford.
- **Pure-logic + thin-shell + determinism gate** → hundreds of interlocking systems stay
  testable in node, headless, forever.

---

## Definition of "done" (gloriously unrealistic — that's the point)

- 40 km² seamless province, **zero loading screens** outdoors, 60 fps on a 2023 integrated GPU.
- 1,000+ scheduled NPCs; a working crime/economy/faction simulation.
- 100+ hours of authored content; *infinite* radiant content.
- A full save fits in a **tweet-sized seed + a journal**, and a whole custom world ships as a
  **link**.
- It runs by opening a URL. No install. Ever.

## How we actually start (so this isn't only a dream)
Nothing here contradicts the real roadmap — it *extends* it. The next concrete step toward The
Territory is still the boring, correct one: finish Era 0. Specifically, **the P1 save layer on top
of the `(seed, input-log)` hash** — because the day we can reconstruct a world from a seed is the
day every impossibility on this page becomes negotiable.

> Build the keystone. The cathedral is just a lot of keystones.
