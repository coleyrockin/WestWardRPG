import { describe, expect, it } from "vitest";
import {
  resolveHouseProgressDisplay,
  resolveHouseTrophyInspection,
} from "../src/houseProgress.js";

function isHouseInteriorOpen(x: number, y: number) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx <= 0 || ty <= 0 || tx >= 17 || ty >= 17) return false;
  if (ty >= 2 && ty <= 4 && tx >= 3 && tx <= 5) return false;
  if (ty >= 2 && ty <= 3 && tx >= 12 && tx <= 14) return false;
  if (ty >= 4 && ty <= 5 && tx >= 7 && tx <= 10) return false;
  if (ty === 8 && tx >= 5 && tx <= 12) return false;
  return true;
}

describe("houseProgress", () => {
  it("shows locked-house planning copy before the house is owned", () => {
    const display = resolveHouseProgressDisplay({
      inventory: { "Worn Badge": 1 },
      jobState: { completedJobIds: ["frontier_badge_return"] },
      house: { unlocked: false },
    });

    expect(display.unlocked).toBe(false);
    expect(display.trophies).toEqual([]);
    expect(display.trophyLine).toBe("House locked");
    expect(display.planningLine).toContain("Unlock the house");
  });

  it("turns carried story loot into house trophies", () => {
    const display = resolveHouseProgressDisplay({
      inventory: { "Worn Badge": 1, "Map Scrap": 1 },
      jobState: { completedJobIds: [] },
      house: { unlocked: true },
    });

    expect(display.trophyCount).toBe(2);
    expect(display.trophies.map((trophy: any) => trophy.id)).toEqual(["deputy_badge", "road_map"]);
    expect(display.trophies[0]).toMatchObject({
      label: "Deputy Badge",
      status: "carried",
      line: "Worn Badge on the shelf",
      color: "#d8a84f",
    });
    expect(display.planningCards.map((card: any) => card.line)).toContain("Take Deputy Badge Return from Boone's board.");
    expect(display.planningLine).toBe("Take Deputy Badge Return from Boone's board.");
    expect(display.trophyLine).toContain("Map Scrap pinned");
  });

  it("promotes completed story jobs over carried trophy copy", () => {
    const display = resolveHouseProgressDisplay({
      inventory: { "Map Scrap": 1, "Sealed Note": 1 },
      jobState: { completedJobIds: ["frontier_map_survey", "frontier_quiet_note_trace"] },
      house: { unlocked: true },
    });

    expect(display.trophies.map((trophy: any) => trophy.status)).toEqual(["completed", "completed"]);
    expect(display.trophyLine).toContain("Old Road Survey");
    expect(display.trophyLine).toContain("Quiet Note Trace");
    expect(display.planningLine).toContain("trusted route");
    expect(display.planningCards.every((card: any) => card.status === "completed")).toBe(true);
  });

  it("can display completed job proof even after the item is gone", () => {
    const display = resolveHouseProgressDisplay({
      inventory: {},
      jobState: { completedJobIds: ["frontier_badge_return"] },
      house: { unlocked: true },
    });

    expect(display.trophies).toHaveLength(1);
    expect(display.trophies[0]).toMatchObject({
      id: "deputy_badge",
      status: "completed",
      line: "Deputy Badge returned, name plate polished",
    });
  });

  it("upgrades the miner helmet trophy after Ashfall salvage work", () => {
    const display = resolveHouseProgressDisplay({
      inventory: { "Miner Helmet": 1 },
      jobState: { completedJobIds: ["ashfall_miner_helmet_salvage"] },
      house: { unlocked: true },
    });

    expect(display.trophies).toHaveLength(1);
    expect(display.trophies[0]).toMatchObject({
      id: "miner_helmet",
      status: "completed",
      line: "Helmet-Lamp Salvage claim tagged in slag chalk",
    });
    expect(display.planningCards[0].line).toContain("workable shaft");
    expect(display.planningLine).toContain("workable shaft");
  });

  it("inspects the nearest reachable house trophy", () => {
    const inspection = resolveHouseTrophyInspection({
      player: { x: 7.08, y: 6.2 },
      inventory: { "Worn Badge": 1, "Map Scrap": 1 },
      jobState: { completedJobIds: ["frontier_map_survey"] },
      house: { unlocked: true },
    });

    expect(inspection).toMatchObject({
      id: "road_map",
      status: "completed",
      label: "Road Map",
    });
    expect(inspection?.distance).toBeLessThan(0.2);
    expect(inspection?.message).toContain("Old Road Survey");
    expect(inspection?.message).toContain("trusted route");
  });

  it("places visible trophies on open house floor tiles", () => {
    const display = resolveHouseProgressDisplay({
      inventory: { "Worn Badge": 1, "Map Scrap": 1, "Sealed Note": 1, "Miner Helmet": 1 },
      jobState: { completedJobIds: ["frontier_badge_return", "frontier_map_survey", "frontier_quiet_note_trace"] },
      house: { unlocked: true },
    });

    expect(display.trophies).toHaveLength(4);
    expect(display.trophies.every((trophy: any) => isHouseInteriorOpen(trophy.x, trophy.y))).toBe(true);
  });

  it("does not inspect trophies when the house is locked or too far away", () => {
    expect(resolveHouseTrophyInspection({
      player: { x: 6.25, y: 4.15 },
      inventory: { "Worn Badge": 1 },
      house: { unlocked: false },
    })).toBeNull();

    expect(resolveHouseTrophyInspection({
      player: { x: 2, y: 2 },
      inventory: { "Worn Badge": 1 },
      house: { unlocked: true },
    })).toBeNull();
  });
});
