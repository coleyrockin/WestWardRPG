import { describe, it, expect } from "vitest";
import { tickExpiringMessages, tickFloatingTexts, tickPlayerCooldowns, resolveRespawnDelay } from "../src/loopTick.js";
import { createSeededRandom } from "../src/rng.js";

// Characterization tests for per-tick ephemera decay extracted verbatim from the
// main.js update() loop. These pin existing behavior so the loop can be carved safely.

describe("loopTick — tickExpiringMessages", () => {
  it("decrements each message ttl by dt", () => {
    const msgs = [{ text: "a", ttl: 2 }, { text: "b", ttl: 1 }];
    tickExpiringMessages(msgs, 0.5);
    expect(msgs.map((m) => m.ttl)).toEqual([1.5, 0.5]);
  });

  it("removes messages whose ttl reaches zero or below", () => {
    const msgs = [{ text: "keep", ttl: 1 }, { text: "drop", ttl: 0.3 }];
    tickExpiringMessages(msgs, 0.3);
    expect(msgs).toEqual([{ text: "keep", ttl: 0.7 }]);
  });

  it("removes all when every message expires", () => {
    const msgs = [{ text: "a", ttl: 0.1 }, { text: "b", ttl: 0.2 }];
    tickExpiringMessages(msgs, 0.5);
    expect(msgs).toEqual([]);
  });

  it("mutates the array in place and returns it", () => {
    const msgs = [{ text: "a", ttl: 1 }];
    const result = tickExpiringMessages(msgs, 0.1);
    expect(result).toBe(msgs);
  });
});

describe("loopTick — tickFloatingTexts", () => {
  it("decrements life and floats text upward by 0.55 * dt", () => {
    const fts = [{ text: "PERFECT", life: 0.7, wy: 5 }];
    tickFloatingTexts(fts, 0.2);
    expect(fts[0].life).toBeCloseTo(0.5);
    expect(fts[0].wy).toBeCloseTo(5 - 0.55 * 0.2);
  });

  it("removes floating texts whose life reaches zero or below", () => {
    const fts = [{ text: "keep", life: 1, wy: 0 }, { text: "drop", life: 0.1, wy: 0 }];
    tickFloatingTexts(fts, 0.2);
    expect(fts.map((f) => f.text)).toEqual(["keep"]);
  });

  it("mutates the array in place and returns it", () => {
    const fts = [{ text: "a", life: 1, wy: 0 }];
    const result = tickFloatingTexts(fts, 0.1);
    expect(result).toBe(fts);
  });
});

describe("loopTick — tickPlayerCooldowns", () => {
  function makePlayer(overrides = {}) {
    return {
      attackCooldown: 1,
      hurtCooldown: 1,
      comboWindow: 1,
      swingTimer: 1,
      hitPulse: 1,
      cameraKick: 1,
      screenShake: 1,
      ...overrides,
    };
  }

  it("decays attackCooldown, hurtCooldown, comboWindow, swingTimer at 1x dt", () => {
    const p = makePlayer();
    tickPlayerCooldowns(p, 0.3);
    expect(p.attackCooldown).toBeCloseTo(0.7);
    expect(p.hurtCooldown).toBeCloseTo(0.7);
    expect(p.comboWindow).toBeCloseTo(0.7);
    expect(p.swingTimer).toBeCloseTo(0.7);
  });

  it("decays hitPulse at 2.4x, cameraKick at 1.8x, screenShake at 7x", () => {
    const p = makePlayer();
    tickPlayerCooldowns(p, 0.1);
    expect(p.hitPulse).toBeCloseTo(1 - 0.1 * 2.4);
    expect(p.cameraKick).toBeCloseTo(1 - 0.1 * 1.8);
    expect(p.screenShake).toBeCloseTo(1 - 0.1 * 7);
  });

  it("clamps every timer at zero, never negative", () => {
    const p = makePlayer({ attackCooldown: 0.05, screenShake: 0.05, swingTimer: 0.01 });
    tickPlayerCooldowns(p, 0.5);
    expect(p.attackCooldown).toBe(0);
    expect(p.screenShake).toBe(0);
    expect(p.swingTimer).toBe(0);
    expect(p.hitPulse).toBe(0);
  });

  it("returns the player object", () => {
    const p = makePlayer();
    expect(tickPlayerCooldowns(p, 0.1)).toBe(p);
  });
});

describe("loopTick — resolveRespawnDelay", () => {
  it("is base 22 plus up to 8, divided by density", () => {
    expect(resolveRespawnDelay(1, () => 0)).toBeCloseTo(22);
    expect(resolveRespawnDelay(1, () => 0.5)).toBeCloseTo(26);
    expect(resolveRespawnDelay(2, () => 1)).toBeCloseTo(15); // 30 / 2
  });

  it("scales inversely with density — denser regions respawn faster", () => {
    const sparse = resolveRespawnDelay(0.5, () => 0.5); // 26 / 0.5 = 52
    const dense = resolveRespawnDelay(2, () => 0.5); // 26 / 2 = 13
    expect(sparse).toBeCloseTo(52);
    expect(dense).toBeCloseTo(13);
  });

  it("defaults to Math.random, staying within [22, 30) / density", () => {
    for (let i = 0; i < 50; i++) {
      const d = resolveRespawnDelay(1);
      expect(d).toBeGreaterThanOrEqual(22);
      expect(d).toBeLessThan(30);
    }
  });

  it("is reproducible with an injected seeded rng", () => {
    const a = resolveRespawnDelay(1, createSeededRandom(9));
    const b = resolveRespawnDelay(1, createSeededRandom(9));
    expect(a).toBe(b);
  });
});
