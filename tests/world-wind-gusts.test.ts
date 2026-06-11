import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { GUST_DURATION, gustAt, gustPeriod } from "../src/game/world/windGusts.js";

// One seeded schedule drives both the tumbleweed speed burst (R1.2) and the
// audio gust (R1.4) — these tests pin the contract both consumers rely on.
describe("windGusts", () => {
  it("period is seeded into the 18–28 s window and stable per seed", () => {
    for (const seed of [0, 1, 7.3, 13.7, 23.1, 999]) {
      const p = gustPeriod(seed);
      expect(p).toBeGreaterThanOrEqual(18);
      expect(p).toBeLessThanOrEqual(28);
      expect(gustPeriod(seed)).toBe(p);
    }
    expect(gustPeriod(7.3)).not.toBe(gustPeriod(13.7));
  });

  it("is deterministic: same (t, seed) → same strength", () => {
    for (const t of [0, 3.7, 19.2, 120.5]) {
      expect(gustAt(t, 7.3)).toBe(gustAt(t, 7.3));
    }
  });

  it("strength stays in [0,1] and the gust window opens once per period", () => {
    const seed = 13.7;
    const period = gustPeriod(seed);
    let active = 0;
    const dt = 0.05;
    for (let t = 0; t < period; t += dt) {
      const g = gustAt(t, seed);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      if (g > 0) active += dt;
    }
    // One GUST_DURATION window per period (sampling slack: ±2 steps).
    expect(active).toBeGreaterThan(GUST_DURATION - 2 * dt);
    expect(active).toBeLessThan(GUST_DURATION + 2 * dt);
  });

  it("the window eases 0→1→0 (peaks mid-window, no snap edges)", () => {
    const seed = 23.1;
    const period = gustPeriod(seed);
    // Find the window start within one period.
    let start = -1;
    for (let t = 0; t < period; t += 0.01) {
      if (gustAt(t, seed) > 0) { start = t; break; }
    }
    expect(start).toBeGreaterThanOrEqual(0);
    const early = gustAt(start + 0.05, seed);
    const mid = gustAt(start + GUST_DURATION / 2, seed);
    const late = gustAt(start + GUST_DURATION - 0.06, seed);
    expect(mid).toBeGreaterThan(early);
    expect(mid).toBeGreaterThan(late);
    expect(mid).toBeGreaterThan(0.9);
  });

  it("guards junk time inputs", () => {
    expect(gustAt(-1, 7.3)).toBe(0);
    expect(gustAt(Number.NaN, 7.3)).toBe(0);
    expect(gustAt(Number.POSITIVE_INFINITY, 7.3)).toBe(0);
  });
});
