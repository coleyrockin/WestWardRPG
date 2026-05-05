import { describe, expect, it } from "vitest";
import {
  formatDiscoveryRewardLine,
  resolveDiscoveryRewardFeedback,
} from "../src/discoveryRewardFeedback.js";

describe("discoveryRewardFeedback", () => {
  it("formats mixed discovery rewards compactly", () => {
    expect(formatDiscoveryRewardLine({
      gold: 8,
      items: { Wood: 1, "Map Scrap": 1, Dust: 0 },
      hp: 0,
      stamina: 10,
    })).toBe("+8g, +1 Wood, +1 Map Scrap, +10 stamina");
  });

  it("falls back to clue copy when there is no numeric reward", () => {
    expect(formatDiscoveryRewardLine({})).toBe("New clue recorded");
  });

  it("builds a player-facing roadside discovery banner", () => {
    const feedback = resolveDiscoveryRewardFeedback({
      poi: {
        id: "frontier_broken_wagon",
        kind: "wagon",
        label: "Broken Wagon",
        regionHint: "Dustward Frontier marshal road",
        returnReason: "The map scrap can open Boone's road survey work.",
      },
      reward: { gold: 8, items: { Wood: 1, "Map Scrap": 1 } },
      codexUnlock: { title: "Broken Wagon" },
    });

    expect(feedback.title).toBe("Broken Wagon discovered");
    expect(feedback.subtitle).toBe("Wagon • Dustward Frontier marshal road");
    expect(feedback.rewardLine).toBe("+8g, +1 Wood, +1 Map Scrap");
    expect(feedback.hookLine).toContain("Boone");
    expect(feedback.codexLine).toBe("Letter unlocked: Broken Wagon");
    expect(feedback.lines).toEqual([
      "+8g, +1 Wood, +1 Map Scrap",
      "The map scrap can open Boone's road survey work.",
      "Letter unlocked: Broken Wagon",
    ]);
  });

  it("includes exploration and route payoff lines when present", () => {
    const feedback = resolveDiscoveryRewardFeedback({
      poi: { kind: "ruin", label: "Sunken Coach Ruins" },
      reward: { gold: 22, items: { "Map Scrap": 1 } },
      renownReward: { summary: "Trail Scout: +30 XP, +18g, +1 upgrade point" },
      routeReward: { summary: "Route scouted: Sunken Coach Ruins. +13 XP, +6g" },
    });

    expect(feedback.kindLabel).toBe("Ruin");
    expect(feedback.lines).toContain("Trail Scout: +30 XP, +18g, +1 upgrade point");
    expect(feedback.lines).toContain("Route scouted: Sunken Coach Ruins. +13 XP, +6g");
  });
});
