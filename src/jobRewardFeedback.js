import { resolveHouseProgressDisplay } from "./houseProgress.js";

const STORY_JOB_TROPHIES = {
  frontier_badge_return: "deputy_badge",
  frontier_map_survey: "road_map",
  frontier_quiet_note_trace: "sealed_note",
  ashfall_miner_helmet_salvage: "miner_helmet",
};

function safeNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function formatJobRewardLine(reward = {}) {
  const gold = safeNumber(reward.gold);
  const xp = safeNumber(reward.xp);
  const itemLine = Object.entries(reward.items || {})
    .filter(([, count]) => safeNumber(count) > 0)
    .map(([name, count]) => `+${safeNumber(count)} ${name}`)
    .join(", ");
  return `+${gold} gold, +${xp} XP${itemLine ? `, ${itemLine}` : ""}`;
}

export function resolveJobRewardFeedback({
  job = {},
  reward = {},
  bonusAwarded = false,
  house = {},
  inventory = {},
  jobState = {},
} = {}) {
  const title = typeof job.title === "string" && job.title.trim() ? job.title.trim() : "Posted work";
  const rewardLine = formatJobRewardLine(reward);
  const bonusLine = bonusAwarded ? "Bonus paid." : "";
  const trophyId = STORY_JOB_TROPHIES[job.id] || "";
  let housePromptLine = "";

  if (trophyId) {
    const houseDisplay = resolveHouseProgressDisplay({ house, inventory, jobState });
    const trophy = houseDisplay.trophies.find((entry) => entry.id === trophyId);
    if (houseDisplay.unlocked && trophy) {
      housePromptLine = `House proof updated: ${trophy.line}. ${trophy.planningLine}`;
    } else {
      housePromptLine = "House proof remembered: unlock your house to display this job's story trophy.";
    }
  }

  return {
    logLine: `Job paid: ${title}. ${rewardLine}${bonusLine ? ` ${bonusLine}` : ""}`,
    rewardLine,
    bonusLine,
    housePromptLine,
    trophyId,
  };
}
