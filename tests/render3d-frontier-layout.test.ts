import { describe, expect, it } from "vitest";
import { modelFor } from "../src/game/renderer/assetManifest.js";
import {
  buildFrontierPlacements,
  FIRST_ROAD_ART_STYLE,
  getArtDirectionLayoutMetrics,
  getProductionFrameLayoutMetrics,
  getRouteMetrics,
  OPEN_RANGE_BOUNDS,
  PLAYER_SPAWN,
  WORLD_MAP_POIS,
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

  it("registers the production-frame Blender kit through the manifest and layout", () => {
    const placements = buildFrontierPlacements();
    const kinds = new Set(placements.map((placement) => placement.kind));

    for (const kind of [
      "productionBoardwalk",
      "productionSaloon",
      "productionStore",
      "productionAssay",
      "windowGlowPanel",
      "hangingSign",
      "hitchingRail",
      "barrelCrateCluster",
      "npcSilhouette",
      "lanternString",
      "mudRutDecal",
      "dustSmokePlume",
      "bountyEmblem",
    ]) {
      expect(kinds.has(kind)).toBe(true);
      expect(modelFor(kind)?.url).toMatch(/\.glb$/);
    }
  });

  it("keeps the production opening dense enough to read as a bounty street", () => {
    const metrics = getProductionFrameLayoutMetrics(buildFrontierPlacements());

    expect(metrics.productionStreetPropCount).toBeGreaterThanOrEqual(FIRST_ROAD_ART_STYLE.minProductionStreetProps);
    expect(metrics.storefrontCount).toBeGreaterThanOrEqual(FIRST_ROAD_ART_STYLE.minStorefronts);
    expect(metrics.npcSilhouetteCount).toBeGreaterThanOrEqual(FIRST_ROAD_ART_STYLE.minNpcSilhouettes);
    expect(metrics.windowLightCount).toBeGreaterThanOrEqual(FIRST_ROAD_ART_STYLE.minWindowLights);
    expect(metrics.productionKinds).toEqual(expect.arrayContaining([
      "productionSaloon",
      "productionBoardwalk",
      "npcSilhouette",
      "lanternString",
      "bountyEmblem",
    ]));
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

describe("Calico Flats — town 2 (the free town, west of the Pass)", () => {
  const placements = buildFrontierPlacements();
  const byLabel = new Map(placements.map((p) => [p.label, p]));
  // Everything west of the West Pass corridor (x ≤ -34) — the Calico zone.
  const westOfPass = placements.filter((p) => p.x <= -34);

  it("places the Calico anchor buildings west of the West Pass", () => {
    expect(byLabel.get("Calico Flats Gate")?.kind).toBe("townGate");
    expect(byLabel.get("The Neutral Ground Saloon")?.kind).toBe("saloonFacade");
    expect(byLabel.get("Calico Sheriff's Office")?.kind).toBe("storefront");
    expect(byLabel.get("Calico Water Tower")?.kind).toBe("waterTower");
    for (const label of [
      "Calico Flats Gate",
      "The Neutral Ground Saloon",
      "Calico Sheriff's Office",
      "Calico Water Tower",
    ]) {
      expect(byLabel.get(label)!.x).toBeLessThan(-34);
    }
  });

  it("keeps every Calico western building on a shoulder, off the y≈9 street", () => {
    // saloonFacade/storefront/ranch route through buildWesternBuilding, whose front
    // rule is (8.9 - y) >= 0. A building in the lane would face ambiguously and block
    // the walk path — assert each sits clearly on one shoulder.
    const buildings = westOfPass.filter((p) =>
      ["saloonFacade", "storefront", "ranch"].includes(p.kind),
    );
    expect(buildings.length).toBeGreaterThanOrEqual(4);
    for (const b of buildings) {
      expect(Math.abs(b.y - 8.9)).toBeGreaterThan(1.5);
    }
  });

  it("spaces Calico building masses so they do not overlap", () => {
    const buildings = westOfPass.filter((p) =>
      ["saloonFacade", "storefront", "ranch", "waterTower"].includes(p.kind),
    );
    for (let i = 0; i < buildings.length; i++) {
      for (let j = i + 1; j < buildings.length; j++) {
        const d = Math.hypot(
          buildings[i].x - buildings[j].x,
          buildings[i].y - buildings[j].y,
        );
        expect(d).toBeGreaterThanOrEqual(3.5);
      }
    }
  });

  it("pins the world wiring that makes Calico reachable and mapped", () => {
    expect(OPEN_RANGE_BOUNDS.minX).toBe(-78);
    const calicoPoi = WORLD_MAP_POIS.find((p) => p.id === "calico");
    expect(calicoPoi?.label).toBe("Calico Flats");
    expect(calicoPoi?.x).toBeLessThan(-34);
  });

  it("gives the town a READABLE marker (kind:sign + signLines, not blank)", () => {
    // The marker stays kind:"sign" (NOT "roadSign" — that kind is gameplay-keyed);
    // buildSign renders its text from signLines. A blank panel = the bug we fixed.
    const marker = byLabel.get("Calico Flats Marker");
    expect(marker?.kind).toBe("sign");
    expect(marker?.signLines).toEqual(["CALICO FLATS"]);
  });

  it("dresses Calico to a composed-town floor (boardwalks, glow, depth, the gallows)", () => {
    // Mirrors FIRST_ROAD_ART_STYLE's intent for town 2: lock the composition pass so
    // a future edit can't silently strip Calico back to a bare skeleton.
    const CALICO_FLOORS = { boardwalks: 4, windowLights: 3, silhouettes: 3, backRank: 2 };
    const calico = placements.filter(
      (p) => p.x <= -34 && p.x >= -68 && p.y >= 0 && p.y <= 18,
    );
    const count = (k: string) => calico.filter((p) => p.kind === k).length;
    expect(count("productionBoardwalk")).toBeGreaterThanOrEqual(CALICO_FLOORS.boardwalks);
    expect(count("windowGlowPanel")).toBeGreaterThanOrEqual(CALICO_FLOORS.windowLights);
    expect(count("npcSilhouette")).toBeGreaterThanOrEqual(CALICO_FLOORS.silhouettes);
    expect(
      calico.filter((p) => ["productionStore", "productionSaloon"].includes(p.kind)).length,
    ).toBeGreaterThanOrEqual(CALICO_FLOORS.backRank);
    expect(calico.some((p) => p.kind === "gallows")).toBe(true);
  });

  it("keeps wilderness scatter out of the Calico street (the clearing holds)", () => {
    // RANGE_CLEARINGS {x:-52,y:9,r:17} is the SOLE defense west of x<-16
    // (RANGE_PROTECT_RECT does not reach Calico). Assert no procedurally-scattered
    // range flora lands inside the town footprint.
    const scatter = placements.filter(
      (p) => typeof p.label === "string" && p.label.startsWith("Range "),
    );
    const intruders = scatter.filter(
      (p) => Math.hypot(p.x - -52, p.y - 9) < 17, // match the actual clearing radius
    );
    expect(intruders).toEqual([]);
  });
});
