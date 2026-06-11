# WestWard 3D — World Realism Roadmap

> **Companion guide to [`roadmap.md`](roadmap.md) — tactical how-to, not competing direction.**
> `roadmap.md` is the single source of truth; this doc sequences how the P4 open range
> (190×150u: Eastwater Ranch, Prospector's Folly, Sunken Wash, West Pass) goes from
> *rendered scene* to *place*. Same standing as [`3d-art-direction.md`](3d-art-direction.md).
> Scope is **realism of life, not realism of rendering** — everything here stays inside the
> low-poly graphic-novel direction. Never photoreal.

Last updated: `2026-06-10` · Branch: `main`

## The target — one sentence

A frontier that visibly **moves, sounds, and is lived in** — windmills turn, wind has a voice,
ground tells you which biome you're standing in, and smoke says somebody's home.

The rule that decides every call (verbatim from `roadmap.md` / `3d-art-direction.md`): **lean
into the illustration, away from realism.** When unsure, do the thing that looks more like a
painted panel and less like an untextured game-jam. Corollary for this doc: **silhouette and
motion beat polycount; sound beats both per line of code.**

## Where we are, honestly

P3/P4 shipped 2026-06-10: open-range expansion live (`frontierLayout.js:579` —
`OPEN_RANGE_BOUNDS` = 190×150u), four authored POIs (Eastwater Ranch 17 props, Prospector's
Folly 9, Sunken Wash 8, West Pass 7), 7 connecting road segments, deterministic wilderness
scatter (`openRangeWilderness()`, 8 flora kinds), 5 far landmarks, FBM relief with corridor
masking, full NPR stack (cel + ink + grade chain + GTAO opt-in + aerial fog), day/night arc,
weather, walk-in saloon, 5 interactive NPCs. ~429 placements. The world is *big* and *looks*
right at dusk.

But it reads as a diorama, for specific fixable reasons:

- **Nothing moves at range.** Windmill blades are static geometry (`spike.js:880-919` builds
  8 fan blades; `stepWorld` never rotates them). One tumbleweed loops x=4→74 forever; the
  ranch road (x 74→130) has zero motion. Three birds circle one fixed thermal and never react.
- **The world is silent.** `audioView.js` is 12 synthesized one-shots on beat triggers. No
  wind bed, no crickets, no coyote, no biome sound. Silence is the loudest prototype tell.
- **One dirt sheet, four biomes.** Marsh, north bluffs, ranch grassland, and canyon all share
  the identical ground blend (`ground.js:120-151`); only relief height varies. Fog density is
  global.
- **Roads are drawn, not travelled.** Road-dust ribbons sit at opacity 0.058 (near-invisible,
  `spike.js:1954`) and only on FIRST_FIVE_ROUTE; the three spurs and the ranch road have no
  surface treatment. Micro-scatter covers a 34u patch around town (`scatter.js:21`) — the
  route middle (x 24–62) is untextured at close range.
- **Nobody lives anywhere.** No chimney smoke, window glow has no day/night schedule, NPCs
  patrol a 14×6u patch (`townsfolk.js:30-34`), Eastwater Ranch has zero inhabitants — no
  horses at the hitching rail, no cattle in the paddock.

Every gap above closes with code we already have patterns for. Four phases, impact-ordered,
compounding: motion and sound first because they lift every screenshot taken in every later
phase.

---

## R1 — The world moves and sounds (1–2 sessions, zero assets)

**Goal:** the three highest-legibility motion signals plus an ambient audio layer. Pure
RAF-loop and Web Audio code — no new assets, no geometry, no layout-test risk. This is the
literal first session: it changes perceived quality immediately and establishes the
`?visual`-freeze discipline for everything after.

### R1.1 Windmill rotation — `spike.js` (`buildWindmill` :880-919 + `stepWorld`)
Collect hub meshes into a `windmillRotors[]` array at scene build — exact parallel to the
existing `lampFlickers[]` collector. Restructure blades as children of the hub sub-group so
rotating the hub rotates all 8. In `stepWorld`: `rotor.rotation.z += delta * windSpeed *
gust(t, seed)` where `windSpeed` is a new scalar on each of the 3 `WEATHER_KINDS`
(`weather.js:9`) and `gust` is a 0.3 Hz seeded sine so each windmill has its own cadence.
Both windmills spin: Drifter's Windmill (`RANGE_LANDMARKS`) and Eastwater Ranch.
**Impact: highest legibility-per-line in the codebase — readable from 80u+. Effort: ~30 min.**

### R1.2 Tumbleweed expansion — `spike.js` :2542-2564
The single tumbleweed closure is 22 lines and fully parametrizable. Extract
`createTumbleweed(startX, endX, seed)`; spawn 3+: existing corridor (x 4→74), ranch road
(x 74→130 — currently the most obvious static-stage tell on the outbound route), north spur.
Seeded gust bursts (every 18–28 s, speed ×2.4 for 1.2 s) — these later couple to the audio
gust in R1.4 as one event.
**Impact: high — wind gets character; the east road stops being empty. Effort: ~45 min.**

### R1.3 Bird scatter — `spike.js` :2567-2590
Keep the thermal flock; add scatter state (`scattered`, `scatterTimer`, `scatterVec[]`):
player within ~14u → birds break orbit on diverging paths for 4–6 s, then reform. Optional
second flock over the northwest rampart (still flat `PlaneGeometry` quads, DoubleSide).
First reactive-world beat — the world answers your approach.
**Impact: medium-high. Effort: ~1 h.**

### R1.4 Wind ambient master loop — `audioView.js`
New `createAmbientLayer()` on the existing `AudioContext`: `OscillatorNode` →
`BiquadFilterNode` (bandpass, cutoff driven by `windSpeed`: clear 800 Hz / dust 1400 / storm
2200) → master `GainNode` gated on `document.visibilityState`. White-noise gust bursts fire
on the same seeded interval as R1.2 tumbleweed gusts. All synthesized — zero asset fetches,
CSP-safe (`connect-src 'self'` untouched).
**Impact: highest perceived-quality gain per line in this whole doc. Effort: ~2 h.**

### R1.5 Biome sound pockets + night bed — `audioView.js` + `stepWorld` hook
`updateAmbientPosition(playerX, playerZ)` cross-fades zone beds within ~20u: marsh creek
trickle (band-passed noise, 0.3 Hz AM) at Sunken Wash; timber moan + the **existing `creak`
SFX** (`SFX_NAMES`, `audioView.js:18-31`) on a 12–20 s random trigger at the Folly — wiring,
not authoring; synthesized cattle low at the ranch; muffled piano leak near the Lucky
Lantern. Night phase (`worldClock.js` `CYCLE_KEYS`): cricket bed fades in over dusk→night,
coyote pitch-glide every 60–120 s with random `StereoPannerNode` pan.
**Impact: every POI gets a sonic identity; night gets its own character. Effort: ~3 h.**

**R1 verification.** Headed vista script capture points: x=90 looking east (ranch windmill
turning, tumbleweed on road), x=33 approach (bird scatter). Gates: dusk golden baseline
**unchanged** — every new motion checks `if (captureMode) return` at the top of its update
block, the exact `lampFlickers` pattern; 541-test suite green; Network tab shows zero new
requests after load; no AudioContext node leak after a 10-min session.

---

## R2 — The ground speaks (1 session, shader-only, one re-bless)

**Goal:** stand anywhere and know which biome you're in before you see a prop. All three
items are shader/uniform edits batched into **one session so the dusk golden baseline is
re-blessed once, not three times**. No props move, no layout-test risk.

### R2.1 Biome colour masks — `ground.js` (`createGroundMaterial` :120-151)
`createGroundMaterial` already blends dirt/sand/scrub off world-position noise nodes. Add
three `smoothstep` zone masks (10–15 TSL lines) on the same position input: marsh
(centre x≈76 z≈58, desaturated grey-green `#7a8a6a`, valley-AO ×1.15), bluff (x≈33 z≈-29,
ochre-rust `#b87a45`), ranch grassland (x≈125 z≈12, dry sage-green `#a0a868`). Blend widths
8–12u — no hard seams to police. Export `biomeAt(x, z)` for R3 scatter consumers. This item
appeared in all three planning drafts; it exists in exactly **this** phase — do not
double-execute. Palette discipline holds: these are tonal shifts inside the warm-key /
cool-shadow scheme, not new saturated accents.
**Impact: highest-leverage single change for regional identity — affects every visible floor
pixel, zero new props. Effort: ~2 h.**

### R2.2 Per-zone fog density — `stepWorld` (one line) + `localFogBoost()`
`scene.fog.density` is already assigned per frame from palette + weather `fogBoost`. Add one
multiplicative term: `localFogBoost(playerX, playerZ)` sampling `biomeAt` — marsh +60%
(ground mist you feel before you see water), bluffs −20% (dry thin air), ranch +10%. 15u
blend radius. Spawn sits in the default zone, so the fixed-spawn dusk capture is unaffected.
**Impact: high biome distinctness at range for ~1 line of integration. Effort: ~1 h.**

### R2.3 Third FBM octave — `ground.js` (`groundFbm` :82-85)
Two lines: add octave at scale ≈0.28, weight ≈0.18 for close-range micro-relief — the
"ground is not obviously different from flat at 10 m" gap. Displacement and colour share the
same FBM, so this lands in both. **Do not** carve arroyos/notches/steps in this phase —
terrain *geometry* surgery is deferred (see Deferred) because of route-coupling risk.
Constraint check after tuning: `groundHeight` at all FIRST_FIVE_ROUTE waypoints within ±0.1u
of pre-change (corridor mask should guarantee this; assert it anyway).
**Impact: medium-high close-range credibility. Effort: ~30 min + tuning.**

**R2 verification.** Vista captures at x=40 (sage flat), x=95 (ranch road), x=130 (ranch),
plus marsh descent (x=72 z=50 heading south — fog visibly thickens) and Folly approach (fog
thins). Gates: distinct ground hue per zone in frozen frames; **re-bless the dusk golden
baseline once** (`npm run test:visual:render3d`) and commit the new hash before R3 starts —
never carry a failing golden gate forward; 541-test suite green; waypoint-height assertion
±0.1u.

---

## R3 — The roads are travelled (1 session, existing assets only)

**Goal:** close the "painted stage" close-range and outbound-route tells. Every item uses
existing `.glb` assets or extends existing loops. Layout floors are re-run; threshold changes
are upward only.

### R3.1 Rut decals on every road — `frontierLayout.js`
`mud_rut_decal.glb` is already in `public/models/`. Loop over all 7 exported
`OPEN_RANGE_ROADS` segments (`frontierLayout.js:584-596`) placing decals every 8–12u with yaw
jitter — copy-pattern placement, zero Blender. Raise the road-dust ribbon base opacity
0.058 → 0.09 (`spike.js:1954`) so the effect crosses the perception threshold.
**Impact: every dirt road reads as used. Effort: ~1 h. `roadRut ≥ 10` floor only rises.**

### R3.2 Road-verge scatter, x=24–62 — `scatter.js` + `frontierLayout.js`
The most-noted close-range gap: the route middle has no micro-scatter.
`createRoadVergeScatter(route, fromX, toX)` — second seeded pass, 60–80 motes constrained to
the shoulder band (off the carriageway, corridor kept clear), seated on `groundHeight`.
Palette: 60% roadGrass tufts, 25% pebble, 15% dry-grass spike. No cactus on the corridor.
**Impact: high — closes the untextured-at-2u read for the whole narrative route.
Effort: ~1.5 h. `minNaturalClusters 34` recount only rises.**

### R3.3 Biome scatter palettes — `frontierLayout.js` (`openRangeWilderness` :730-760)
Import `biomeAt` from R2.1; swap the flora palette array per cell — direct extension of the
existing weighted-pick logic, grid and 58% cull untouched. Drop cactus east of x=90; weight
boulders/snags north; weight reeds/deadfall south of z≈50; grass-heavy at the ranch. No new
geometry types required for the base switch.
**Impact: silhouette variety per biome at near-zero geometry cost. Effort: ~1.5 h.**

### R3.4 Freight on the ranch road — `frontierLayout.js`
Three placements, all existing assets: `wagon.glb` parked on the shoulder at x≈98 z≈10
(yawed ±8° as if pulled aside), a `barrel_crate_cluster.glb` offloaded beside it,
`wagon_wreck_hero.glb` at x≈88 — a broken-down predecessor implying long use. Contact
shadows via the existing `addContactShadow` (`spike.js:156-170`). All at x>74, outside the
authored route corridor — HERO_OBJECTS untouched.
**Impact: the east road becomes a working freight corridor for 3 placement entries.
Effort: ~30 min.**

### R3.5 Prospector's Folly set-dressing — `frontierLayout.js` (POI block :620-630)
Pure placement entries from confirmed-existing assets: 2× `barrel_crate_cluster.glb` at the
ore-cart staging area, 1× `dust_smoke_plume.glb` at the headframe base scaled 0.4× (dust-seep,
not explosion), 1× `lamp_low.glb` on the headframe added to the `lampFlickers[]` collector.
(The `mine_cart_track.glb` idea needs a Blender session — deferred.)
**Impact: "random rock pile" → "this was a working mine." Effort: ~30 min. Watch the
PointLight budget: +1 light.**

**R3 verification.** Vista captures: ranch-road approach x=100–130 (ruts + freight visible),
ground-level walk of FIRST_FIVE_ROUTE (verge motes at 2–5u, carriageway clear), Folly at
night (lamp flickering). Gates: 541-test suite green including layout floors
(`render3d-frontier-layout.test.ts`: `minNaturalClusters ≥ 34`, `roadRut ≥ 10` — both only
rise); spawn wedge clear (x ∈ [9.5,16], y ∈ [6.5,11]); dusk golden baseline unchanged
(static props outside the capture frame; verify diff anyway); draw-call smoke under ceiling.

---

## R4 — Somebody lives here (2–3 sessions; Blender isolated last)

**Goal:** occupancy signals — smoke, light schedules, human routine, weather drama — then the
two Blender assets. Code items first; Blender work is **isolated to the final session so the
asset pipeline never blocks a code session.**

### R4.1 Chimney smoke emitters — `spike.js` + `frontierLayout.js`
New `smokeEmitter` kind: pool of 4–6 `PlaneGeometry(0.3,0.3)` quads per source, opacity
0.12–0.22, grey-violet; drift +Y and +windX over ~3 s, fade, reset. Same pool pattern as
`weatherView.js` (RAIN_N=110 individual meshes — per-mesh material clones, the WebGL2 way).
Four sources = four occupied buildings: blacksmith, hotel, Lucky Lantern stovepipe, Eastwater
bunkhouse. Tint lerps warm at night via `worldClock` phase.
**Impact: smoke is the oldest "humans are home" signal. Effort: ~2 h (~60 lines).**

### R4.2 Window glow schedule — `frontierLayout.js` + RAF loop
`window_glow_panel.glb` already ships with a light entry. Add panels: hotel upper floor (4),
ranch house (2), bunkhouse (1). Drive emissive intensity off `worldClock` phase: day 0,
goldenHour 0.3, dusk 1.0, night 0.85; colour neutral `#f5dfa0` → deep amber `#f0a030`.
Phase-keyed uniform update, same loop shape as lamp flicker. Emissive only — **zero new
lights**. This answers "sealed boxes" honestly: glow implies occupation without enterable
geometry (enterable interiors stay deferred).
**Impact: strongest occupied-at-dusk signal in any illustrated western. Effort: ~1.5 h.
`minWindowLights ≥ 10` floor only rises.**

### R4.3 NPC schedule extension — `townsfolk.js` + `npcWander.js`
Extend each NPC's deterministic waypoint list: one south-frontage boardwalk waypoint, one
home-doorway waypoint. Schedule check in `update()`: `night` → reroute to doorway (the
"humans go indoors at night" beat — the single strongest occupancy signal achievable with no
new models); `day`/`goldenHour` → resume patrol. NPC-to-NPC idle facing when two pause within
2u (reuse the player `lookAt`). No new RNG; `INTERACT_RADIUS` 2.0 unchanged. Both files are
isolated from `spike.js` — low blast radius. (Ranch-resident NPCs are deferred — see below.)
**Impact: routine = life. Effort: ~1.5 h.**

### R4.4 Lamp personality + forge spill — `spike.js` (`lampFlickers` :2602-2608 + blacksmith)
Split lamps via `userData.flickerKind` assigned at placement-build: **steady** (main street,
current sine), **guttering** (Folly, West Pass, ranch boundary — per-lamp `nextDropTime`
float, intensity dips to 0.2 for 0.12 s every 4–9 s), **distant beacon** (0.4 Hz slow pulse).
Storm: guttering lamps get occasional near-blackout. Blacksmith forge: range 8→12, two-sine
flicker (3.1 + 7.3 Hz), deeper orange `#ff6820` — fire reads different from lamplight at a
glance. Intensity-only changes — **no new lights**.
**Impact: frontier-edge neglect, told in light. Effort: ~1 h.**

### R4.5 Storm cloud deck + wind-coupled sway — `atmosphere.js` :90-114 + `stepWorld`
Storm state cross-fades in 6–8 stacked dark quads (`MeshToonNodeMaterial`, 2-stop gradient —
a graphic-novel storm panel, not volumetrics) over 8 s on `weatherKind` transitions; clear
keeps the existing 3 streaks. Prop sway: tag at build time —
`mesh.userData.windSway = { axis, freq, amp }` on dead trees, hanging signs, brush — one
generic `stepWorld` loop reads the tag, no per-kind branching (the `lampFlickers`/`userData`
architecture). Storm multiplies sway ×2.5 with synchronized gusts.
**Impact: a stormy plain of swaying snags and swinging signs is the most cinematic open-range
shot available. Effort: ~3 h combined.**

### R4.6 Hitched horses + paddock cattle — Blender MCP session (last)
The only new assets in this entire roadmap; isolated here so nothing above waits on the
pipeline. `tools/blender/` scripts → export `.glb` to `public/models/` → register in
`assetManifest.js`. (a) `horse_hitched.glb`, ~120 tri, silhouette-first side profile; 2 at
the Eastwater hitching rail; head-bob ±4° period 3.2 s in the RAF loop (windmill pattern);
contact shadows. (b) `cattle.glb`, ~40 tri broadside silhouette, ink-edge eligible; 6–8
static in the paddock (x 118–128) seated via `groundHeight`; optional 0.04-amplitude breath
sway. Add both to `GROUNDABLE_KINDS`. Cattle read at 40u+, horses at 20u+ — Eastwater stops
being a ghost town.
**Impact: minimum viable "inhabited ranch." Effort: ~45 min Blender per model + ~1 h
placement/code.**

**R4 verification.** Vista captures: dusk town from spawn (smoke columns frozen at cycle
frame 0, hotel windows amber), night walk Main Street → Folly (steady vs guttering lamps),
storm pan across open range (`setWeather('storm')` — deck + synchronized sway), x=80 looking
east (cattle silhouettes against sky, horses at rail, windmill turning behind). Gates: every
new animation registered in the `?visual` freeze guard; **re-bless dusk baseline once** if
smoke/glow shifts the spawn frame, document the hash in the commit; 541-test suite green
(`minNpcSilhouettes ≥ 6`, `minWindowLights ≥ 10` hold); PointLight count within budget (R4
adds zero new lights); frame-time smoke under 16.6 ms on the integrated-GPU target with sway
+ smoke + deck active.

---

## Standing perf budget + guardrails (all phases)

**WebGL2 backend is the floor.** No `InstancedMesh`, no `Lines`/`Points`, no shared
materials — every particle, mote, smoke quad, cloud quad, horse, and cow is an individual
`Mesh` with its own material (the `weatherView.js` pattern). That makes the **draw-call
ceiling the binding constraint**: the render smoke asserts draw-call / frame-time / triangle
/ light counts and the build fails on regression. Current placement baseline ≈429 — every
phase above adds meshes, so check the smoke numbers *per phase*, not at the end. If a phase
busts the ceiling, cut mote counts — **never** trade the NPR stack (ink edges, grade, post)
for perf headroom; cut polygons instead (`roadmap.md` rule).

Non-negotiables, checked every session:

- **Dusk golden baseline** — `npm run test:visual:render3d`. Every continuous motion (rotor,
  tumbleweed, smoke, sway, deck drift, water) checks the `visualCapture` freeze flag, exact
  `lampFlickers` pattern. Re-bless only at the two sanctioned points (end of R2, end of R4),
  commit the hash.
- **541-test suite green** before "done" — including
  `tests/render3d-frontier-layout.test.ts` floors: `minNaturalClusters 34`, `roadPlank ≥ 12`,
  `roadRut ≥ 10`, `minProductionStreetProps 36`, `minStorefronts 6`, `minNpcSilhouettes 6`,
  `minWindowLights 10`. This roadmap only raises floors.
- **Spawn wedge inviolable** — no slab-kind prop inside x ∈ [9.5,16], y ∈ [6.5,11];
  `firstFrameSlabBlockers` stays `[]`.
- **HERO_OBJECTS / FIRST_FIVE_ROUTE untouched** — everything here is passive dressing; no new
  beat triggers, no moved waypoints (`phaseState.js` coupling).
- **One Three.js instance** — node materials from `three/webgpu`, TSL from `three/tsl`.
- **CSP clean** — all audio synthesized, all assets same-origin `.glb`, textures embedded. No
  fetches added anywhere in this doc.
- **Illustration over realism** — `MeshToonNodeMaterial` / `MeshBasicNodeMaterial` only. No
  PBR, no normal maps, no texture imports. Don't add detail to fix flatness — add contrast.

---

## Deferred / out of scope

Cut deliberately — each was weighed and lost on impact-per-session or risk:

- **Terrain geometry surgery** — arroyo channels, West Pass V-notch, Folly bluff step. All
  carry FIRST_FIVE_ROUTE / prop-seating coupling risk (9 Folly props seat via `groundHeight`;
  the pass road threads the notch zone) with no R1–R3 unlock. Revisit only after R2 proves
  biome identity lands without moving a single vertex.
- **Sunken Wash water + creek seep** — needs a `water.js` multi-plane factory refactor with
  `world-water.test.ts` risk; the marsh already reads via R2 colour + fog. Revisit post-R4.
- **Marsh mist planes** — per-zone FogExp2 (R2.2) is 1 line vs 12+ drifting meshes for
  comparable range read. Evaluate only after R2.2 ships.
- **Lizard skitter** (`lizard.glb`) — reads at 3u; cattle read at 40u. Wrong asset to spend a
  Blender session on. Maybe a post-R4 charm pass.
- **Ranch-resident NPCs** — `townsfolk.js`/`phaseState` coupling makes extending NPCs to
  x=125+ riskier than it looks; R4.1/R4.2/R3.4 say "inhabited ranch" with zero system risk.
  Dedicated NPC-range sprint later.
- **Laundry lines** — the cable wants `LineSegments`, which don't render on the WebGL2
  backend; workaround geometry + hotel spawn-wedge proximity makes this mid-risk dressing.
- **Road-following bird group** — state-machine cost for marginal gain over R1.3 scatter.
- **Talus skirts on the far buttes / rock-strata tinting** — backdrop-distance items the
  player never approaches; draw calls spent where boulders don't register.
- **`mine_cart_track.glb`** — only new-asset item in the Folly dressing; fold into a future
  Blender batch, not its own session.
- **Enterable interiors beyond the Lucky Lantern** — a P5+ systems question (doors, interior
  light budget, camera), not a dressing item. R4.2 window glow is the honest interim answer.
- **Regional weather kinds / Ashfall / Ironlantern anything** — Phase 6 territory per
  `roadmap.md`. This doc ends at the edge of the Frontier region.