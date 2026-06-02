import { describe, it, expect } from "vitest";
import {
  createPlayerCombat,
  hitboxHitsTarget,
  ATTACK_TIMING,
} from "../src/render3d/combat/playerCombat.js";
import {
  stepDodge,
  dodgeIsInvulnerable,
  DODGE,
} from "../src/render3d/playerController.js";

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
    c.update(ATTACK_TIMING.windup + 0.001); // → active
    expect(c.tryRegisterHit()).toBe(true); // connect
    expect(c.tryRegisterHit()).toBe(false); // no double-hit
  });
});

describe("dodge roll", () => {
  it("advances position along the locked direction and ends after the duration", () => {
    let st: any = { position: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, elapsed: 0 };
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
