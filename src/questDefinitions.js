export const QUEST_DEFINITIONS = {
  crystal: {
    id: "crystal",
    title: "1) Valley Survey",
    type: "collect",
    item: "Crystal Shard",
    need: 4,
    reward: { xp: 60, gold: 25 },
    branchTag: "truthVsComfort",
  },
  slime: {
    id: "slime",
    title: "2) Marsh Cleansing",
    type: "defeat",
    enemyType: "slime",
    need: 3,
    reward: { xp: 75, gold: 35, potion: 1 },
    branchTag: "controlVsFreedom",
  },
  wood: {
    id: "wood",
    title: "3) Raise Your House",
    type: "build",
    need: 10,
    needWood: 6,
    needStone: 4,
    reward: { xp: 95, gold: 60 },
    branchTag: "solidarityVsStatus",
  },
  archive: {
    id: "archive",
    title: "4) The Redacted Archive",
    type: "story",
    need: 4,
    reward: { xp: 120, gold: 80 },
    branchTag: "truthVsComfort",
  },
};

export function createInitialQuestState() {
  const out = {};
  for (const definition of Object.values(QUEST_DEFINITIONS)) {
    out[definition.id] = {
      title: definition.title,
      status: definition.id === "crystal" ? "active" : "locked",
      need: definition.need,
      progress: 0,
      needWood: definition.needWood || 0,
      needStone: definition.needStone || 0,
      reward: { ...definition.reward },
      branchTag: definition.branchTag,
    };
  }
  return out;
}

export function updateQuestProgressFromInventoryDataDriven(quests, inventory) {
  const updates = [];
  const crystal = quests.crystal;
  if (crystal && crystal.status === "active") {
    const next = Math.min(crystal.need, inventory["Crystal Shard"] || 0);
    if (next !== crystal.progress) crystal.progress = next;
    if (crystal.progress >= crystal.need) {
      crystal.status = "complete";
      updates.push("Quest complete objective: Valley Survey ready to turn in.");
    }
  }

  const house = quests.wood;
  if (house && (house.status === "active" || house.status === "complete")) {
    const woodPart = Math.min(house.needWood, inventory.Wood || 0);
    const stonePart = Math.min(house.needStone, inventory.Stone || 0);
    const hasAll = woodPart >= house.needWood && stonePart >= house.needStone;
    const wasComplete = house.status === "complete";
    house.progress = woodPart + stonePart;
    if (hasAll && house.status === "active") {
      house.status = "complete";
      updates.push("Quest complete objective: Raise Your House ready to turn in.");
    } else if (!hasAll && wasComplete) {
      house.status = "active";
      updates.push("House materials were used elsewhere. Gather more to finish construction.");
    }
  }

  return updates;
}
