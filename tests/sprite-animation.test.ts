import { describe, it, expect } from "vitest";
import { resolveWalkCycle, resolveAttackCycle } from "../src/spriteAnimation.js";

describe("resolveWalkCycle", () => {
  it("returns deterministic output for the same id+time", () => {
    const a = resolveWalkCycle({ id: "elder", time: 1.4, kind: "npc" });
    const b = resolveWalkCycle({ id: "elder", time: 1.4, kind: "npc" });
    expect(a).toEqual(b);
  });

  it("phase-shifts different ids so adjacent npcs do not lockstep", () => {
    const a = resolveWalkCycle({ id: "elder", time: 0, kind: "npc" });
    const b = resolveWalkCycle({ id: "warden", time: 0, kind: "npc" });
    expect(a.phase).not.toBe(b.phase);
  });

  it("dampens motion when moving=false", () => {
    const moving = resolveWalkCycle({ id: "x", time: 0.7, kind: "npc", moving: true });
    const idle = resolveWalkCycle({ id: "x", time: 0.7, kind: "npc", moving: false });
    expect(Math.abs(idle.bob)).toBeLessThan(Math.abs(moving.bob) + 1e-9);
    expect(Math.abs(idle.swayX)).toBeLessThan(Math.abs(moving.swayX) + 1e-9);
    expect(idle.moving).toBe(false);
  });

  it("returns zeroed amplitudes when nothing is provided", () => {
    const c = resolveWalkCycle();
    expect(Number.isFinite(c.bob)).toBe(true);
    expect(Number.isFinite(c.swayX)).toBe(true);
    expect(Number.isFinite(c.legPhase)).toBe(true);
    expect(Number.isFinite(c.breath)).toBe(true);
  });

  it("breath is bounded to a small range", () => {
    let max = 0;
    for (let t = 0; t < 20; t += 0.2) {
      const v = Math.abs(resolveWalkCycle({ id: "enemy", time: t, kind: "enemy" }).breath);
      if (v > max) max = v;
    }
    expect(max).toBeLessThan(0.06);
  });
});

describe("resolveAttackCycle", () => {
  it("is inactive when no windup is in progress", () => {
    expect(resolveAttackCycle({}).active).toBe(false);
    expect(resolveAttackCycle({ windupTimer: 0, windupMax: 0.4 }).active).toBe(false);
  });

  it("ramps lunge from 0 toward 1 as windup completes", () => {
    const start = resolveAttackCycle({ windupTimer: 0.4, windupMax: 0.4 });
    const mid = resolveAttackCycle({ windupTimer: 0.2, windupMax: 0.4 });
    const end = resolveAttackCycle({ windupTimer: 0.05, windupMax: 0.4 });
    expect(start.lunge).toBe(0);
    expect(mid.lunge).toBeGreaterThan(start.lunge);
    expect(end.lunge).toBeGreaterThan(mid.lunge);
    expect(end.lunge).toBeLessThanOrEqual(1);
  });
});
