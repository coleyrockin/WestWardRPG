import { describe, it, expect } from "vitest";
import { createHitStop, createCameraShake } from "../src/render3d/combat/hitFx.js";

describe("createHitStop", () => {
  it("returns 1 when idle and the punch scale during a freeze, then restores", () => {
    const hs = createHitStop();
    expect(hs.scale(0.016)).toBe(1);
    hs.punch(0.07, 0.05);
    expect(hs.scale(0.03)).toBe(0.05); // mid-freeze
    expect(hs.scale(0.03)).toBe(0.05); // still within 0.07 total (0.06 elapsed)
    expect(hs.scale(0.05)).toBe(1); // elapsed > 0.07 → restored
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
  it("offset is zero at zero trauma", () => {
    const sh = createCameraShake();
    const off = sh.sample(0, 0.123);
    expect(off.x).toBeCloseTo(0);
    expect(off.y).toBeCloseTo(0);
    expect(off.trauma).toBe(0);
  });
});
