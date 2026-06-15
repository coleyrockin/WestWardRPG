# The Open Range — First Ride Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rideable horse and a free-roam discovery loop so the player can mount up after the funeral, ride a golden-hour stretch of frontier, and stumble onto points of interest — the project's first genuinely *fun* exploration slice.

**Architecture:** A new pure momentum step-function (`stepMount`) mirrors the existing pure `stepPlayer`; the existing `createPlayerController` gains a `mounted` mode that swaps the movement model and camera preset while reusing all its collision/camera/character code. The discovery loop is driven each frame from the player's world position through the existing `poiSystem` (`poiUnderInteraction` → `markPOIDiscovered`), surfacing the POI's authored `loreHint`. Vibe comes from pinning the world clock to golden hour for the slice and the existing fog/audio systems — no new render tech. Everything is **additive**: the funeral cold-open and first-road spine are untouched.

**Tech Stack:** JavaScript (ES modules), Three.js (WebGPU/TSL), Vitest (node, no jsdom for pure modules), Vite.

---

## Current-State Facts (verified — the engineer needs these)

**Conventions:** World `y`-axis is up. Ground plane is `(x, z)`. In placement/POI data the field `y` is the world **Z** axis (`+x` = east, `+y` = south). Hero ≈ 1.8u tall.

**`src/render3d/playerController.js`** (already exists, 730 lines):
- Pure `stepPlayer({position, yaw, pitch, input, dt, speeds, sensitivity})` → `{position:{x,z}, yaw, pitch}`. Forward unit vector = `forwardVector(yaw) = {x:-sin yaw, z:-cos yaw}` (exported); `rightVector(yaw)` exported.
- `export const CAMERA_PRESETS = Object.freeze({...})` — has `shoulder`, `graveside`, `combat`, `exploration`, `town`, `inspection`, `objective`. Each has `distance, height, lookHeight, lookAhead, shoulder, smoothing`, optional `fov`.
- `resolveCameraPreset(name, overrides)` → merged preset. `SPRINT_FOV_BOOST = 6`.
- `createPlayerController(camera, opts)` returns `{update, setPosition, setCameraPreset, setLookTarget, resetCameraBehind, releasePointerFocus, dispose, get position, get yaw, get pitch, get moving, get running, get isDodging, get isInvulnerable, get dodgeProgress}`.
- `update(dt, proxies)` (lines 552–663): computes movement via `stepPlayer`, applies dodge, drains mouse deltas, resolves collision with `resolveCollision({from,to}, proxies)`, positions `character` mesh (`character.position.x/z`, `character.rotation.y = yaw`), and drives the third-person camera + FOV breathe.
- Internal mutable `input` shape: `{forward, back, left, right, shift, dodge, lookDx, lookDy}`.

**`src/render3d/interactionSystem.js`** (already exists):
- `PROMPTS` object keyed by `kind` → `{radius, text}`. `createInteractionSystem({worldObjects, setPromptText, isTargetEnabled, getPromptText})` → `{update(playerPos), registerHandler(kind, fn), dispose, get nearest}`. Action key is `KeyE`. `pickNearest(playerPos, worldObjects, isTargetEnabled)` is pure.

**`src/poiSystem.js`** (already exists):
- `POI_KINDS` (cache/shrine/camp/wagon/mine/ruin/hideout/stranger, each `{label, radius, color}`).
- `POI_DEFINITIONS.frontier` = 10 authored POIs (x 8.5–40.5, y 10.5–36.5), each with `id, kind, x, y, label, loot, regionHint, dangerHint, mysteryLine, returnReason`, most with `loreHint`.
- `ensurePoiDefaults(regions)`, `isPOIDiscovered(regions, id)`, `markPOIDiscovered(regions, id)` (returns `true` if newly added), `poiUnderInteraction(regions, regionId, x, y)` → nearest undiscovered POI within its kind radius or `null`, `resolveExplorationRenownReward(discoveredCount)` → milestone reward at counts 3/6/9 or `null`.
- Discovery state lives at `state.regions.poisDiscovered` (array of ids).

**`src/render3d/frontierLayout.js`** (already exists):
- `export const PLAYER_SPAWN = { x: 9.5, y: 8.5 }` (line 14). `export const OPEN_RANGE_BOUNDS = { minX: -78, maxX: 150, minY: -60, maxY: 90 }` (line 588).
- `HERO_OBJECTS` (line 216) includes `{ kind: "steelMustang", label: "Steel Mustang Mount", x: 16.2, y: 12.0, color: "#8a8f7d", size: 1.1, yaw: -1.2 }`.
- `FIRST_FIVE_ROUTE` (line 45) and `buildFrontierPlacements()` (line 981). **Do not move HERO_OBJECTS or FIRST_FIVE_ROUTE.**

**`src/game/world/ground.js`**: `groundHeight(x, z, amp = 0.48)` → float (terrain height). `biomeAt(x, z)` → `{key, marsh, bluff, ranch}`.

**`src/game/renderer/assetManifest.js`**: `horseHitched: { url: "/models/horse_hitched.glb", scale: 1.0, vary: true }` (line ~88). `modelFor(kind)` lookup. (`steelMustang` has no model — procedural fallback today.)

**`src/render3d/spike.js`** integration points (4774 lines):
- `const player = createPlayerController(camera, { canvas, thirdPerson: true, character: character.group, cameraPreset: "shoulder", resetYaw: -0.9 })` — **line 3506**.
- `const proxies = buildProxies(snapshot.worldObjects).concat(waterCollisionBoxes())` — **line 3680**.
- `const interaction = createInteractionSystem({...})` — **line 3721**; handlers registered **lines 4167–4174**; `interaction.update(player.position)` — **line 4637**.
- Render loop `function loop(now)` — **line 4573**; `dt` computed **line 4576**; `player.update(dt, proxies)` — **line 4606**.
- Funeral → free-play handoff — **lines 4154–4162** (`player.setLookTarget(null); player.setPosition({x:PLAYER_SPAWN.x, z:PLAYER_SPAWN.y}); player.setCameraPreset("shoulder")`).
- Clock: `const clock = createWorldClock({ dayTime: 0.25 })` — **line 2666**; `if (visualCapture) pinClock(clock, "dusk")`. `tickClock(clock, fdt)` — **line 4316**. `dayTimeToKey(clock.dayTime)` used for audio.
- `audioView` created **line 3395**; `audioView.update(dt, {moving, running, paletteKey, windSpeed, worldTime, playerX, playerY})` — **lines 4727–4738**.
- `atmosphere` created **line 2651**; `atmosphere.setShadowFocus(player.position.x, player.position.z)` — **line 4623**.
- Debug: `window.__spike = {...}` — **lines 3564–3674** (has `setPos`, `goto`, `captureMode`); `window.__westward3dTest = {...}` — **lines 4360+** (has `getPlayerPosition`, `setTimeOfDay`, `getTimeOfDay`).
- `character` (hero mesh) created **line 3466**, added to scene **line 3489**, `character.group` passed to controller, `character.update(dt, moving, running)` **line 4683**.

**`src/render3d/timeOfDay.js`**: `TIME_KEYS = ["day","dusk","goldenHour","night"]`. `getPalette(key)`. Golden hour = palette key `"goldenHour"` ≈ `dayTime 0.25`. (Clock helpers `createWorldClock`/`tickClock`/`pinClock`/`dayTimeToKey` live in `src/game/world/worldClock.js`.)

**`src/render3d/audioView.js`**: `createAudioView()` → `{unlock, update, play, onLoopEvent, setMuted, dispose, ...}`. `SFX_NAMES` includes `footstep`, `whoosh`, `chime`, `sting`, `resolveChime`, `uiTick`. Ambient beds (wind, coyote, crickets, marsh) driven by `update(dt, opts)`. **No hooves recipe exists** (footstep cadence is reused for the ride in this slice; a dedicated hooves recipe is explicitly out of MVP scope).

**Test idiom** (`tests/render3d-player-controller.test.ts`): `import { ... } from "../src/render3d/playerController.js"; const approx = (n, t, eps=1e-6) => Math.abs(n-t) <= eps;` then `describe("…", () => { it("…", () => { const next = stepPlayer({...start, input:{...}, dt}); expect(approx(next.position.z, -4)).toBe(true); }) })`.

**Guardrail tests:** `tests/render3d-frontier-layout.test.ts:124` asserts `expect(metrics.firstFrameSlabBlockers).toEqual([])`. `tests/render3d-phase-state.test.ts` asserts the full phase sequence and per-phase target enablement.

---

## File Structure

**Create:**
- `src/render3d/mountController.js` — pure horse momentum model: `MOUNT_GAITS`, `stepMount(...)`. One responsibility: given mount state + input + dt, produce the next mount state. Node-testable, no Three.
- `src/render3d/discoveryRuntime.js` — pure discovery resolver: `resolveDiscovery(regions, regionId, x, y)` wrapping `poiSystem`. One responsibility: detect+mark a fresh POI discovery and return a render-ready event.
- `tests/render3d-mount-controller.test.ts` — unit tests for `stepMount`.
- `tests/render3d-discovery-runtime.test.ts` — unit tests for `resolveDiscovery`.

**Modify:**
- `src/render3d/playerController.js` — add `saddle` camera preset; add `mounted` mode (`setMounted`/`isMounted`) to the controller; `update()` uses `stepMount` when mounted.
- `tests/render3d-player-controller.test.ts` — add coverage for the `saddle` preset and `setMounted` toggle.
- `src/render3d/interactionSystem.js` — add a `mountHorse` prompt kind.
- `src/render3d/spike.js` — load/show the rideable horse mesh; register the mount handler + dismount key; drive the discovery loop each frame in free-roam; pin golden hour for the slice; expose `window.__spike.mount()/dismount()`.

**No changes to:** `createRenderer.js` (tone mapping / dusk baseline), `frontierLayout.js` `HERO_OBJECTS`/`FIRST_FIVE_ROUTE`, `phaseState`.

---

## Task 1: Pure horse momentum model (`stepMount`)

**Files:**
- Create: `src/render3d/mountController.js`
- Test: `tests/render3d-mount-controller.test.ts`

A horse moves only where it faces (no strafing), reins-turns with A/D, throttles with W/S, gallops on Shift, and carries momentum (accelerates/decelerates toward a target speed). This mirrors the pure-`stepPlayer` pattern so it is deterministic and node-testable.

- [ ] **Step 1: Write the failing test**

Create `tests/render3d-mount-controller.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { MOUNT_GAITS, stepMount } from "../src/render3d/mountController.js";

const approx = (n: number, t: number, eps = 1e-6) => Math.abs(n - t) <= eps;
const start = { position: { x: 0, z: 0 }, yaw: 0, speed: 0 };

describe("mountController — stepMount", () => {
  it("idle with no throttle stays put and at zero speed", () => {
    const next = stepMount({ ...start, input: {}, dt: 1 });
    expect(approx(next.position.x, 0)).toBe(true);
    expect(approx(next.position.z, 0)).toBe(true);
    expect(next.speed).toBe(0);
  });

  it("W accelerates from rest toward trot but not instantly", () => {
    const next = stepMount({ ...start, input: { forward: true }, dt: 0.1 });
    expect(next.speed).toBeGreaterThan(0);
    expect(next.speed).toBeLessThan(MOUNT_GAITS.trotSpeed);
  });

  it("W held long enough caps at trot speed; +Shift caps at gallop", () => {
    let s = { ...start };
    for (let i = 0; i < 200; i++) s = stepMount({ ...s, input: { forward: true }, dt: 0.1 });
    expect(approx(s.speed, MOUNT_GAITS.trotSpeed)).toBe(true);
    let g = { ...start };
    for (let i = 0; i < 200; i++) g = stepMount({ ...g, input: { forward: true, shift: true }, dt: 0.1 });
    expect(approx(g.speed, MOUNT_GAITS.gallopSpeed)).toBe(true);
  });

  it("releasing throttle decelerates back to a stop", () => {
    let s = { ...start, speed: MOUNT_GAITS.gallopSpeed };
    for (let i = 0; i < 200; i++) s = stepMount({ ...s, input: {}, dt: 0.1 });
    expect(s.speed).toBe(0);
  });

  it("the horse only moves where it faces (no strafing)", () => {
    // yaw=0 → forward is -Z. Holding 'right' must NOT translate sideways; it reins-turns.
    const next = stepMount({ ...start, speed: 5, input: { right: true, forward: true }, dt: 0.1 });
    expect(next.yaw).toBeLessThan(0); // reined toward the right (yaw decreases)
    // displacement is along the (new) facing, never along world +X with yaw≈0
    expect(Math.abs(next.position.x)).toBeLessThan(Math.abs(next.position.z));
  });

  it("mouse look turns the heading using the stepPlayer convention", () => {
    const next = stepMount({ ...start, input: { lookDx: 100 }, dt: 0.016 });
    expect(next.yaw).toBeLessThan(0); // cursor right → yaw decreases, same as stepPlayer
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/render3d-mount-controller.test.ts`
Expected: FAIL — `Cannot find module '../src/render3d/mountController.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/render3d/mountController.js`:

```javascript
// Pure horse-momentum model for the mounted free-roam slice.
//
// A horse moves only along its facing (no strafing), reins-turns with A/D,
// throttles with W/S, gallops while Shift is held, and carries momentum
// (eases toward a target speed via accel/decel). Mirrors the pure stepPlayer
// pattern in playerController.js so it is deterministic and node-testable.

import { forwardVector } from "./playerController.js";

export const MOUNT_GAITS = Object.freeze({
  trotSpeed: 7,    // steady cruise (u/s) — W
  gallopSpeed: 15, // top speed (u/s) — W + Shift
  accel: 9,        // u/s^2 toward a higher target speed
  decel: 12,       // u/s^2 toward a lower target speed (and to a stop)
  turnRate: 1.9,   // rad/s yaw turn from A/D reins
});

const DEFAULT_SENSITIVITY = 0.0035; // matches playerController look sensitivity

// Pure single step. state = { position:{x,z}, yaw, speed }. Returns a NEW
// { position, yaw, speed }; never mutates input.
export function stepMount({
  position,
  yaw,
  speed = 0,
  input,
  dt,
  gaits = MOUNT_GAITS,
  sensitivity = DEFAULT_SENSITIVITY,
} = {}) {
  const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const inp = input || {};

  // Heading: mouse look (cursor right → yaw decreases, same as stepPlayer) plus
  // A/D rein turn. left raises yaw, right lowers it.
  const reins = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
  const nextYaw = yaw - (inp.lookDx || 0) * sensitivity + reins * gaits.turnRate * safeDt;

  // Throttle: W forward, S brake/back. Target speed depends on the gait held.
  const throttle = (inp.forward ? 1 : 0) - (inp.back ? 1 : 0);
  const targetSpeed = throttle > 0 ? (inp.shift ? gaits.gallopSpeed : gaits.trotSpeed) : 0;

  const rate = targetSpeed > speed ? gaits.accel : gaits.decel;
  const step = Math.sign(targetSpeed - speed) * rate * safeDt;
  let nextSpeed = speed + step;
  // Don't overshoot the target in either direction.
  if (targetSpeed >= speed) nextSpeed = Math.min(nextSpeed, targetSpeed);
  else nextSpeed = Math.max(nextSpeed, targetSpeed);
  if (nextSpeed < 0) nextSpeed = 0;

  const fwd = forwardVector(nextYaw);
  return {
    position: {
      x: position.x + fwd.x * nextSpeed * safeDt,
      z: position.z + fwd.z * nextSpeed * safeDt,
    },
    yaw: nextYaw,
    speed: nextSpeed,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/render3d-mount-controller.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render3d/mountController.js tests/render3d-mount-controller.test.ts
git commit -m "feat(mount): pure stepMount horse-momentum model + tests"
```

---

## Task 2: The `saddle` camera preset

**Files:**
- Modify: `src/render3d/playerController.js` (the `CAMERA_PRESETS` object, near line 65)
- Test: `tests/render3d-player-controller.test.ts`

The mounted camera pulls back and lifts vs the on-foot `shoulder` framing, and declares a slightly wider `fov` so the existing FOV-breathe widens it further at a gallop.

- [ ] **Step 1: Write the failing test**

Add to `tests/render3d-player-controller.test.ts` (new `describe` block at the end of the file):

```typescript
describe("playerController — saddle camera preset", () => {
  it("exposes a saddle preset pulled back and lifted vs shoulder, with an fov", () => {
    expect(CAMERA_PRESETS.saddle).toBeDefined();
    expect(CAMERA_PRESETS.saddle.distance).toBeGreaterThan(CAMERA_PRESETS.shoulder.distance);
    expect(CAMERA_PRESETS.saddle.height).toBeGreaterThan(CAMERA_PRESETS.shoulder.height);
    expect(Number.isFinite(CAMERA_PRESETS.saddle.fov)).toBe(true);
  });

  it("resolveCameraPreset('saddle') returns the saddle framing", () => {
    const p = resolveCameraPreset("saddle");
    expect(p.distance).toBe(CAMERA_PRESETS.saddle.distance);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/render3d-player-controller.test.ts -t "saddle"`
Expected: FAIL — `CAMERA_PRESETS.saddle` is `undefined`.

- [ ] **Step 3: Write the implementation**

In `src/render3d/playerController.js`, inside the `CAMERA_PRESETS = Object.freeze({ ... })` block, add a `saddle` entry after the `exploration` preset (after line 107):

```javascript
  // Mounted free-roam: pulled back and lifted off the shoulder so the horse +
  // rider read as a silhouette against the range, with a wider fov that the
  // FOV-breathe opens further at a gallop.
  saddle: Object.freeze({
    distance: 7.8,
    height: 4.2,
    lookHeight: 2.1,
    lookAhead: 6.0,
    shoulder: 0.5,
    smoothing: 8.0,
    fov: 60,
  }),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/render3d-player-controller.test.ts -t "saddle"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render3d/playerController.js tests/render3d-player-controller.test.ts
git commit -m "feat(mount): add saddle camera preset"
```

---

## Task 3: Mount mode in the player controller

**Files:**
- Modify: `src/render3d/playerController.js` (`update()` at lines 552–663; the returned API at lines 713–729; import at line 20)
- Test: `tests/render3d-player-controller.test.ts`

The controller gains a `mounted` flag. When mounted, `update()` drives movement with `stepMount` (carrying an internal `mountSpeed`) and uses the `saddle` preset; when on foot it behaves exactly as today. All collision/camera/character code is reused unchanged.

- [ ] **Step 1: Write the failing test**

Add to `tests/render3d-player-controller.test.ts`:

```typescript
describe("playerController — mounted mode", () => {
  const makeCam = () => ({
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    rotation: { x: 0, y: 0, z: 0, order: "XYZ" },
    fov: 56,
    lookAt() {},
    updateProjectionMatrix() {},
    getWorldDirection(o) { o.set(0, 0, -1); return o; },
  });

  it("defaults to on-foot; setMounted(true) flips isMounted", () => {
    const ctrl = createPlayerController(makeCam(), { document: null, window: null });
    expect(ctrl.isMounted).toBe(false);
    ctrl.setMounted(true);
    expect(ctrl.isMounted).toBe(true);
    ctrl.setMounted(false);
    expect(ctrl.isMounted).toBe(false);
  });

  it("mounted + forward accelerates the rig from rest (momentum, not instant)", () => {
    const ctrl = createPlayerController(makeCam(), { document: null, window: null });
    ctrl.setMounted(true);
    // Simulate a held-forward frame via the public input seam used by the DOM shell:
    // setMounted exposes a test seam through update by reading the same input buffer.
    ctrl.pressForTest({ forward: true });
    const before = ctrl.position;
    ctrl.update(0.1, null);
    const after = ctrl.position;
    const moved = Math.hypot(after.x - before.x, after.z - before.z);
    expect(moved).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/render3d-player-controller.test.ts -t "mounted mode"`
Expected: FAIL — `ctrl.isMounted` is `undefined` / `ctrl.setMounted is not a function`.

- [ ] **Step 3: Write the implementation**

3a. At the top of `src/render3d/playerController.js`, add to the imports (after line 20):

```javascript
import { stepMount } from "./mountController.js";
```

3b. Inside `createPlayerController`, near the other `let` state (after `let running = false;` at line 383), add:

```javascript
  let mounted = false;
  let mountSpeed = 0;
  let priorPreset = cameraPreset; // restore this on dismount
```

3c. Replace the movement block at the top of `update(dt, proxies)`. The current block (lines 553–577) computes `stepPlayer` then applies dodge. Wrap it so mounted mode swaps the movement model. Replace lines 553–577 with:

```javascript
    let nextPos;
    if (mounted) {
      // Look-pitch still tracks the mouse so you can glance up/down from the saddle.
      pitch = Math.max(
        -MAX_PITCH,
        Math.min(MAX_PITCH, pitch - (input.lookDy || 0) * sensitivity),
      );
      const m = stepMount({ position, yaw, speed: mountSpeed, input, dt, sensitivity });
      yaw = m.yaw;
      mountSpeed = m.speed;
      nextPos = m.position;
      input.dodge = false; // no dodge-roll while mounted
    } else {
      const stepped = stepPlayer({ position, yaw, pitch, input, dt, speeds, sensitivity });
      yaw = stepped.yaw;
      pitch = stepped.pitch;
      nextPos = stepped.position;

      // Dodge-roll: edge-triggered by Space (on-foot only).
      if (input.dodge && dodge.elapsed === null) {
        const f = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
        const r = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const fwd = forwardVector(yaw);
        const rt = rightVector(yaw);
        let dx = fwd.x * f + rt.x * r;
        let dz = fwd.z * f + rt.z * r;
        const m2 = Math.hypot(dx, dz);
        if (m2 < 1e-6) { dx = fwd.x; dz = fwd.z; } else { dx /= m2; dz /= m2; }
        dodge = { dir: { x: dx, z: dz }, elapsed: 0 };
      }
      input.dodge = false; // consume the edge
      if (dodge.elapsed !== null) {
        const rolled = stepDodge({ position, dir: dodge.dir, elapsed: dodge.elapsed }, dt, DODGE);
        nextPos = rolled.position;
        dodge.elapsed = rolled.done ? null : rolled.elapsed;
      }
    }
```

3d. Just below, update the `moving`/`running` derivation (lines 579–580) so the FOV-breathe and footstep cadence respond to the gallop. Replace those two lines with:

```javascript
    if (mounted) {
      moving = mountSpeed > 0.1;
      running = mountSpeed > MOUNT_GAITS.trotSpeed + 0.1; // galloping → FOV widen + hot cadence
    } else {
      moving = !!(input.forward || input.back || input.left || input.right);
      running = moving && !!input.shift; // sprint speed already applied in stepPlayer
    }
```

3e. Add the `MOUNT_GAITS` import alongside `stepMount` (amend step 3a):

```javascript
import { stepMount, MOUNT_GAITS } from "./mountController.js";
```

3f. Add the public methods + a test seam. In the returned object (lines 713–729), add:

```javascript
    setMounted(on) {
      const next = !!on;
      if (next === mounted) return;
      mounted = next;
      mountSpeed = 0;
      if (mounted) {
        priorPreset = activeCameraPreset;
        activeCameraPreset = resolveCameraPreset("saddle", presetOverrides);
      } else {
        activeCameraPreset = priorPreset || resolveCameraPreset(cameraPreset, presetOverrides);
      }
    },
    get isMounted() { return mounted; },
    // Test-only seam: the DOM shell normally writes `input`; tests poke it here.
    pressForTest(partial = {}) { Object.assign(input, partial); },
```

- [ ] **Step 4: Run the full controller test to verify it passes**

Run: `npx vitest run tests/render3d-player-controller.test.ts`
Expected: PASS (all existing tests still green + the new "mounted mode" block).

- [ ] **Step 5: Commit**

```bash
git add src/render3d/playerController.js tests/render3d-player-controller.test.ts
git commit -m "feat(mount): add mounted mode to the player controller"
```

---

## Task 4: Pure discovery resolver

**Files:**
- Create: `src/render3d/discoveryRuntime.js`
- Test: `tests/render3d-discovery-runtime.test.ts`

When the rider comes within a POI's radius, the slice should detect it, mark it discovered, and return a render-ready event carrying the authored `loreHint`/`mysteryLine`, the loot/buff, and any milestone renown. This wraps the existing `poiSystem` so the per-frame spike.js loop stays thin.

- [ ] **Step 1: Write the failing test**

Create `tests/render3d-discovery-runtime.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { resolveDiscovery } from "../src/render3d/discoveryRuntime.js";
import { POI_DEFINITIONS } from "../src/poiSystem.js";

const firstPoi = POI_DEFINITIONS.frontier[0]; // frontier_broken_wagon @ (13.5, 10.5)

describe("discoveryRuntime — resolveDiscovery", () => {
  it("returns null when the rider is far from every POI", () => {
    const regions = { poisDiscovered: [] };
    expect(resolveDiscovery(regions, "frontier", -999, -999)).toBe(null);
  });

  it("detects a fresh POI within range and returns its lore + marks it discovered", () => {
    const regions = { poisDiscovered: [] };
    const event = resolveDiscovery(regions, "frontier", firstPoi.x, firstPoi.y);
    expect(event).not.toBe(null);
    expect(event.id).toBe(firstPoi.id);
    expect(event.label).toBe(firstPoi.label);
    expect(typeof event.line).toBe("string");
    expect(event.line.length).toBeGreaterThan(0);
    expect(regions.poisDiscovered).toContain(firstPoi.id);
  });

  it("does not re-fire for an already-discovered POI", () => {
    const regions = { poisDiscovered: [firstPoi.id] };
    expect(resolveDiscovery(regions, "frontier", firstPoi.x, firstPoi.y)).toBe(null);
  });

  it("surfaces a renown milestone on the 3rd discovery", () => {
    const regions = { poisDiscovered: [] };
    const pois = POI_DEFINITIONS.frontier;
    resolveDiscovery(regions, "frontier", pois[0].x, pois[0].y);
    resolveDiscovery(regions, "frontier", pois[1].x, pois[1].y);
    const third = resolveDiscovery(regions, "frontier", pois[2].x, pois[2].y);
    expect(third.renown).not.toBe(null);
    expect(third.renown.discoveredCount).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/render3d-discovery-runtime.test.ts`
Expected: FAIL — `Cannot find module '../src/render3d/discoveryRuntime.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/render3d/discoveryRuntime.js`:

```javascript
// Drives the free-roam discovery loop off the rider's world position.
//
// Each frame the host calls resolveDiscovery with the player's (x, y=worldZ).
// If a not-yet-discovered POI is within its kind radius, it is marked discovered
// and a render-ready event is returned (authored lore line, loot/buff, milestone
// renown). Returns null when nothing fresh is in range. Pure wrapper over
// poiSystem — no Three, node-testable.

import {
  poiUnderInteraction,
  markPOIDiscovered,
  resolveExplorationRenownReward,
} from "../poiSystem.js";

export function resolveDiscovery(regions, regionId, x, y) {
  if (!regions) return null;
  const poi = poiUnderInteraction(regions, regionId, x, y);
  if (!poi) return null;

  const isNew = markPOIDiscovered(regions, poi.id);
  if (!isNew) return null; // already discovered — nothing to surface

  const discoveredCount = regions.poisDiscovered.length;
  return {
    id: poi.id,
    kind: poi.kind,
    label: poi.label,
    loot: poi.loot || null,
    buff: poi.buff || null,
    loreHint: poi.loreHint || null,
    // Prefer the atmospheric mystery line; fall back to the lore hint, then a default.
    line: poi.mysteryLine || poi.loreHint || `${poi.label}: a place worth knowing.`,
    renown: resolveExplorationRenownReward(discoveredCount),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/render3d-discovery-runtime.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render3d/discoveryRuntime.js tests/render3d-discovery-runtime.test.ts
git commit -m "feat(explore): pure resolveDiscovery proximity loop"
```

---

## Task 5: Mount/dismount interaction prompt

**Files:**
- Modify: `src/render3d/interactionSystem.js` (the `PROMPTS` object, lines 13–22)
- Test: `tests/render3d-interaction-system.test.ts` (create if absent; else append)

Add a `mountHorse` interactable so walking up to the horse surfaces an "E — Mount Up" prompt. spike.js (Task 6) registers the handler.

- [ ] **Step 1: Write the failing test**

Append to (or create) `tests/render3d-interaction-system.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { pickNearest, promptFor } from "../src/render3d/interactionSystem.js";

describe("interactionSystem — mountHorse prompt", () => {
  const horse = { kind: "mountHorse", x: 16.2, y: 12.0 };

  it("surfaces a Mount Up prompt for the horse when in range", () => {
    const near = pickNearest({ x: 16.2, z: 12.0 }, [horse]);
    expect(near).toBe(horse);
    expect(promptFor(horse)).toContain("Mount");
  });

  it("does not surface the prompt when out of range", () => {
    expect(pickNearest({ x: 30, z: 30 }, [horse])).toBe(null);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/render3d-interaction-system.test.ts -t "mountHorse"`
Expected: FAIL — `promptFor(horse)` returns `""` (kind not in `PROMPTS`).

- [ ] **Step 3: Write the implementation**

In `src/render3d/interactionSystem.js`, add to the `PROMPTS` object (after line 21, before the closing brace):

```javascript
  mountHorse:  { radius: 2.6, text: "E — Mount Up" },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/render3d-interaction-system.test.ts -t "mountHorse"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render3d/interactionSystem.js tests/render3d-interaction-system.test.ts
git commit -m "feat(mount): add mountHorse interaction prompt"
```

---

## Task 6: Wire the rideable horse into the scene (spike.js)

**Files:**
- Modify: `src/render3d/spike.js`

Show a rideable horse near spawn (reusing the `horse_hitched.glb` asset at the `steelMustang` location), add a `mountHorse` placement to the interactable world objects, register a mount handler, add a dismount key (`KeyF`), and keep the horse mesh following the rider's position/heading while mounted (hidden-at-rail when on foot is fine for MVP — the simplest read is: horse sits at the rail; on mount, the hero "rides" by snapping onto the horse and the rail horse hides). This task has no unit test (it is Three/DOM wiring); it is verified in Task 9's browser check and must keep the existing gate green.

- [ ] **Step 1: Add a `mountHorse` interactable placement**

After `const proxies = ...` (line 3680), add a derived mount placement appended to the interaction world objects. Find where `snapshot.worldObjects` is passed to `createInteractionSystem` (line 3721) and change the `worldObjects:` option to include the horse:

```javascript
  // The rideable horse sits at the steelMustang mark by spawn (16.2, 12.0).
  const MOUNT_SPOT = { x: 16.2, y: 12.0 };
  const mountObjects = snapshot.worldObjects.concat([
    { kind: "mountHorse", label: "Steel Mustang", x: MOUNT_SPOT.x, y: MOUNT_SPOT.y },
  ]);
```

Then in the `createInteractionSystem({ ... })` call (line 3721), change `worldObjects: snapshot.worldObjects,` to `worldObjects: mountObjects,`.

- [ ] **Step 2: Load + place the horse mesh**

Near the character creation (after line 3489 where `scene.add(character.group)`), add a horse mesh using the **exact** loader spike.js already uses for placements: `instanceModel(url, { x, z, y, yaw, scale, scaleY })` (imported at line 13 from `../game/renderer/assetLoader.js`) + `modelFor(kind)` (line 14) + `groundHeight` (already imported, used at line 2772). Add:

```javascript
  // Rideable horse — reuse the hitched-horse model as the mount.
  let horseNode = null;
  try {
    const horseEntry = modelFor("horseHitched"); // { url: "/models/horse_hitched.glb", scale: 1.0, vary: true }
    horseNode = await instanceModel(horseEntry.url, {
      x: MOUNT_SPOT.x,
      z: MOUNT_SPOT.y,
      y: groundHeight(MOUNT_SPOT.x, MOUNT_SPOT.y),
      yaw: -1.2,
      scale: horseEntry.scale,
    });
    scene.add(horseNode);
  } catch (err) {
    console.warn("[render3d] rideable horse model failed to load", err);
  }
```

(`instanceModel` takes the placement `y` field as world Z — same convention the placement loop uses at line 2772: `{ x: p.x, z: p.y, y: groundHeight(p.x, p.y), ... }`.)

- [ ] **Step 3: Register the mount handler + dismount key**

Where handlers are registered (lines 4167–4174), add:

```javascript
  function setRiderVisual(mountedNow) {
    if (horseNode) horseNode.visible = !mountedNow; // rail horse hides while you ride it
    // The hero stays visible as the rider; the saddle camera lifts to frame both.
  }
  interaction.registerHandler("mountHorse", () => {
    player.setMounted(true);
    setRiderVisual(true);
    audioView?.play("uiTick");
  });
```

Add dismount (`KeyF`) and whistle-to-call (`KeyH`) listeners near the other document key handling (after line 4174). The controller owns movement keys; these are one-shot host actions. On dismount the horse stays exactly where you stepped off (so you can walk to a nearby POI and walk back); whistle eases it toward you:

```javascript
  let horseCalled = false; // whistle-to-call latch (on-foot only)
  const onHorseKeys = (e) => {
    if (e.code === "KeyF" && player.isMounted) {
      player.setMounted(false);
      setRiderVisual(false); // horse stays visible at the spot you dismounted
      audioView?.play("uiTick");
    } else if (e.code === "KeyH" && !player.isMounted) {
      horseCalled = true; // the horse will ease toward you in the loop
      audioView?.play("uiTick");
    }
  };
  document.addEventListener("keydown", onHorseKeys);
```

- [ ] **Step 4: Keep the horse under the rider (mounted) and bring it on a whistle (on foot)**

In the render loop, right after `player.update(dt, proxies)` (line 4606), add:

```javascript
    if (horseNode) {
      if (player.isMounted) {
        // Mounted: the horse rides under you, facing your heading.
        horseNode.position.set(player.position.x, groundHeight(player.position.x, player.position.z), player.position.z);
        horseNode.rotation.y = player.yaw;
      } else if (horseCalled) {
        // Whistle-to-call: ease the horse toward you; stop when it arrives.
        const dx = player.position.x - horseNode.position.x;
        const dz = player.position.z - horseNode.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= 2.5) {
          horseCalled = false;
        } else {
          const stepLen = Math.min(dist, MOUNT_GAITS.trotSpeed * dt);
          const nx = horseNode.position.x + (dx / dist) * stepLen;
          const nz = horseNode.position.z + (dz / dist) * stepLen;
          horseNode.position.set(nx, groundHeight(nx, nz), nz);
          horseNode.rotation.y = Math.atan2(-dx, -dz); // face its travel direction
        }
      }
    }
```

`MOUNT_GAITS` is exported from `mountController.js`; add it to the spike.js imports: `import { MOUNT_GAITS } from "./mountController.js";` (alongside the other render3d imports). Net effect: one horse — under you while riding, parked where you dismount, and trotting back when you whistle.

- [ ] **Step 5: Run the gate**

Run: `npx vitest run && npx tsc --noEmit && npx vite build`
Expected: tests PASS (766+ unchanged), tsc clean, build succeeds (chunk-size warning expected).

- [ ] **Step 6: Commit**

```bash
git add src/render3d/spike.js
git commit -m "feat(mount): wire the rideable horse, mount/dismount, into the scene"
```

---

## Task 7: Drive the discovery loop in free-roam (spike.js)

**Files:**
- Modify: `src/render3d/spike.js`

Each frame (when not in the funeral/board UI), call `resolveDiscovery` with the rider's position; on a hit, surface the lore line via the existing prompt DOM, play a discovery chime, and apply the loot to game state.

- [ ] **Step 1: Import the resolver**

At the top of `spike.js` with the other render3d imports, add:

```javascript
import { resolveDiscovery } from "./discoveryRuntime.js";
```

- [ ] **Step 2: Drive it in the loop**

In the render loop after `interaction.update(player.position)` (line 4637), add:

```javascript
    // Free-roam discovery: ride within a POI radius → surface its lore + reward.
    if (!boardModalController.isOpen()) {
      const found = resolveDiscovery(
        game.regions,
        "frontier",
        player.position.x,
        player.position.z,
      );
      if (found) {
        setPromptText(`Discovered — ${found.label}: ${found.line}`);
        discoveryHoldT = 4.0; // hold the line on screen for 4s (drained below)
        audioView?.play("chime");
        if (found.loot?.gold) grantGold(game, found.loot.gold);
        if (found.renown) {
          if (found.renown.gold) grantGold(game, found.renown.gold);
          if (found.renown.xp) grantXp(game, found.renown.xp);
          audioView?.play("resolveChime");
        }
        onRunMutated();
      }
    }
    if (discoveryHoldT > 0) {
      discoveryHoldT -= dt;
      if (discoveryHoldT <= 0) interaction.update(player.position); // restore normal prompt
    }
```

Declare `let discoveryHoldT = 0;` near the other loop-scoped `let` timers (e.g. beside `fieldMapLiveSyncT`).

- [ ] **Step 3: Initialize discovery state + confirm the economy imports**

`game.regions` must have `poisDiscovered` initialized — call `ensurePoiDefaults(game.regions)` once during setup (import it from `../poiSystem.js`) right after `game` is created (near line 2612 where game state is built). The loot/renown application in Step 2 uses the real, already-defined economy mutators `grantGold(state, amount)` (`src/render3d/gameState.js:178`) and `grantXp(state, amount)` (`:162`); ensure both are imported into spike.js (grep `from "./gameState.js"` — add them to that import if missing).

MVP applies **gold + renown only** (the discovery payoff is the lore line + chime + milestone, not item drops). Item rewards (`found.loot.items`) are deferred to a follow-up that routes through the existing `applyLootDropToState` path (`src/lootSystem.js:101`) — do NOT hand-add items to the inventory map here, and do NOT introduce any non-canonical item (the audit flagged the "Tonic" reward bug; only canonical `inventoryState` items may ever be granted).

- [ ] **Step 4: Run the gate**

Run: `npx vitest run && npx tsc --noEmit && npx vite build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/render3d/spike.js
git commit -m "feat(explore): surface POI discoveries from the saddle"
```

---

## Task 8: Golden-hour + vibe pass (spike.js)

**Files:**
- Modify: `src/render3d/spike.js`

Pin the slice to golden hour for the best ride (without touching the dusk visual baseline), and make sure the existing fog + ambient audio sell the range. Golden hour is `clock.dayTime = 0.25`; this must apply only to live free-roam, never to `visualCapture` (which pins dusk for the golden-image test).

- [ ] **Step 1: Pin golden hour for the live slice**

At the clock setup (line 2666), the code is:
```javascript
const clock = createWorldClock({ dayTime: 0.25 });
if (visualCapture) pinClock(clock, "dusk");
else if (resumeRun && Number.isFinite(resumeRun.world?.dayTime)) clock.dayTime = resumeRun.world.dayTime;
```
`createWorldClock({ dayTime: 0.25 })` already starts at golden hour, and `visualCapture` still pins dusk — so the live slice already boots golden hour. **Verify** this is the case and that no later code advances the clock away from golden hour during free-roam faster than intended. If `tickClock(clock, fdt)` (line 4316) advances day time, slow it for the slice by scaling `fdt` for the clock only (so a session stays bathed in golden light rather than rolling to night):

```javascript
    // Slice mood: hold golden hour — advance the day clock very slowly so a
    // free-roam session stays in warm light instead of rolling to night.
    tickClock(clock, fdt * 0.15);
```

- [ ] **Step 2: Confirm fog reads as dust haze at golden hour**

No code change required if the `goldenHour` palette fog density (~0.01) already reads as soft haze. If the range feels too clear at distance, nudge ONLY the live (non-capture) path — do not edit `timeOfDay.js` palettes (the visual baseline reads them). This is a judgment call confirmed in the browser (Task 9); leave the palette untouched unless the haze is visibly missing.

- [ ] **Step 3: Verify ambient audio rides along**

The audio update already receives `moving`/`running`/`paletteKey`/`windSpeed`/`playerX`/`playerY` (lines 4727–4738). Because mounted mode sets `player.moving`/`player.running` (Task 3d), the footstep bed already plays as a ride cadence (hot at gallop) and the wind/coyote beds already key off `paletteKey`. No change required; confirm in the browser. (A dedicated hooves recipe is explicitly out of MVP scope.)

- [ ] **Step 4: Run the gate (including the visual baseline)**

Run: `npx vitest run && npx tsc --noEmit && npx vite build`
Expected: all green. The `?visual` golden-image baseline is unaffected because `visualCapture` still pins dusk and tone mapping is untouched.

- [ ] **Step 5: Commit**

```bash
git add src/render3d/spike.js
git commit -m "feat(vibe): hold golden hour for the free-roam slice"
```

---

## Task 9: Debug hooks, guardrail verification, and the play test

**Files:**
- Modify: `src/render3d/spike.js` (the `window.__spike` object, lines 3564–3674)

Add debug affordances so the slice can be inspected without driving, verify no guardrail tripped, then judge the actual fun in a real foreground browser against the spec's success criteria.

- [ ] **Step 1: Add mount/dismount + ride-to-POI debug hooks**

First add `POI_DEFINITIONS` to the existing `../poiSystem.js` import at the top of spike.js (it is an ES module — no `require`). Then in the `window.__spike = { ... }` object (lines 3564–3674), add:

```javascript
    mount: () => { player.setMounted(true); setRiderVisual(true); return player.isMounted; },
    dismount: () => { player.setMounted(false); setRiderVisual(false); return player.isMounted; },
    rideTo: (poiId) => {
      const poi = (POI_DEFINITIONS.frontier || []).find((p) => p.id === poiId);
      if (poi) player.setPosition({ x: poi.x, z: poi.y });
      return poi || null;
    },
```

- [ ] **Step 2: Run the full gate + confirm guardrails**

Run: `npx vitest run`
Expected: PASS. Specifically confirm these guardrail tests are green:
- `tests/render3d-frontier-layout.test.ts` — `firstFrameSlabBlockers` still `[]` (the `mountHorse` placement at (16.2, 12.0) is outside the spawn→board wedge x[9.5–16] y[6.5–11], so it must not appear).
- `tests/render3d-phase-state.test.ts` — the funeral/first-road sequence unchanged (we added nothing to `HERO_OBJECTS`/`FIRST_FIVE_ROUTE`).

Then: `npx tsc --noEmit && npx vite build` → clean.

- [ ] **Step 3: Play it in a real foreground browser**

Run `npm run play` and open `http://127.0.0.1:5191/` in a **foreground** Chrome tab (the dev/preview tab is throttled — motion/audio won't run occluded). If an old save boots dark, run `indexedDB.deleteDatabase('westward')` and reload with `location.href = '/?n=' + Date.now()`. Walk out of the funeral, approach the horse at (16.2, 12.0), press **E** to mount, ride with **WASD** + **Shift** to gallop, **F** to dismount.

Judge against the spec's success criteria (all by feel, in the foreground browser):
1. The ride feels good on its own — you'd gallop around 30s just for the feel.
2. The "what's over there?" pull works — POI silhouettes draw you off your line.
3. Arrival pays off — a discovery lands a real little hit.
4. It's pleasant to exist in — golden light + haze + ambient sound.
5. 3–5 min in, you want to keep riding, not open a menu.

Record what does/doesn't land. Items that fail criteria 1–2 (ride feel) are tuning passes on `MOUNT_GAITS` (Task 1) and the `saddle` preset (Task 2); items failing 3–4 are discovery-presentation/vibe tuning (Tasks 7–8).

- [ ] **Step 4: Commit the debug hooks**

```bash
git add src/render3d/spike.js
git commit -m "feat(mount): debug hooks for mounted free-roam + verify guardrails"
```

---

## Out of scope (do not build in this slice)

Horse bonding/stats/inventory, mounted combat, rearing, fall-off, horse death; a dedicated hooves audio recipe; M0 WebGPU batching for grass density (the explicit *next* milestone — this slice is composition-first under the WebGL2 budget); any new POI content (reuse the 10 authored `frontier` POIs); any change to job board / faction / NG+ systems.

## Guardrails recap (must stay true at every commit)

- `HERO_OBJECTS` and `FIRST_FIVE_ROUTE` unchanged; `firstFrameSlabBlockers` stays `[]`.
- No edits to `createRenderer.js` tone mapping or `timeOfDay.js` dusk palette (the `?visual` baseline pins dusk).
- The game stays playable at every commit (the funeral → first-road spine is untouched; the slice is additive).
- Tests are sacred: any tuned-value change updates its test's expected value in the same commit.
