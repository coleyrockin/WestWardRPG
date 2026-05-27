import { describe, expect, it } from "vitest";
import { buildFrontierPlacements, PLAYER_SPAWN } from "../src/render3d/frontierLayout.js";

describe("render3d frontier layout", () => {
  it("keeps the first-road hero interactables in the opening layout", () => {
    const placements = buildFrontierPlacements();
    const kinds = new Set(placements.map((placement) => placement.kind));

    expect(kinds.has("jobBoard")).toBe(true);
    expect(kinds.has("smokeCache")).toBe(true);
    expect(kinds.has("roadSlime")).toBe(true);
    expect(kinds.has("brokenWagon")).toBe(true);
  });

  it("emits finite coordinates and sizes for every placement", () => {
    for (const placement of buildFrontierPlacements()) {
      expect(Number.isFinite(placement.x)).toBe(true);
      expect(Number.isFinite(placement.y)).toBe(true);
      expect(Number.isFinite(placement.size)).toBe(true);
      expect(placement.size).toBeGreaterThan(0);
    }
  });

  it("keeps the Dustward spawn anchored to the road start", () => {
    expect(PLAYER_SPAWN).toEqual({ x: 9.5, y: 8.5 });
  });
});
