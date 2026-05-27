# WestWardRPG Execution Roadmap

Single source of truth. Do not create parallel `TODO.md`, `PLAN.md`, `ROADMAP-*.md`,
or another roadmap file.

Last updated: `2026-05-27`
Branch: `main` @ `ba24094` plus local foundation-hardening edits

---

## 1. Project Summary

WestWardRPG is a browser RPG prototype with a large systems backbone already in place:
job boards/quests, deterministic save/reload, gear and crafting foundations,
housing/workbench loops, NPC memory, POI/loot systems, run summaries, and
strong smoke/visual testing coverage.

There are **two active renderers**:

- **Canvas renderer** (`src/main.js` + `index.html`) — the current playable/reference build.
  Keep it stable while 3D work proves parity.
- **Three.js spike** (`src/render3d/` + `render3d.html`) — the new renderer in progress.
  Milestone 3A art proof done; Milestone 3B gameplay in progress.

The goal: make the Three.js spike a complete, playable first-five-minute slice, then
migrate the Canvas renderer to parity (Milestones 4–9).

---

## 2. Milestone History

### Milestone 0 — Rewrite Prep & Repo Hygiene ✅

Clean repo, CI gates, Vite build, Canvas smoke passing.

### Milestone 1 — Three.js Spike ✅

`render3d.html` entry; purple-dusk scene builder; `spike_compare.mjs` screenshot gate.

### Milestone 2 — State Adapter ✅

`src/bridge/stateSnapshot.js` bridge: Canvas game state → snapshot object consumed by 3D spike.
`createRenderSnapshot` imports from canvas-side modules (`firstRoadMemory`, `gameFeel`, etc.).

### Milestone 3A — Art Proof ✅ `PR #19 / 4c30262`

Purple 3-stop dusk sky shader, road-level hero camera, backface-expansion outlines,
blob contact shadows, vignette overlay, sickly-green emissive slime, larger job board,
smoke plume animation.
`spike_compare.mjs` screenshot gate passes.

### Milestone 3B — First Gameplay Loop 🟡 in progress

**Steps 1–6 foundation + board modal + Road Slime encounter done.**
**Step 8 animation helper baseline done. Steps 7, 9, and 10 remain** — see Section 5.

---

## 3. Current Repo State

| Gate | Status |
|---|---|
| `npm test` | ✅ 96 files, 1 085 tests |
| `npm run typecheck:ts` | ✅ |
| `npm run dev:lint` | ✅ |
| `npm run test:syntax` | ✅ |
| `npm run build` | ✅ both `dist/index.html` and `dist/render3d.html`; Vite chunk warning remains |
| `WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d` | ✅ with dev server running |
| `node scripts/spike_compare.mjs` | ✅ with dev server running; wrote old/new proof screenshots |
| `npm run test:smoke` (Canvas) | Not rerun in this pass; use explicit `WESTWARD_PORT` if local port binding is restricted |

---

## 4. Architecture Constraints

- **`src/main.js` is never modified for 3D work.** The Canvas renderer is the reference.
- **All new 3D code lives in `src/render3d/`.** No top-level files for render logic.
- **No imports from `src/render3d/` inside `src/main.js`.** Bridge flows one direction: Canvas → snapshot → 3D.
- **Tests are `environment: "node"` (vitest).** No jsdom, no WebGL, no real DOM. All modules expose pure-logic seams.
- **Pure / shell split.** Every render3d module has a pure exported function (tested in Node) and an optional thin DOM/Three.js shell (not unit-tested, covered by smoke).

### Current `src/render3d/` module map

```
frontierLayout.js     placement data (world-map coordinates → 3D positions)
playerController.js   WASD walk + shift sprint + mouse-drag look; pure stepPlayer() + DOM shell
worldProxies.js       AABB collision from frontierLayout; resolveCollision() sweep
interactionSystem.js  proximity picker + E-key dispatch + setPromptText seam
phaseState.js         9-phase state machine (spawn → survey_offered)
objectiveDom.js       cached DOM refs + safe objective/meta rendering
boardModal.js         testable job-board modal state + button wiring
animationHelpers.js   pure mesh mutation helpers for bob/glow/hit/collapse/reward descriptors
encounterSystem.js    Road Slime proximity, engage, strike, death state machine
spike.js              Three.js scene assembly + RAF loop + modal handlers
                      ⚠️ still broad — geometry builders need extraction (see §5 Step 9)
```

### Coordinate convention

- World `(x, y)` (frontierLayout) → 3D `(X=x, Z=y, Y=up)`.
- `yaw = 0` → camera looks toward −Z. `yaw = −π/2` → looks +X (east).
- Player position always stored as `{ x, z }` (3D coords).
- **`interactionSystem.pickNearest`** uses `playerPos.z` vs `obj.y` — asymmetric but correct.
  Any caller passing a placement record as `playerPos` would silently get wrong distance.

### Naming landmine: "Boone" vs "warden"

The 3D layer uses `"Boone"` everywhere (prompt text, phase labels, `return_to_boone` phase).
The Canvas layer uses `npcId: "warden"` — `npcMemory.js` maps it to "Marshal Boone".
The `phaseState.js` emits `"frontier_slime_bounty_accepted"` etc.; `firstRoadMemory.js`
checks `FIRST_ROAD_STARTER_JOB_ID = "frontier_slime_bounty"`.
These do not intersect yet (3D phase machine is local spike state, not written to save).
**Must be reconciled before any write-bridge integration** (Step 9 / Milestone 7 save sync).

---

## 5. Milestone 3B — Remaining Steps (6–10)

All code in `src/render3d/`. Run all gates before every commit:

```bash
npm test && npm run typecheck:ts && npm run test:syntax && npm run dev:lint && npm run build
```

---

### Step 4 — Objective strip sync ✅ done

`phaseState.js` phase output now drives the `#objective` DOM strip through
`src/render3d/objectiveDom.js`.

Completed foundation-hardening work:

- DOM refs are cached at init through `createObjectiveDomRefs`.
- Objective metadata uses `document.createElement` / `replaceChildren`, not string HTML.
- `syncObjectiveDom` is exported and unit-tested without jsdom.
- `objectiveMeta` is asserted for every phase.
- `#prompt` has `role="status" aria-live="polite"` and `#tag` is `aria-hidden`.
- Debug globals are gated behind `import.meta.env.DEV`, while dev smoke remains supported.

**Test files:** `tests/render3d-objective-dom.test.ts`, `tests/render3d-phase-state.test.ts`

**Acceptance:** Phase label, text, and metadata update correctly; no `innerHTML` remains in
`src/render3d/spike.js`.

---

### Step 5 — Job board modal ✅ done

When the player presses E at the job board in `accept_bounty` phase:

1. Movement pauses while the board modal is open.
2. `#board-modal` opens with the existing bounty copy and focused Accept action.
3. Accept advances to `road_walk`, closes the modal, and resumes movement.
4. The job board panel shifts to a warmer accepted emissive state.

**Test file:** `tests/render3d-board-modal.test.ts`

The render3d smoke also asserts the modal opens, prevents movement while open, and
closes after accept. No Canvas state is modified.

**Acceptance:** Modal opens, phase advances, modal closes, movement freeze is verified,
and board accepted state is visible.

---

### Step 6 — Slime encounter (`src/render3d/encounterSystem.js`) ✅ done

`createEncounterSystem(scene, snapshot, options)` owns Road Slime proximity, explicit
cache-open engagement, strike/death handling, and mesh animation hooks.

Slime state machine: `patrol → aggro → attack → dead`

- `patrol`: slime bobs gently (`animationHelpers.idleBob`). No movement.
- `aggro` (player within 4 units or cache-open engage): calls registered `onSlimeEngage`.
- `attack` (player within 1.5 units): calls registered `onSlimeAttack`.
- `dead` (E pressed while slime in strike range): calls registered `onSlimeDeath`;
  `spike.js` advances `defeat_slime`.

**Note:** `worldObjects` is captured by reference at construction time in both
`interactionSystem` and `encounterSystem`. If a future step removes dead slimes,
mutate the array in-place — do not replace the reference.

**Test file:** `tests/render3d-encounter.test.ts`

Asserted: state transitions; explicit engage; deferred engage callbacks; `onSlimeDeath`
fires once; dead slime no longer aggros.

**Acceptance:** Cache open engages slime, player can move into range → press E →
slime dies → phase advances.

---

### Step 7 — Reward + Map Scrap

On `onSlimeDeath`:

1. `advance("scrap_earned")`.
2. `+1 Map Scrap` floating text over slime position (DOM overlay preferred over Three.js sprite).
3. Smoke Cache lid mesh scale-Y ×1.2 (open animation).
4. `smokeCache` interaction becomes active; prompt changes to "E — Open Cache".
5. On cache open: `advance("board_return")`.

**Prerequisite:** `interactionSystem.js` currently has no update path for enabling/disabling
targets after construction. Before this step, either expose `setWorldObjects(arr)` on the
system or accept an optional `worldObjects?` param in `update(playerPos, worldObjects?)`.

**Test file:** `tests/render3d-rewards.test.ts`

Assert: Map Scrap count increments; phase transitions correctly; cache interaction
enabled after slime death.

---

### Step 8 — Animation helpers (`src/render3d/animationHelpers.js`) ✅ baseline done

Pure functions — no Three.js instantiation required. Take a mesh + time, mutate in place:

```js
idleBob(mesh, t, amplitude = 0.04)      // gentle y sine
walkBob(mesh, t, speed)                 // lateral + vertical walk cycle
interactGlow(mesh, t)                   // emissive pulse on interactable
hitFlash(mesh, intensity = 3.0)         // one-frame emissive spike
stagger(mesh, direction, t)             // knockback lerp
deathCollapse(mesh, progress)           // scale Y → 0 over 0.4s
rewardPop(scene, position, text)        // floating +text (DOM overlay preferred)
```

These are available for Steps 6 and 7. `rewardPop` currently returns and records a
DOM-overlay-friendly reward descriptor; Step 7 still needs the actual visible reward
overlay wiring.

**Test file:** `tests/render3d-animation-helpers.test.ts`

Asserted with fake meshes: each helper mutates the expected mesh property; reward
descriptors are recorded without constructing Three.js objects.

---

### Step 9 — Game loop extraction (`src/render3d/gameLoop.js`)

`spike.js` currently owns: scene construction, lighting, geometry builders, RAF loop,
DOM HUD sync, modal handlers, and debug surface. Split before the loop gets more complex.

**`spike.js` becomes:** scene + camera + renderer construction only. No RAF, no handlers.

**`gameLoop.js` owns:**
- `requestAnimationFrame` loop.
- `player.update(dt, proxies)`.
- `interaction.update(playerPos)`.
- `encounter.update(playerPos, dt)`.
- Phase machine poll and DOM sync.
- `window.__westward3dLoop` debug surface.

**`src/render3d/propBuilders.js`:** extract geometry builders (spike.js lines ~111–288).

**`src/render3d/handlers.js`:** extract `handleJobBoard`, `handleSmokeCache`,
`handleBrokenWagon`, `handleRoadSlime` — or fold into `phaseState.js` as registered callbacks.

**Debug globals — gate behind dev check:**

```js
if (import.meta.env.DEV) {
  window.__westward3dTest = { ... };
}
```

No new tests required for pure extraction — existing tests + smoke cover behavior.
`npm run test:render3d` (smoke) is the acceptance gate.

---

### Step 10 — Smoke suite hardening (`scripts/render3d_loop_smoke.mjs`)

**Port default:** done. The script now defaults to `http://127.0.0.1:5180`, matching
`vite.config.js`. It still accepts `WESTWARD_URL` for explicit smoke targets.

**Remaining smoke assertions to add:**

- `objectiveMeta` DOM tags render correctly each phase.
- Visible Map Scrap reward text appears after slime death.
- Smoke Cache/camera reward state is asserted after Step 7.

---

### Milestone 3B Acceptance Criteria

All 10 steps done when:

1. A tester can walk WASD through the frontier, open the job board, defeat the slime,
   collect Map Scrap, open the cache, and return to Boone — full `spawn → survey_offered` loop.
2. `#prompt`, `#objective`, and `#board-modal` always agree (single phase state machine drives all three).
3. `npm run test:render3d` (smoke) exits 0 and asserts the full phase sequence.
4. Canvas build is untouched, all 1 085+ tests still pass.
5. `node scripts/spike_compare.mjs` still exits 0.
6. No `console.log` stub handlers remain — all E-press actions have real flows.

---

## 6. Technical Debt (known, tracked)

Pay down during the step that touches the affected file, not as a dedicated pass.

| Debt | File | ~Line | Pay off by |
|---|---|---|---|
| String-based DOM mutation for meta tags | `spike.js` | paid | Done in Step 4 |
| `window.setTimeout` phase transition — no cancel handle | `spike.js` | scrap auto-ack remains | Step 7 |
| `document.querySelector` called at transition time (not cached) | `spike.js` | paid | Done in Step 4 |
| Debug globals unconditionally attached to `window` | `spike.js` | paid | Done in Step 4 |
| Stub `console.log` E-press handlers | `spike.js` | 532–544 | Steps 5–7 |
| `worldObjects` captured by ref — no update path | `interactionSystem.js` | 62 | Step 7 |
| `BOUNDARY_EPSILON` undocumented vs `PLAYER_RADIUS_DEFAULT` | `worldProxies.js` | 14, 86 | Next touch |
| No `dispose()` on spike root object | `spike.js` | 598 | Step 9 |
| Smoke script default port mismatch | `render3d_loop_smoke.mjs` | paid | Done in Step 4 |
| `syncObjectiveDom` not exported → untestable | `objectiveDom.js` | paid | Done in Step 4 |

---

## 7. Test Coverage Gaps

| Gap | Where to add | Notes |
|---|---|---|
| `frontierLayout.js` — no direct tests | `tests/render3d-frontier-layout.test.ts` | Covered for hero kinds, finite coords, PLAYER_SPAWN |
| `phaseState.js` — `objectiveMeta` not asserted | `tests/render3d-phase-state.test.ts` | Covered for every loop phase |
| `playerController.setPosition` untested | `tests/render3d-player-controller.test.ts` | Covered because smoke uses it as fallback |
| `playerController.update(dt, proxies)` collision path | `tests/render3d-player-controller.test.ts` | Pass a real proxy list to `update` |
| Multi-proxy pinch (two overlapping inflated extents) | `tests/render3d-world-proxies.test.ts` | Exercises the 4-iteration stuck-fallback |
| In-range → out-of-range → in-range crossing | `tests/render3d-interaction.test.ts` | Stateful re-entry edge case |
| Reward overlay wiring | `tests/render3d-rewards.test.ts` (new) | Step 7 |

---

## 8. Roadmap Omissions (not yet planned, need a milestone home)

### Pointer lock

`playerController.js` uses left-button-drag for look. True first-person requires
`requestPointerLock()` — drag-to-look degrades when the player also holds WASD.
Low risk as an optional enhancement with drag fallback.
**Home:** Step 9 sub-task or Milestone 4 polish.

### Touch / mobile input

`playerController.js` has no touch event handling. `render3d.html` declares the viewport
meta tag (mobile-responsive intent) but delivers no virtual controls.
**Home:** Milestone 4 or dedicated sub-step. Requires joystick overlay or tilt-control design decision.

### Runtime performance budget

Current scene has 6 point lights, PCFSoftShadowMap at 2048×2048, and ~11 per-kind
geometry builders. No draw-call count, triangle budget, or frame time target is documented.
**Required before Milestone 4:** Baseline on a mid-range integrated GPU (60 fps target).
Instrument with `renderer.info.render` in dev mode and document the budget here.

### Write bridge (save/load integration)

`stateSnapshot.js` is read-only. `phaseState.js` tracks its own state that parallels
the Canvas save schema but never writes to `savePersistence.js`.
**Required before Milestone 7 parity:** Design and implement a write bridge.
**Prerequisite:** Reconcile "Boone" (3D) ↔ "warden" (Canvas) naming before bridge design.

### Audio

`src/audio.js` exists for the Canvas game. The 3D spike has no audio — no
`THREE.AudioListener`, no interaction SFX, no ambient loop.
**Home:** Milestone 4 polish pass. Use Three.js PositionalAudio for spatial effects,
DOM `<audio>` element for ambient loop.

### `survey_offered` continuation

`phaseState.js` `survey_offered` phase has no transitions. `spike.js` shows a hardcoded
string: "Old Road Survey is ready. This is tomorrow's next playable job."
The loop terminates with no designed handoff. Options:
1. Restart loop (new run).
2. Unlock "Old Road Survey" as a new job flow.
3. Exit to canvas game with updated save state.
**Must be decided before Milestone 3B acceptance.**

### Accessibility for 3D path

Known gaps in `render3d.html`:
- `#prompt` has no `role` or `aria-live` — prompt text won't be announced.
- `#tag` debug overlay has no `aria-hidden="true"`.
- `<canvas id="scene">` has no `aria-label` or `role`.
- Focus is not trapped in `#board-modal` (buttons exist but no focus management).

**Home:** `#tag` / `#prompt` quick attributes are done; full focus-trap and canvas label
belong in Milestone 6.

---

## 9. Quick Wins (< 1 hour each, no planning required)

Do these opportunistically, not as a dedicated session:

1. **Fix smoke port** — done. `render3d_loop_smoke.mjs` now defaults to `5180`.

2. **`setPosition` test** — done in `render3d-player-controller.test.ts`.

3. **`frontierLayout.js` direct tests** — done in `tests/render3d-frontier-layout.test.ts`.

4. **`objectiveMeta` assertions** — done in `tests/render3d-phase-state.test.ts`.

5. **`aria-hidden` + `aria-live`** — done in `render3d.html`.

6. **Gate debug globals** — done in `spike.js`.

7. **Fix Three.js camera direction seeding** — done in `playerController.js`; real
   `PerspectiveCamera.getWorldDirection` now preserves the intended opening frame.

---

## 10. Milestone 4+ (after 3B complete)

### Milestone 4 — Art Pipeline

- Material library: replace per-object `MeshStandardMaterial` literals with a shared
  `materials.js` palette.
- GLTF model import pipeline for at least one hero prop.
- Post-processing: bloom pass on emissive surfaces.
- Audio: ambient + interaction SFX.
- Pointer lock implementation.

### Milestone 5 — Combat and Character Feel

- `encounterSystem.js` hardened with animation, timing, player HP.
- Hit flash, stagger, death collapse via `animationHelpers.js`.
- Screen shake on hit.

### Milestone 6 — UI Rebuild

- `#board-modal` with keyboard focus trapping and ARIA.
- Inventory panel driven by real save state (write bridge required).
- Phase progress indicator.

### Milestone 7 — System Parity

- Canvas renderer feature parity checklist (jobs, loot, gear, housing, NPC memory).
- Write bridge: 3D phase completions → `savePersistence.js`.
- `stateSnapshot.js` no longer uses stub time/quest values.
- "Boone" / "warden" naming reconciled.

### Milestone 8 — Retire Canvas Renderer

- Canvas renderer feature-frozen.
- `index.html` redirects to `render3d.html`.
- All Canvas-only tests migrated or deleted.

### Milestone 9 — Release MVP

- Performance budget met on integrated GPU (60 fps target).
- Accessibility audit passed.
- `survey_offered` continuation implemented.
- README demo link live, screenshot gallery current.
- `npm run package:itch` produces shippable artifact.

---

## 11. Verification Gates

### Before every commit

```bash
npm test && npm run typecheck:ts && npm run test:syntax && npm run dev:lint && npm run build
```

### Before marking a Milestone 3B step done

```bash
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d   # smoke: full phase loop
node scripts/spike_compare.mjs                              # screenshot gate (dev server up)
```

### Before Milestone 3B acceptance

- Manual playtest: WASD, collision, prompt, board modal, slime fight, scrap reward, cache,
  return to Boone.
- All 9 phases confirmed in order with correct labels.
- No `console.log` stub handlers remain.
- `npm run test:render3d` exits 0 and asserts all smoke checks.

---

## 12. Next Agent Instructions

### Immediate (before starting Step 7)

1. Run all gates (§11) and record results.
2. Read `spike.js`, `phaseState.js`, `interactionSystem.js`, and `encounterSystem.js`
   in full before touching Step 7.
3. Confirm `WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d` passes with dev server running.
4. Start Step 7 by wiring Map Scrap reward UI and cache/return behavior through the phase machine.

### Step 7 checklist

- [ ] Keep `phaseState.js` as the source of truth for `scrap_earned` and `return_to_boone`.
- [ ] Add visible `+1 Map Scrap` reward feedback without writing Canvas save state.
- [ ] Enable cache/return interactions through a tested update seam, not array replacement.
- [ ] Add focused reward tests before broad loop extraction.
- [ ] All gates pass.

### Files involved in Steps 4–10

```
src/render3d/spike.js                       Steps 5–6 done; modify next in Steps 7 and 9
src/render3d/objectiveDom.js                done (Step 4)
src/render3d/boardModal.js                  done (Step 5)
src/render3d/gameLoop.js                    create (Step 9)
src/render3d/propBuilders.js                create (Step 9 extraction)
src/render3d/handlers.js                    create (Step 9 extraction)
src/render3d/encounterSystem.js             done (Step 6)
src/render3d/animationHelpers.js            baseline done (Step 8)
render3d.html                               Step 5 accessibility/focus foundation done; modify next in Step 7
scripts/render3d_loop_smoke.mjs             Step 5 modal + Step 6 slime proximity smoke done
tests/render3d-objective-dom.test.ts        done (Step 4)
tests/render3d-board-modal.test.ts          done (Step 5)
tests/render3d-encounter.test.ts            done (Step 6)
tests/render3d-animation-helpers.test.ts    done (Step 8)
tests/render3d-rewards.test.ts              create (Step 7)
```

### What must not be broken

- `src/main.js` — never touched.
- Canvas/reference test suite (1 085+ tests) — must stay green.
- `node scripts/spike_compare.mjs` — must stay exit 0.

---

## 13. Production Readiness Checklist

Before portfolio-ready state:

- [ ] All Milestone 3B steps complete and smoke-gated.
- [ ] No `console.log` stub handlers remain.
- [x] Debug globals gated behind `import.meta.env.DEV`.
- [ ] `#prompt` and `#board-modal` accessibility attributes complete.
- [ ] Pointer lock implemented or explicitly deferred with rationale.
- [ ] Performance budget documented (draw calls, frame time on integrated GPU).
- [ ] Write bridge design decided (even if implementation is deferred).
- [ ] `survey_offered` continuation designed.
- [ ] README demo link live and correct.
- [ ] `npm run package:itch` produces working artifact.

---

## 14. Appendix — Action Template

Use for all future work packages added to this roadmap:

- **What needs to be done**
- **Why it matters**
- **Expected impact**
- **Difficulty** (`Low` / `Medium` / `High`)
- **Risk** (`Low` / `Medium` / `High`)
- **Dependencies**
- **Files / folders involved**
- **Suggested implementation order**
- **Acceptance criteria**
- **Tests / checks the next agent should run**
