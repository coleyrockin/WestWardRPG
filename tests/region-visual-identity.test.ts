import { describe, expect, it } from "vitest";
import {
  REGION_VISUAL_IDENTITIES,
  buildRegionRoutePolyline,
  buildRegionWorldPresentation,
  buildRegionIdentityLine,
  getRegionVisualIdentity,
  resolveRegionReadabilityCues,
  resolveRoadSignPrompt,
} from "../src/regionVisualIdentity.js";

describe("regionVisualIdentity", () => {
  it("defines a complete visual identity for each shipped region", () => {
    for (const regionId of ["frontier", "ashfall", "ironlantern"]) {
      const profile = getRegionVisualIdentity(regionId);
      expect(profile.id).toBe(regionId);
      expect(profile.label.length).toBeGreaterThan(4);
      expect(profile.skyTint).toMatch(/^#/);
      expect(profile.groundPalette.length).toBeGreaterThanOrEqual(3);
      expect(profile.landmarkHints.length).toBeGreaterThanOrEqual(3);
      expect(profile.propPalette.length).toBeGreaterThanOrEqual(3);
      expect(profile.roadColor).toMatch(/^#/);
      expect(profile.roadEdgeColor).toMatch(/^#/);
      expect(profile.minimapTint).toMatch(/^#/);
      expect(profile.dangerIdentity.length).toBeGreaterThan(8);
    }
  });

  it("falls back to Frontier for unknown regions", () => {
    expect(getRegionVisualIdentity("unknown")).toEqual(REGION_VISUAL_IDENTITIES.frontier);
  });

  it("builds a compact debug/readability line", () => {
    const line = buildRegionIdentityLine("ashfall");
    expect(line).toContain("Ashfall");
    expect(line).toContain("Landmarks");
    expect(line).toContain("Danger");
  });

  it("builds deterministic non-blocking world dressing around the start view", () => {
    const presentation = buildRegionWorldPresentation("frontier", { playerX: 9.5, playerY: 8.5 });

    expect(presentation.landmark.label).toContain("Watchtower");
    expect(presentation.routeLine).toContain("wagon ruts");
    expect(presentation.routeLine).toContain("hanging lamps");
    expect(presentation.readability.roadPull).toContain("mileposts");
    expect(presentation.readability.roadPull).toContain("paired lamps");
    expect(presentation.props.length).toBeGreaterThanOrEqual(5);
    expect(presentation.vegetation.length).toBeGreaterThanOrEqual(4);
    expect(presentation.roads.length).toBeGreaterThanOrEqual(7);
    expect(presentation.props.every((prop: any) => prop.blocking === false)).toBe(true);
    expect(presentation.vegetation.every((plant: any) => plant.blocking === false)).toBe(true);
    expect(presentation.roads.every((road: any) => road.blocking === false)).toBe(true);
    expect(presentation.props.some((prop: any) => prop.kind === "sign")).toBe(true);
    expect(presentation.vegetation.some((plant: any) => plant.kind === "tree")).toBe(true);
    expect(presentation.props.some((prop: any) => prop.label === "Slime-Scarred Road")).toBe(true);
    expect(presentation.props.filter((prop: any) => prop.kind === "lamp").length).toBeGreaterThanOrEqual(2);
    expect(presentation.roads.some((road: any) => road.label.includes("Marshal"))).toBe(true);
    expect(presentation.roads.some((road: any) => road.label.includes("Broken Wagon"))).toBe(true);
    expect(new Set([...presentation.props, ...presentation.vegetation, ...presentation.vistas].map((item: any) => item.depthLane).filter(Boolean)).size).toBeGreaterThanOrEqual(3);
  });

  it("surfaces explicit readability cues for the Westward visual pass", () => {
    const cues = resolveRegionReadabilityCues("frontier");

    expect(cues.regionId).toBe("frontier");
    expect(cues.roadPull).toContain("wagon ruts");
    expect(cues.landmarkCue).toContain("Watchtower");
    expect(cues.wallCue).toContain("contact trim");
    expect(cues.interactableCue).toContain("job board");
  });

  it("adds road discovery signposts that point to authored POIs", () => {
    const presentation = buildRegionWorldPresentation("frontier", { playerX: 9.5, playerY: 8.5 });

    expect(presentation.roadSigns.length).toBeGreaterThanOrEqual(3);
    expect(presentation.roadSigns.every((sign: any) => sign.kind === "road-sign")).toBe(true);
    expect(presentation.roadSigns.every((sign: any) => sign.blocking === false)).toBe(true);
    expect(presentation.roadSigns.every((sign: any) => sign.targetId && sign.distanceLine && sign.dangerHint)).toBe(true);
    expect(presentation.roadSigns.map((sign: any) => sign.targetKind)).toEqual(expect.arrayContaining([
      "ruin",
      "hideout",
      "stranger",
    ]));
  });

  it("keeps road discovery signposts map-valid when their first placement is blocked", () => {
    const blocked = new Set(["11.00,8.98"]);
    const isPassable = (x: number, y: number) => !blocked.has(`${x.toFixed(2)},${y.toFixed(2)}`);
    const isVisible = (x: number, y: number) => x >= 9 && x <= 16 && y >= 6 && y <= 11;
    const presentation = buildRegionWorldPresentation("frontier", {
      playerX: 9.5,
      playerY: 8.5,
      isPassable,
      isVisible,
    });

    expect(presentation.roadSigns.every((sign: any) => isPassable(sign.x, sign.y) && isVisible(sign.x, sign.y))).toBe(true);
    expect(presentation.roadSigns[0].placement).toBe("adjusted");
  });

  it("resolves a readable prompt when the player is near a road discovery sign", () => {
    const presentation = buildRegionWorldPresentation("frontier", { playerX: 9.5, playerY: 8.5 });
    const firstSign = presentation.roadSigns[0];
    const prompt = resolveRoadSignPrompt(presentation.roadSigns, firstSign.x + 0.2, firstSign.y + 0.1);

    expect(prompt?.title).toBe("Road sign");
    expect(prompt?.action).toBe("read");
    expect(prompt?.targetId).toBe(firstSign.targetId);
    expect(prompt?.targetX).toBe(firstSign.targetX);
    expect(prompt?.targetY).toBe(firstSign.targetY);
    expect(prompt?.objectiveLine).toContain(firstSign.targetLabel);
    expect(prompt?.secondaryLine).toContain(firstSign.dangerHint);
    expect(prompt?.distanceToSign).toBeLessThan(0.4);
  });

  it("returns null when no road discovery sign is close enough to read", () => {
    const presentation = buildRegionWorldPresentation("frontier", { playerX: 9.5, playerY: 8.5 });

    expect(resolveRoadSignPrompt(presentation.roadSigns, 2, 2, { radius: 1 })).toBeNull();
  });

  it("prefers the nearest readable road sign", () => {
    const presentation = buildRegionWorldPresentation("frontier", { playerX: 9.5, playerY: 8.5 });
    const secondSign = presentation.roadSigns[1];
    const prompt = resolveRoadSignPrompt(presentation.roadSigns, secondSign.x, secondSign.y, { radius: 3 });

    expect(prompt?.targetId).toBe(secondSign.targetId);
  });

  it("adds first-view composition with validated vista silhouettes", () => {
    const presentation = buildRegionWorldPresentation("frontier", { playerX: 9.5, playerY: 8.5 });

    expect(presentation.compositionLine).toContain("road");
    expect(presentation.compositionLine).toContain("town");
    expect(presentation.anchor).toMatchObject({ x: 9.5, y: 8.5 });
    expect(presentation.vistas.length).toBeGreaterThanOrEqual(3);
    expect(presentation.vistas.every((vista: any) => vista.blocking === false)).toBe(true);
    expect(presentation.vistas.map((vista: any) => vista.kind)).toEqual(expect.arrayContaining([
      "town",
      "watchtower",
      "gate",
    ]));
    expect(presentation.vistas.find((vista: any) => vista.kind === "town")?.label).toContain("Town");
  });

  it("moves props to map-valid visible tiles when a generated coordinate is blocked", () => {
    const blocked = new Set(["11.12,9.24"]);
    const isPassable = (x: number, y: number) => !blocked.has(`${x.toFixed(2)},${y.toFixed(2)}`);
    const isVisible = (x: number, y: number) => x >= 9 && x <= 16 && y >= 6 && y <= 11;
    const presentation = buildRegionWorldPresentation("frontier", {
      playerX: 9.5,
      playerY: 8.5,
      isPassable,
      isVisible,
    });

    const placements = [presentation.landmark, ...presentation.props, ...presentation.vegetation, ...presentation.roads, ...presentation.vistas, ...presentation.roadSigns];
    expect(placements.every((item: any) => isPassable(item.x, item.y) && isVisible(item.x, item.y))).toBe(true);
    expect(presentation.props.find((prop: any) => prop.kind === "sign")).toMatchObject({
      placement: "adjusted",
    });
  });

  it("changes landmark and prop identity by region", () => {
    const ashfall = buildRegionWorldPresentation("ashfall", { playerX: 38, playerY: 39 });
    const lantern = buildRegionWorldPresentation("ironlantern", { playerX: 14, playerY: 39 });

    expect(ashfall.landmark.label).toContain("Slag");
    expect(lantern.landmark.label).toContain("Signal");
    expect(ashfall.props.map((prop: any) => prop.label)).not.toEqual(lantern.props.map((prop: any) => prop.label));
    expect(ashfall.vegetation.map((prop: any) => prop.label)).not.toEqual(lantern.vegetation.map((prop: any) => prop.label));
    expect(ashfall.roads.map((road: any) => road.label)).not.toEqual(lantern.roads.map((road: any) => road.label));
    expect(ashfall.vistas.map((vista: any) => vista.label)).not.toEqual(lantern.vistas.map((vista: any) => vista.label));
    expect(ashfall.roadSigns.map((sign: any) => sign.targetKind)).toContain("mine");
    expect(lantern.roadSigns.map((sign: any) => sign.targetKind)).toContain("hideout");
  });

  it("does not emit unvalidated world dressing placements", () => {
    for (const regionId of ["frontier", "ashfall", "ironlantern"]) {
      const presentation = buildRegionWorldPresentation(regionId, {});
      const placements = [
        presentation.landmark,
        ...presentation.props,
        ...presentation.vegetation,
        ...presentation.roads,
        ...presentation.vistas,
        ...presentation.roadSigns,
      ];
      expect(placements.every((item: any) => item.placement !== "unvalidated")).toBe(true);
    }
  });

  it("builds an ordered route polyline from player anchor through road dressing to the landmark", () => {
    const presentation = buildRegionWorldPresentation("frontier", { playerX: 9.5, playerY: 8.5 });
    const route = buildRegionRoutePolyline(presentation);

    expect(route[0]).toMatchObject({ kind: "start", x: 9.5, y: 8.5 });
    expect(route.slice(1, 4).every((point: any) => point.kind === "road")).toBe(true);
    expect(route[route.length - 1]).toMatchObject({ kind: "landmark" });
    expect(route[route.length - 1].label).toContain("North Watchtower");
    expect(route).toHaveLength(presentation.roads.length + 2);
  });
});
