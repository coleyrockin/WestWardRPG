import { describe, it, expect } from "vitest";
import { createSeededRandom } from "../src/rng.js";
import { createRng, nextRng } from "../src/game/rng.js";

// World systems need a stateful drop-in for Math.random so loop sub-steps can
// take an injectable `rng` and become deterministically testable. It must
// produce the SAME mulberry32 stream as the sim core so the two are
// interchangeable.

describe("rng — createSeededRandom", () => {
  it("returns a function producing floats in [0, 1)", () => {
    const rng = createSeededRandom(123);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic — the same seed yields the same sequence", () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds yield different sequences", () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    expect(a()).not.toBe(b());
  });

  it("matches the sim core's mulberry32 stream for the same seed", () => {
    const rng = createSeededRandom(777);
    let state = createRng(777);
    for (let i = 0; i < 8; i++) {
      const stepped = nextRng(state);
      expect(rng()).toBeCloseTo(stepped.value, 12);
      state = stepped.state;
    }
  });
});
