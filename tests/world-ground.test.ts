import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { valueNoise2, groundFbm, reliefMask, groundHeight, createGroundMaterial, biomeAt, biomeFloraTint, localFogBoost, waterBasin } from "../src/game/world/ground.js";
import { FIRST_FIVE_ROUTE } from "../src/render3d/frontierLayout.js";

describe("ground", () => {
  it("value noise stays in [0,1] and is deterministic", () => {
    for (let i = 0; i < 60; i++) {
      const n = valueNoise2(i * 1.7, i * -0.9);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
    expect(valueNoise2(3.2, 4.8)).toBeCloseTo(valueNoise2(3.2, 4.8), 12);
  });

  it("value noise varies across space (not constant)", () => {
    const a = valueNoise2(1.2, 9.4);
    const b = valueNoise2(40.1, -22.3);
    expect(Math.abs(a - b)).toBeGreaterThan(0.001);
  });

  it("builds a toon ground material with a varied colour node", () => {
    const mat = createGroundMaterial();
    expect(mat.isMeshToonNodeMaterial).toBe(true);
    expect(mat.colorNode).toBeTruthy();
    expect(mat.gradientMap).toBeTruthy();
    expect(mat.positionNode).toBeTruthy(); // relief displacement
  });
});

describe("ground relief — FBM field", () => {
  it("stays in [0, ~1.18] across the world (third octave adds ≤0.18, unnormalised per R2.3 spec)", () => {
    // Lower bound is well above 0; upper bound can slightly exceed 1.0 with the third octave.
    for (let x = -10; x < 30; x += 3) {
      for (let z = -5; z < 25; z += 3) {
        const v = groundFbm(x, z);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1.2); // documented max ≈1.18 on the world grid
      }
    }
  });

  it("is deterministic", () => {
    expect(groundFbm(5.5, 2.0)).toBe(groundFbm(5.5, 2.0));
    expect(groundFbm(-8.3, 14.7)).toBe(groundFbm(-8.3, 14.7));
  });
});

describe("ground relief — mask", () => {
  it("is 0 in the road/play corridor (z near 8.9)", () => {
    expect(reliefMask(8.9)).toBeCloseTo(0, 6);
    expect(reliefMask(9.5)).toBeCloseTo(0, 6); // spawn row
  });

  it("is 0 in the south marsh basin (z >= 12.5)", () => {
    expect(reliefMask(13)).toBeCloseTo(0, 6);
    expect(reliefMask(16)).toBeCloseTo(0, 6);
  });

  it("ramps up on the framing flanks (north town / far field)", () => {
    expect(reliefMask(2)).toBeGreaterThan(0.5);
    expect(reliefMask(-1)).toBeGreaterThan(0.8);
  });

  it("stays within [0,1] everywhere", () => {
    for (let z = -5; z < 25; z += 0.5) {
      const m = reliefMask(z);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
    }
  });
});

describe("ground relief — height field", () => {
  it("is flat (0) in the gameplay corridor so props don't float", () => {
    expect(groundHeight(9.5, 8.5)).toBeCloseTo(0, 6); // spawn
    expect(groundHeight(12.35, 8.55)).toBeCloseTo(0, 6); // job board
  });

  it("is flat (0) in the marsh basin so terrain never pokes through water", () => {
    expect(groundHeight(17, 16)).toBeCloseTo(0, 6); // water centre
    expect(groundHeight(14, 16.2)).toBeCloseTo(0, 6); // marsh snag
  });

  it("has real relief on the flanks", () => {
    let maxAbs = 0;
    for (let x = -1; x < 29; x += 1.3) maxAbs = Math.max(maxAbs, Math.abs(groundHeight(x, 2)));
    expect(maxAbs).toBeGreaterThan(0.05);
  });

  it("is bounded by the amplitude and deterministic (third octave stays within ±0.57u max)", () => {
    // Third octave can push groundFbm to ≈1.18; (1.18-0.5)*2*0.48 ≈ 0.653 theoretical.
    // In practice on the test grid the max observed is ~0.24u — we bound at 0.60 to
    // document the new ceiling without over-asserting.
    for (let x = -10; x < 30; x += 1.1) {
      for (let z = -5; z < 25; z += 1.1) {
        expect(Math.abs(groundHeight(x, z))).toBeLessThanOrEqual(0.60);
      }
    }
    expect(groundHeight(5.5, 2.0)).toBe(groundHeight(5.5, 2.0));
  });
});

// ---------------------------------------------------------------------------
// R2.3 — FIRST_FIVE_ROUTE waypoint height constraint (roadmap R2.3)
// ---------------------------------------------------------------------------
describe("R2.3 — FIRST_FIVE_ROUTE waypoints within ±0.1u of zero", () => {
  it("all FIRST_FIVE_ROUTE waypoints have groundHeight ≤ 0.1u (corridor mask)", () => {
    for (const wp of FIRST_FIVE_ROUTE) {
      // frontierLayout uses (x, y) where y maps to world Z
      const h = Math.abs(groundHeight(wp.x, wp.y));
      expect(h).toBeLessThanOrEqual(0.1);
    }
  });
});

// ---------------------------------------------------------------------------
// Meridian basins — the riverbed + reservoir flatten so water never gets pierced
// ---------------------------------------------------------------------------
describe("waterBasin — riverbed + reservoir flatten", () => {
  it("flattens the upper riverbed (x≈47, north of the marsh)", () => {
    expect(waterBasin(47, 0)).toBeCloseTo(1, 6); // mid upper channel
    expect(waterBasin(47, -10)).toBeCloseTo(1, 6);
    expect(groundHeight(47, 0)).toBeCloseTo(0, 6); // terrain carved flat under the river
  });

  it("flattens the Cross Reservoir bed (far north)", () => {
    expect(waterBasin(47, -32)).toBeCloseTo(1, 6); // reservoir centre
    expect(groundHeight(47, -32)).toBeCloseTo(0, 6);
  });

  it("leaves the dusk-frame ground and the open range untouched", () => {
    // dusk frame (Westward street) — must be 0 so the golden baseline holds
    for (let x = 6; x <= 25; x += 2) {
      for (let z = 5; z <= 11; z += 2) {
        expect(waterBasin(x, z), `(${x},${z})`).toBeCloseTo(0, 6);
      }
    }
    // a relief flank well away from any water
    expect(waterBasin(0, 2)).toBeCloseTo(0, 6);
    expect(waterBasin(120, 40)).toBeCloseTo(0, 6);
  });

  it("stays within [0,1]", () => {
    for (let x = -10; x < 90; x += 7) {
      for (let z = -55; z < 40; z += 7) {
        const b = waterBasin(x, z);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// R2.1 — biomeAt classification
// ---------------------------------------------------------------------------
describe("R2.1 — biomeAt zone classification", () => {
  it("returns 'marsh' with full weight at marsh centre (76, 58)", () => {
    const b = biomeAt(76, 58);
    expect(b.key).toBe("marsh");
    expect(b.marsh).toBeCloseTo(1, 6);
    expect(b.bluff).toBeCloseTo(0, 6);
    expect(b.ranch).toBeCloseTo(0, 6);
  });

  it("returns 'bluff' with full weight at bluff centre (33.5, -29)", () => {
    const b = biomeAt(33.5, -29);
    expect(b.key).toBe("bluff");
    expect(b.marsh).toBeCloseTo(0, 6);
    expect(b.bluff).toBeCloseTo(1, 6);
    expect(b.ranch).toBeCloseTo(0, 6);
  });

  it("returns 'ranch' with full weight at ranch centre (125, 12)", () => {
    const b = biomeAt(125, 12);
    expect(b.key).toBe("ranch");
    expect(b.marsh).toBeCloseTo(0, 6);
    expect(b.bluff).toBeCloseTo(0, 6);
    expect(b.ranch).toBeCloseTo(1, 6);
  });

  it("returns 'range' far from all zones (0, 0)", () => {
    const b = biomeAt(0, 0);
    expect(b.key).toBe("range");
    expect(b.marsh).toBeCloseTo(0, 6);
    expect(b.bluff).toBeCloseTo(0, 6);
    expect(b.ranch).toBeCloseTo(0, 6);
  });

  it("returns fractional weights in blend zone — marsh at 20u from centre", () => {
    // At exactly inner radius (16u) weight=1; at outer radius (26u) weight=0.
    // At 20u (midway through the fade) it should be between 0 and 1, not 0 or 1.
    // Point 20u east of marsh centre:
    const b = biomeAt(76 + 20, 58);
    expect(b.marsh).toBeGreaterThan(0);
    expect(b.marsh).toBeLessThan(1);
  });

  it("returns fractional weights in blend zone — bluff at 18u from centre", () => {
    const b = biomeAt(33.5 + 18, -29);
    expect(b.bluff).toBeGreaterThan(0);
    expect(b.bluff).toBeLessThan(1);
  });

  it("returns fractional weights in blend zone — ranch at 22u from centre", () => {
    const b = biomeAt(125 + 22, 12);
    expect(b.ranch).toBeGreaterThan(0);
    expect(b.ranch).toBeLessThan(1);
  });

  it("zones are mutually exclusive — no position has two non-zero weights", () => {
    // All zone centres are far apart (>60u) so cross-contamination is impossible.
    // Spot-check some inter-zone midpoints.
    const midpoints = [
      [(76 + 33.5) / 2, (58 + -29) / 2],  // marsh-bluff midpoint
      [(76 + 125) / 2, (58 + 12) / 2],    // marsh-ranch midpoint
      [(33.5 + 125) / 2, (-29 + 12) / 2], // bluff-ranch midpoint
    ];
    for (const [x, z] of midpoints) {
      const b = biomeAt(x, z);
      const nonZero = [b.marsh, b.bluff, b.ranch].filter((w) => w > 0.001);
      expect(nonZero.length).toBeLessThanOrEqual(1);
    }
  });

  it("all mask weights stay in [0,1]", () => {
    for (let x = 0; x < 150; x += 10) {
      for (let z = -40; z < 80; z += 10) {
        const b = biomeAt(x, z);
        expect(b.marsh).toBeGreaterThanOrEqual(0);
        expect(b.marsh).toBeLessThanOrEqual(1);
        expect(b.bluff).toBeGreaterThanOrEqual(0);
        expect(b.bluff).toBeLessThanOrEqual(1);
        expect(b.ranch).toBeGreaterThanOrEqual(0);
        expect(b.ranch).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 1.3 — biomeFloraTint: shift flora colour toward its biome
// ---------------------------------------------------------------------------
describe("biomeFloraTint — per-biome flora colouring", () => {
  it("leaves the base colour untouched in plain range / unknown biome", () => {
    expect(biomeFloraTint("#70814b", "range")).toBe("#70814b");
    expect(biomeFloraTint("#70814b", "nope")).toBe("#70814b");
    expect(biomeFloraTint("#70814b")).toBe("#70814b");
  });

  it("returns a valid 6-digit hex for every biome", () => {
    for (const key of ["marsh", "bluff", "ranch", "range"]) {
      expect(biomeFloraTint("#70814b", key)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("shifts the colour toward the biome (marsh greener, bluff rustier, ranch golder), not all the way", () => {
    const base = "#70814b";
    for (const key of ["marsh", "bluff", "ranch"]) {
      const out = biomeFloraTint(base, key);
      expect(out).not.toBe(base); // it moved
    }
    // bluff is ochre-rust → red channel rises vs the green base
    const r = (h: string) => parseInt(h.slice(1, 3), 16);
    expect(r(biomeFloraTint(base, "bluff"))).toBeGreaterThan(r(base));
  });

  it("amount 0 = base, amount 1 = the biome target, and is deterministic", () => {
    const base = "#70814b";
    expect(biomeFloraTint(base, "marsh", 0)).toBe(base);
    expect(biomeFloraTint(base, "marsh", 1)).toBe("#7a8a6a"); // the ground marsh tint
    expect(biomeFloraTint(base, "ranch", 0.4)).toBe(biomeFloraTint(base, "ranch", 0.4));
  });
});

// ---------------------------------------------------------------------------
// R2.2 — localFogBoost values
// ---------------------------------------------------------------------------
describe("R2.2 — localFogBoost per-zone fog multiplier", () => {
  it("is ≈1.6 at marsh centre (marsh +60%)", () => {
    expect(localFogBoost(76, 58)).toBeCloseTo(1.6, 5);
  });

  it("is ≈0.8 at bluff centre (bluff −20%)", () => {
    expect(localFogBoost(33.5, -29)).toBeCloseTo(0.8, 5);
  });

  it("is ≈1.1 at ranch centre (ranch +10%)", () => {
    expect(localFogBoost(125, 12)).toBeCloseTo(1.1, 5);
  });

  it("is 1.0 far from all zones (range)", () => {
    expect(localFogBoost(0, 0)).toBeCloseTo(1.0, 5);
    expect(localFogBoost(-50, -50)).toBeCloseTo(1.0, 5);
  });

  it("blends smoothly — value between 1.0 and 1.6 in marsh fade zone", () => {
    // 20u from marsh centre — partially inside fade zone
    const f = localFogBoost(76 + 20, 58);
    expect(f).toBeGreaterThan(1.0);
    expect(f).toBeLessThan(1.6);
  });

  it("blends smoothly — value between 0.8 and 1.0 in bluff fade zone", () => {
    const f = localFogBoost(33.5 + 18, -29);
    expect(f).toBeGreaterThan(0.8);
    expect(f).toBeLessThan(1.0);
  });
});
