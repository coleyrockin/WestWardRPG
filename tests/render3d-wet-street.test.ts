import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { wetnessAt, wetnessField, PUDDLE_LO, PUDDLE_HI } from "../src/render3d/wetStreet.js";

// Sample the Westward main-street footprint (x ~9.5..24 along the road, z ~5.5..9).
const grid = () => {
  const pts: Array<[number, number]> = [];
  for (let x = 9; x <= 24; x += 0.5) for (let z = 5.5; z <= 9; z += 0.5) pts.push([x, z]);
  return pts;
};

describe("wetStreet puddle field", () => {
  it("returns wetness in [0,1] and is deterministic", () => {
    for (const [x, z] of grid()) {
      const w = wetnessAt(x, z);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
      expect(wetnessAt(x, z)).toBe(w); // same input → same output
    }
  });

  it("ACTUALLY varies wet-vs-dry — both puddle and dry mud exist (no uniform gloss)", () => {
    const ws = grid().map(([x, z]) => wetnessAt(x, z));
    const wet = ws.filter((w) => w > 0.6).length;
    const dry = ws.filter((w) => w < 0.05).length;
    expect(wet).toBeGreaterThan(0); // there ARE puddles
    expect(dry).toBeGreaterThan(0); // there IS dry mud
  });

  it("keeps puddle coverage moderate — a muddy street with pools, not a lake", () => {
    const ws = grid().map(([x, z]) => wetnessAt(x, z));
    const coverage = ws.filter((w) => w > 0.5).length / ws.length;
    expect(coverage).toBeGreaterThan(0.03);
    expect(coverage).toBeLessThan(0.6);
  });

  it("pools ALONG the street — wet runs continue further down +x than across +z (anisotropy)", () => {
    // Given a wet sample, how often is the neighbour 0.5u away also wet? Stretched
    // puddles continue more along the travel axis (+x) than across the street (+z).
    const step = 0.5, thr = 0.5;
    let xHit = 0, xTot = 0, zHit = 0, zTot = 0;
    for (const [x, z] of grid()) {
      if (wetnessAt(x, z) > thr) {
        xTot++; if (wetnessAt(x + step, z) > thr) xHit++;
        zTot++; if (wetnessAt(x, z + step) > thr) zHit++;
      }
    }
    const pAlong = xHit / Math.max(1, xTot);
    const pAcross = zHit / Math.max(1, zTot);
    expect(pAlong).toBeGreaterThan(pAcross); // streaks down the street, not round blobs
  });

  it("threshold band is well-formed (LO < HI, both in range)", () => {
    expect(PUDDLE_LO).toBeLessThan(PUDDLE_HI);
    expect(PUDDLE_LO).toBeGreaterThan(0);
    expect(PUDDLE_HI).toBeLessThan(1);
  });

  it("saturates: field below LO → fully dry (0), field above HI → full puddle (1)", () => {
    // find a representative dry + wet sample and confirm the mapping saturates
    const dry = grid().find(([x, z]) => wetnessField(x, z) < PUDDLE_LO);
    const wet = grid().find(([x, z]) => wetnessField(x, z) > PUDDLE_HI);
    if (dry) expect(wetnessAt(dry[0], dry[1])).toBe(0);
    if (wet) expect(wetnessAt(wet[0], wet[1])).toBe(1);
  });
});
