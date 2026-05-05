import { describe, expect, it } from "vitest";
import {
  createRoadRouteFromSignPrompt,
  normalizeRoadRouteState,
  resolveRoadRouteCompletionReward,
  resolveRoadRouteObjective,
} from "../src/roadRoutes.js";

const prompt = {
  targetId: "frontier_sunken_coach",
  targetKind: "ruin",
  targetLabel: "Sunken Coach Ruins",
  targetX: 24.5,
  targetY: 20.5,
  dangerHint: "Medium danger: broken cover.",
  returnReason: "Map scraps can point future jobs toward better routes.",
  distanceLine: "19.2 tiles southeast",
};

describe("roadRoutes", () => {
  it("creates a save-safe pinned route from a readable road sign prompt", () => {
    const route = createRoadRouteFromSignPrompt(prompt, { regionId: "frontier", time: 12 });

    expect(route).toMatchObject({
      active: true,
      source: "road_sign",
      targetId: "frontier_sunken_coach",
      targetKind: "ruin",
      targetLabel: "Sunken Coach Ruins",
      targetX: 24.5,
      targetY: 20.5,
      regionId: "frontier",
      startedAt: 12,
    });
  });

  it("normalizes malformed or missing route state to null", () => {
    expect(normalizeRoadRouteState(null)).toBeNull();
    expect(normalizeRoadRouteState({ targetLabel: "No id" })).toBeNull();
    expect(normalizeRoadRouteState({ targetId: "x", targetLabel: "X" })).toMatchObject({
      active: true,
      targetId: "x",
      targetLabel: "X",
      targetX: null,
      targetY: null,
    });
  });

  it("resolves an active route objective with live distance to the destination", () => {
    const route = createRoadRouteFromSignPrompt(prompt, { regionId: "frontier", time: 12 });
    const objective = resolveRoadRouteObjective(route, 20.5, 20.5, "frontier");

    expect(objective?.title).toBe("Pinned road");
    expect(objective?.objectiveLine).toContain("Sunken Coach Ruins");
    expect(objective?.objectiveLine).toContain("4");
    expect(objective?.secondaryLine).toContain("broken cover");
    expect(objective?.status).toBe("active");
  });

  it("marks the route as arrived when the player reaches the destination", () => {
    const route = createRoadRouteFromSignPrompt(prompt, { regionId: "frontier", time: 12 });
    const objective = resolveRoadRouteObjective(route, 24.2, 20.4, "frontier");

    expect(objective?.status).toBe("arrived");
    expect(objective?.objectiveLine).toContain("Arrived");
  });

  it("does not show a route outside its region", () => {
    const route = createRoadRouteFromSignPrompt(prompt, { regionId: "frontier", time: 12 });

    expect(resolveRoadRouteObjective(route, 24.2, 20.4, "ashfall")).toBeNull();
  });

  it("rewards completed pinned routes based on danger and destination type", () => {
    const route = createRoadRouteFromSignPrompt({
      ...prompt,
      targetKind: "hideout",
      dangerHint: "High danger: outlaw cover and poor retreat lanes.",
    }, { regionId: "frontier", time: 12 });
    const reward = resolveRoadRouteCompletionReward(route);

    expect(reward).toMatchObject({
      title: "Route scouted",
      xp: 18,
      gold: 10,
      targetLabel: "Sunken Coach Ruins",
    });
    expect(reward?.summary).toContain("Route scouted");
    expect(reward?.summary).toContain("+18 XP");
  });

  it("does not reward malformed or inactive pinned routes", () => {
    expect(resolveRoadRouteCompletionReward(null)).toBeNull();
    expect(resolveRoadRouteCompletionReward({ targetId: "x", targetLabel: "X", active: false })).toBeNull();
  });
});
