import { describe, expect, it } from "vitest";
import {
  resolveStoryLootBoardReaction,
  resolveStoryLootNpcReaction,
} from "../src/storyLootReactions.js";

describe("storyLootReactions", () => {
  it("resolves memorable NPC reactions from notable story loot", () => {
    const line = resolveStoryLootNpcReaction("warden", {
      "Worn Badge": 1,
    });

    expect(line?.line).toContain("Marshal Boone");
    expect(line?.line).toContain("badge");
    expect(line?.itemName).toBe("Worn Badge");
  });

  it("uses priority when multiple story loot hooks are present", () => {
    const line = resolveStoryLootNpcReaction("warden", {
      "Map Scrap": 2,
      "Worn Badge": 1,
      "Sealed Note": 1,
    });

    expect(line?.itemName).toBe("Worn Badge");
  });

  it("returns a board reaction that can enrich job-board copy", () => {
    const reaction = resolveStoryLootBoardReaction({
      "Map Scrap": 1,
    }, "frontier");

    expect(reaction?.line).toContain("map scrap");
    expect(reaction?.regionId).toBe("frontier");
  });

  it("returns null when no relevant story loot exists", () => {
    expect(resolveStoryLootNpcReaction("warden", { Wood: 5 })).toBeNull();
    expect(resolveStoryLootBoardReaction({ Potion: 2 }, "frontier")).toBeNull();
  });
});
