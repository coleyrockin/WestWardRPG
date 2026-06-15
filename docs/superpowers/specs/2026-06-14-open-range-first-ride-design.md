# The Open Range — First Ride (vertical slice design)

**Date:** 2026-06-14
**Status:** Approved (design); pending implementation plan
**Type:** Gameplay vertical slice — the project's pivot from "systems" to "a fun thing to play"

## Why this exists

The codebase is technically healthy (766 tests, clean build) but it isn't *fun* yet — it's
infrastructure without a loop a player wants to repeat. A full audit confirmed the pattern:
many systems look shipped but aren't wired (NG+, job-board timers, progression trees, faction
meters). The owner's north star, stated plainly: **a fun, badass, open-world game** — and
specifically the **exploration & vibe** (RDR2 soul: the world, the ride, stumbling into things),
delivered as **one small vertical slice made genuinely great**, not the whole frontier.

This slice exists to prove the fun before we build anything else. If 3–5 minutes of mounted
free-roam feels badass, we have a game and everything else is "more of a thing that already
works." If it doesn't, no amount of systems or map fixes it — and we'll know now.

## North-star decisions (locked)

| Decision | Choice |
| --- | --- |
| What must feel great | **Exploration & vibe** (being somewhere; finding things) |
| Scope | **One vertical slice**, made great, then grown |
| Traversal | **A rideable horse** (the western fantasy) |
| Spine | **Free roam** — mount up, no fixed destination, discover POIs |

## The experience (the pitch)

The funeral cold-open ends. Your horse is waiting. You mount up and the world opens — mesa
ridgelines on the horizon, the Meridian reservoir catching golden-hour light off to one side,
dust haze softening the distance. No quest marker. You see a *shape* out there — a broken wagon,
a shrine — and you ride to it because you want to know what it is. You arrive, dismount, and the
place tells you something small (a line of lore, a sound, a little reward). Then you spot the
next shape. That loop — **ride → notice → arrive → small payoff → notice the next thing** — is
the whole game for this slice, and it's enough, because the riding feels good and every arrival
rewards the curiosity.

## What we are NOT building (YAGNI / leave-behind)

Explicitly out of this slice — these are the headache systems we are *not* touching here:

- Job board, the (inert) time-limit economy, faction standing meters, New Game+.
- Horse depth: bonding/stats, horse inventory, mounted combat, rearing, fall-off, horse death.
- Combat as a focus. (Light ambient threat is *optional* — see below.)
- New world generation or the full open frontier. One bounded, hand-composed area only.
- Mass density (grass swarms, dense flora) — blocked by the M0 perf doctrine; see Perf.

## Build scope — four pieces

### 1. The horse (MVP)

Goal: a mount that feels *weighty and good*, nothing more.

- **Mount / dismount** on approach to the horse (interaction prompt, press to mount).
- **Two gaits:** a steady trot and a held-button gallop, with real acceleration/deceleration so
  it has momentum and weight — not a floaty WASD box. Tune for "heavy animal," not "vehicle."
- **Whistle-to-call:** press a key and the horse paths to the player (can be a simple
  walk-to-player; no advanced pathing). This is the signature feel beat — cheap to fake, high payoff.
- **Mounted camera:** pulls back from the on-foot shoulder cam and breathes with speed. Reuse the
  existing sprint-FOV breathe (`playerController.js` SPRINT_FOV_BOOST) and shoulder-cam rig.
- **Terrain follow:** the horse rides the existing ground height (`game/world/ground.js` /
  `groundHeight`); simple gait animation (existing `animatedCharacter` / `animationHelpers`).
- Reuse the placed `steelMustang` prop location (`frontierLayout.js:225`) and `horseHitched`
  models as the visual basis.

Existing touch points: `src/render3d/playerController.js` (movement/cam), `src/render3d/interactionSystem.js`
(mount prompt), `src/render3d/animationHelpers.js`, `src/game/world/animatedCharacter.js`,
`src/game/renderer/assetManifest.js` (`horseHitched`, add a rideable variant if needed).

### 2. The range (the area)

- One bounded area, hand-composed, **~60–90 seconds across at a gallop**.
- Bounded **naturally**, not by a wall: mesa ridgelines (`heroMesaSkyline` in `frontierLayout.js`)
  and the reservoir/river edge of the Meridian water act as the fence. Player never hits an
  invisible box in the open sightlines.
- **Pinned to golden hour** for maximum vibe (see Guardrails re: visual baseline).
- Built on the existing `frontierLayout` coordinate world and the shipped open-range region; the
  Meridian reservoir/Cross Dam sits at the edge as a vista you can ride along (not a forced destination).

### 3. The discovery loop

- Reuse `src/poiSystem.js` **as-is**: `POI_KINDS` (cache, shrine, camp, wagon, mine, ruin,
  hideout, stranger), each already carrying `radius`, `regionHint`, `dangerHint`, `loreHint`,
  `returnReason`, and discovery state (`state.regions.poisDiscovered`).
- Place **5–6 POIs** across the range, varied kinds, each a **hero silhouette visible from
  distance** (that's the "what's over there?" pull).
- On entering a POI's radius (first time): mark discovered → surface its `loreHint` as one
  atmospheric on-screen line + a short sound sting + a small reward (existing loot/lore reaction
  systems where cheap; otherwise lore-only is fine for the slice).
- Spacing: the next undiscovered silhouette is always ~30–45s ride away. The range never feels empty.

### 4. The vibe layer (the multiplier)

- **Dust haze / fog** that bounds draw distance *and* sells the "Dustwater" aesthetic.
- **Wind** in whatever scatter we can afford under the perf budget; existing `windGusts` /
  `weather` systems.
- **Ambient sound:** wind, hooves, distant coyote, water near the reservoir. This is where
  "pleasant to just ride" comes from — budget real attention here, it's cheap and high-impact.
- Existing stack: `render3d/atmosphere.js`, `render3d/timeOfDay.js`, `game/world/weather*`,
  `render3d/audioView.js`.

## The one honest constraint: performance

Free-roam exploration wants density and draw distance — exactly what the WebGL2 fallback and the
**M0 perf doctrine** forbid (draw-call-bound; no flora/scatter swarms until WebGPU batching lands).

**Decision: ship the slice composition-first.** Vibe comes from fog-bounding, hero silhouettes,
light, and sound — not from density. Fog is the aesthetic, not a crutch. **M0 batching
(WebGPU + InstancedMesh grass/scatter) is the very next milestone after this slice**, specifically
to unlock grass density and longer sightlines. Fun now, lush next; no front-loaded systems slog.

## Guardrails (must not trip)

- **Additive only.** The funeral cold-open + first-road spine stay intact. This slice is reachable
  as the "ride out" after the funeral; do **not** move `HERO_OBJECTS` or `FIRST_FIVE_ROUTE`
  (`phaseState` beats trigger by kind; `render3d-phase-state.test.ts` is the tripwire).
- `firstFrameSlabBlockers` stays `[]` (`render3d-frontier-layout.test.ts`) — keep the spawn→board
  camera wedge clear; new placements respect it.
- Do **not** change dusk tone-mapping / output color space / the dusk palette the `?visual`
  golden-image baseline pins (`createRenderer.js`). Pin the slice's golden-hour mood without
  altering the guarded dusk path; if the baseline must change, re-bless deliberately
  (`npm run test:visual:update`) and eyeball it.
- If we keep **any** ambient slime as danger: **fix the audit's critical instakill bug first**
  (`encounterSystem.js:199-210` — lunge contact applies full damage every frame; one lunge kills a
  full-HP player). Otherwise an out-of-place slime ruins the vibe. Default for this slice: keep
  threat minimal or absent; the north star is vibe, not combat.
- **Tests are sacred:** any tuned-value change updates its test's expected value in the same commit.

## Success criteria (how we know it's "fun")

The slice succeeds if, played in a real foreground browser (not the throttled capture tab):

1. **The ride feels good on its own** — you'd gallop around for 30s just for the feel, before
   going anywhere.
2. **The "what's over there?" pull works** — silhouettes reliably draw the player off their line.
3. **Arrival pays off** — discovering a POI lands a small but real hit of "oh, nice."
4. **It's pleasant to exist in** — light + dust + sound make even empty wandering enjoyable.
5. **3–5 minutes in, the player wants to keep riding**, not check a menu.

These are judged by play, in a foreground browser, not by a test or a screenshot (the capture
tab is throttled and static).

## Open questions for the implementation plan

- Exact rideable-horse asset: reuse/retexture `horseHitched.glb`, or author a rider+mount rig in Blender?
- How the player first gets the horse: auto-mounted out of the funeral, or walk to the hitched
  `steelMustang` and mount? (Leaning: it's waiting, you walk up and mount — agency from the first second.)
- Reward shape for discoveries: lore-only vs. lore + a canonical item (avoid the non-canonical
  "Tonic" reward bug the audit flagged).
- Whether the bounded range is a new region record or a curated subset of the existing open-range placements.
