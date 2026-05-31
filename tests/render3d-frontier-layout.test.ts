import { describe, expect, it } from "vitest";
import { buildFrontierPlacements, getRouteMetrics, PLAYER_SPAWN } from "../src/render3d/frontierLayout.js";

describe("render3d frontier layout", () => {
  it("keeps the first-road hero interactables in the opening layout", () => {
    const placements = buildFrontierPlacements();
    const kinds = new Set(placements.map((placement) => placement.kind));

    expect(kinds.has("jobBoard")).toBe(true);
    expect(kinds.has("roadSign")).toBe(true);
    expect(kinds.has("townBark")).toBe(true);
    expect(kinds.has("smokeCache")).toBe(true);
    expect(kinds.has("slimeTell")).toBe(true);
    expect(kinds.has("roadSlime")).toBe(true);
    expect(kinds.has("brokenWagon")).toBe(true);
  });

  it("registers the Blender recovery kit as real route dressing", () => {
    const placements = buildFrontierPlacements();
    const kinds = new Set(placements.map((placement) => placement.kind));
    const planks = placements.filter((placement) => placement.kind === "roadPlank");

    expect(kinds.has("townFacadeWarm")).toBe(true);
    expect(kinds.has("townFacadeStore")).toBe(true);
    expect(kinds.has("townFacadeDark")).toBe(true);
    expect(kinds.has("lampTall")).toBe(true);
    expect(kinds.has("lampLow")).toBe(true);
    expect(kinds.has("wagonSalvage")).toBe(true);
    expect(kinds.has("mesa")).toBe(true);
    expect(planks.length).toBeGreaterThanOrEqual(12);
    expect(planks.every((placement) => Number.isFinite(placement.yaw))).toBe(true);
  });

  it("registers the max-mode Blender kit with readable route composition props", () => {
    const placements = buildFrontierPlacements();
    const kinds = new Set(placements.map((placement) => placement.kind));
    const ruts = placements.filter((placement) => placement.kind === "roadRut");

    expect(kinds.has("brokenFence")).toBe(true);
    expect(kinds.has("marshCluster")).toBe(true);
    expect(kinds.has("mesaSkyline")).toBe(true);
    expect(ruts.length).toBeGreaterThanOrEqual(10);
    expect(ruts.every((placement) => Number.isFinite(placement.yaw))).toBe(true);
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

  it("paces the first-five-minute route beyond a short prop chain", () => {
    const metrics = getRouteMetrics(buildFrontierPlacements());

    expect(metrics.targetKinds).toEqual([
      "spawn",
      "jobBoard",
      "roadSign",
      "townBark",
      "smokeCache",
      "slimeTell",
      "roadSlime",
      "brokenWagon",
      "returnJobBoard",
    ]);
    expect(metrics.totalDistance).toBeGreaterThan(95);
    expect(metrics.estimatedPlaySeconds).toBeGreaterThanOrEqual(240);
    expect(metrics.estimatedPlaySeconds).toBeLessThanOrEqual(360);
  });
});
