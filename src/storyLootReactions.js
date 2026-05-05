import { normalizeInventoryState } from "./inventoryState.js";

const STORY_LOOT_REACTIONS = [
  {
    itemName: "Worn Badge",
    priority: 100,
    npcLines: {
      warden: "Marshal Boone: That badge did not walk out there by itself. Keep it visible and old deputies will start remembering names.",
      elder: "Mayor Clem: A worn badge is never just metal. It is a receipt for who got protected and who did not.",
    },
    boardLine: "The worn badge has Boone reopening deputy work that was too quiet on the old board.",
    regions: ["frontier", "ironlantern"],
  },
  {
    itemName: "Map Scrap",
    priority: 80,
    npcLines: {
      elder: "Mayor Clem: That map scrap proves the old roads still have a memory. Bring me enough pieces and we can argue with the official maps.",
      warden: "Marshal Boone: That map scrap gives my road jobs sharper teeth. It marks where trouble waits, not where reports pretend it waits.",
    },
    boardLine: "Your map scrap lets Boone mark road work with better routes and fewer blind corners.",
    regions: ["frontier", "ashfall", "ironlantern"],
  },
  {
    itemName: "Sealed Note",
    priority: 70,
    npcLines: {
      merchant: "Reverend Quill: A sealed note is a locked market. The question is whether you sell the lock or the key.",
      elder: "Mayor Clem: Keep that sealed note dry. Paper survives longer than courage around here.",
    },
    boardLine: "The sealed note has the board carrying quieter courier work.",
    regions: ["frontier"],
  },
  {
    itemName: "Miner Helmet",
    priority: 60,
    npcLines: {
      smith: "Professor Cogwheel: That miner helmet is ugly, useful, and honest. Three traits most tools never manage at once.",
      warden: "Marshal Boone: Helmet like that means someone went into a mine and either came out changed or did not come out.",
    },
    boardLine: "The miner helmet has Ashfall crews posting deeper salvage work.",
    regions: ["ashfall"],
  },
];

function relevantReactions(inventory) {
  const normalized = normalizeInventoryState(inventory);
  return STORY_LOOT_REACTIONS
    .filter((reaction) => (normalized[reaction.itemName] || 0) > 0)
    .sort((a, b) => b.priority - a.priority || a.itemName.localeCompare(b.itemName));
}

export function resolveStoryLootNpcReaction(npcId, inventory = {}) {
  if (typeof npcId !== "string") return null;
  const reaction = relevantReactions(inventory).find((entry) => entry.npcLines[npcId]);
  if (!reaction) return null;
  return {
    itemName: reaction.itemName,
    npcId,
    priority: reaction.priority,
    line: reaction.npcLines[npcId],
  };
}

export function resolveStoryLootBoardReaction(inventory = {}, regionId = "frontier") {
  const reaction = relevantReactions(inventory).find((entry) => entry.regions.includes(regionId));
  if (!reaction) return null;
  return {
    itemName: reaction.itemName,
    regionId,
    priority: reaction.priority,
    line: reaction.boardLine,
  };
}
