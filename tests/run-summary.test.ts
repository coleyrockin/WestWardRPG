import { describe, it, expect } from "vitest";
import {
  buildRunSummary,
  completeVictoryRun,
  createInitialRunStats,
  ensureRunStats,
  formatRunDuration,
  recordResourceHarvest,
  recordRunKill,
  syncQuestOutcomeCount,
} from "../src/runSummary.js";

describe("run summary", () => {
  it("normalizes missing run stats onto world state", () => {
    const world: any = {};
    const stats = ensureRunStats(world, 12);
    expect(stats).toEqual(createInitialRunStats(12));
    expect(world.runStats).toBe(stats);
  });

  it("tracks kills, mini-boss kills, and harvested resources", () => {
    const world: any = { runStats: createInitialRunStats(0) };
    recordRunKill(world, { type: "slime" });
    recordRunKill(world, { miniBossId: "lantern_overseer" });
    recordResourceHarvest(world);
    recordResourceHarvest(world);
    expect(world.runStats.kills).toBe(2);
    expect(world.runStats.miniBossKills).toBe(1);
    expect(world.runStats.resourcesHarvested).toBe(2);
  });

  it("locks victory with ending id and quest outcome count", () => {
    const world: any = { runStats: createInitialRunStats(5) };
    const narrative: any = { questOutcomes: { crystal: "truth", lantern_revolt: "guild" } };
    const stats = completeVictoryRun(world, narrative, { id: "messy_commons" }, 95);
    expect(stats.victory).toBe(true);
    expect(stats.endingId).toBe("messy_commons");
    expect(stats.endedAt).toBe(95);
    expect(stats.questOutcomesCount).toBe(2);
  });

  it("formats and builds summary payloads", () => {
    expect(formatRunDuration(125)).toBe("2:05");
    const world: any = {
      runStats: {
        ...createInitialRunStats(10),
        endedAt: 130,
        victory: true,
        endingId: "order_without_truth",
        kills: 7,
      },
    };
    const summary = buildRunSummary(
      world,
      {
        thematicAxes: { controlVsFreedom: 30 },
        questOutcomes: { crystal: "comfort" },
        decisions: [{ log: "Decision A" }, { log: "Decision B" }, { log: "Decision C" }, { log: "Decision D" }],
      },
      { deaths: 2, level: 8, gold: 55 },
      { active: false, downed: true, name: "Nora" },
      160,
    );
    expect(summary.durationLabel).toBe("2:00");
    expect(summary.questOutcomesCount).toBe(1);
    expect(summary.latestDecisions).toEqual(["Decision B", "Decision C", "Decision D"]);
    expect(summary.companion).toContain("recovering");
  });

  it("syncs quest outcome counts independently", () => {
    const world: any = {};
    const stats = syncQuestOutcomeCount(world, { questOutcomes: { a: 1, b: 2, c: 3 } });
    expect(stats.questOutcomesCount).toBe(3);
  });
});
