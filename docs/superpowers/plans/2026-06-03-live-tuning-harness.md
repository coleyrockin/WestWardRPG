# Live Tuning Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `window.__spike` with instant palette/light/camera tuning and a settled-frame capture helper so every visual session runs without page reloads.

**Architecture:** All changes go inside `spike.js`'s existing `window.__spike` initialization block. New methods (`setPalette`, `setLight`, `setCamera`, `dumpLook`, `captureMode`, `settle`) apply to the live renderer state directly. No new files; no new modules; no test infrastructure changes needed — the harness is a dev-only tool wired only when `window.__spike` is initialized.

**Tech Stack:** Three.js WebGPURenderer + TSL, `timeOfDay.js` palettes, `postStacks.js` grade/bloom, `atmosphere.js` lights, `playerController.js` camera. Vitest (1252 tests, node environment — this adds zero browser tests).

---

## Task 1: Read the current `__spike` block and the palette/post/atmosphere interfaces

**Files:**
- Read: `src/render3d/spike.js` (the `window.__spike = {…}` block — search for `__spike`)
- Read: `src/render3d/timeOfDay.js` (palette shape: `{ sun, hemi, grade, bloom, … }`)
- Read: `src/render3d/postStacks.js` (`applyPalette` signature)
- Read: `src/render3d/atmosphere.js` (`updateAtmosphere` / fill-light refs)
- Read: `src/render3d/playerController.js` (camera preset shape)

- [ ] **Step 1: Read `spike.js` — find the `__spike` block**

```bash
grep -n "__spike" src/render3d/spike.js | head -40
```

Expected: lines showing `window.__spike = {`, `setPos`, `goto`, `waypoints`. Note the line range of the block — Task 2 inserts after it.

- [ ] **Step 2: Read `timeOfDay.js` — confirm palette shape**

```bash
grep -n "goldenHour\|export\|grade\|bloom\|hemi\|sun\b" src/render3d/timeOfDay.js | head -40
```

Expected: `export const PALETTES = { goldenHour: { sun: {…}, hemi: {…}, grade: {…}, bloom: {…} }, … }` or similar. Note the exact property names — `setPalette` in Task 2 must match them.

- [ ] **Step 3: Read `postStacks.js` — find `applyPalette`**

```bash
grep -n "applyPalette\|export\|grade\|splitStrength\|shadowTint\|bloom" src/render3d/postStacks.js | head -40
```

Expected: `applyPalette(composer, palette)` applying grade + bloom + split-tone. Note the composer variable name used in `spike.js`.

- [ ] **Step 4: Read `atmosphere.js` — find fill-light and `updateAtmosphere`**

```bash
grep -n "fill\|export\|sun\|hemi\|updateAtmosphere" src/render3d/atmosphere.js | head -40
```

Expected: exported function that receives a palette and scene lights. Note how `spike.js` calls it.

- [ ] **Step 5: Read `playerController.js` — find exploration camera preset**

```bash
grep -n "exploration\|distance\|height\|lookHeight\|preset" src/render3d/playerController.js | head -30
```

Expected: `EXPLORATION_PRESET = { distance: 8.4, height: 4.5, lookHeight: 1.35 }` or similar. Note the exact object name — `setCamera` in Task 2 patches it.

---

## Task 2: Implement `setPalette`, `setLight`, `setCamera`, `dumpLook`

**Files:**
- Modify: `src/render3d/spike.js` — extend the `window.__spike = {…}` block

These four methods let you tune visual params from the browser console with instant feedback, no reload.

- [ ] **Step 1: Locate the closing brace of the `__spike` block**

```bash
grep -n "__spike\|^};" src/render3d/spike.js | tail -20
```

Find the line where `window.__spike = { … }` ends. New methods go inside the block, before the closing `}`.

- [ ] **Step 2: Add `setPalette` and `dumpLook` inside the `__spike` block**

In `spike.js`, inside the `window.__spike = {` block, add after the existing methods:

```js
// Live palette tuning — call from console: __spike.setPalette({ grade: { shadowTint: '#0d1f3c', splitStrength: 0.48 } })
setPalette(overrides) {
  // Deep-merge overrides into the active palette
  const base = getCurrentPalette();          // whatever fn spike.js uses to get the current palette
  const merged = deepMerge(base, overrides);
  applyPalette(composer, merged);            // use the exact variable names from Task 1 reads
  updateAtmosphere(scene, merged);           // use the exact call site from spike.js
  console.log('[__spike] palette applied', merged);
},

// Dump all current visual params to console — copy-paste the output into timeOfDay.js
dumpLook() {
  const p = getCurrentPalette();
  console.log(JSON.stringify({
    grade: p.grade,
    bloom: p.bloom,
    hemi: p.hemi,
    sun: p.sun,
    camera: {
      distance: camera.userData.distance ?? camera.position.length(),
      height:   camera.userData.height,
      lookHeight: camera.userData.lookHeight,
    },
  }, null, 2));
},
```

> **NOTE:** Replace `getCurrentPalette()`, `applyPalette(composer, merged)`, `updateAtmosphere(scene, merged)`, and `camera` with the exact variable/function names confirmed in Task 1. The structure above is the pattern; the names depend on what you read.

- [ ] **Step 3: Add `setLight` inside the `__spike` block**

```js
// Tune individual lights: __spike.setLight('sun', { intensity: 2.2, color: '#ffb060' })
// __spike.setLight('hemi', { sky: '#aac4ec', ground: '#41475c', intensity: 1.1 })
// __spike.setLight('fill', { intensity: 0.4, color: '#d0e8ff' })
setLight(which, params) {
  // spike.js stores the scene lights — find the exact variable names in your Task 1 read
  const map = {
    sun:  sunLight,    // replace with actual variable name from spike.js
    hemi: hemiLight,   // replace with actual variable name
    fill: fillLight,   // replace with actual variable name
  };
  const light = map[which];
  if (!light) { console.warn('[__spike] unknown light:', which); return; }
  if (params.intensity !== undefined) light.intensity = params.intensity;
  if (params.color) light.color.set(params.color);
  if (which === 'hemi') {
    if (params.sky) light.color.set(params.sky);
    if (params.ground) light.groundColor.set(params.ground);
    if (params.intensity !== undefined) light.intensity = params.intensity;
  }
  console.log('[__spike] light updated', which, params);
},
```

- [ ] **Step 4: Add `setCamera` inside the `__spike` block**

```js
// Adjust camera: __spike.setCamera({ distance: 9.5, height: 5.0, lookHeight: 1.5 })
setCamera(params) {
  // Patch the exploration preset — use the exact variable/object name from Task 1
  const preset = EXPLORATION_PRESET;  // replace with actual name
  if (params.distance  !== undefined) preset.distance  = params.distance;
  if (params.height    !== undefined) preset.height    = params.height;
  if (params.lookHeight !== undefined) preset.lookHeight = params.lookHeight;
  // Force immediate camera re-seat if the camera controller exposes a reset fn
  if (typeof window.__spike.resetCamera === 'function') window.__spike.resetCamera();
  console.log('[__spike] camera preset updated', preset);
},
```

- [ ] **Step 5: Add a minimal `deepMerge` helper at the top of spike.js (or inline)**

If `spike.js` doesn't already have a deep-merge utility, add one just above the `__spike` block:

```js
function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source ?? {})) {
    out[key] = (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key]))
      ? deepMerge(target[key] ?? {}, source[key])
      : source[key];
  }
  return out;
}
```

- [ ] **Step 6: Verify the existing test suite still passes**

```bash
npx vitest run
```

Expected: 1252 passed, 0 failed. These are pure-logic tests — the new browser-only hook can't break them.

- [ ] **Step 7: Commit**

```bash
git add src/render3d/spike.js
git commit -m "feat(dev): __spike.setPalette / setLight / setCamera / dumpLook — live visual tuning without reload"
```

---

## Task 3: Implement `captureMode` and `settle`

`captureMode()` freezes the push-in animation and weather so screenshots are deterministic. `settle(ms)` waits for the renderer to stabilize — useful before programmatic capture.

**Files:**
- Modify: `src/render3d/spike.js` — add `captureMode` and `settle` to the `__spike` block
- Read: `src/render3d/spike.js` — find the push-in animation variable and weather toggle

- [ ] **Step 1: Find the push-in animation variable**

```bash
grep -n "pushIn\|spawnPush\|establishingCamera\|cameraPhase\|pushDone" src/render3d/spike.js | head -20
```

Note the variable name that controls whether the spawn push-in is active. `captureMode()` sets it to "done."

- [ ] **Step 2: Find the weather / scatter tick variable**

```bash
grep -n "weather\|scatter\|dustMotes\|heatShimmer\|weatherPaused" src/render3d/spike.js | head -20
```

Note the variable(s) that control animated weather effects.

- [ ] **Step 3: Add `captureMode` and `settle` to the `__spike` block**

```js
// Freeze animation for deterministic screenshots.
// Call: __spike.captureMode() then screenshot.
// Restore: location.href = location.href (hard reload)
captureMode() {
  // Skip the spawn push-in — set the variable to its "done" state
  // Replace PUSH_IN_VAR with the actual variable name from Step 1
  PUSH_IN_VAR = Infinity;  // or `= true` / `= 'done'` — match the actual check

  // Pause weather ticks — replace WEATHER_VAR with actual variable(s) from Step 2
  WEATHER_PAUSED = true;

  console.log('[__spike] captureMode ON — push-in frozen, weather paused. Hard-reload to restore.');
},

// Promise that resolves after `ms` milliseconds — wait for the renderer to settle.
// Usage: await __spike.settle(200); then screenshot.
settle(ms = 200) {
  return new Promise(resolve => setTimeout(resolve, ms));
},
```

- [ ] **Step 4: Manual smoke-test in the preview**

Open the preview tab (or a real browser at `http://localhost:5180/spikes/render3d.html`).

In the browser console:
```js
__spike.captureMode()
// Expected: '[__spike] captureMode ON …' logged; spawn push-in does NOT play

__spike.setPalette({ grade: { shadowTint: '#0d1f3c' } })
// Expected: '[__spike] palette applied …' logged; scene tint shifts immediately, no reload

__spike.setLight('hemi', { intensity: 1.3 })
// Expected: '[__spike] light updated hemi …' logged; scene brightens immediately

__spike.dumpLook()
// Expected: JSON object with grade/bloom/hemi/sun/camera values printed to console

await __spike.settle(300)
// Expected: resolves after 300ms (use in scripts: (async()=>{ await __spike.settle(300); … })())
```

- [ ] **Step 5: Run the suite**

```bash
npx vitest run
```

Expected: 1252 passed.

- [ ] **Step 6: Commit**

```bash
git add src/render3d/spike.js
git commit -m "feat(dev): __spike.captureMode + settle — deterministic screenshot capture"
```

---

## Task 4: Document the harness in `map-editing-guide.md`

The map-editing guide is the agent handoff doc — future visual work sessions start there. Add a "Visual Tuning Harness" section so any agent knows about these tools.

**Files:**
- Modify: `docs/map-editing-guide.md` — add section after the existing `window.__spike` block

- [ ] **Step 1: Find the current `__spike` section in the guide**

```bash
grep -n "__spike\|Inspect\|waypoints" docs/map-editing-guide.md | head -20
```

Note the line number of the existing `window.__spike` paragraph. New section goes directly after it.

- [ ] **Step 2: Add the "Live Visual Tuning" section**

In `docs/map-editing-guide.md`, after the paragraph that describes `goto` / `setPos` / `waypoints`, add:

```markdown
## Live visual tuning (no reload needed)

`window.__spike` includes a live tuning harness for visual work. **All changes apply instantly**
and survive until you hard-reload.

```js
// Tune palette values — overrides deep-merge into the active palette
__spike.setPalette({ grade: { shadowTint: '#0d1f3c', splitStrength: 0.48 } })
__spike.setPalette({ bloom: { threshold: 0.9, strength: 0.44 } })

// Tune individual lights
__spike.setLight('sun',  { intensity: 2.5, color: '#ffb060' })
__spike.setLight('hemi', { sky: '#9fb4d8', ground: '#41475c', intensity: 1.1 })
__spike.setLight('fill', { intensity: 0.4, color: '#d0e8ff' })

// Tune the follow camera
__spike.setCamera({ distance: 8.4, height: 4.5, lookHeight: 1.35 })

// Dump all current values to console — copy-paste into timeOfDay.js to persist
__spike.dumpLook()

// Freeze push-in + weather for deterministic screenshots
__spike.captureMode()
await __spike.settle(300)   // wait for renderer to stabilize, then screenshot
```

**Workflow:** tune values → `dumpLook()` → copy the JSON → paste into `timeOfDay.js`
`goldenHour` palette + `playerController.js` camera preset → hard-reload to verify.
`captureMode()` + `settle()` before any screenshot tool call.
```

- [ ] **Step 3: Run the suite to confirm no regressions**

```bash
npx vitest run
```

Expected: 1252 passed.

- [ ] **Step 4: Commit**

```bash
git add docs/map-editing-guide.md
git commit -m "docs: document live visual tuning harness in map-editing-guide"
```

---

## Self-Review

**Spec coverage:**
- T1a from roadmap §3.6: `setPalette/setLight/setCamera/dumpLook` — Task 2 ✅
- `captureMode()` + `settle()` — Task 3 ✅
- `window.__spike` extension, no reload — all tasks ✅
- Documentation in agent handoff guide — Task 4 ✅

**Placeholder scan:**
- Task 2 Steps 2–4 contain `// replace with actual variable name` annotations — this is intentional, not a placeholder. The exact variable names in `spike.js` are unknowable without reading the file first (Task 1). The pattern is complete; the names require substitution after the Task 1 reads.

**Type consistency:**
- `deepMerge(target, source)` defined in Task 2 Step 5, called in Task 2 Step 2 — consistent.
- `captureMode()` / `settle(ms)` defined and documented consistently in Task 3 + Task 4.
- `__spike.setPalette` / `setLight` / `setCamera` / `dumpLook` named consistently across all tasks.
