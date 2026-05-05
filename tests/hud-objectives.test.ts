import { describe, expect, it } from "vitest";
import {
  buildJobObjective,
  buildQuestHudLines,
  resolveLiveObjectiveLine,
  selectLiveObjective,
} from "../src/hudObjectives.js";

describe("hudObjectives", () => {
  const labels = { locked: "Locked", done: "Done", turnIn: "Turn in" };

  it("formats quest progress and inserts active job after house quest slot", () => {
    const lines = buildQuestHudLines({
      labels,
      inventory: { Wood: 3, Stone: 1 },
      activeJob: { title: "Courier Orders", status: "active", npcName: "Boone", progressLine: "1/2 stops" },
      quests: {
        crystal: { title: "Crystal", status: "active", progress: 1, need: 3 },
        slime: { title: "Slime", status: "complete", progress: 2, need: 2 },
        wood: { title: "House", status: "active", needWood: 5, needStone: 2 },
        archive: { title: "Archive", status: "locked", progress: 0, need: 1 },
      },
    });

    expect(lines).toEqual([
      "Crystal: 1/3",
      "Slime: 2/2 Turn in",
      "House: 3/5W 1/2S",
      "Job: Courier Orders: 1/2 stops",
      "Archive: Locked",
    ]);
  });

  it("builds return and active job objectives with route details", () => {
    expect(buildJobObjective({
      activeJob: { title: "Courier", status: "ready", npcName: "Boone", rewardLine: "12g" },
      jobMarker: { distanceLine: "14m" },
    })).toMatchObject({
      title: "Job ready",
      line: "Return to Boone for 12g (14m)",
      urgency: "high",
    });

    expect(buildJobObjective({
      activeJob: { title: "Patrol", status: "active", progressLine: "Checkpoint 2" },
      jobMarker: { regionHint: "Dustward road", checkpointIndex: 2, checkpointTotal: 3, distanceLine: "22m" },
    })?.line).toBe("Patrol: Dustward road • Checkpoint 2 • 2/3 • 22m");
  });

  it("selects the first live objective and resolves either line field", () => {
    const objective = selectLiveObjective([null, { title: "Road", objectiveLine: "Follow smoke" }, { title: "Other", line: "Later" }]);

    expect(objective?.title).toBe("Road");
    expect(resolveLiveObjectiveLine(objective)).toBe("Follow smoke");
    expect(resolveLiveObjectiveLine({ line: "Return home" })).toBe("Return home");
  });
});
