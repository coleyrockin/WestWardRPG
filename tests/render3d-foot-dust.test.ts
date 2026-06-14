import { describe, it, expect } from "vitest";
import { footDustStep } from "../src/render3d/footDust.js";

describe("footDustStep — footfall dust cadence", () => {
  it("accumulates sub-stride steps and emits once the stride is crossed", () => {
    const a = footDustStep(0.6, 0, 1.1);
    expect(a.emit).toBe(false);
    expect(a.sinceEmit).toBeCloseTo(0.6, 6);
    const b = footDustStep(0.6, a.sinceEmit, 1.1);
    expect(b.emit).toBe(true);
    expect(b.sinceEmit).toBe(0); // resets on emit
  });

  it("running stride (0.8) emits sooner than walking (1.1) for the same step", () => {
    expect(footDustStep(0.9, 0, 0.8).emit).toBe(true);
    expect(footDustStep(0.9, 0, 1.1).emit).toBe(false);
  });

  it("suppresses emission and resets cadence on a teleport jump (>10u)", () => {
    // respawn/beat/resume setPosition jumps must NOT trail a puff across the gap
    const r = footDustStep(40, 0.5, 0.8);
    expect(r.emit).toBe(false);
    expect(r.sinceEmit).toBe(0);
  });
});
