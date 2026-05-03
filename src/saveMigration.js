import { createInitialNarrativeState } from "./decisionEngine.js";
import { createInitialQuestState } from "./questDefinitions.js";
import { createInitialProgressionState } from "./progressionSystem.js";
import { createInitialRegionState } from "./regionSystem.js";
import { createInitialGraphicsState } from "./graphicsSettings.js";
import { ensureRunStats } from "./runSummary.js";
import { normalizeCharacterIdentity } from "./characterIdentity.js";
import { normalizeGearState } from "./gearCrafting.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeQuest(source, fallback) {
  if (!source) return fallback;
  return {
    ...fallback,
    status: typeof source.status === "string" ? source.status : fallback.status,
    progress: Number.isFinite(source.progress) ? source.progress : fallback.progress,
  };
}

function backfillRegionDefaults(regions) {
  const defaults = createInitialRegionState();
  if (!regions) return clone(defaults);
  const next = clone(regions);
  if (!next.miniBosses || typeof next.miniBosses !== "object") {
    next.miniBosses = clone(defaults.miniBosses);
  } else {
    for (const [bossId, def] of Object.entries(defaults.miniBosses)) {
      if (!next.miniBosses[bossId]) next.miniBosses[bossId] = clone(def);
    }
  }
  if (!Array.isArray(next.poisDiscovered)) {
    next.poisDiscovered = [];
  }
  return next;
}

function backfillEquipmentDefaults(equipment) {
  return normalizeGearState(equipment);
}

function backfillProgressionDefaults(progression) {
  const defaults = createInitialProgressionState();
  const next = progression && typeof progression === "object" ? clone(progression) : clone(defaults);
  next.upgradePoints = Number.isFinite(next.upgradePoints) ? Math.max(0, Math.floor(next.upgradePoints)) : defaults.upgradePoints;
  next.skillTree = next.skillTree && typeof next.skillTree === "object" ? next.skillTree : clone(defaults.skillTree);
  for (const branch of Object.keys(defaults.skillTree)) {
    next.skillTree[branch] = Number.isFinite(next.skillTree[branch])
      ? Math.max(0, Math.floor(next.skillTree[branch]))
      : defaults.skillTree[branch];
  }
  next.equipment = backfillEquipmentDefaults(next.equipment);
  next.identity = normalizeCharacterIdentity(next.identity);
  next.traits = Array.isArray(next.traits) ? next.traits.filter((trait) => typeof trait === "string") : [];
  return next;
}

function backfillWorldDefaults(world, now = 0) {
  const next = world && typeof world === "object" ? clone(world) : {};
  if (typeof next.timeOfDay !== "number" || !isFinite(next.timeOfDay)) {
    next.timeOfDay = 0.25;
  }
  if (typeof next.companionId !== "string") {
    next.companionId = null;
  }
  if (typeof next.companionHp !== "number" || !isFinite(next.companionHp)) {
    next.companionHp = null;
  }
  next.companionDowned = Boolean(next.companionDowned);
  if (typeof next.companionRecoveryTimer !== "number" || !isFinite(next.companionRecoveryTimer)) {
    next.companionRecoveryTimer = 0;
  }
  const holder = next.runStats && typeof next.runStats === "object"
    ? { runStats: next.runStats }
    : {};
  next.runStats = ensureRunStats(holder, now);
  return next;
}

export function migrateSaveToV3(save) {
  if (!save || typeof save !== "object") return null;
  if (save.version === 3) {
    save.regions = backfillRegionDefaults(save.regions);
    save.world = backfillWorldDefaults(save.world, Number.isFinite(save.time) ? save.time : 0);
    if (!save.player) save.player = {};
    save.player.equipment = backfillEquipmentDefaults(save.player.equipment);
    save.progression = backfillProgressionDefaults(save.progression);
    return save;
  }
  if (save.version !== 2 && save.version !== 1) return null;

  const questDefaults = createInitialQuestState();
  const graphicsDefaults = createInitialGraphicsState();
  const base = {
    version: 3,
    savedAt: Number.isFinite(save.savedAt) ? save.savedAt : Date.now(),
    time: Number.isFinite(save.time) ? save.time : 0,
    player: {
      ...(save.player || {}),
      upgradePoints: Number.isFinite(save.player?.upgradePoints) ? save.player.upgradePoints : 0,
      equipment: backfillEquipmentDefaults(save.player?.equipment),
      traits: clone(save.player?.traits || []),
      quickUtility: clone(save.player?.quickUtility || { active: "smoke", inventory: { smoke: 1, flare: 1, tonic: 1 } }),
    },
    inventory: clone(save.inventory || {}),
    quests: {
      crystal: normalizeQuest(save.quests?.crystal, questDefaults.crystal),
      slime: normalizeQuest(save.quests?.slime, questDefaults.slime),
      wood: normalizeQuest(save.quests?.wood, questDefaults.wood),
      archive: normalizeQuest(save.quests?.archive, questDefaults.archive),
      ashfall_intro: normalizeQuest(save.quests?.ashfall_intro, questDefaults.ashfall_intro),
      ashfall_boss: normalizeQuest(save.quests?.ashfall_boss, questDefaults.ashfall_boss),
      lantern_probe: normalizeQuest(save.quests?.lantern_probe, questDefaults.lantern_probe),
      lantern_revolt: normalizeQuest(save.quests?.lantern_revolt, questDefaults.lantern_revolt),
    },
    house: clone(save.house || {}),
    world: backfillWorldDefaults(save.world, Number.isFinite(save.time) ? save.time : 0),
    narrative: clone(save.narrative || createInitialNarrativeState()),
    showMap: typeof save.showMap === "boolean" ? save.showMap : true,
    progression: backfillProgressionDefaults(save.progression),
    regions: backfillRegionDefaults(save.regions),
    graphics: {
      ...clone(graphicsDefaults),
      ...(save.graphics || {}),
      accessibility: {
        ...clone(graphicsDefaults.accessibility),
        ...(save.graphics?.accessibility || {}),
      },
      performance: {
        ...clone(graphicsDefaults.performance),
        ...(save.graphics?.performance || {}),
      },
    },
  };

  if (save.version === 1) {
    base.narrative = createInitialNarrativeState();
  }
  return base;
}
