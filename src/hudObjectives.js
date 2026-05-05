function questProgressLine(quest, labels = {}, inventory = {}) {
  if (!quest) return "";
  if (quest.status === "locked") return labels.locked || "Locked";
  if (quest.status === "turned_in") return labels.done || "Done";
  const turnIn = quest.status === "complete" ? ` ${labels.turnIn || "Turn in"}` : "";
  if (quest.needWood || quest.needStone) {
    const wood = Math.min(quest.needWood || 0, inventory.Wood || 0);
    const stone = Math.min(quest.needStone || 0, inventory.Stone || 0);
    return `${wood}/${quest.needWood || 0}W ${stone}/${quest.needStone || 0}S${turnIn}`;
  }
  return `${quest.progress || 0}/${quest.need || 0}${turnIn}`;
}

export function buildQuestHudLines(options = {}) {
  const quests = options.quests || {};
  const inventory = options.inventory || {};
  const labels = options.labels || {};
  const activeJob = options.activeJob || null;
  const ordered = [
    quests.crystal,
    quests.slime,
    quests.wood,
    quests.archive,
    quests.ashfall_intro,
    quests.ashfall_boss,
    quests.lantern_probe,
    quests.lantern_revolt,
  ];
  const lines = ordered
    .filter(Boolean)
    .map((quest) => `${quest.title}: ${questProgressLine(quest, labels, inventory)}`);

  if (activeJob) {
    lines.splice(3, 0, `Job: ${activeJob.title}: ${activeJob.status === "ready" ? `Return to ${activeJob.npcName}` : activeJob.progressLine}`);
  }

  return lines;
}

export function buildJobObjective(options = {}) {
  const activeJob = options.activeJob || null;
  if (!activeJob) return null;
  const jobMarker = options.jobMarker || null;
  const distanceSuffix = jobMarker?.distanceLine ? ` (${jobMarker.distanceLine})` : "";
  if (activeJob.status === "ready") {
    return {
      title: "Job ready",
      line: `Return to ${activeJob.npcName} for ${activeJob.rewardLine}${distanceSuffix}`,
      urgency: "high",
    };
  }
  if (activeJob.status === "failed") {
    return {
      title: "Job failed",
      line: `Report to ${activeJob.npcName}: ${activeJob.progressLine}${distanceSuffix}`,
      urgency: "high",
    };
  }

  const fallbackParts = [];
  if (jobMarker?.regionHint) fallbackParts.push(jobMarker.regionHint);
  fallbackParts.push(activeJob.progressLine);
  if (jobMarker?.checkpointIndex) fallbackParts.push(`${jobMarker.checkpointIndex}/${jobMarker.checkpointTotal}`);
  if (jobMarker?.distanceLine) fallbackParts.push(jobMarker.distanceLine);
  return {
    title: "Job route",
    line: `${activeJob.title}: ${jobMarker?.objectiveLine || fallbackParts.filter(Boolean).join(" • ")}`,
    urgency: "medium",
  };
}

export function resolveLiveObjectiveLine(objective = null) {
  return objective?.objectiveLine || objective?.line || "";
}

export function selectLiveObjective(candidates = []) {
  return candidates.find(Boolean) || null;
}
