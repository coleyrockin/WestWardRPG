import { describe, it, expect } from "vitest";
import { createFogGrid, normalizeFogGrid, worldToCell, revealAroundPlayer, isCellDiscovered, regionDiscoveryRatio, FOG_GRID_SIZE } from "../src/fogOfWar.js";

describe("fogOfWar — grid creation", () => {
  it("createFogGrid returns a fully-dark grid", () => {
    const g = createFogGrid();
    expect(g).toHaveLength(FOG_GRID_SIZE * FOG_GRID_SIZE);
    expect(g.every((v) => v === false)).toBe(true);
  });

  it("normalizeFogGrid accepts a valid grid", () => {
    const src = createFogGrid();
    src[0] = true;
    const out = normalizeFogGrid(src);
    expect(out[0]).toBe(true);
    expect(out.every((v, i) => i === 0 ? v === true : v === false)).toBe(true);
  });

  it("normalizeFogGrid returns fresh dark grid for invalid input", () => {
    expect(normalizeFogGrid(null)).toHaveLength(FOG_GRID_SIZE * FOG_GRID_SIZE);
    expect(normalizeFogGrid([1, 2, 3])).toHaveLength(FOG_GRID_SIZE * FOG_GRID_SIZE);
  });
});

describe("fogOfWar — worldToCell", () => {
  it("maps the origin of frontier to (0,0)", () => {
    const { gx, gy } = worldToCell("frontier", 0, 0);
    expect(gx).toBe(0);
    expect(gy).toBe(0);
  });

  it("maps the center of frontier to approximately (16,16)", () => {
    const { gx, gy } = worldToCell("frontier", 16, 16);
    expect(gx).toBeCloseTo(16, 0);
    expect(gy).toBeCloseTo(16, 0);
  });

  it("clamps out-of-bounds coordinates", () => {
    const { gx, gy } = worldToCell("frontier", -99, 999);
    expect(gx).toBeGreaterThanOrEqual(0);
    expect(gx).toBeLessThan(FOG_GRID_SIZE);
    expect(gy).toBeGreaterThanOrEqual(0);
    expect(gy).toBeLessThan(FOG_GRID_SIZE);
  });
});

describe("fogOfWar — reveal and discovery", () => {
  it("revealAroundPlayer marks a 3×3 neighbourhood as discovered", () => {
    const g = createFogGrid();
    revealAroundPlayer(g, "frontier", 16, 16);
    const { gx, gy } = worldToCell("frontier", 16, 16);
    expect(isCellDiscovered(g, gx, gy)).toBe(true);
    // At least 3 cells should be discovered (may be up to 9 away from edges)
    expect(g.filter(Boolean).length).toBeGreaterThanOrEqual(3);
  });

  it("isCellDiscovered returns false for a fresh grid", () => {
    const g = createFogGrid();
    expect(isCellDiscovered(g, 0, 0)).toBe(false);
  });

  it("isCellDiscovered returns false for null grid", () => {
    expect(isCellDiscovered(null as any, 0, 0)).toBe(false);
  });

  it("regionDiscoveryRatio is 0 for a fresh grid", () => {
    expect(regionDiscoveryRatio(createFogGrid())).toBe(0);
  });

  it("regionDiscoveryRatio increases after reveals", () => {
    const g = createFogGrid();
    revealAroundPlayer(g, "frontier", 16, 16);
    expect(regionDiscoveryRatio(g)).toBeGreaterThan(0);
  });

  it("regionDiscoveryRatio is 1 when all cells are discovered", () => {
    const g = new Array(FOG_GRID_SIZE * FOG_GRID_SIZE).fill(true);
    expect(regionDiscoveryRatio(g)).toBe(1);
  });
});
