import { describe, it, expect } from "vitest";
import {
  createSlimeState,
  stepSlime,
  SLIME_TUNING,
} from "../src/render3d/combat/slimeBehavior.js";

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
    let s: any = { ...createSlimeState({ x: 0, z: 0 }), mode: "telegraph", timer: 0 };
    s = stepSlime(s, { x: 1, z: 0 }, T.telegraphTime + 0.001);
    expect(s.mode).toBe("lunge");
    expect(s.lungeDir.x).toBeGreaterThan(0.99); // locked toward +x
  });
  it("lunge moves fast in the locked direction and reports contact when overlapping", () => {
    const s: any = { ...createSlimeState({ x: 0, z: 0 }), mode: "lunge", timer: 0, lungeDir: { x: 1, z: 0 } };
    const next = stepSlime(s, { x: T.contactRadius - 0.1, z: 0 }, 0.05);
    expect(next.pos.x).toBeGreaterThan(0);
    expect(next.contact).toBe(true);
  });
  it("recovers after the lunge then returns to chase", () => {
    let s: any = { ...createSlimeState({ x: 0, z: 0 }), mode: "lunge", timer: 0, lungeDir: { x: 1, z: 0 } };
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
