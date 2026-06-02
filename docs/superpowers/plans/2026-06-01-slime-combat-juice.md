# Slime Fight — Real-Time Melee Combat + Juice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 3D road-slime encounter into a real-time action fight that feels incredible — aim + whiffable swing, dodge-roll with i-frames, a slime that chases/telegraphs/lunges, plus hit-stop, screen shake, knockback, particles, damage numbers, and a live HP bar.

**Architecture:** Three new pure-logic modules under `src/render3d/combat/` (attack state machine, slime AI step, hit-fx math + particle pool), thin extensions to `playerController.js` (dodge) and `encounterSystem.js` (drive slime AI + register swing hits), and wiring + HUD in `spike.js` / `spikes/render3d.html`. Every combat/juice effect is gated behind the existing `visualCapture` switch so the golden-image gate stays deterministic.

**Tech Stack:** Three.js r184 WebGPURenderer (+ WebGL2 fallback), vitest, vanilla DOM HUD. Project convention: JS modules consumed by `.ts` tests need a hand-written `.d.ts` (selective tsconfig). Backend constraint: NO `THREE.Points`/Instanced/shared-materials — use regular meshes with their own material (see `src/game/world/scatter.js`).

**Branch:** `claude/slime-combat-juice` (already created off `main`).

**Test/verify commands:**
- Single test file: `npx vitest run tests/<file>.test.ts`
- Full suite: `npm test`
- Types: `npm run typecheck:ts`
- Build: `npm run build`
- Golden gate (needs dev server on :5180): `npm run dev -- --port 5180 --strictPort &` then `npm run test:visual:render3d` (expect `PASS — ~0.01%`)
- Loop smoke (dev server up): `npm run test:render3d`

---

## File Structure

**Create:**
- `src/render3d/combat/playerCombat.js` (+ `.d.ts`) — attack state machine + hitbox geometry (pure)
- `src/render3d/combat/slimeBehavior.js` (+ `.d.ts`) — slime AI step: chase/telegraph/lunge (pure)
- `src/render3d/combat/hitFx.js` (+ `.d.ts`) — hit-stop + camera-shake math (pure) + Three.js particle burst pool
- `tests/render3d-player-combat.test.ts`, `tests/render3d-slime-behavior.test.ts`, `tests/render3d-hit-fx.test.ts`

**Modify:**
- `src/render3d/playerController.js` (+ its `.d.ts` if present) — dodge-roll + i-frames
- `src/render3d/encounterSystem.js` (+ `.d.ts`) — drive slime AI, `registerHit()`, lunge-contact damage, hit-flash decay
- `src/render3d/spike.js` — input (click/E/Space), per-frame hitbox check, juice application, hit-stop dt, slime AI dt-gate, HUD updates
- `spikes/render3d.html` — damage-number layer, combo, hitmarker; wire the existing `#hero-panel` HP bar

---

## Task 1: Player attack state machine + hitbox geometry (pure)

**Files:**
- Create: `src/render3d/combat/playerCombat.js`, `src/render3d/combat/playerCombat.d.ts`
- Test: `tests/render3d-player-combat.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/render3d-player-combat.test.ts
import { describe, it, expect } from "vitest";
import { createPlayerCombat, hitboxHitsTarget, ATTACK_TIMING } from "../src/render3d/combat/playerCombat.js";

describe("hitboxHitsTarget", () => {
  it("hits a target directly in front within range", () => {
    // yaw 0 → forward is -Z (forwardVector(0) = {x:0,z:-1})
    expect(hitboxHitsTarget({ x: 0, z: 0 }, 0, { x: 0, z: -2 })).toBe(true);
  });
  it("misses a target behind the player", () => {
    expect(hitboxHitsTarget({ x: 0, z: 0 }, 0, { x: 0, z: 2 })).toBe(false);
  });
  it("misses a target out of range", () => {
    expect(hitboxHitsTarget({ x: 0, z: 0 }, 0, { x: 0, z: -5 })).toBe(false);
  });
  it("counts a point-blank target as a hit regardless of facing", () => {
    expect(hitboxHitsTarget({ x: 0, z: 0 }, 0, { x: 0, z: 0 })).toBe(true);
  });
});

describe("createPlayerCombat", () => {
  it("runs ready → windup → active → recovery → ready on the timing budget", () => {
    const c = createPlayerCombat();
    expect(c.phase).toBe("ready");
    expect(c.tryAttack()).toBe(true);
    expect(c.phase).toBe("windup");
    c.update(ATTACK_TIMING.windup + 0.001);
    expect(c.phase).toBe("active");
    expect(c.isHitboxLive).toBe(true);
    c.update(ATTACK_TIMING.active + 0.001);
    expect(c.phase).toBe("recovery");
    c.update(ATTACK_TIMING.recovery + 0.001);
    expect(c.phase).toBe("ready");
  });
  it("ignores tryAttack while a swing is in progress", () => {
    const c = createPlayerCombat();
    c.tryAttack();
    expect(c.tryAttack()).toBe(false);
  });
  it("registers exactly one hit per swing, only during the active window", () => {
    const c = createPlayerCombat();
    c.tryAttack();
    expect(c.tryRegisterHit()).toBe(false); // still windup
    c.update(ATTACK_TIMING.windup + 0.001);  // → active
    expect(c.tryRegisterHit()).toBe(true);   // connect
    expect(c.tryRegisterHit()).toBe(false);  // no double-hit
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render3d-player-combat.test.ts`
Expected: FAIL — cannot resolve `../src/render3d/combat/playerCombat.js`.

- [ ] **Step 3: Write the implementation**

```js
// src/render3d/combat/playerCombat.js
// Player melee swing as an explicit state machine: ready → windup → active
// (hitbox live) → recovery → ready. Whiffable — a swing only damages if the hitbox
// overlaps the target during the active window, and at most once per swing. Pure
// (no Three.js); spike.js drives it and tests the hitbox against the slime.

export const ATTACK_TIMING = { windup: 0.12, active: 0.10, recovery: 0.18 };
export const HITBOX = { range: 2.2, halfAngle: Math.PI / 3 }; // 60° half-cone in front

// forwardVector(yaw) in playerController is { x: -sin(yaw), z: -cos(yaw) }; match it.
export function hitboxHitsTarget(playerPos, yaw, targetPos, opts = {}) {
  const range = opts.range ?? HITBOX.range;
  const halfAngle = opts.halfAngle ?? HITBOX.halfAngle;
  const dx = targetPos.x - playerPos.x;
  const dz = targetPos.z - playerPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > range) return false;
  if (dist < 1e-6) return true; // point-blank
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const dot = (dx / dist) * fx + (dz / dist) * fz;
  return Math.acos(Math.max(-1, Math.min(1, dot))) <= halfAngle;
}

export function createPlayerCombat(opts = {}) {
  const timing = { ...ATTACK_TIMING, ...(opts.timing || {}) };
  let phase = "ready"; // ready | windup | active | recovery
  let t = 0;
  let consumedHit = false;

  function tryAttack() {
    if (phase !== "ready") return false;
    phase = "windup";
    t = 0;
    consumedHit = false;
    return true;
  }
  function update(dt) {
    if (phase === "ready") return;
    t += Number.isFinite(dt) && dt > 0 ? dt : 0;
    if (phase === "windup" && t >= timing.windup) { phase = "active"; t -= timing.windup; }
    if (phase === "active" && t >= timing.active) { phase = "recovery"; t -= timing.active; }
    if (phase === "recovery" && t >= timing.recovery) { phase = "ready"; t = 0; }
  }
  // Call each active-window frame the hitbox overlaps the target; true once per swing.
  function tryRegisterHit() {
    if (phase !== "active" || consumedHit) return false;
    consumedHit = true;
    return true;
  }
  return {
    tryAttack,
    update,
    tryRegisterHit,
    get phase() { return phase; },
    get isHitboxLive() { return phase === "active"; },
    get isAttacking() { return phase !== "ready"; },
    get windupProgress() { return phase === "windup" ? t / timing.windup : phase === "ready" ? 0 : 1; },
  };
}
```

```ts
// src/render3d/combat/playerCombat.d.ts
export const ATTACK_TIMING: { windup: number; active: number; recovery: number };
export const HITBOX: { range: number; halfAngle: number };
export function hitboxHitsTarget(
  playerPos: { x: number; z: number },
  yaw: number,
  targetPos: { x: number; z: number },
  opts?: { range?: number; halfAngle?: number },
): boolean;
export interface PlayerCombat {
  tryAttack(): boolean;
  update(dt: number): void;
  tryRegisterHit(): boolean;
  readonly phase: "ready" | "windup" | "active" | "recovery";
  readonly isHitboxLive: boolean;
  readonly isAttacking: boolean;
  readonly windupProgress: number;
}
export function createPlayerCombat(opts?: { timing?: Partial<{ windup: number; active: number; recovery: number }> }): PlayerCombat;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/render3d-player-combat.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render3d/combat/playerCombat.js src/render3d/combat/playerCombat.d.ts tests/render3d-player-combat.test.ts
git commit -m "feat(combat): player swing state machine + hitbox geometry"
```

---

## Task 2: Slime AI step — chase / telegraph / lunge (pure)

**Files:**
- Create: `src/render3d/combat/slimeBehavior.js`, `src/render3d/combat/slimeBehavior.d.ts`
- Test: `tests/render3d-slime-behavior.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/render3d-slime-behavior.test.ts
import { describe, it, expect } from "vitest";
import { createSlimeState, stepSlime, SLIME_TUNING } from "../src/render3d/combat/slimeBehavior.js";

const T = SLIME_TUNING;

describe("stepSlime", () => {
  it("chases toward the player when out of engage range", () => {
    const s = createSlimeState({ x: 0, z: 0 });
    const next = stepSlime(s, { x: 10, z: 0 }, 0.1);
    expect(next.mode).toBe("chase");
    expect(next.pos.x).toBeGreaterThan(0); // moved toward +x
  });
  it("enters telegraph when the player is within engage range", () => {
    const s = createSlimeState({ x: 0, z: 0 });
    const next = stepSlime(s, { x: T.engageRange - 0.1, z: 0 }, 0.016);
    expect(next.mode).toBe("telegraph");
  });
  it("telegraph counts down then lunges, locking the lunge direction", () => {
    let s = { ...createSlimeState({ x: 0, z: 0 }), mode: "telegraph", timer: 0 };
    s = stepSlime(s, { x: 1, z: 0 }, T.telegraphTime + 0.001);
    expect(s.mode).toBe("lunge");
    expect(s.lungeDir.x).toBeGreaterThan(0.99); // locked toward +x
  });
  it("lunge moves fast in the locked direction and reports contact when overlapping", () => {
    let s = { ...createSlimeState({ x: 0, z: 0 }), mode: "lunge", timer: 0, lungeDir: { x: 1, z: 0 } };
    const next = stepSlime(s, { x: T.contactRadius - 0.1, z: 0 }, 0.05);
    expect(next.pos.x).toBeGreaterThan(0);
    expect(next.contact).toBe(true);
  });
  it("recovers after the lunge then returns to chase", () => {
    let s = { ...createSlimeState({ x: 0, z: 0 }), mode: "lunge", timer: 0, lungeDir: { x: 1, z: 0 } };
    s = stepSlime(s, { x: 10, z: 0 }, T.lungeTime + 0.001);
    expect(s.mode).toBe("recover");
    s = stepSlime(s, { x: 10, z: 0 }, T.recoverTime + 0.001);
    expect(s.mode).toBe("chase");
  });
  it("does not mutate the input state", () => {
    const s = createSlimeState({ x: 0, z: 0 });
    const snap = JSON.stringify(s);
    stepSlime(s, { x: 10, z: 0 }, 0.1);
    expect(JSON.stringify(s)).toBe(snap);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render3d-slime-behavior.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/render3d/combat/slimeBehavior.js
// The slime as a real-time enemy: chase → telegraph (dodge window) → lunge
// (the lethal contact) → recover → chase. Pure step over (state, playerPos, dt).
// Coordinates are 3D ground plane (x, z). No RNG — fully deterministic.

export const SLIME_TUNING = {
  chaseSpeed: 1.7,    // u/s toward the player while chasing
  engageRange: 2.0,   // start a telegraph within this distance
  telegraphTime: 0.5, // windup before the lunge — this IS the player's dodge window
  lungeSpeed: 7.5,    // u/s during the lunge dash
  lungeTime: 0.26,    // lunge duration
  recoverTime: 0.6,   // pause after a lunge
  contactRadius: 1.0, // lunge connects within this distance
};

export function createSlimeState(pos) {
  return { pos: { x: pos.x, z: pos.z }, mode: "idle", timer: 0, lungeDir: { x: 0, z: 1 } };
}

// Returns a NEW state plus { contact, telegraphT } for the frame. Never mutates input.
export function stepSlime(state, playerPos, dt, tuning = SLIME_TUNING) {
  const d = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const s = {
    pos: { x: state.pos.x, z: state.pos.z },
    mode: state.mode,
    timer: state.timer || 0,
    lungeDir: { x: state.lungeDir.x, z: state.lungeDir.z },
  };
  let contact = false;
  const dx = playerPos.x - s.pos.x;
  const dz = playerPos.z - s.pos.z;
  const dist = Math.hypot(dx, dz) || 1e-6;
  const toPlayer = { x: dx / dist, z: dz / dist };

  if (s.mode === "idle" || s.mode === "chase") {
    if (dist <= tuning.engageRange) {
      s.mode = "telegraph";
      s.timer = 0;
    } else {
      s.mode = "chase";
      s.pos.x += toPlayer.x * tuning.chaseSpeed * d;
      s.pos.z += toPlayer.z * tuning.chaseSpeed * d;
    }
  } else if (s.mode === "telegraph") {
    s.timer += d;
    if (s.timer >= tuning.telegraphTime) {
      s.mode = "lunge";
      s.timer = 0;
      s.lungeDir = { x: toPlayer.x, z: toPlayer.z }; // lock aim at lunge start
    }
  } else if (s.mode === "lunge") {
    s.timer += d;
    s.pos.x += s.lungeDir.x * tuning.lungeSpeed * d;
    s.pos.z += s.lungeDir.z * tuning.lungeSpeed * d;
    if (dist <= tuning.contactRadius) contact = true;
    if (s.timer >= tuning.lungeTime) {
      s.mode = "recover";
      s.timer = 0;
    }
  } else if (s.mode === "recover") {
    s.timer += d;
    if (s.timer >= tuning.recoverTime) {
      s.mode = "chase";
      s.timer = 0;
    }
  }

  return { ...s, contact, telegraphT: s.mode === "telegraph" ? s.timer / tuning.telegraphTime : 0 };
}
```

```ts
// src/render3d/combat/slimeBehavior.d.ts
export const SLIME_TUNING: {
  chaseSpeed: number; engageRange: number; telegraphTime: number;
  lungeSpeed: number; lungeTime: number; recoverTime: number; contactRadius: number;
};
export interface SlimeState {
  pos: { x: number; z: number };
  mode: "idle" | "chase" | "telegraph" | "lunge" | "recover";
  timer: number;
  lungeDir: { x: number; z: number };
}
export function createSlimeState(pos: { x: number; z: number }): SlimeState;
export function stepSlime(
  state: SlimeState,
  playerPos: { x: number; z: number },
  dt: number,
  tuning?: typeof SLIME_TUNING,
): SlimeState & { contact: boolean; telegraphT: number };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/render3d-slime-behavior.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render3d/combat/slimeBehavior.js src/render3d/combat/slimeBehavior.d.ts tests/render3d-slime-behavior.test.ts
git commit -m "feat(combat): slime chase/telegraph/lunge AI step"
```

---

## Task 3: Hit-fx — hit-stop + camera-shake math (pure) + particle burst pool

**Files:**
- Create: `src/render3d/combat/hitFx.js`, `src/render3d/combat/hitFx.d.ts`
- Test: `tests/render3d-hit-fx.test.ts`

- [ ] **Step 1: Write the failing test** (math only — the particle pool is Three.js, verified via smoke/preview)

```ts
// tests/render3d-hit-fx.test.ts
import { describe, it, expect } from "vitest";
import { createHitStop, createCameraShake } from "../src/render3d/combat/hitFx.js";

describe("createHitStop", () => {
  it("returns 1 when idle and the punch scale during a freeze, then restores", () => {
    const hs = createHitStop();
    expect(hs.scale(0.016)).toBe(1);
    hs.punch(0.07, 0.05);
    expect(hs.scale(0.03)).toBe(0.05); // mid-freeze
    expect(hs.scale(0.05)).toBe(0.05); // still within 0.07 total
    expect(hs.scale(0.05)).toBe(1);    // elapsed > 0.07 → restored
  });
});

describe("createCameraShake", () => {
  it("raises trauma on add and decays it to zero over time", () => {
    const sh = createCameraShake({ decay: 2 });
    sh.add(1);
    const a = sh.sample(0, 0);
    expect(a.trauma).toBeCloseTo(1);
    sh.sample(0.5, 1); // decays by 0.5*2 = 1.0
    expect(sh.trauma).toBeCloseTo(0);
  });
  it("offset magnitude scales with trauma squared (zero at zero trauma)", () => {
    const sh = createCameraShake();
    const off = sh.sample(0, 0.123);
    expect(off.x).toBe(0);
    expect(off.y).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render3d-hit-fx.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/render3d/combat/hitFx.js
// Combat juice. The hit-stop + camera-shake are pure math (tested). The particle
// burst is a bounded pool of regular meshes with their OWN material — NOT
// THREE.Points/Instanced, which don't render on the WebGL2 fallback (see
// src/game/world/scatter.js + project memory).

import * as THREE from "three";
import { createNprMaterial } from "../../game/renderer/materials/nprMaterial.js";

// Freeze-frame punch: spike multiplies its loop dt by scale() each frame. The
// freeze is advanced by REAL dt so it lasts a wall-clock duration.
export function createHitStop() {
  let remaining = 0;
  let scaleVal = 1;
  return {
    punch(seconds = 0.07, scale = 0.05) {
      remaining = Math.max(remaining, seconds);
      scaleVal = scale;
    },
    scale(realDt) {
      if (remaining <= 0) return 1;
      remaining = Math.max(0, remaining - (Number.isFinite(realDt) ? realDt : 0));
      return remaining > 0 ? scaleVal : 1;
    },
    get active() { return remaining > 0; },
  };
}

// Trauma-based shake. add() on impact; sample(dt, t) decays trauma and returns a
// transient camera offset whose magnitude ~ trauma². t = wall-clock seconds.
export function createCameraShake({ decay = 1.6 } = {}) {
  let trauma = 0;
  return {
    add(amount) { trauma = Math.min(1, trauma + amount); },
    sample(dt, t) {
      trauma = Math.max(0, trauma - (Number.isFinite(dt) ? dt : 0) * decay);
      const s = trauma * trauma;
      return {
        x: Math.sin(t * 57.3) * 0.18 * s,
        y: Math.sin(t * 43.1) * 0.12 * s,
        z: Math.sin(t * 71.7) * 0.10 * s,
        yaw: Math.sin(t * 33.3) * 0.05 * s,
        trauma,
      };
    },
    get trauma() { return trauma; },
  };
}

// Goo burst pool. burst() flings n motes from pos; update() integrates + fades.
export function createBurstPool(scene, { count = 24 } = {}) {
  const geo = new THREE.IcosahedronGeometry(0.07, 0);
  const group = new THREE.Group();
  const slots = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, createNprMaterial("#6be873", { rimStrength: 0 }));
    mesh.visible = false;
    mesh.castShadow = false;
    group.add(mesh);
    slots.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0 });
  }
  scene.add(group);
  let cursor = 0;
  // rand: app-runtime Math.random is fine (golden gate freezes spawns via visualCapture)
  function burst(pos, n = 12, color = "#6be873", speed = 3) {
    for (let i = 0; i < n; i++) {
      const sl = slots[cursor];
      cursor = (cursor + 1) % slots.length;
      sl.mesh.material.color?.set?.(color);
      sl.mesh.position.set(pos.x, pos.y ?? 0.6, pos.z);
      const a = (i / n) * Math.PI * 2;
      const sp = speed * (0.5 + Math.random() * 0.5);
      sl.vx = Math.cos(a) * sp;
      sl.vz = Math.sin(a) * sp;
      sl.vy = 2 + Math.random() * 2.5;
      sl.maxLife = 0.4 + Math.random() * 0.3;
      sl.life = sl.maxLife;
      sl.mesh.visible = true;
      sl.mesh.scale.setScalar(1);
    }
  }
  function update(dt) {
    for (const sl of slots) {
      if (sl.life <= 0) continue;
      sl.life -= dt;
      if (sl.life <= 0) { sl.mesh.visible = false; continue; }
      sl.vy -= 9.8 * dt;
      sl.mesh.position.x += sl.vx * dt;
      sl.mesh.position.y += sl.vy * dt;
      sl.mesh.position.z += sl.vz * dt;
      sl.mesh.scale.setScalar(Math.max(0.02, sl.life / sl.maxLife));
    }
  }
  return { burst, update, group };
}
```

```ts
// src/render3d/combat/hitFx.d.ts
export function createHitStop(): {
  punch(seconds?: number, scale?: number): void;
  scale(realDt: number): number;
  readonly active: boolean;
};
export function createCameraShake(opts?: { decay?: number }): {
  add(amount: number): void;
  sample(dt: number, t: number): { x: number; y: number; z: number; yaw: number; trauma: number };
  readonly trauma: number;
};
export function createBurstPool(scene: any, opts?: { count?: number }): {
  burst(pos: { x: number; y?: number; z: number }, n?: number, color?: string, speed?: number): void;
  update(dt: number): void;
  group: any;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/render3d-hit-fx.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render3d/combat/hitFx.js src/render3d/combat/hitFx.d.ts tests/render3d-hit-fx.test.ts
git commit -m "feat(combat): hit-stop + camera-shake math + goo burst pool"
```

---

## Task 4: Dodge-roll + i-frames in the player controller

**Files:**
- Modify: `src/render3d/playerController.js` (add dodge helpers + state + getters + Space key)
- Modify: `src/render3d/playerController.d.ts` if it exists (add getters) — check with `ls src/render3d/playerController.d.ts`
- Test: extend `tests/render3d-player-combat.test.ts` (the dodge helpers are pure, exported from playerController)

- [ ] **Step 1: Write the failing test** (append to the existing combat test file)

```ts
// append to tests/render3d-player-combat.test.ts
import { stepDodge, dodgeIsInvulnerable, DODGE } from "../src/render3d/playerController.js";

describe("dodge roll", () => {
  it("advances position along the locked direction and ends after the duration", () => {
    let st = { position: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, elapsed: 0 };
    st = stepDodge(st, 0.1, DODGE);
    expect(st.position.x).toBeGreaterThan(0);
    expect(st.done).toBe(false);
    st = stepDodge(st, DODGE.duration, DODGE);
    expect(st.done).toBe(true);
  });
  it("grants i-frames only within the i-frame window", () => {
    expect(dodgeIsInvulnerable(0.0, DODGE)).toBe(true);
    expect(dodgeIsInvulnerable(DODGE.iframes - 0.01, DODGE)).toBe(true);
    expect(dodgeIsInvulnerable(DODGE.iframes + 0.01, DODGE)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render3d-player-combat.test.ts`
Expected: FAIL — `stepDodge`/`dodgeIsInvulnerable`/`DODGE` not exported.

- [ ] **Step 3: Add the pure dodge helpers near the top of `playerController.js`** (after the existing `rightVector` export, ~line 98)

```js
export const DODGE = { duration: 0.35, iframes: 0.22, speed: 11 };

// Pure dodge step. state = { position:{x,z}, dir:{x,z}, elapsed }. Speed eases out
// over the duration so the roll has a snappy start and a soft stop.
export function stepDodge(state, dt, cfg = DODGE) {
  const d = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const elapsed = (state.elapsed || 0) + d;
  const p = Math.min(1, elapsed / cfg.duration);
  const speed = cfg.speed * (1 - p) * (1 - p); // ease-out
  return {
    position: { x: state.position.x + state.dir.x * speed * d, z: state.position.z + state.dir.z * speed * d },
    dir: { x: state.dir.x, z: state.dir.z },
    elapsed,
    done: elapsed >= cfg.duration,
  };
}

export function dodgeIsInvulnerable(elapsed, cfg = DODGE) {
  return (elapsed || 0) <= cfg.iframes;
}
```

- [ ] **Step 4: Run tests to verify the helpers pass**

Run: `npx vitest run tests/render3d-player-combat.test.ts`
Expected: PASS (now 11 tests).

- [ ] **Step 5: Wire the dodge into the controller** — in `makeInputState()` (~line 258) add the dodge flag:

```js
function makeInputState() {
  return {
    forward: false, back: false, left: false, right: false, shift: false,
    dodge: false,
    lookDx: 0, lookDy: 0,
  };
}
```

In `onKeyDown` (~line 399, after the Shift handling) add Space → edge-trigger dodge:

```js
    if (e.code === "Space") { input.dodge = true; e.preventDefault?.(); }
```

In the controller closure, add dodge state near the other `let` decls (find where `let yaw`/`let position` live, ~line 300-320), and in the per-frame `update(dt, proxies)` method (the one that calls `stepPlayer`), BEFORE the normal `stepPlayer` movement:

```js
    // Dodge: edge-triggered by Space; locks direction from current WASD heading
    // (or facing if idle) and overrides normal movement for DODGE.duration.
    if (input.dodge && dodge.elapsed === null) {
      const f = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
      const r = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const fwd = forwardVector(yaw);
      const rt = rightVector(yaw);
      let dx = fwd.x * f + rt.x * r;
      let dz = fwd.z * f + rt.z * r;
      const m = Math.hypot(dx, dz);
      if (m < 1e-6) { dx = fwd.x; dz = fwd.z; } else { dx /= m; dz /= m; }
      dodge = { dir: { x: dx, z: dz }, elapsed: 0 };
    }
    input.dodge = false; // consume the edge
    if (dodge.elapsed !== null) {
      const stepped = stepDodge({ position, dir: dodge.dir, elapsed: dodge.elapsed }, dt, DODGE);
      position = collideMove(position, stepped.position, proxies); // reuse the existing proxy-collision helper used by normal movement
      if (camera) { camera.position.x = position.x; camera.position.z = position.z; }
      dodge.elapsed = stepped.done ? null : stepped.elapsed;
      // skip normal stepPlayer this frame while rolling
      return;
    }
```

Initialize `let dodge = { dir: { x: 0, z: 1 }, elapsed: null };` with the other controller `let`s.

> NOTE for the implementer: the normal-movement path already applies proxy collision — locate that exact call (search `proxies` inside `update`) and reuse the same collision helper for `collideMove` above. If movement is applied inline rather than via a helper, mirror that inline logic for the dodge displacement. Keep the look (`stepPlayer` look handling) — if returning early skips look, sample look first or apply yaw/pitch before the early return.

Add getters to the controller's returned object (next to `get position()` / `get yaw()`, ~line 574):

```js
    get isDodging() { return dodge.elapsed !== null; },
    get isInvulnerable() { return dodge.elapsed !== null && dodgeIsInvulnerable(dodge.elapsed, DODGE); },
    get dodgeProgress() { return dodge.elapsed === null ? 0 : Math.min(1, dodge.elapsed / DODGE.duration); },
```

- [ ] **Step 6: Update `playerController.d.ts`** (if present) — add to the controller return type:

```ts
  readonly isDodging: boolean;
  readonly isInvulnerable: boolean;
  readonly dodgeProgress: number;
```
And module-level:
```ts
export const DODGE: { duration: number; iframes: number; speed: number };
export function stepDodge(state: { position: { x: number; z: number }; dir: { x: number; z: number }; elapsed?: number }, dt: number, cfg?: typeof DODGE): { position: { x: number; z: number }; dir: { x: number; z: number }; elapsed: number; done: boolean };
export function dodgeIsInvulnerable(elapsed: number, cfg?: typeof DODGE): boolean;
```

- [ ] **Step 7: Verify types + tests**

Run: `npm run typecheck:ts && npx vitest run tests/render3d-player-combat.test.ts`
Expected: typecheck clean; tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/render3d/playerController.js src/render3d/playerController.d.ts tests/render3d-player-combat.test.ts
git commit -m "feat(combat): dodge-roll with i-frames in the player controller"
```

---

## Task 5: Encounter — drive slime AI, register swing hits, lunge-contact damage, flash decay

**Files:**
- Modify: `src/render3d/encounterSystem.js`
- Modify: `src/render3d/encounterSystem.d.ts`
- Test: extend `tests/render3d-encounter.test.ts`

- [ ] **Step 1: Write the failing test** (append to `tests/render3d-encounter.test.ts`)

```ts
describe("render3d encounter — real-time combat", () => {
  it("registerHit applies one hit and fires death on the third", () => {
    const onSlimeDeath = vi.fn();
    const e = createEncounterSystem(null, SNAPSHOT, { onSlimeDeath, slimeMesh: fakeSlimeMesh() });
    expect(e.registerHit().defeated).toBe(false);
    expect(e.getState().hitCount).toBe(1);
    e.registerHit();
    const third = e.registerHit();
    expect(third.defeated).toBe(true);
    expect(onSlimeDeath).toHaveBeenCalledTimes(1);
  });
  it("a lunge that contacts the player deals burst damage unless i-frames are active", () => {
    const onPlayerDeath = vi.fn();
    // playerInvulnerable() lets spike feed dodge i-frames into the gate
    let invuln = false;
    const e = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 20, canDamagePlayer: () => true, playerInvulnerable: () => invuln, onPlayerDeath,
      slimeMesh: fakeSlimeMesh(),
    });
    e.applyLungeContact(); // 14 burst dmg → 6
    expect(e.getState().playerHp).toBe(6);
    invuln = true;
    e.applyLungeContact(); // negated by i-frames
    expect(e.getState().playerHp).toBe(6);
    invuln = false;
    e.applyLungeContact(); // 6 - 14 → 0 → death
    expect(e.getState().playerDefeated).toBe(true);
    expect(onPlayerDeath).toHaveBeenCalledTimes(1);
  });
});
```

> The existing proximity-DoT tests in this file ("deals contact damage while engaged…", "fires onPlayerDeath…") assume the OLD passive-bleed model. Replace those specific cases with the lunge-contact model above — the new model is contact-based, not proximity-DoT. Keep the slime-strike, engage, and dispose tests.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render3d-encounter.test.ts`
Expected: FAIL — `registerHit` / `applyLungeContact` / `playerInvulnerable` not present.

- [ ] **Step 3: Refactor `encounterSystem.js`**

(a) Add options near the other option parses (~line 104): `playerInvulnerable`, `lungeDamage`:
```js
  const playerInvulnerable = typeof options.playerInvulnerable === "function" ? options.playerInvulnerable : () => false;
  const lungeDamage = Number.isFinite(options.lungeDamage) ? options.lungeDamage : 14;
```

(b) Extract the 3-hit core from `strike()` into `registerHit()` so spike's swing can call it directly (strike() near line 166 currently bundles range-check + hit). Add:
```js
  // Apply one landed melee hit (range/active-window already validated by the caller's hitbox).
  function registerHit() {
    if (disposed || hp <= 0 || state === "dead") return getState();
    hitCount = Math.min(maxHits, hitCount + 1);
    hp = Math.max(0, maxHits - hitCount);
    flashSlime(slimeMesh, hp <= 0 ? 3.5 : 2.6);
    flashTimer = FLASH_TIME; // NEW: drive decay (see (d))
    slumpSlime(slimeMesh, hp, maxHits);
    onSlimeHit({ state, phase: getPhase(), slimePlacement, hp, maxHits, hitCount, defeated: hp <= 0 });
    if (hp > 0) { state = "attack"; return getState(); }
    state = "dead";
    deathCollapse(slimeMesh, 1);
    if (!deathNotified) { deathNotified = true; onSlimeDeath({ state, phase: getPhase(), slimePlacement, scene, hp, maxHits, hitCount, defeated: true }); }
    return getState();
  }
```
Keep `strike(playerPos)` as a thin wrapper for compatibility: `if (!canStrikeSlime(...)) return false; registerHit(); return true;`.

(c) Replace the proximity-DoT block in `update()` (the `if ((state === "aggro" || state === "attack") && … canDamagePlayer())` block from the persistence work) with a lunge-contact entry point and remove the per-frame proximity bleed:
```js
  // Burst damage from a slime lunge connecting (spike calls this when slimeBehavior
  // reports contact). Negated by player i-frames.
  function applyLungeContact() {
    if (disposed || playerHp <= 0) return getState();
    if (!canDamagePlayer() || playerInvulnerable()) return getState();
    playerHp = Math.max(0, playerHp - lungeDamage);
    if (playerHp <= 0 && !playerDeathNotified) {
      playerDeathNotified = true;
      onPlayerDeath({ phase: getPhase(), slimePlacement, scene, playerHp: 0 });
    }
    return getState();
  }
```
Delete the old proximity-DoT `if` block inside `update()` (player damage is now lunge-driven). `update()` keeps slime state/animate; spike will drive movement (Task 6).

(d) Add hit-flash decay. Near the state `let`s add `let flashTimer = 0; const FLASH_TIME = 0.18;`. In `animate(dt)` (or `update`), lerp emissive back:
```js
  if (flashTimer > 0 && slimeMesh) {
    flashTimer = Math.max(0, flashTimer - safeDt);
    // ride interactGlow back to baseline as the flash fades (no hard snap)
  }
```
(Leave the existing `interactGlow` call; the flash now fades instead of holding.)

(e) Expose the new methods on the returned object: add `registerHit, applyLungeContact` next to `strike`.

- [ ] **Step 4: Update `encounterSystem.d.ts`** — add to options: `playerInvulnerable?: () => boolean; lungeDamage?: number;`. Add to the return type: `registerHit(): EncounterState; applyLungeContact(): EncounterState;`.

- [ ] **Step 5: Run tests + types**

Run: `npm run typecheck:ts && npx vitest run tests/render3d-encounter.test.ts`
Expected: typecheck clean; tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render3d/encounterSystem.js src/render3d/encounterSystem.d.ts tests/render3d-encounter.test.ts
git commit -m "feat(combat): registerHit + lunge-contact damage + flash decay"
```

---

## Task 6: Wire combat + juice into spike.js

**Files:**
- Modify: `src/render3d/spike.js`

No new unit tests (browser integration) — verified by Task 8 (loop smoke + golden + preview). All edits gated behind `visualCapture`.

- [ ] **Step 1: Imports** (after the runSave import added previously):
```js
import { createPlayerCombat, hitboxHitsTarget } from "./combat/playerCombat.js";
import { createSlimeState, stepSlime } from "./combat/slimeBehavior.js";
import { createHitStop, createCameraShake, createBurstPool } from "./combat/hitFx.js";
```

- [ ] **Step 2: Construct combat systems** after the encounter is created (~spike.js:2013):
```js
  const playerCombat = createPlayerCombat();
  const hitStop = createHitStop();
  const camShake = createCameraShake();
  const burst = createBurstPool(scene, { count: 28 });
  let slimeAI = heroMeshes.roadSlime ? createSlimeState({ x: heroMeshes.roadSlime.position.x, z: heroMeshes.roadSlime.position.z }) : null;
  let comboCount = 0;
  let comboTimer = 0;
```
Pass i-frames into the encounter gate — update the `createEncounterSystem` options (Task 5 added `playerInvulnerable`): add `playerInvulnerable: () => player.isInvulnerable,` to the options object.

- [ ] **Step 3: Attack input** — add a swing trigger (left-click + E) during `slime_fight`. Near the existing F-key listener (~spike.js:1916):
```js
  function trySwing() {
    if (loopState.phase !== "slime_fight") return;
    if (playerCombat.tryAttack()) character.playOnce?.("attack") || character.playOnce?.("draw");
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => { if (e.code === "KeyE") trySwing(); });
    canvas.addEventListener("mousedown", (e) => { if (e.button === 0) trySwing(); });
  }
```
(E already opens the board in `spawn`/`board_choice`; `trySwing` no-ops outside `slime_fight`, so no conflict.)

- [ ] **Step 4: Per-frame combat in `loop()`** — replace the hit-stop-naive dt and add combat. Change the dt line:
```js
    const rawDt = Math.min((now - prevTs) / 1000, 0.05);
    prevTs = now;
    const dt = visualCapture ? rawDt : rawDt * hitStop.scale(rawDt);
```
After `encounter.update(...)` change it to gate slime motion by capture and drive the AI:
```js
    encounter.update(player.position, visualCapture ? 0 : dt);
    if (!visualCapture && slimeAI && heroMeshes.roadSlime && loopState.phase === "slime_fight" && !encounter.getState().defeated) {
      slimeAI = stepSlime(slimeAI, player.position, dt);
      heroMeshes.roadSlime.position.x = slimeAI.pos.x;
      heroMeshes.roadSlime.position.z = slimeAI.pos.z;
      if (slimeAI.contact) {
        encounter.applyLungeContact();
        camShake.add(0.6);
      }
    }
    // Player swing: test the hitbox during the active window
    if (!visualCapture) {
      playerCombat.update(dt);
      if (playerCombat.isHitboxLive && heroMeshes.roadSlime && !encounter.getState().defeated) {
        const sp = heroMeshes.roadSlime.position;
        if (hitboxHitsTarget(player.position, player.yaw, { x: sp.x, z: sp.z }) && playerCombat.tryRegisterHit()) {
          const res = encounter.registerHit();
          hitStop.punch(res.defeated ? 0.12 : 0.06, res.defeated ? 0.02 : 0.05);
          camShake.add(res.defeated ? 0.9 : 0.5);
          burst.burst({ x: sp.x, y: 0.7, z: sp.z }, res.defeated ? 22 : 12, "#6be873", res.defeated ? 5 : 3);
          stagger(heroMeshes.roadSlime, { x: Math.sin(player.yaw), z: Math.cos(player.yaw) }, 1); // knockback
          comboCount += 1; comboTimer = 1.6;
          spawnDamageNumber(sp, res.defeated ? "SLAIN" : "HIT");
          pulseHitmarker();
          if (res.defeated) postHitPulse();
        }
      }
    }
```
(`stagger` is already imported from `animationHelpers.js`; if not, add it to that import.)

- [ ] **Step 5: Apply juice each frame** — after `post.render()` prep, before it, update particles + shake + combo:
```js
    if (!visualCapture) {
      burst.update(dt);
      const off = camShake.sample(dt, now / 1000);
      applyCameraShakeOffset(off); // see Step 6
      if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) { comboCount = 0; updateComboHud(0); } }
      updateHpHud(encounter.getState());
      updateDamageNumbers(dt);
    }
```

- [ ] **Step 6: Camera shake offset helper** — apply a transient offset to the camera AFTER the follow-cam positions it (the follow-cam runs inside `player.update`). Add near the loop:
```js
  function applyCameraShakeOffset(off) {
    if (!off || off.trauma <= 0) return;
    camera.position.x += off.x;
    camera.position.y += off.y;
    camera.position.z += off.z;
    camera.rotation.y += off.yaw;
  }
```
Place the `applyCameraShakeOffset` call AFTER `player.update(dt, proxies)` and any `applyHeroCamera()` so it's the last word on camera transform for the frame (it is, in Step 5, since player.update is at the top of loop()).

- [ ] **Step 7: HUD helper stubs in spike.js** (DOM, real implementations — Task 7 adds the markup):
```js
  const hpFillEl = document.querySelector("#hero-panel .hp-fill");
  const hpLabelEl = document.querySelector("#hero-panel .hp-label");
  function updateHpHud(st) {
    if (!Number.isFinite(st?.playerHp)) return;
    const pct = Math.max(0, Math.min(1, st.playerHp / (st.playerMaxHp || 40)));
    if (hpFillEl) hpFillEl.style.width = `${(pct * 100).toFixed(1)}%`;
    if (hpLabelEl) {
      const v = hpLabelEl.querySelector("span:last-child");
      if (v) v.textContent = `${Math.ceil(st.playerHp)} / ${st.playerMaxHp || 40}`;
    }
  }
  const comboEl = () => document.getElementById("combo-count");
  function updateComboHud(n) { const el = comboEl(); if (el) { el.textContent = n > 1 ? `${n} HIT` : ""; el.hidden = n < 2; } }
  const hitmarkerEl = () => document.getElementById("hitmarker");
  let hitmarkerT = 0;
  function pulseHitmarker() { const el = hitmarkerEl(); if (el) { el.hidden = false; hitmarkerT = 0.12; } }
  // damage numbers: pooled DOM spans positioned by projecting world→screen
  const dmgLayer = () => document.getElementById("damage-numbers");
  const dmgPool = [];
  function spawnDamageNumber(worldPos, text) {
    const layer = dmgLayer(); if (!layer) return;
    let el = dmgPool.find((d) => d.life <= 0);
    if (!el) { const span = document.createElement("span"); span.className = "dmg-num"; layer.appendChild(span); el = { span, life: 0, wx: 0, wy: 0, wz: 0 }; dmgPool.push(el); }
    el.span.textContent = text; el.life = 0.9; el.wx = worldPos.x; el.wy = 1.4; el.wz = worldPos.z; el.span.hidden = false;
  }
  function updateDamageNumbers(dt) {
    const tmp = new THREE.Vector3();
    for (const d of dmgPool) {
      if (d.life <= 0) continue;
      d.life -= dt; if (d.life <= 0) { d.span.hidden = true; continue; }
      tmp.set(d.wx, d.wy + (0.9 - d.life) * 0.8, d.wz).project(camera);
      d.span.style.left = `${(tmp.x * 0.5 + 0.5) * 100}%`;
      d.span.style.top = `${(-tmp.y * 0.5 + 0.5) * 100}%`;
      d.span.style.opacity = `${Math.max(0, d.life / 0.9)}`;
    }
    if (hitmarkerT > 0) { hitmarkerT -= dt; if (hitmarkerT <= 0) { const el = hitmarkerEl(); if (el) el.hidden = true; } }
    if (comboCount >= 2) updateComboHud(comboCount);
  }
  function postHitPulse() {
    // brief exposure punch on kill; post stack exposes a live uniform via applyPalette
    if (post?.uniforms?.exposure) { const u = post.uniforms.exposure; const base = u.value; u.value = base * 1.35; setTimeout(() => { u.value = base; }, 90); }
  }
```
> IMPLEMENTER: confirm how the post stack exposes `exposure` (search `createPostProcessing` return in `postStacks.js`). If the uniform isn't returned on `post`, route the pulse through the existing `applyPalette` path instead (temporarily bump `grade.exposure`). If unavailable, omit `postHitPulse()` — it's a bonus.

- [ ] **Step 8: Verify build + smoke**

Run: `node --check src/render3d/spike.js && npm run typecheck:ts && npm run build`
Expected: all clean.

- [ ] **Step 9: Commit**

```bash
git add src/render3d/spike.js
git commit -m "feat(combat): wire swing/dodge/slime-AI + juice into the loop"
```

---

## Task 7: Combat HUD markup (damage numbers, combo, hitmarker) + HP bar style

**Files:**
- Modify: `spikes/render3d.html`

- [ ] **Step 1: Add markup** before `<script type="module" src="/src/render3d/spike.js">` (after the `#run-summary` overlay):
```html
    <div id="damage-numbers" aria-hidden="true"></div>
    <div id="combo-count" aria-hidden="true" hidden></div>
    <div id="hitmarker" aria-hidden="true" hidden></div>
```

- [ ] **Step 2: Add CSS** before `</style>`:
```css
      #damage-numbers { position: fixed; inset: 0; pointer-events: none; z-index: 35; }
      #damage-numbers .dmg-num {
        position: absolute; transform: translate(-50%, -50%);
        font: 700 22px "Iowan Old Style", Georgia, serif; color: #fff;
        text-shadow: 0 2px 6px rgba(0,0,0,0.8); }
      #combo-count {
        position: fixed; top: 18%; left: 50%; transform: translateX(-50%); z-index: 36;
        font: 800 28px "Iowan Old Style", Georgia, serif; color: #ffd77b;
        text-shadow: 0 2px 8px rgba(0,0,0,0.85); pointer-events: none; }
      #combo-count[hidden] { display: none; }
      #hitmarker {
        position: fixed; top: 50%; left: 50%; width: 22px; height: 22px;
        transform: translate(-50%,-50%) rotate(45deg); z-index: 36; pointer-events: none;
        border: 2px solid rgba(255,255,255,0.9); border-radius: 3px; }
      #hitmarker[hidden] { display: none; }
```

- [ ] **Step 3: Commit**

```bash
git add spikes/render3d.html
git commit -m "feat(combat): combat HUD — damage numbers, combo, hitmarker"
```

---

## Task 8: Full verification

- [ ] **Step 1: Unit + types + build**

Run: `npm test && npm run typecheck:ts && npm run build`
Expected: all green; ~16 new tests added (playerCombat 7 + dodge 2, slimeBehavior 6, hitFx 3, encounter combat 2).

- [ ] **Step 2: Golden gate (beauty unchanged)**

Run: `lsof -ti tcp:5180 | xargs kill -9 2>/dev/null; npm run dev -- --port 5180 --strictPort &` then (after ready) `npm run test:visual:render3d`
Expected: `PASS — ~0.01% pixel diff` (no re-baseline). Confirms combat/juice is fully bypassed under `?visual`.

- [ ] **Step 3: Loop smoke (wired loop boots)**

Run: `npm run test:render3d`
Expected: `render3d first-road loop smoke passed`.

- [ ] **Step 4: Live playthrough via Claude_Preview MCP** (real WebGPU)

`preview_start` the render3d page (no `?visual`), drive to `slime_fight`, then: swing (left-click/E) — confirm whiff vs connect, hit-stop + shake + goo burst + damage number + HP bar drop on the slime's lunge; Space-dodge through a lunge — confirm i-frames negate it; kill the slime in 3 connects — confirm SLAIN + kill juice. Then stand in lunges to die — confirm the sealed run-summary still fires.

- [ ] **Step 5: Kill the dev server**

Run: `lsof -ti tcp:5180 | xargs kill -9 2>/dev/null`

---

## Self-review notes
- **Spec coverage:** controls (T6.3), swing/whiff (T1+T6.4), dodge+i-frames (T4, gate in T5/T6.2), slime move/telegraph/lunge (T2+T6.4), hit-stop/shake/knockback/flash/particles/post-pulse (T3+T5+T6), HP bar + damage numbers + combo + hitmarker (T6.7+T7), determinism (`visualCapture` gates in T6, verified T8.2), tests (T1-T5, T8). All spec sections mapped.
- **Type consistency:** `registerHit()`/`applyLungeContact()`/`playerInvulnerable`/`lungeDamage` defined in T5 and used in T6; `isInvulnerable`/`isDodging` defined in T4 and used in T6.2; `hitboxHitsTarget`/`tryRegisterHit`/`isHitboxLive` defined in T1 used in T6.4; `stepSlime`/`createSlimeState`/`.contact` defined in T2 used in T6.4; `createHitStop().scale/punch`, `createCameraShake().add/sample`, `createBurstPool().burst/update` defined in T3 used in T6.
- **Flagged for implementer (not placeholders — genuine codebase confirmations):** the proxy-collision helper name in playerController `update` (T4.5); whether `postStacks` returns the `exposure` uniform on `post` (T6.7); whether `playerController.d.ts` exists (T4.6).
