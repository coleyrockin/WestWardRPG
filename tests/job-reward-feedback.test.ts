import { describe, expect, it } from "vitest";
import {
  createJobLoopNotice,
  formatJobRewardLine,
  resolveJobRewardFeedback,
} from "../src/jobRewardFeedback.js";

describe("jobRewardFeedback", () => {
  it("formats gold, XP, and item payouts", () => {
    expect(formatJobRewardLine({
      gold: 18,
      xp: 11,
      items: { "Repair Parts": 2, Tonic: 1, Dust: 0 },
    })).toBe("+18 gold, +11 XP, +2 Repair Parts, +1 Tonic");
  });

  it("keeps generic jobs focused on the payout", () => {
    const feedback = resolveJobRewardFeedback({
      job: { id: "frontier_road_salvage", title: "Roadside Salvage" },
      reward: { gold: 16, xp: 8, items: { Tonic: 1 } },
    });

    expect(feedback.logLine).toBe("Job paid: Roadside Salvage. +16 gold, +8 XP, +1 Tonic");
    expect(feedback.bonusLine).toBe("");
    expect(feedback.housePromptLine).toBe("");
    expect(feedback.trophyId).toBe("");
  });

  it("mentions bonus pay when the job paid extra", () => {
    const feedback = resolveJobRewardFeedback({
      job: { id: "frontier_supply_run", title: "Frontier Supply Run" },
      reward: { gold: 25, xp: 12, items: {} },
      bonusAwarded: true,
    });

    expect(feedback.logLine).toBe("Job paid: Frontier Supply Run. +25 gold, +12 XP Bonus paid.");
    expect(feedback.bonusLine).toBe("Bonus paid.");
  });

  it("points completed story-loot jobs back to the unlocked house", () => {
    const feedback = resolveJobRewardFeedback({
      job: { id: "frontier_badge_return", title: "Deputy Badge Return" },
      reward: { gold: 20, xp: 14, items: {} },
      inventory: {},
      house: { unlocked: true },
      jobState: { completedJobIds: ["frontier_badge_return"] },
    });

    expect(feedback.trophyId).toBe("deputy_badge");
    expect(feedback.housePromptLine).toContain("House proof updated");
    expect(feedback.housePromptLine).toContain("Deputy Badge returned");
    expect(feedback.housePromptLine).toContain("Boone trusts you");
  });

  it("turns the canonical starter bounty into visible house proof", () => {
    const feedback = resolveJobRewardFeedback({
      job: { id: "frontier_slime_bounty", title: "Marsh Slime Bounty" },
      reward: { gold: 38, xp: 18, items: { Potion: 1, "Slime Core": 1, Stone: 1 } },
      house: { unlocked: true },
      jobState: { completedJobIds: ["frontier_slime_bounty"] },
    });

    expect(feedback.trophyId).toBe("marsh_bounty_notice");
    expect(feedback.rewardLine).toBe("+38 gold, +18 XP, +1 Potion, +1 Slime Core, +1 Stone");
    expect(feedback.housePromptLine).toContain("Marsh Slime Bounty notice");
    expect(feedback.housePromptLine).toContain("marshal road is safer");
  });

  it("remembers story proof when the house is still locked", () => {
    const feedback = resolveJobRewardFeedback({
      job: { id: "frontier_map_survey", title: "Old Road Survey" },
      reward: { gold: 18, xp: 12, items: {} },
      inventory: { "Map Scrap": 1 },
      house: { unlocked: false },
      jobState: { completedJobIds: ["frontier_map_survey"] },
    });

    expect(feedback.trophyId).toBe("road_map");
    expect(feedback.housePromptLine).toBe("House proof remembered: unlock your house to display this job's story trophy.");
  });

  it("creates a visible road-loop notice for completed jobs", () => {
    const feedback = resolveJobRewardFeedback({
      job: { id: "frontier_map_survey", title: "Old Road Survey" },
      reward: { gold: 18, xp: 12, items: { "Map Scrap": 1 } },
      inventory: { "Map Scrap": 1 },
      house: { unlocked: true },
      jobState: { completedJobIds: ["frontier_map_survey"] },
    });
    const notice = createJobLoopNotice({
      job: { id: "frontier_map_survey", title: "Old Road Survey" },
      feedback,
      house: { unlocked: true },
    });

    expect(notice).toMatchObject({
      kind: "job-loop",
      title: "Road loop complete",
      color: "#ffe16a",
    });
    expect(notice.line).toContain("Old Road Survey");
    expect(notice.line).toContain("+18 gold, +12 XP, +1 Map Scrap");
    expect(notice.line).toContain("home proof updated");
  });
});
