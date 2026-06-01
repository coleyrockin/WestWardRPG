import { describe, expect, it } from "vitest";
import { modelFor } from "../src/game/renderer/assetManifest.js";
import {
  buildFrontierPlacements,
  FIRST_ROAD_ART_STYLE,
  getArtDirectionLayoutMetrics,
  getRouteMetrics,
  PLAYER_SPAWN,
} from "../src/render3d/frontierLayout.js";

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

  it("registers the hero-polish model kit through the manifest and layout", () => {
    const placements = buildFrontierPlacements();
    const kinds = new Set(placements.map((placement) => placement.kind));

    expect(modelFor("jobBoard")?.url).toBe("/models/jobBoard_hero.glb");
    expect(modelFor("brokenWagon")?.url).toBe("/models/wagon_wreck_hero_v2.glb");
    for (const kind of ["heroTownSaloon", "heroTownStore", "heroTownAssay", "heroMesaSkyline", "sageCluster", "roadGrass", "slimeTrailHero"]) {
      expect(kinds.has(kind)).toBe(true);
      expect(modelFor(kind)?.url).toMatch(/\.glb$/);
    }
  });

  it("keeps the first-frame art direction away from slab blockers", () => {
    const metrics = getArtDirectionLayoutMetrics(buildFrontierPlacements());

    expect(metrics.style.openingRoadWidth).toBe(FIRST_ROAD_ART_STYLE.openingRoadWidth);
    expect(metrics.style.openingRoadWidth).toBeGreaterThanOrEqual(6.5);
    expect(metrics.heroPolishKinds).toEqual(expect.arrayContaining([
      "heroTownSaloon",
      "heroTownStore",
      "heroTownAssay",
      "heroMesaSkyline",
      "sageCluster",
      "roadGrass",
      "slimeTrailHero",
    ]));
    expect(metrics.naturalClusterCount).toBeGreaterThanOrEqual(FIRST_ROAD_ART_STYLE.minNaturalClusters);
    expect(metrics.firstFrameNaturalCount).toBeGreaterThanOrEqual(4);
    expect(metrics.firstFrameSlabBlockers).toEqual([]);
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
