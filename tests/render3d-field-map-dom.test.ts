import { describe, expect, it } from "vitest";
import { buildFieldMapRouteModel, buildFieldMapWorldModel, resolveFieldMapMode } from "../src/render3d/fieldMapDom.js";

describe("render3d field map DOM helpers", () => {
  it("projects the first-road route into finite SVG coordinates", () => {
    const model = buildFieldMapRouteModel({ phase: "spawn" }, { playerPosition: { x: 9.5, z: 8.5 } });

    expect(model.phase).toBe("spawn");
    expect(model.activeKind).toBe("jobBoard");
    expect(model.playerPoint.label).toBe("You");
    expect(Number.isFinite(model.playerPoint.x)).toBe(true);
    expect(Number.isFinite(model.distanceToTarget)).toBe(true);
    expect(model.distanceToTarget).toBeGreaterThan(0);
    expect(model.distanceLabel).toMatch(/paces/);
    expect(model.path).toContain("M");
    expect(model.activePath).toContain("L");
    expect(model.points.length).toBeGreaterThanOrEqual(8);
    for (const point of model.points) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(220);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(142);
    }
  });

  it("uses distinct field-map marker shapes for opening beats", () => {
    const model = buildFieldMapRouteModel({ phase: "cache_clue", boardChoice: "ask_danger" });
    const byKind = new Map(model.points.map((point: any) => [point.kind, point]));

    expect(model.activeIndex).toBe(4);
    expect(model.choiceCue).toMatchObject({ optionId: "ask_danger", kind: "slimeTell" });
    expect(model.warningKinds).toEqual(expect.arrayContaining(["slimeTell", "roadSlime"]));
    expect(byKind.get("jobBoard")).toMatchObject({ shape: "square" });
    expect(byKind.get("smokeCache")).toMatchObject({ shape: "diamond", active: true });
    expect(byKind.get("slimeTell")).toMatchObject({ shape: "triangle", warning: true, choice: true });
    expect(byKind.get("roadSlime")).toMatchObject({ shape: "triangle", warning: true });
  });

  it("keeps the return route quiet until the wagon salvage payoff unlocks it", () => {
    const before = buildFieldMapRouteModel({ phase: "wagon_salvage" });
    const after = buildFieldMapRouteModel({
      phase: "return_to_boone",
      routeBeats: { wagonSalvage: true },
    });

    expect(before.returnPath).toBe("");
    expect(after.returnPath).toContain("L");
  });

  it("upgrades the route state after returning the Map Scrap to Boone", () => {
    const model = buildFieldMapRouteModel({
      phase: "survey_teaser",
      routeBeats: { returnToBoone: true },
    });
    const board = model.points.find((point: any) => point.kind === "jobBoard");
    const wagon = model.points.find((point: any) => point.kind === "brokenWagon");

    expect(model.upgraded).toBe(true);
    expect(model.statusLabel).toBe("Old Road Survey marked");
    expect(model.activeKind).toBe("returnJobBoard");
    expect(model.completedKinds).toEqual(expect.arrayContaining(["jobBoard", "brokenWagon"]));
    expect(board?.completed).toBe(true);
    expect(wagon?.completed).toBe(true);
  });
});

describe("world minimap model", () => {
  const SVG_W = 220;
  const SVG_H = 142;
  const PADDING = 17;

  it("projects all 5 POIs to finite coords inside the 220×142 viewBox with padding", () => {
    const model = buildFieldMapWorldModel({}, {});
    expect(model.pois).toHaveLength(5);
    for (const poi of model.pois) {
      expect(Number.isFinite(poi.x)).toBe(true);
      expect(Number.isFinite(poi.y)).toBe(true);
      // Coords must fall within the SVG viewport (clamped to padding * 0.55)
      expect(poi.x).toBeGreaterThanOrEqual(0);
      expect(poi.x).toBeLessThanOrEqual(SVG_W);
      expect(poi.y).toBeGreaterThanOrEqual(0);
      expect(poi.y).toBeLessThanOrEqual(SVG_H);
    }
  });

  it("POI ids and labels match the WORLD_MAP_POIS spec", () => {
    const model = buildFieldMapWorldModel({}, {});
    const byId = new Map(model.pois.map((p: any) => [p.id, p]));
    expect(byId.has("dustward")).toBe(true);
    expect(byId.has("eastwater")).toBe(true);
    expect(byId.has("folly")).toBe(true);
    expect(byId.has("wash")).toBe(true);
    expect(byId.has("westPass")).toBe(true);
    expect(byId.get("dustward")?.label).toBe("Dustward");
    expect(byId.get("eastwater")?.label).toBe("Eastwater Ranch");
    expect(byId.get("folly")?.label).toBe("Prospector's Folly");
  });

  it("Dustward is warmer (#ffd77b) and larger than other POIs", () => {
    const model = buildFieldMapWorldModel({}, {});
    const byId = new Map(model.pois.map((p: any) => [p.id, p]));
    const dustward = byId.get("dustward");
    const others = model.pois.filter((p: any) => p.id !== "dustward");
    expect(dustward?.color).toBe("#ffd77b");
    for (const other of others) {
      expect(dustward!.size).toBeGreaterThan(other.size);
    }
  });

  it("all POI shapes are circle", () => {
    const model = buildFieldMapWorldModel({}, {});
    for (const poi of model.pois) {
      expect(poi.shape).toBe("circle");
    }
  });

  it("roads array contains at least one path string per OPEN_RANGE_ROADS segment plus FIRST_FIVE_ROUTE", () => {
    const model = buildFieldMapWorldModel({}, {});
    // 7 OPEN_RANGE_ROADS segments + 1 FIRST_FIVE_ROUTE polyline = 8 total
    expect(model.roads.length).toBe(8);
    for (const d of model.roads) {
      expect(d).toContain("M");
    }
  });

  it("playerPoint projects to finite coords", () => {
    const model = buildFieldMapWorldModel({}, { playerPosition: { x: 13, z: 8 } });
    expect(Number.isFinite(model.playerPoint.x)).toBe(true);
    expect(Number.isFinite(model.playerPoint.y)).toBe(true);
    expect(model.playerPoint.label).toBe("You");
    expect(Number.isFinite(model.playerPoint.worldX)).toBe(true);
    expect(Number.isFinite(model.playerPoint.worldY)).toBe(true);
  });

  it("playerYaw passthrough: null when not provided", () => {
    const model = buildFieldMapWorldModel({}, {});
    expect(model.playerYaw).toBeNull();
    expect(model.yawDeg).toBeNull();
  });

  it("playerYaw pinned: yaw=0 → yawDeg=0 (cone points north/map-up)", () => {
    const model = buildFieldMapWorldModel({}, { playerYaw: 0 });
    expect(model.playerYaw).toBe(0);
    // −yaw * 180/π at yaw=0 → 0 (may be −0 in JS, which equals 0)
    expect(model.yawDeg).toBeCloseTo(0);
  });

  it("playerYaw pinned: yaw=−π/2 → yawDeg=+90 (cone points east/map-right)", () => {
    const model = buildFieldMapWorldModel({}, { playerYaw: -Math.PI / 2 });
    expect(model.playerYaw).toBeCloseTo(-Math.PI / 2);
    // −(−π/2) * 180/π = +90
    expect(model.yawDeg).toBeCloseTo(90);
  });

  it("non-finite playerYaw is treated as null", () => {
    const model = buildFieldMapWorldModel({}, { playerYaw: NaN });
    expect(model.playerYaw).toBeNull();
    expect(model.yawDeg).toBeNull();
  });

  it("jobTarget projects to finite coords when provided", () => {
    const model = buildFieldMapWorldModel({}, {
      jobTarget: { x: 76.5, y: 58.5, label: "Sunken Wash" },
    });
    expect(model.jobTarget).not.toBeNull();
    expect(Number.isFinite(model.jobTarget!.x)).toBe(true);
    expect(Number.isFinite(model.jobTarget!.y)).toBe(true);
    expect(model.jobTarget!.label).toBe("Sunken Wash");
  });

  it("jobTarget is null when not provided", () => {
    const model = buildFieldMapWorldModel({}, {});
    expect(model.jobTarget).toBeNull();
  });

  it("statusLabel is 'Open Range'", () => {
    const model = buildFieldMapWorldModel({}, {});
    expect(model.statusLabel).toBe("Open Range");
  });
});

describe("resolveFieldMapMode", () => {
  it("returns 'route' for normal gameplay phases", () => {
    const routePhases = ["spawn", "board_choice", "road_sign", "road_walk", "cache_clue", "slime_fight", "wagon_salvage", "return_to_boone"];
    for (const phase of routePhases) {
      expect(resolveFieldMapMode({ phase }, null)).toBe("route");
    }
  });

  it("returns 'world' at survey_teaser phase", () => {
    expect(resolveFieldMapMode({ phase: "survey_teaser" }, null)).toBe("world");
  });

  it("override 'route' wins over survey_teaser", () => {
    expect(resolveFieldMapMode({ phase: "survey_teaser" }, "route")).toBe("route");
  });

  it("override 'world' wins over spawn phase", () => {
    expect(resolveFieldMapMode({ phase: "spawn" }, "world")).toBe("world");
  });

  it("override 'route' wins over spawn", () => {
    expect(resolveFieldMapMode({ phase: "spawn" }, "route")).toBe("route");
  });

  it("non-matching override falls through to default logic", () => {
    expect(resolveFieldMapMode({ phase: "spawn" }, "other" as any)).toBe("route");
    expect(resolveFieldMapMode({ phase: "survey_teaser" }, "other" as any)).toBe("world");
  });

  it("no loopState defaults to route", () => {
    expect(resolveFieldMapMode({}, null)).toBe("route");
  });
});
