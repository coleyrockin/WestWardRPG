# WestWard 3D — Visual North Star

> What will make this demo look *amazing*, not just "a working prototype."
> Grounded in the current Three.js build (`spikes/render3d.html` → `src/render3d/`),
> honest about the gap, and ordered by impact-per-effort so it doubles as a punch-list.
> This is an **art-direction spec**, not a roadmap — execution order lives in
> [`roadmap.md`](roadmap.md).

## The target — one sentence

A **stylized dark-western graphic novel you can walk through**: *Oblivion meets Weird
West meets a low-poly inked comic*. Confident shapes, a tight palette, dramatic light,
and a world that feels hand-drawn and alive — not photoreal, not generic-low-poly.

The rule that decides every call: **lean into the illustration, away from realism.** When
unsure, do the thing that makes it look more like a painted comic panel and less like an
untextured game jam.

## Where we are, honestly

After the demo-polish pass the build reads warm and legible (golden-hour light, pulled-back
camera, a populated main street, a working first-road loop, a slick HUD). But it still reads
as a *prototype*, for specific, fixable reasons:

- **Placeholder geometry.** Buildings are plain boxes, the hero is a blocky figure, props are
  primitives. Silhouettes have no character — this is the #1 "prototype" tell.
- **Monochrome amber.** Almost everything is one warm hue. No color contrast = no depth, no
  drama, no focal hierarchy.
- **Everything floats.** No contact shadows; props and the hero sit *on* the ground plane
  instead of being *grounded* in it.
- **The render isn't committed to its style.** The NPR cel + ink pass is good but subtle; it
  hedges between "stylized" and "plain." A graphic-novel look has to be *loud*.
- **Static.** Beyond faint dust motes, nothing moves. No life, no atmosphere.
- **No sound.** Half of "amazing" is missing entirely.

None of this is architecture. The engine, loop, shader stack, and model pipeline all work.
What's missing is **built and tuned**, not **fixed**.

## The pillars — what makes it amazing (in priority order)

### 1. Silhouette & model character  ·  highest impact
Replace placeholder boxes with **hand-authored low-poly hero models** that read in
silhouette. The pipeline already exists — the wagon ships a `wagon_wreck_hero_v2.glb` and the
job board a `jobBoard_hero.glb` via `src/game/renderer/assetManifest.js`; the layout already
prefers a model when one exists (`modelFor(kind)` in `spike.js`). Extend that to the shapes
the eye lands on most:
- **The hero character** (see pillar 7) — most important single asset.
- **The 3–4 nearest buildings** (saloon, store, assay, watchtower) — distinctive rooflines,
  porches, leaning posts. One great saloon beats ten boxes.
- **The slime** — a gooey, wobbling silhouette with weight, not a green lump.
Author in Blender (the project has a Blender MCP pipeline), keep poly counts low, bank
silhouette over detail. *Files: `assetManifest.js`, `frontierLayout.js` kinds, `/public/models/`.*

### 2. A confident, limited palette  ·  highest impact, low effort
Monochrome amber is the biggest cheap loss. Commit to a **deliberate 3-zone palette**:
- **Warm key** — the golden sun (have it).
- **Cool shadow** — push dusk blue/violet into the shadow tint so shadows *read* against the
  warm light. The split-tone is already there (`postStacks.js` shadowTint `#2a3a56`) — make it
  bolder, and lift the hemisphere ground out of near-black.
- **1–2 saturated accents** — lantern amber, slime green, a danger red. Accents only on things
  that matter (lights, threats, objectives) so the eye is *led*.
Color contrast is the single highest production-value-per-hour change. *Files: `timeOfDay.js`
palettes, `postStacks.js` split-tone/grade, `atmosphere.js` hemi.*

### 3. Ground everything — contact shadows  ·  high impact, low effort
The floaty look dies the moment objects cast a soft shadow where they meet the ground. Add a
cheap **blob/contact shadow** (a dark soft-edged decal or a single shadow-catching plane)
under the hero and every hero prop. This alone makes the scene feel *solid*. *Files: prop
instancing in `spike.js`, a shared shadow-decal mesh.*

### 4. Commit all the way to the graphic-novel render  ·  high impact
The look's identity is *inked comic*. Push the NPR stack from subtle to **signature**:
- **Bolder, cleaner ink outlines** — consistent weight, slightly thicker on hero shapes
  (`postStacks.js` Sobel `edgeStrength` 2.65 → push, tune lo/hi for clean lines).
- **Flatter cel banding** — fewer, harder steps in the toon ramp (`nprMaterial.js` gradient
  `[55,100,255]`) so surfaces read as flat ink fills.
- **A paper/halftone whisper** — a faint paper grain or shadow-only halftone dot screen
  overlay sells "printed comic." Add as a final post pass.
- **Keep** the god-rays and bloom — they're already doing real work.
*Files: `nprMaterial.js`, `postStacks.js`.*

### 5. Atmosphere & motion — make it alive  ·  high impact
A still frame can be pretty; a *living* one is amazing. Layer cheap motion:
- **Drifting dust + heat shimmer** in the low sun; **lantern flicker** (subtle intensity
  noise on the lamp point-lights); **wind** sway already exists on flora — exaggerate it.
- One **slow tumbleweed** crossing the road, **distant circling birds**, a far **dust devil**.
- These are particles + tiny per-frame noise, not new systems. *Files: `atmosphere.js`,
  `src/game/world/weather.js`, the lamp lights in `spike.js`.*

### 6. Cinematic camera & composition  ·  medium impact
The demo should **open like a film**. On spawn, a 2–3s eased establishing push-in from a wide
hero angle settling into gameplay framing (the smoothed camera from the polish pass makes this
trivial now). Strengthen composition: leading lines down the road to the lit board, a
**foreground depth element** (a near rock/post/cart) framing the opening shot, rule-of-thirds
hero placement. *Files: `playerController.js` (camera), `frontierLayout.js` (foreground props).*

### 7. The hero character  ·  high impact (its own pillar — you stare at it the whole time)
A **readable gunslinger silhouette**: wide hat, long coat that catches wind, the sword on the
back. Then motion: idle breathing, a confident weighted walk, **dust kick on footfalls**, a
draw flourish. The avatar is on screen every second — it must have character and weight.
*Files: the character model + `character.animate()` referenced in `playerController.js`,
footfall particles.*

### 8. Signature staged moments  ·  medium impact
A 5-minute demo needs 2–3 beats people remember. Stage them:
- **The reveal** — spawn into the golden-hour town with the establishing push-in (pillar 6).
- **The slime fight** — lean on the existing juice (`hitFx.js`: hit-stop, camera shake, goo
  burst) and crank it: a meaty hit-stop, a green goo splatter, a slow-mo final blow.
- **The wagon salvage** — the map-scrap flourish (`createMapScrapReward` in `spike.js`) with a
  light bloom pop and a satisfying chime.

### 9. Sound — the missing half  ·  high impact, currently absent
The spike has **no audio**. Even a thin layer transforms it: wind bed, boot footsteps,
lantern hum, a lonely harmonica/guitar sting on the reveal, a wet *thwack* + splatter on slime
hits, a chime on the map scrap. Audio is half of "amazing" and it's at zero. *New: a small
render3d audio module — shipped as `audioView.js` (synthesized Web Audio, zero asset fetches).*

## Punch-list (impact × effort)

| Move | Impact | Effort | Pillar |
|---|---|---|---|
| Bolder palette: cool shadows + accent colors | ★★★ | S | 2 |
| Contact/blob shadows under hero + props | ★★★ | S | 3 |
| Push the ink + cel + paper-grain grade | ★★★ | S–M | 4 |
| Establishing push-in camera on spawn | ★★ | S | 6 |
| Atmosphere: dust, flicker, tumbleweed, birds | ★★★ | M | 5 |
| Hero character model + walk/idle/dust | ★★★ | L | 7 |
| Hero building models (saloon, store, tower) | ★★★ | L | 1 |
| Slime model + crank the combat juice | ★★ | M | 1,8 |
| A thin audio layer | ★★★ | M | 9 |

**Start here (a single afternoon, no new art):** palette + contact shadows + grade push +
establishing camera. Those four are all small/medium, need zero new models, and together move
the build from "prototype" to "intentional" — the fastest visible jump. Models, character, and
audio are the bigger lifts that take it from "intentional" to "amazing."

## Progress log — 2026-06-02 foundation + polish pass

Landed (committed + pushed to `main`, render3d-only, suite green at 1251):
- **Readable lighting** — fill light 0.34→1.0, raised + neutralized the sun (no more red raking
  shadows), exposure/contrast/vignette rebalanced. Fixed "too dark to see."
- **Real building scale** — `heightMul`/`scaleY` (tall-without-wide) + storefront proportions;
  buildings tower over the 1.8u hero without footprint collisions. Fixed "cardboard boxes."
- **Per-building variety** — height + yaw jitter + road-facing **signboards** (from each model's
  real bbox). Less stamped-clone.
- **Cleaner road**, warmer desert ground, **richer color grade**.
- **Establishing push-in** — wall-clock-driven (survives rAF throttling).
- **Beat staging** — Smoke Cache (lantern + signal smoke + crate stash) and the slime arena
  (marsh-edge clearing) now read as authored scenes; the wagon lamp lights the wreck.
- **Dev teleport hook** (`window.__spike`) to review every beat without driving.

Gated on you (can't be done from the throttled headless preview):
- **Real building geometry** → needs **Blender running** with the MCP addon (`localhost:9876`).
  Code-side signboards are as far as primitives go cleanly; the false-front cornice/porch
  augmentation was tried and reverted (chunky slabs). This is pillar 1, the biggest payoff.
- **Motion / combat / push-in feel** → needs a **real-browser playtest at full framerate**;
  the preview tab throttles the render loop so animation/combat can't be judged here.
- **Atmosphere, hero character, audio** (pillars 5/7/9) — code is sound but the payoff is motion
  + sound, best authored against a real-browser session.

### Districts pass — map content (later 2026-06-02, all pushed, suite green at 1251)

Turned the map from a town-on-an-empty-plane into a frontier with depth and districts
(layout-only, `frontierLayout.js`; every array placed outside the guarded test boxes):
- **Town depth** — north + south **back-rank** buildings behind the storefront strips
  (staggered, smaller, in the front-row gaps) so the town reads as overlapping masses, not
  two facade walls.
- **Per-district landmarks** — four interior buttes give the outskirts / marsh / wagon legs a
  tall "you are here" silhouette (town had only the watchtower).
- **Outskirts district** — corral + lone outpost + abandoned wagons + scrub: leaving town now
  reads as crossing into the frontier.
- **Marsh district** — reeds line the water's shore, snags + a half-sunk boulder in the
  shallows, mud on the road approach: the slime/wagon climax reads as a wetland crossing.
- **Board plaza** — townsfolk reading the bounties + supplies make the opening focal point the
  lively heart of town.
- **Opening foreground frame** — a thin near-field snag + cart at the spawn shot's edges (subtle).
- **Less-red foreground** — lifted the ground dirt base + shade floor so the near field stops
  crushing to red murk.

Verification note: the preview tab throttles hard once the scene is this dense — `window.__spike`
teleport + screenshots become unreliable mid-session. Composition was verified at the spawn view
and a couple of teleported beats; judge motion/density at full framerate in a real browser.
Next map wins (see [`map-editing-guide.md`](map-editing-guide.md)): a town cross-street, road
shaping (curve / marsh plank-crossing), and skyline color variety once real building models land.

## Anti-goals — what NOT to do

- **Don't chase realism.** No PBR, no photoscanned textures, no realistic lighting. Every hour
  spent toward realism is spent away from the comic look.
- **Don't add detail to fix flatness — add *contrast*.** The fix for "flat" is color + light +
  ink, not more polygons or props.
- **Don't re-clutter.** The world should feel composed and confident; resist filling space.
- **Don't gold-plate one corner.** Spread the polish evenly across the 5-minute path; a demo is
  judged by its weakest beat.
