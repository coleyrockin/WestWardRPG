import { describe, it, expect } from "vitest";
import { createRng, nextRng, rngRange, rngInt } from "../src/game/rng.js";

describe("rng — seeded determinism", () => {
  it("same state yields the same value and next state", () => {
    const s = createRng(42);
    const a = nextRng(s);
    const b = nextRng(s);
    expect(a.value).toBe(b.value);
    expect(a.state.seed).toBe(b.state.seed);
  });

  it("produces a reproducible sequence from a seed", () => {
    const seq = (seed: number) => {
      let st = createRng(seed);
      const out: number[] = [];
      for (let i = 0; i < 5; i++) {
        const r = nextRng(st);
        out.push(r.value);
        st = r.state;
      }
      return out;
    };
    expect(seq(7)).toEqual(seq(7));
    expect(seq(7)).not.toEqual(seq(8));
  });

  it("values stay in [0, 1)", () => {
    let st = createRng(123);
    for (let i = 0; i < 200; i++) {
      const r = nextRng(st);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      st = r.state;
    }
  });

  it("rngRange stays within bounds; rngInt within [0, n)", () => {
    let st = createRng(99);
    for (let i = 0; i < 100; i++) {
      const rr = rngRange(st, -5, 5);
      expect(rr.value).toBeGreaterThanOrEqual(-5);
      expect(rr.value).toBeLessThan(5);
      const ri = rngInt(rr.state, 4);
      expect(Number.isInteger(ri.value)).toBe(true);
      expect(ri.value).toBeGreaterThanOrEqual(0);
      expect(ri.value).toBeLessThan(4);
      st = ri.state;
    }
  });

  it("does not mutate the input state", () => {
    const s = createRng(5);
    const before = s.seed;
    nextRng(s);
    expect(s.seed).toBe(before);
  });
});
