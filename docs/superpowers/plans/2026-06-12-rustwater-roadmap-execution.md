# RUSTWATER Roadmap Execution Plan (M0 → M4+)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish M0 performance reset, then ship the Meridian vertical slice (M1), wealth systems (M2), and Act 1 completion (M3) — extending shipped WestWard engines in place per [`roadmap.md`](../roadmap.md) and [`rustwater-treatment.md`](../rustwater-treatment.md).

**Architecture:** Progressive re-skin, never restart. One renderer (WebGPU + reduced WebGL2 fallback). Renderer-agnostic logic (`jobBoard`, `questRuntime`, `npcMemory`, `shopCatalog`, `progressionSystem`) grows via `gameState.js`; 3D wiring stays in `spike.js` + `frontierLayout.js`. The first-road loop (`phaseState.js`) stays the tripwire until M1 missions replace it beat-for-beat — extend via `activeMission`, don't break default `spawn` start.

**Tech Stack:** Node 22 · Vite · Three.js WebGPURenderer + TSL · Vitest · Playwright smoke/golden gates

**Current state (2026-06-12):** ~590 lines uncommitted on M0 instancing + M1 scaffolding (`gravesite`, `dust_to_dust` phases in `phaseState.js`, `buildGravesite`, `__westward3dStats`, probe scripts). Default loop tests must stay green untouched.

---

## File map (what each milestone touches)

| Area | Primary files |
|---|---|
| Renderer / backend | `src/game/renderer/createRenderer.js`, `src/render3d/spike.js` |
| World batching | `src/game/world/scatter.js`, `weatherView.js`, `water.js`, `ground.js` |
| Perf CI | `scripts/_boot_probe_tmp.mjs`, `scripts/backend_caps_probe.mjs`, `scripts/render3d_loop_smoke.mjs` |
| Mission FSM | `src/render3d/phaseState.js`, `src/render3d/gameState.js`, `src/render3d/runSave.js` |
| World map | `src/render3d/frontierLayout.js`, `src/render3d/worldProxies.js` |
| Interactions | `src/render3d/interactionSystem.js`, `src/render3d/spike.js` handlers |
| Quest wiring | `src/render3d/questRuntime.js`, `src/jobBoard.js` |
| UI modals | `src/render3d/boardModal.js`, `boardDom.js` → clone for holdings/shop |
| HUD | `index.html`, spike HUD updaters |
| Tests | `tests/render3d-phase-state.test.ts` (default loop — sacred), new mission tests |

---

## Phase 0 — Land in-progress work

### Task 0: Commit the M0/M1 scaffold

**Files:**
- Modify: all 17 files in current working tree
- Test: full gate

- [ ] **Step 1: Run gate on current tree**

```bash
cd /Users/boydroberts/Documents/projects/WestWardRPG
npx vitest run && npx tsc --noEmit && npx vite build
```

Expected: all vitest pass; `render3d-phase-state.test.ts` still starts at `spawn` (not `funeral`).

- [ ] **Step 2: Fix any regressions from instancing path**

If NPR material or scatter tests fail, align `tests/render3d-npr-material.test.ts` expectations with shared-material instancing (already partially updated).

- [ ] **Step 3: Commit scaffold**

```bash
git add index.html scripts/ src/ tests/
git commit -m "$(cat <<'EOF'
feat(m0+m1): instanced scatter/weather, gravesite scaffold, dust_to_dust phases

WebGPU path batches flora/weather; WebGL2 fallback stays halved per-mesh.
Adds Abram gravesite + optional funeral/implant loop extension without
breaking the default first-road spawn tripwire.
EOF
)"
```

---

## M0 — Performance Reset (finish)

Roadmap targets: ≥5× frame-time improvement · <~400 draw calls in town · CI ceiling.

### Task 1: Baseline measurement (foreground protocol)

**Files:**
- Create: `scripts/perf_baseline_probe.mjs` (formalize `_boot_probe_tmp.mjs`)
- Modify: `docs/roadmap.md` M0 §1 (record numbers)

- [ ] **Step 1: Start play server**

```bash
npm run play
```

- [ ] **Step 2: Measure three poses in a real foreground Chrome tab**

Open `http://127.0.0.1:5191/?n=` + timestamp. In DevTools console:

```javascript
async function samplePose(x, z, label) {
  window.__spike.setPos(x, z);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const t0 = performance.now();
  for (let i = 0; i < 120; i++) await new Promise(r => requestAnimationFrame(r));
  const ms = performance.now() - t0;
  const stats = window.__westward3dStats();
  return { label, ms120: ms, fps: 120000 / ms, ...stats };
}
const poses = [
  await samplePose(9.5, 8.5, "town"),
  await samplePose(60, 12, "open_range"),
  await samplePose(48, 16, "marsh"),
];
console.table(poses);
```

- [ ] **Step 3: Record baseline table in `docs/roadmap.md` M0 §1**

Example row format: `| town (9.5,8.5) | webgpu | 142ms/120f | 487 calls | 2100 casters |`

---

### Task 2: Wire backend through spike boot

**Files:**
- Modify: `src/render3d/spike.js` (pass `backend` to `createScatter`, `createWeatherView`, material factories)
- Test: `tests/render3d-npr-material.test.ts`

- [ ] **Step 1: Ensure `createRenderer` result propagates**

After `const { renderer, backend } = await createRenderer(canvas)`, thread `backend` into:

```javascript
const scatter = createScatter(scene, { backend, count: backend === "webgl" ? 45 : 90 });
const weather = createWeatherView(scene, { backend });
```

- [ ] **Step 2: WebGL reduced mode flags**

When `backend === "webgl"`:
- `renderer.shadowMap.enabled = false` (already in createRenderer)
- Halve weather particle pools (already in weatherView)
- Skip shadow casters on scatter instances

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/render3d-npr-material.test.ts tests/render3d-world-proxies.test.ts
```

---

### Task 3: Shared material pools + shadow culling

**Files:**
- Modify: `src/game/renderer/materials/nprMaterial.js` (add `getSharedNprMaterial(key)` cache)
- Modify: `src/render3d/spike.js` (distance cull + `castShadow` only on hero/buildings)

- [ ] **Step 1: Add material pool**

```javascript
const _pool = new Map();
export function getSharedNprMaterial(key, factory) {
  if (!_pool.has(key)) _pool.set(key, factory());
  return _pool.get(key);
}
```

Use in `scatter.js` instancing path: one material per color bucket, not per instance.

- [ ] **Step 2: Shadow-caster culling in spike render loop**

```javascript
const SHADOW_NEAR = 28; // world units from player
scene.traverse((o) => {
  if (!o.isMesh) return;
  if (o.userData.alwaysShadow) return;
  const dx = o.position.x - player.position.x;
  const dz = o.position.z - player.position.z;
  o.castShadow = backend === "webgpu" && (dx * dx + dz * dz) < SHADOW_NEAR * SHADOW_NEAR;
});
```

Mark hero buildings/props with `userData.alwaysShadow = true` at build time.

- [ ] **Step 3: Re-measure town pose**

Target: draw calls < 600 interim, < 400 after Task 4.

---

### Task 4: Merged static town geometry (WebGPU only)

**Files:**
- Modify: `src/render3d/spike.js` (`buildWesternBuilding` batch path)
- Test: `tests/render3d-frontier-layout.test.ts` (layout floors only rise; `firstFrameSlabBlockers === []`)

- [ ] **Step 1: Group procedural building boxes by material key**

After western-kit build, if `backend === "webgpu"`, merge same-material `BoxGeometry` transforms into `BufferGeometryUtils.mergeGeometries` (or manual merge) → one mesh per material per building.

- [ ] **Step 2: Verify layout tripwire**

```bash
npx vitest run tests/render3d-frontier-layout.test.ts
```

- [ ] **Step 3: Re-measure — record post-M0 numbers in roadmap.md**

---

### Task 5: CI perf gate

**Files:**
- Modify: `scripts/render3d_loop_smoke.mjs`
- Create: `scripts/perf_stats_probe.mjs`

- [ ] **Step 1: Add stats assertion to loop smoke**

After loop completes, evaluate:

```javascript
const stats = await page.evaluate(() => window.__westward3dStats?.() ?? null);
if (!stats || stats.calls > 900) throw new Error(`draw-call ceiling: ${stats?.calls}`);
```

Use 900 for WebGL CI path (reduced mode); document separate WebGPU ceiling when headless WebGPU lands.

- [ ] **Step 2: Add wall-time budget**

Fail smoke if total script runtime > 45s (tune from current green runs).

- [ ] **Step 3: Run smoke**

```bash
npm run play &
sleep 3
WESTWARD_URL=http://127.0.0.1:5191 npm run test:render3d
```

---

## M1 — Meridian Vertical Slice

Treatment missions 1.1–1.3 + Calico dressing + smart-link revolver v0.

### Task 6: Mission 1.1 "Dust to Dust" — wire the funeral beat

**Files:**
- Modify: `src/render3d/spike.js` (gravesite handler, Executor speech, spawn position)
- Modify: `src/render3d/gameState.js`, `src/render3d/runSave.js` (`activeMission: "dust_to_dust"` on fresh run)
- Modify: `index.html` (Executor prompt styling — chrome tint, distinct from NPC speech)
- Test: `tests/render3d-phase-state.test.ts` (add NEW describe block for dust_to_dust; leave default block untouched)

- [ ] **Step 1: Fresh-run mission flag**

In `createGameState()` / `createInitialLoopState()`:

```javascript
loop: createInitialLoopState({ activeMission: "dust_to_dust" }),
```

Persist `activeMission` in `runSave.js` normalize path.

- [ ] **Step 2: Gravesite interaction handler in spike.js**

Pattern: copy `handleSmokeCache` — on `gravesite` interact:

```javascript
if (loopState.phase === "funeral") {
  transitionLoopPhase(loopState, "attend_funeral");
  npcSpeechMsg = 'Mourner: "He owned the territory. Now he owns you."';
  beatToast.show("Dust to Dust", "Abram Cross is in the ground.");
} else if (loopState.phase === "implant") {
  transitionLoopPhase(loopState, "install_implant");
  npcSpeechMsg = 'Executor: "Stop sniveling. We have roads to ride."';
  beatToast.show("Neural Sync", "The implant is live. Your father's voice is in your skull.");
}
```

- [ ] **Step 3: Executor visual treatment**

CSS in `index.html` for `#prompt-bar.executor`:
- `text-shadow: 0 0 8px #00ffc8`
- `border-left: 3px solid #00ffc8`
- Toggle class when `npcSpeechMsg` starts with `Executor:`

- [ ] **Step 4: Spawn player at gravesite for dust_to_dust**

On boot when `activeMission === "dust_to_dust"`, `player.setPosition({ x: 15, z: -4 })` before cam intro.

- [ ] **Step 5: Add dust_to_dust test block**

```typescript
describe("dust_to_dust mission extension", () => {
  it("starts at funeral when activeMission is set", () => {
    const state = createInitialLoopState({ activeMission: "dust_to_dust" });
    expect(state.phase).toBe("funeral");
    expect(getPhaseView(state.phase, state.activeMission).activeTargetKind).toBe("gravesite");
  });
  it("walks funeral → implant → spawn", () => {
    let s = createInitialLoopState({ activeMission: "dust_to_dust" });
    s = transitionLoopPhase(s, "attend_funeral");
    expect(s.phase).toBe("implant");
    s = transitionLoopPhase(s, "install_implant");
    expect(s.phase).toBe("spawn");
  });
});
```

- [ ] **Step 6: Gate**

```bash
npx vitest run tests/render3d-phase-state.test.ts
WESTWARD_URL=http://127.0.0.1:5191 npm run test:render3d
```

---

### Task 7: Courier quest world-integration (mission pattern warm-up)

**Files:**
- Modify: `src/render3d/frontierLayout.js` (add placements)
- Modify: `src/render3d/interactionSystem.js` (PROMPTS)
- Modify: `src/render3d/spike.js` (handlers → `recordJobEvent`)
- Test: `tests/render3d-quest-runtime.test.ts`, `tests/render3d-interaction.test.ts`

Engine already ships: `frontier_eastwater_run` in `jobBoard.js`, `questRuntime.js` gates.

- [ ] **Step 1: Add placements**

```javascript
{ kind: "questPickup",  label: "Ranch Ledger", x: 14.2, y: 5.9,  color: "#8a6a40", size: 0.9 },
{ kind: "questDropoff", label: "Eastwater Drop", x: 128.8, y: 18.6, color: "#6a5040", size: 0.9 },
```

Path-check tumbleweed/animal bands (ranch weed x=122, y 11.9–15.4).

- [ ] **Step 2: Composite interaction gate**

In `interactionSystem.js` target enable:

```javascript
(t) => loopState.isTargetEnabled(t) || questTargetEnabled(game.world.jobs, t)
```

- [ ] **Step 3: Handlers**

Pickup → `recordJobEvent(jobs, "frontier_eastwater_run", "pickup_ledger")` + toast.
Dropoff → `recordJobEvent(..., "deliver_ledger")` + reward toast.

- [ ] **Step 4: Objective strip fallback**

HUD objective uses `questObjectiveView(game.world.jobs)` when active courier job.

- [ ] **Step 5: Tests + gate**

Update `render3d-interaction.test.ts` kind set; run vitest.

---

### Task 8: Mission 1.2 "The Reading" — holdings UI

**Files:**
- Create: `src/render3d/holdingsModal.js`, `src/render3d/holdingsDom.js`
- Modify: `src/render3d/gameState.js` (seed holdings from shopCatalog)
- Modify: `index.html` (`#holdings-modal` CSS cloned from `#board-modal`)
- Test: `tests/render3d-holdings-modal.test.ts` (new)

- [ ] **Step 1: Seed holdings list in gameState**

```javascript
holdings: [
  { id: "crossline_ranch", name: "Crossline Ranch", region: "ranch", income: 120 },
  { id: "calico_saloon", name: "The Rustwater Saloon", region: "town", income: 45 },
  { id: "providence_penthouse", name: "Providence Penthouse", region: "providence", income: 0 },
],
```

- [ ] **Step 2: Clone boardDom pattern**

`holdingsDom.js` — `createElement`/`textContent` only. Rows: name, region chip, weekly income. Footer: total acreage copy from treatment.

- [ ] **Step 3: Phase hook**

New phase `holdings_reading` after `board_choice` OR triggered by interactable `lawOffice` placement. Transition via `transitionLoopPhase(state, "open_holdings")`.

- [ ] **Step 4: Test DOM security + render**

```typescript
it("builds holdings modal without innerHTML sinks", () => {
  const el = buildHoldingsModal({ holdings: sample });
  expect(el.querySelector("#holdings-modal")).toBeTruthy();
});
```

---

### Task 9: Mission 1.3 "Lord of the Manor" — morality fork

**Files:**
- Modify: `src/npcMemory.js` (witness event types)
- Modify: `src/render3d/spike.js` (saloon manager choice modal)
- Modify: `src/render3d/gameState.js` (`legend` seed field)
- Test: `tests/npc-memory.test.ts`, new phase transition test

- [ ] **Step 1: Add `legend` to gameState (stub for M2, used here)**

```javascript
player: { ..., legend: 0 },
```

- [ ] **Step 2: Three-choice board-style modal at saloon**

Choices: `fire_manager` / `forgive_manager` / `make_example`.
Each calls `recordNpcMemoryEvent` + adjusts `legend` (+5 example, +2 forgive, +1 fire).

- [ ] **Step 3: Witnessed flag**

`recordNpcMemoryEvent(npcId, { type: "witnessed_morality", choice, legendDelta })`.

- [ ] **Step 4: Phase transition**

`lord_of_manor` phase → choice → `spawn` or next mission phase.

---

### Task 10: Calico dressing pass

**Files:**
- Modify: `src/render3d/spike.js` (`buildSteelMustang` already exists — add placement)
- Modify: `src/render3d/frontierLayout.js` (neon sign placements, antenna props)
- Modify: `index.html` + spike HUD (Dustward → Calico Flats; road sign "CALICO FLATS ½ MI")
- Test: `tests/render3d-frontier-layout.test.ts`

- [ ] **Step 1: HUD town name**

Replace "Dustward" strings in objective/HUD with "Calico Flats". Gate sign stays **WESTWARD** (owner decision).

- [ ] **Step 2: One steel-mustang prop**

`{ kind: "steelMustang", x: 11.5, y: 10.2, size: 1.1 }` — clear spawn wedge x[9.5–16] y[6.5–11].

- [ ] **Step 3: Neon on existing emissive lamps**

Add 2–3 `neonSign` placements using emissive NPR materials (saloon, bounty office). Rule: nothing sleek — sun-bleached chrome, clapboard.

- [ ] **Step 4: Golden gate**

Only if neon shifts dusk composition:

```bash
WESTWARD_URL=http://127.0.0.1:5191 npm run test:visual
# eyeball diff; if intentional:
npm run test:visual:update
```

---

### Task 11: Smart-link revolver v0

**Files:**
- Modify: `src/render3d/combat/playerCombat.js` (or equivalent draw/attack module)
- Modify: `src/progressionSystem.js` (seed `deadeye_protocol` perk stub)

- [ ] **Step 1: Slow-mo hook on draw (F key)**

When drawing weapon, set `timeScale = 0.35` for 1.2s real-time; restore in combat update.

- [ ] **Step 2: Visual — smart-link reticle**

Brief emissive cyan ring on crosshair DOM element during slow-mo.

- [ ] **Step 3: Test combat FSM still passes**

```bash
npx vitest run tests/render3d-combat*.test.ts
```

---

## M2 — Systems of Wealth

### Task 12: Cash / Standing / Legend meters

**Files:**
- Modify: `src/render3d/gameState.js`
- Modify: `index.html` (HUD chips)
- Modify: `src/render3d/spike.js` (HUD updater)
- Test: `tests/render3d-game-state.test.ts`

- [ ] **Step 1: State shape**

```javascript
wealth: { cash: 0, standing: 50, legend: 0 },
```

`cash` mirrors `player.gold` initially; migrate helpers.

- [ ] **Step 2: HUD chips** — three compact pills top-right: `$Cash`, `Standing`, `★Legend`.

- [ ] **Step 3: Standing gates**

In `interactionSystem.js`, some prompts require `standing >= N` (e.g. Providence gate).

---

### Task 13: Trouble engine v0

**Files:**
- Create: `src/troubleEngine.js`
- Modify: `src/jobBoard.js` (trouble job templates)
- Modify: `src/render3d/spike.js` (scheduler tick)

- [ ] **Step 1: Scheduler**

```javascript
export function rollTrouble(state, rng) {
  const pressure = (state.wealth.cash / 1000) * (1 + state.wealth.legend / 50);
  if (rng() > Math.min(0.4, pressure * 0.05)) return null;
  return pickTroubleTemplate(state, rng);
}
```

- [ ] **Step 2: Deliver via jobBoard encounter templates**

Lawsuit notice, kidnap attempt (combat), con artist (dialogue choice).

- [ ] **Step 3: Tests**

```bash
npx vitest run tests/trouble-engine.test.ts
```

---

### Task 14: Businesses v1 + shop UI

**Files:**
- Create: `src/render3d/shopModal.js`, `src/render3d/shopDom.js`
- Modify: `src/shopCatalog.js` (saloon + bounty office SKUs)
- Modify: `index.html` (`#shop-modal`)

Clone `boardModal.js` / `boardDom.js` exactly. Wire `tradeWithVendor` + `economyServices`.

- [ ] **Step 1: Saloon interactable opens shop modal**
- [ ] **Step 2: Bounty office opens jobBoard procedural listings**
- [ ] **Step 3: Gossip → quest lead** — saloon purchase/action adds `questLead` to gameState

---

## M3 — Act 1 Complete (missions 1.4–1.8)

**Owner-authored content required before implementation** — treatment §Act 1 table. Do not improvise dialogue or Seizure branching.

### Task 15: Combat road mission (1.4 Smart Money)

- Kidnap ambush on Providence road — new `encounterSystem` template, smart-link combat showcase.

### Task 16: Faction intro (1.5 The Tally)

- Three Tally Men in saloon — dialogue tree via `npcSpeechMsg` + choices; Tongue skill check stub.

### Task 17: Investigation (1.6 Preacher's Proof)

- Josiah NPC + evidence object; Wire skill check; three branches (bury / verify / burn).

### Task 18: Economy beat (1.7 The Audit)

- Accountant dialogue + Helios intro; Vance NPC placement in Providence skeleton.

### Task 19: Providence region skeleton

**Files:**
- Modify: `src/render3d/frontierLayout.js` — new district coords
- Modify: `src/render3d/spike.js` — `buildHeliosSpire` landmark

### Task 20: THE SEIZURE (1.8) — branching finale

- Gala scene; five-asset choice; `savePersistence` divergent `seizedAssets` / `keptAsset` fields.
- **Blocker:** owner must author Seizure script + asset list before coding.

---

## M4+ — Wide Game (sequenced, not detailed here)

After M3, against treatment §WHAT TO DESIGN NEXT (owner sessions):

| Track | Extends | Gate |
|---|---|---|
| Act 2 faction lines | `questRuntime.js` | Per-faction vertical slice playable |
| Romance chains | `npcMemory.js` | One full courtship → marriage event |
| Augments | `gearCrafting.js` | One iron-doctor install flow |
| Skill trees | `progressionSystem.js` | GUN/IRON/WIRE/TONGUE/TRAIL tier-1 perks |
| Caldera / Drift regions | `frontierLayout.js` | Open-world travel between regions |
| Hearing + Water War + endings | story content | Owner-authored beats only |

---

## Verification checklist (every milestone)

```bash
npx vitest run && npx tsc --noEmit && npx vite build
WESTWARD_URL=http://127.0.0.1:5191 npm run test:render3d
# visual only when palette/composition changes:
WESTWARD_URL=http://127.0.0.1:5191 npm run test:visual
```

**Sacred tripwires (never break without intentional same-commit update):**
- `tests/render3d-phase-state.test.ts` default loop (`spawn` start, 10-phase walk)
- `tests/render3d-frontier-layout.test.ts` `firstFrameSlabBlockers === []`
- `HERO_OBJECTS` / `FIRST_FIVE_ROUTE` alignment

---

## Suggested execution order

```
Phase 0 (land scaffold)
  → M0 Tasks 1–5 (perf)
  → M1 Tasks 6–11 (vertical slice)
  → M2 Tasks 12–14 (wealth)
  → M3 Tasks 15–20 (owner content gates)
  → M4+ (owner design sessions)
```

**Parallelizable after M0:** Task 7 (courier) can run alongside Task 6 (funeral wiring). Task 10 (dressing) can run alongside 8–9.

**Do NOT start:** Seizure branching, romance bios, full skill trees, Act 2 beats — owner design backlog.
