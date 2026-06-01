import { describe, expect, it } from "vitest";
import { buildFieldMapRouteModel } from "../src/render3d/fieldMapDom.js";

describe("render3d field map DOM helpers", () => {
  it("projects the first-road route into finite SVG coordinates", () => {
    const model = buildFieldMapRouteModel({ phase: "spawn" });

    expect(model.phase).toBe("spawn");
    expect(model.activeKind).toBe("jobBoard");
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
    const model = buildFieldMapRouteModel({ phase: "cache_clue" });
    const byKind = new Map(model.points.map((point: any) => [point.kind, point]));

    expect(model.activeIndex).toBe(4);
    expect(model.warningKinds).toEqual(expect.arrayContaining(["slimeTell", "roadSlime"]));
    expect(byKind.get("jobBoard")).toMatchObject({ shape: "square" });
    expect(byKind.get("smokeCache")).toMatchObject({ shape: "diamond", active: true });
    expect(byKind.get("slimeTell")).toMatchObject({ shape: "triangle", warning: true });
    expect(byKind.get("roadSlime")).toMatchObject({ shape: "triangle", warning: true });
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
