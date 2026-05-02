import { describe, it, expect } from "vitest";
import {
  createParticlePool,
  spawnParticleInto,
  updateParticlePool,
  forEachActive,
  clearPool,
  getActiveCount,
  DEFAULT_PARTICLE_CAP,
} from "../src/particlePool.js";

describe("particlePool", () => {
  it("default cap is reasonable for combat-heavy scenes", () => {
    expect(DEFAULT_PARTICLE_CAP).toBeGreaterThanOrEqual(800);
  });

  it("creates a pool with capacity inactive slots", () => {
    const p = createParticlePool(64);
    expect(p.capacity).toBe(64);
    expect(p.activeCount).toBe(0);
    expect(p.slots.length).toBe(64);
    expect(p.slots.every((s: any) => s.active === false)).toBe(true);
  });

  it("spawn activates a slot and increments count", () => {
    const p = createParticlePool(8);
    spawnParticleInto(p, 1, 2, 0.1, 0.2, 0.5, "#abc", 3);
    expect(getActiveCount(p)).toBe(1);
    let seen = 0;
    forEachActive(p, (slot) => {
      seen++;
      expect(slot.x).toBe(1);
      expect(slot.y).toBe(2);
      expect(slot.color).toBe("#abc");
    });
    expect(seen).toBe(1);
  });

  it("update advances active slots and deactivates expired ones", () => {
    const p = createParticlePool(8);
    spawnParticleInto(p, 0, 0, 1, 0, 0.05, "#fff", 1);
    spawnParticleInto(p, 0, 0, 0, 0, 1.0, "#fff", 1);
    updateParticlePool(p, 0.1);
    expect(getActiveCount(p)).toBe(1); // first one expired
  });

  it("recycles oldest slot when full instead of allocating", () => {
    const p = createParticlePool(3);
    spawnParticleInto(p, 1, 0, 0, 0, 5, "#a", 1);
    spawnParticleInto(p, 2, 0, 0, 0, 5, "#b", 1);
    spawnParticleInto(p, 3, 0, 0, 0, 5, "#c", 1);
    expect(getActiveCount(p)).toBe(3);
    // 4th overwrites slot 0 — total still 3, capacity stable
    spawnParticleInto(p, 9, 9, 0, 0, 5, "#d", 1);
    expect(getActiveCount(p)).toBe(3);
    expect(p.slots.length).toBe(3);
    const colors = p.slots.map((s: any) => s.color).sort();
    expect(colors).toContain("#d");
  });

  it("clearPool resets all slots", () => {
    const p = createParticlePool(4);
    spawnParticleInto(p, 1, 0, 0, 0, 5, "#a", 1);
    spawnParticleInto(p, 2, 0, 0, 0, 5, "#b", 1);
    clearPool(p);
    expect(getActiveCount(p)).toBe(0);
    expect(p.cursor).toBe(0);
    expect(p.slots.every((s: any) => !s.active)).toBe(true);
  });

  it("steady-state spawn does not grow the slots array", () => {
    const p = createParticlePool(50);
    for (let frame = 0; frame < 200; frame++) {
      for (let i = 0; i < 30; i++) {
        spawnParticleInto(p, Math.random(), Math.random(), 0, 0, 0.5, "#ccc", 1);
      }
      updateParticlePool(p, 1 / 60);
    }
    expect(p.slots.length).toBe(50);
    expect(getActiveCount(p)).toBeLessThanOrEqual(50);
  });
});
