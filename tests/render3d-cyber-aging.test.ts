import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { flickerValue, CYBER_AGED_KINDS } from "../src/render3d/cyberAging.js";

describe("cyber-aging flicker", () => {
  const cfg = { freq: 9.0, phase: 1.3 };

  it("stays in a dim-but-lit band [0.5,1.0]", () => {
    for (let t = 0; t < 40; t += 0.05) {
      const v = flickerValue(t, cfg);
      expect(v).toBeGreaterThanOrEqual(0.5);
      expect(v).toBeLessThanOrEqual(1.0);
    }
  });

  it("is deterministic for a fixed (t,cfg)", () => {
    expect(flickerValue(12.34, cfg)).toBe(flickerValue(12.34, cfg));
  });

  it("differs by phase (each tube buzzes independently)", () => {
    const a = flickerValue(3.0, { freq: 9, phase: 0 });
    const b = flickerValue(3.0, { freq: 9, phase: 2.5 });
    expect(a).not.toBe(b);
  });

  it("actually FLICKERS — the value varies over time (not a constant)", () => {
    const vals = [];
    for (let t = 0; t < 20; t += 0.1) vals.push(flickerValue(t, cfg));
    const min = Math.min(...vals), max = Math.max(...vals);
    expect(max - min).toBeGreaterThan(0.1); // visible pulsing
  });

  it("has occasional dropouts — dips below the steady buzz floor sometimes", () => {
    let dropouts = 0;
    for (let t = 0; t < 200; t += 0.05) if (flickerValue(t, cfg) < 0.7) dropouts++;
    expect(dropouts).toBeGreaterThan(0); // the dying-tube stutter fires
  });

  it("ages exactly the three chosen Westward buildings", () => {
    expect([...CYBER_AGED_KINDS].sort()).toEqual(["blacksmith", "hotel", "walkInSaloon"]);
  });
});
