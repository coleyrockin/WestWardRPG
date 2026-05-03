export function createInitialRunStats(startedAt = 0) {
  return {
    startedAt,
    endedAt: null,
    victory: false,
    endingId: null,
    kills: 0,
    miniBossKills: 0,
    resourcesHarvested: 0,
    questOutcomesCount: 0,
  };
}

export function ensureRunStats(world, now = 0) {
  if (!world || typeof world !== "object") return createInitialRunStats(now);
  const source = world.runStats && typeof world.runStats === "object" ? world.runStats : world;
  const stats = {
    ...createInitialRunStats(now),
    ...source,
  };
  stats.startedAt = Number.isFinite(stats.startedAt) ? stats.startedAt : now;
  stats.endedAt = Number.isFinite(stats.endedAt) ? stats.endedAt : null;
  stats.kills = Math.max(0, Math.floor(stats.kills || 0));
  stats.miniBossKills = Math.max(0, Math.floor(stats.miniBossKills || 0));
  stats.resourcesHarvested = Math.max(0, Math.floor(stats.resourcesHarvested || 0));
  stats.questOutcomesCount = Math.max(0, Math.floor(stats.questOutcomesCount || 0));
  stats.victory = Boolean(stats.victory);
  stats.endingId = typeof stats.endingId === "string" ? stats.endingId : null;
  world.runStats = stats;
  return stats;
}

export function recordRunKill(world, enemy = {}) {
  const stats = ensureRunStats(world);
  stats.kills += 1;
  if (enemy.miniBossId) stats.miniBossKills += 1;
  return stats;
}

export function recordResourceHarvest(world) {
  const stats = ensureRunStats(world);
  stats.resourcesHarvested += 1;
  return stats;
}

export function syncQuestOutcomeCount(world, narrative) {
  const stats = ensureRunStats(world);
  stats.questOutcomesCount = Object.keys(narrative?.questOutcomes || {}).length;
  return stats;
}

export function completeVictoryRun(world, narrative, ending, now = 0) {
  const stats = syncQuestOutcomeCount(world, narrative);
  stats.victory = true;
  stats.endedAt = now;
  stats.endingId = ending?.id || null;
  return stats;
}

export function formatRunDuration(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remain = safe % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

export function buildRunSummary(world, narrative, player, companion, now = 0) {
  const stats = syncQuestOutcomeCount(world, narrative);
  const endedAt = Number.isFinite(stats.endedAt) ? stats.endedAt : now;
  const duration = Math.max(0, endedAt - stats.startedAt);
  return {
    victory: stats.victory,
    endingId: stats.endingId || narrative?.ending?.id || null,
    durationSeconds: Math.floor(duration),
    durationLabel: formatRunDuration(duration),
    kills: stats.kills,
    miniBossKills: stats.miniBossKills,
    resourcesHarvested: stats.resourcesHarvested,
    questOutcomesCount: stats.questOutcomesCount,
    deaths: Math.max(0, Math.floor(player?.deaths || 0)),
    level: Math.max(1, Math.floor(player?.level || 1)),
    gold: Math.max(0, Math.floor(player?.gold || 0)),
    axes: { ...(narrative?.thematicAxes || {}) },
    latestDecisions: [...(narrative?.decisions || [])].slice(-3).map((entry) => entry.log || entry.prompt || entry.id),
    companion: companion?.active
      ? `${companion.name} active (${Math.max(0, Math.round(companion.hp || 0))} HP)`
      : companion?.downed
        ? `${companion.name} recovering`
        : "No active companion",
  };
}
