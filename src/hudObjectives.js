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

function cleanObjectivePart(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function capitalizeObjective(value) {
  const text = cleanObjectivePart(value);
  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function stripObjectivePrefix(value) {
  return cleanObjectivePart(value).replace(/^(mission|fight|threat|next step|opening route|job route|job ready):\s*/i, "");
}

function splitObjectiveParts(value) {
  return cleanObjectivePart(value)
    .split(/\s+•\s+/)
    .map(cleanObjectivePart)
    .filter(Boolean);
}

function pushUniqueMeta(meta, value) {
  const text = cleanObjectivePart(value).replace(/\.$/, "");
  if (text && !meta.includes(text)) meta.push(text);
}

function collectLineMeta(parts = []) {
  const meta = [];
  for (const part of parts) {
    const distanceAction = part.match(/^(\d+\s*m)\.?\s*(Press\s+.+)$/i);
    if (distanceAction) {
      pushUniqueMeta(meta, distanceAction[1]);
      pushUniqueMeta(meta, distanceAction[2]);
    } else if (/^\+/.test(part)) {
      pushUniqueMeta(meta, `Reward ${part}`);
    } else {
      pushUniqueMeta(meta, part);
    }
  }
  return meta;
}

function splitSecondaryParts(value) {
  return cleanObjectivePart(value)
    .split(/\s*\|\s*/)
    .map(cleanObjectivePart)
    .filter(Boolean);
}

function collectThreatMeta(secondaryParts = []) {
  const meta = [];
  for (const part of secondaryParts) {
    if (!/^Threat:/i.test(part)) continue;
    const threat = stripObjectivePrefix(part).replace(/^Fight:\s*/i, "").split(/\s+•\s+/)[0];
    pushUniqueMeta(meta, `Threat ${threat}`);
  }
  return meta;
}

function selectDisplaySecondary(objective = {}, secondaryParts = []) {
  if (objective.displaySecondary) return cleanObjectivePart(objective.displaySecondary);
  const reason = secondaryParts.find((part) => (
    !/^Threat:/i.test(part)
    && !/^\+/.test(part)
    && !/^\d+\s*m/i.test(part)
    && !/Job Board/i.test(part)
  ));
  if (reason) return reason;
  if (objective.payoffLine) return cleanObjectivePart(objective.payoffLine);
  return secondaryParts.find((part) => !/^Threat:/i.test(part)) || "";
}

export function buildObjectiveDisplay(objective = null) {
  if (!objective) return null;
  const rawLine = resolveLiveObjectiveLine(objective);
  if (!rawLine) return null;

  const parts = splitObjectiveParts(rawLine);
  const firstPart = parts[0] || rawLine;
  const linePrefix = cleanObjectivePart(firstPart).match(/^([^:]{2,24}):\s*/);
  const displayTitle = cleanObjectivePart(objective.displayTitle)
    || (linePrefix && /^Mission$/i.test(linePrefix[1]) ? "Mission" : "")
    || (linePrefix && /^Fight$/i.test(linePrefix[1]) ? "Threat" : "")
    || cleanObjectivePart(objective.title)
    || "Objective";
  const displayPrimary = capitalizeObjective(stripObjectivePrefix(firstPart));
  const secondaryParts = splitSecondaryParts(objective.secondaryLine);
  const displayMeta = [
    ...collectLineMeta(parts.slice(1)),
    ...collectThreatMeta(secondaryParts),
  ].slice(0, 4);
  const displaySecondary = selectDisplaySecondary(objective, secondaryParts);

  return {
    displayTitle,
    displayPrimary,
    displayMeta,
    displaySecondary,
  };
}

export function resolveHudChromeMode(options = {}) {
  if (options.mode !== "playing") return "standard";
  if (options.inHouse || options.hasModalOpen) return "standard";
  if (Math.max(0, Number(options.time) || 0) > 90) return "standard";
  if (options.hasOpeningProgress) return "standard";
  return "first-minute-low-chrome";
}

export function selectLiveObjective(candidates = []) {
  return candidates.find(Boolean) || null;
}
