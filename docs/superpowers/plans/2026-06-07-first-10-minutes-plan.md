# WestWard — First 10 Minutes: Execution Plan

> **Scope:** Make the first-road loop read as "a real game" rather than "a working prototype."
> Every beat on `spawn → board → sign → cache → slime → wagon → return` should feel like
> an authored, intentional scene — not a waypoint on a test map.
>
> **Plan only — no building yet.** Verify in a real browser before each execution step.
> Last updated: `2026-06-07`

---

## 1. Honest current state

After auditing the actual code (not assumptions), the build is further along than the gap list in
`roadmap.md §3.5` suggests. Many items are done:

**Already in place:**
- NPR pipeline: WebGPU + TSL, cel ramp `[85,145,255]`, ink edges, bloom, vignette, grain ✅
- goldenHour deep cool split-tone (shadowTint `#0f1f48`, strength 0.48), warm key vs cool shadow ✅
- Camera-side fill light, lamp flicker in `stepWorld` ✅
- Live tuning harness (`__spike.setPalette/setLight/setCamera/dumpLook/captureMode`) ✅
- Contact shadows on **every** builder — procedural buildings, .glb models, all hero props ✅
- Beat props fully authored: board plaza, smoke cache, slime tell, broken wagon, return notice ✅
- **All hero-kind models have .glb files loaded:** `jobBoard_hero.glb`, `slime_trail_hero.glb`,
  `marsh_slime_cluster.glb`, `wagon_wreck_hero_v2.glb`, `sign.glb` ✅
- Main-street buildings use the **procedural western kit** (board-and-batten siding, shutters,
  varied parapets, storefront windows, porches) — not placeholder boxes ✅
- Map-scrap reward: floating PointLight + pulsing glow already implemented ✅
- Hero character: `character.glb` loads via `createAnimatedCharacter` ✅
- Road ruts: `mud_rut_decal.glb` + `road_rut_strip.glb` in the manifest ✅
- World districts: town depth, outskirts, marsh, board plaza all authored in frontierLayout.js ✅

**The real gaps (honest):**

| Gap | Impact | Status |
|---|---|---|
| **Zero audio** | ★★★ — half of "amazing" | `audioView.js` does not exist |
| **Slime mesh animation** | ★★ — fight beat feels dead without it | Static mesh in stepWorld |
| **Road surface color variety** | ★ | Flat vertex color, ruts but no hue/tone variety |
| **Scatter density** | ★ | 620 motes, could be 850 for richer ground cover |
| **Model quality (unknown until real browser)** | ★★★ | Can't assess `.glb` visual quality headless |
| **Character idle/walk animation** | ★★ | `createAnimatedCharacter` loads model; unclear if animations play |

---

## 2. The biggest gap: Audio (T2b)

**Zero audio.** Currently the game is silent — no wind, no footsteps, no music, no SFX.
This is half of "amazing" and it's at absolute zero. Audio is the highest-leverage single
task remaining that requires no art assets.

### New file: `src/render3d/audioView.js`

Single AudioContext guard (autoplay policy). Web Audio API only — no external libs.
THREE.PositionalAudio + THREE.AudioLoader for spatialized cues; raw AudioContext.createOscillator
for procedural SFX if no files are available.

**Six cues in implementation priority order:**

#### Cue 1 — Wind bed
- Looping low-pass pink noise; single non-spatial ambient
- `AudioContext.createBufferSource` with procedurally generated buffer (no asset needed)
- 0.12 gain; filter `AudioContext.createBiquadFilter({ type: 'lowpass', frequency: 800 })`
- Plays from spawn init; fades in over 2s

#### Cue 2 — Boot footsteps
- Triggered when player is moving (`playerController.isMoving` or velocity > threshold)
- Two interleaved crisp transients (dirt crunch), rate ~1.8 steps/sec at walk pace
- Procedural: short noise burst + bandpass centred at 200Hz; no asset needed
- Variant on wood planks (higher pitch, hollow) when on road plank terrain

#### Cue 3 — Harmonica sting
- One-shot on spawn reveal (after `camIntroSettled = true`, ~2.5s into push-in)
- Short 4-note descending phrase, FM synthesis or a short audio file
- Fades out at 5s; never repeats in a run
- Implementation note: if using WebAudio synthesis, model as 4 FM oscillators with
  detune + amp envelope — approximates mouth harmonica without any asset

#### Cue 4 — Lantern hum
- THREE.PositionalAudio on each lamp group
- Low 60Hz drone + subtle 3rd harmonic; very low gain (0.08)
- Audible only within ~3u of each lamp
- Attach in `spike.js` alongside the existing lamp PointLight attachment

#### Cue 5 — Slime hit SFX
- Triggered from `encounterSystem` on each player hit to slime (the `onHit` callback path)
- Wet thwack: noise burst + low-freq thud + a green "splat" resonance (~300Hz ring)
- Plays from slime position (PositionalAudio on the slime's Group)

#### Cue 6 — Map-scrap chime
- Triggered from the wagon salvage reward phase transition
- 3-bell ascending arpeggio: pure sine tones at 880 / 1046 / 1318 Hz
- Short decay (300ms per note), high pass to keep it clean
- The "you found a thing" moment — should feel rewarding

### Integration points in spike.js

```js
// Import
import { createAudioView } from './audioView.js';

// After scene init:
const audio = createAudioView(camera, { anchor: FRONTIER_ANCHOR });
audio.start(); // begins wind bed on first user gesture

// In stepWorld:
audio.update(dt, {
  playerVelocity: controls.velocity,  // for footsteps
  phase: loopState.phase,             // for phase-gated sting
  camIntroSettled,                    // for harmonica timing
});

// In encounter onHit:
audio.sfx('slimeHit', slimeMesh.position);

// In phase transition to wagon_salvage:
audio.sfx('mapScrapChime');
```

### Autoplay policy handling

Web browsers block audio until a user gesture. Wrap `AudioContext.resume()` on the first
`pointerdown` or `keydown` event. The `createAudioView` function should accept a flag
`{ waitForGesture: true }` and hold all cues until `audio.start()` is called post-gesture.

### File: `src/render3d/audioView.js` (new — ~200 lines)

No external audio files required for the base layer — all six cues are synthesizable in
Web Audio API. This means zero asset pipeline complexity and no MIME/CSP issues on Vercel.
A real `.ogg`/`.mp3` audio pass (music, polished SFX) is the Phase-4 art-pipeline work;
this layer is the "thin" version that eliminates the silence before then.

---

## 3. Beat-by-beat assessment

The `FIRST_FIVE_ROUTE` defines 8 beats. Assess each with
`window.__spike.goto('beatName')` + screenshot in a **real browser** (not the throttled
preview — motion + models don't render correctly there).

### Beat 0 — Spawn (x:9.5, y:8.5)

**What should read:**
- Establishing push-in (2–3s eased from wide angle) settling into gameplay framing
- The board plaza ahead: townsfolk reading bounties, warm lamp over the board
- Foreground frame: near snag + cart at frame edges
- Background: town skyline (procedural western buildings with varied parapets)

**Code verify:**
- Push-in is wall-clock-driven (`camIntroSettled`) — should work even in throttled preview
- NPC silhouettes: `npcSilhouette` kind maps to `npc_silhouette.glb` — are there enough?
- Board plaza lamp (6.8 intensity PointLight at height 2.3) — reads warm against goldenHour sky?

**Likely gap:** Model quality unknown until real browser. If `character.glb` is a gunslinger
shape → great. If it's a capsule with a hat → T3a Blender work is the fix.

### Beat 1 — Job Board (x:13.0, y:5.65)

**What should read:**
- Player approaches the board; warm lantern over it; Boone-ish NPC presence
- Board text visible; interaction prompt triggers
- Board reads as the social hub of the opening scene

**Code verify:**
- `buildJobBoard` lamp at intensity 6.8 within `lampFlickers` range (≤12) — it should flicker
- `jobBoard_hero.glb` model at scale 1.06, yaw π/2 — check orientation (should face player)
- Contact shadow under board — ✅ already in builder

**Gap:** Board model visual quality unknown. The `buildJobBoard` procedural builder is the fallback
if `jobBoard_hero.glb` fails to load — confirm load succeeds.

### Beat 2 — Road Sign (x:24.0, y:6.3)

**What should read:**
- Sign plank readable; text legible (currently uses `sign.glb` model)
- Player is now outside town; road shoulders visible, frontier ahead
- Transitional moment: buildings behind, empty road ahead

**Code verify:**
- `sign.glb` model at scale 1.35 — does it actually have readable text/markings or is it
  a blank plank? If blank, text needs to be added (a `makeLetterSprite` decal or a texture).
- Road ruts at this point on the route: `mud_rut_decal.glb` + `road_rut_strip.glb` kinds — check
  they appear along the road segment between town and sign.

**Likely gap:** Sign text. The `sign.glb` model is probably a blank board. Needs either a
texture-swapped variant or the procedural signboard text approach (letter sprites).

### Beat 3 — Town Bark (x:32.0, y:9.2)

**What should read:**
- An NPC silhouette at the town edge, delivering a warning
- The "you're leaving safety" feel: town receding behind, open scrubland ahead
- Outskirts district visible (corral, abandoned wagons, scrub)

**Code verify:**
- `townBark` kind — what's in frontierLayout.js at this position? A placed NPC silhouette?
- Outskirts props (corral fence, abandoned wagons, scrub clusters) — verify they appear in
  the view at this beat position

**No blocking gap identified — assess visually.**

### Beat 4 — Smoke Cache (x:41.0, y:13.2)

**What should read:**
- Lone crate/chest in the scrubland; a lantern over it; wisps of smoke
- Warm beacon visible from the road before you reach it (leading the player forward)
- Pickup interaction: crate opens, lamp flickers, smoke plume rises

**Code verify:**
- `buildSmokeCache` is procedural (crate + cone wisps + lantern light)
- Smoke wisps: three small cones at `opacity 0.04–0.16` with `emissive: "#7d756a"` —
  this is VERY subtle. May need more visible smoke.
- Lantern PointLight at the cache — is it in `lampFlickers` (intensity ≤ 12)? Check it flickers.
- Contact shadow under crate ✅

**Gap:** Smoke is too subtle (opacity 0.04). Real signal smoke should be more visible.
Consider: `dustSmokePlume.glb` model (`/models/dust_smoke_plume.glb` exists) placed at the
cache instead of the cone wisps. It's already in the asset manifest.

### Beat 5 — Slime Tell (x:48.2, y:16.4)

**What should read:**
- Slime trail smears on the ground; marsh environment encroaching
- The "something went wrong here" atmospheric moment before the fight
- Water visible ahead; reeds; ominous green glow

**Code verify:**
- `slimeTell` maps to `slime_trail_hero.glb` — visual quality unknown
- The procedural `buildSlimeTell` (smear circles, reeds) is the fallback — actually decent
- Green PointLight at 0.6u height, intensity 5.0 — visible enough? Check at beat position
- Marsh water visible from here (water plane at x:48, z:19) — check composition

**Gap:** `slime_trail_hero.glb` model quality unknown. If it's bland, the procedural fallback
may actually look better (green smear circles have transparency + emissive).

### Beat 6 — Road Slime Fight (x:53.5, y:15.0)

**What should read:**
- A defined arena: marsh clearing, water edge to one side, scrubland on the other
- The slime entity: a green gooey presence with weight and menace
- Combat feel: hit-stop, camera shake, goo burst, green light flash on hit

**Code verify:**
- `roadSlime` maps to `marsh_slime_cluster.glb` at scale 1.15 + green PointLight (intensity 1.4)
- `buildSlime` procedural builder exists as fallback
- `createSlimeCombatCue` builds a warning ring + strike pointer + defeat splash
- **SLIME MESH DOESN'T ANIMATE** — no breathing/pulsing in `stepWorld`. This is a gap.

**Gap — slime animation:** The slime mesh is static. A sin-based scale pulse in `stepWorld`
gives it organic weight with zero new art:
```js
// In stepWorld, after lampFlickers loop:
if (fdt > 0 && heroMeshes.roadSlime && loopState.phase === 'slime_fight') {
  const s = 1.0 + 0.04 * Math.sin(waterTime * 2.1);
  heroMeshes.roadSlime.scale.set(s, 1.0 / s, s); // breathing: expand/contract
}
```

**Gap — combat camera:** Is the fight camera distinct from exploration? Or does the player
fight with the wide exploration camera? A tighter combat FOV / closer distance would increase
intensity. Assess in real browser.

### Beat 7 — Broken Wagon (x:60.5, y:12.2)

**What should read:**
- A tilted, ruined wagon in the scrub; warm lantern light from the wagon lamp
- Map-scrap salvage: the paper fragment floats up + glows warm + a chime plays
- Journey's-end feel at the furthest point before returning

**Code verify:**
- `brokenWagon` maps to `wagon_wreck_hero_v2.glb` ✅
- `createMapScrapReward` has floating paper + pulsing PointLight ✅
- No chime audio currently (audio = zero)

**Gap:** The chime (Cue 6 from §2) makes this beat land. Without it, the salvage is silent.
This is fixed by the audio layer.

### Beat 8 — Return to Board

**What should read:**
- The town approaching again from the east; familiar buildings but now lit differently (time
  of day should have advanced slightly — the continuous `sunArc` arc)
- The board plaza warmer/busier at dusk
- A sense of journey completed

**Code verify:**
- Does the clock advance during the loop? `stepWorld` advances `clock.dayTime` when not frozen.
  By the time the player returns (~8–10 min), goldenHour should have shifted toward dusk.
- `boardReturnNotice` is created separately — check it renders at board position

**No blocking gap — assess visually.**

---

## 4. Outstanding visual improvements (no new art)

### V1 — Slime breathing animation (spike.js)
See §3 Beat 6 above. One-liner in `stepWorld` using `waterTime` (already available).
**File:** `src/render3d/spike.js` · Effort: 30min · Impact: ★★

### V2 — Smoke cache plume (spike.js + frontierLayout.js)
Replace the barely-visible cone wisps with `dustSmokePlume.glb` (already in manifest at
`/models/dust_smoke_plume.glb`). Add a `smokeCache` kind placement in `frontierLayout.js`
with kind `dustSmokePlume` at an offset above the crate. The existing manifest entry:
```js
dustSmokePlume: { url: "/models/dust_smoke_plume.glb", scale: 1.0, vary: true }
```
**File:** `src/render3d/frontierLayout.js` · Effort: 30min · Impact: ★★

### V3 — Road sign text (frontierLayout.js + spike.js)
The `sign.glb` is probably a blank plank. Options:
- If `sign.glb` has no text baked in: add a `makeLetterSprite("DUSTWARD 12M →")` call
  in `buildPlacement` for `roadSign` kind (the letter sprite system already exists — check
  for `makeLetterSprite` or equivalent in spike.js)
- Alternatively: swap `sign.glb` for a sign + text texture authored in Blender

**Check first:** `grep -n "makeLetterSprite\|makeSign\|signText" spike.js` — if the text
helper exists, use it. If not, a flat `THREE.PlaneGeometry` with a Canvas-generated texture
is the 30-min path.

### V4 — Scatter density (spike.js line 2134)
```js
createScatter(scene, { center: { x: 35, z: 13 }, area: 78, count: 850 }); // was 620
```
Denser ground cover = less bare-dirt-floor read. One-line change.
**File:** `src/render3d/spike.js` · Effort: 5min · Impact: ★

### V5 — Road surface hue variance (spike.js road builder ~1808–1866)
Per-segment: a small deterministic hue offset (±3% lightness via a hash of segment index)
on the road surface material. Gives the road a worn, sun-bleached look instead of uniform flat
color. Use the existing `hashYaw` function for the deterministic offset.
**File:** `src/render3d/spike.js` · Effort: 1hr · Impact: ★

---

## 5. Model quality assessment (requires real browser)

These are unknowns until assessed in a **real** browser at full framerate. The throttled
preview MCP is unreliable for model visual quality assessment.

**Assess each using `window.__spike.goto('beatName')` + screenshot:**

| Model | Kind | File | Quality question |
|---|---|---|---|
| Hero character | auto-loaded | `character.glb` | Is it a readable gunslinger silhouette? Idle breathing? |
| Job board | `jobBoard` | `jobBoard_hero.glb` | Does it read as a real bulletin board? Notices visible? |
| Slime | `roadSlime` | `marsh_slime_cluster.glb` | Gooey/menacing? Or a green blob? |
| Slime trail | `slimeTell` | `slime_trail_hero.glb` | Trail marks readable? Or blank? |
| Wagon | `brokenWagon` | `wagon_wreck_hero_v2.glb` | Tilted, ruined read? Distinct silhouette? |
| Key buildings | mixed .glb / procedural | various | Western false-front character? |

**If a model reads poorly → Blender work (§6).**
**If a model reads well → check animation + contact shadow only.**

---

## 6. Blender work (requires Blender MCP at localhost:9876)

Tier 3 items — highest ceiling, blocked on Blender. Do **after** audio + no-art improvements.
Priority order based on player exposure time:

| Priority | Model | Impact | Note |
|---|---|---|---|
| 1 | Hero character (T3a) | ★★★ | On screen every second. Idle breathing + walk cycle |
| 2 | Slime (T3c) | ★★★ | Key fight moment — determines how memorable Beat 6 is |
| 3 | Saloon (T3b) | ★★ | Dominant architecture; player visits it twice |
| 4 | Store + Assay (T3b) | ★ | Secondary buildings — do after saloon reads correctly |

**For hero character:** the model should establish the gunslinger visual language —
wide-brimmed hat, long coat that would catch wind, sword silhouette on the back (per roadmap §3.6 T3a).
Keep poly count ≤3000 faces. Rig for idle (chest breathe, weight shift) + walk (hip sway,
arm swing) + combat stance. Export to `public/models/character_hero.glb`.

The manifest already has:
```js
// assetManifest.js (not yet a registered model kind in frontierLayout.js, but the file exists):
character_hero.glb  ← exists in /public/models/
character_vest.glb  ← exists in /public/models/
character_vendor.glb ← exists in /public/models/
```
These may be placeholder or partial — inspect in Blender before deciding whether to
extend the existing mesh or start fresh.

**For slime:** gooey organic body, 1–2u tall, 4–6 tendrils. Export to `public/models/slime_hero.glb`
and update assetManifest.js `roadSlime` entry URL to point to the new model.

---

## 7. Execution order

Run in this sequence — each step is independently testable:

```
Week A — Code only (no Blender, no assets)
──────────────────────────────────────────
1. T2b Audio layer          — src/render3d/audioView.js + spike.js wiring   [~4hrs]
2. V1 Slime breathing       — spike.js stepWorld one-liner                   [30min]
3. V2 Smoke cache plume     — dustSmokePlume.glb at cache position           [30min]
4. V3 Road sign text        — makeLetterSprite or canvas texture              [1hr]
5. V4 Scatter density       — count 620 → 850                                [5min]
6. V5 Road hue variance     — per-segment hashYaw offset                     [1hr]

Week B — Model assessment + Blender
────────────────────────────────────
7. Real-browser model audit — goto each beat, screenshot, assess quality
8. T3a Hero character       — if character.glb reads poorly
9. T3c Slime model          — if marsh_slime_cluster.glb reads poorly
10. T3b Saloon              — if procedural saloon needs model replacement
```

---

## 8. Gate — "first 10 minutes looks correct"

Run the **full first-road loop in a real browser**, start-to-finish. Check each beat:

```
✅ Spawn     — establishing push-in reads, board plaza has life and warmth
✅ Board     — warm lamp over a readable board; NPC presence; pick-up interaction triggers
✅ Sign      — readable road sign text; transitional feel; frontier opens up
✅ Cache     — visible smoke plume; warm beacon in the scrubland
✅ SlimeTell — green ground smears; marsh encroachment; ominous light
✅ Fight     — slime has visible presence + breathing; combat juice fires (hit-stop/shake)
✅ Wagon     — model reads ruined; map-scrap floats + chimes; journey completion feel
✅ Return    — town feels warmer at dusk; quest-complete feel
✅ Audio     — wind bed + footsteps throughout; harmonica on spawn; chime on salvage
✅ Suite     — npx vitest run (1252+ green), tsc clean, vite build clean
```

If all checked: **the first 10 minutes reads as a real game.**

---

## 9. What this plan does NOT change

Per `roadmap.md §6` constraints:
- `?visual` dusk golden-image baseline untouched (this plan doesn't touch `timeOfDay.js`)
- `firstFrameSlabBlockers` stays `[]`
- `HERO_OBJECTS` positions in `FIRST_FIVE_ROUTE` unchanged
- The render path (`createRenderer.js`, outputColorSpace, ACES) unchanged
- 1252 tests stay green after each step
