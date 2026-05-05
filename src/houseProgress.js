import { normalizeInventoryState } from "./inventoryState.js";

const STORY_TROPHIES = [
  {
    id: "deputy_badge",
    itemName: "Worn Badge",
    completedJobId: "frontier_badge_return",
    label: "Deputy Badge",
    carriedLine: "Worn Badge on the shelf",
    completedLine: "Deputy Badge returned, name plate polished",
    planningLine: "Boone trusts you with old-law work.",
    openLead: "Take Deputy Badge Return from Boone's board.",
    completedLead: "Deputy work is open with fewer whispers.",
    x: 6.25,
    y: 6.25,
    color: "#d8a84f",
  },
  {
    id: "road_map",
    itemName: "Map Scrap",
    completedJobId: "frontier_map_survey",
    label: "Road Map",
    carriedLine: "Map Scrap pinned above the bench",
    completedLine: "Old Road Survey pinned with fresh marks",
    planningLine: "The road board has one trusted route again.",
    openLead: "Take Old Road Survey from Boone's board.",
    completedLead: "A trusted route is marked for travelers.",
    x: 7.15,
    y: 6.25,
    color: "#9bd3ff",
  },
  {
    id: "sealed_note",
    itemName: "Sealed Note",
    completedJobId: "frontier_quiet_note_trace",
    label: "Sealed Note",
    carriedLine: "Sealed Note tucked under a tin weight",
    completedLine: "Quiet Note Trace filed beside Quill's copy",
    planningLine: "Quill's quiet routes are now part of Boone's margins.",
    openLead: "Take Quiet Note Trace from Boone's board.",
    completedLead: "Quill's quiet route is logged in the margins.",
    x: 8.05,
    y: 6.25,
    color: "#cdb8ff",
  },
  {
    id: "miner_helmet",
    itemName: "Miner Helmet",
    completedJobId: "ashfall_miner_helmet_salvage",
    label: "Miner Helmet",
    carriedLine: "Miner Helmet hanging by the stash",
    completedLine: "Helmet-Lamp Salvage claim tagged in slag chalk",
    planningLine: "Ashfall crews have one workable shaft because of you.",
    openLead: "Take Helmet-Lamp Salvage from the Ashfall board.",
    completedLead: "Ashfall crews have one workable shaft again.",
    x: 12.25,
    y: 4.1,
    color: "#ff9f5f",
  },
];

function completedSet(jobState = {}) {
  return new Set(Array.isArray(jobState.completedJobIds) ? jobState.completedJobIds.filter((id) => typeof id === "string") : []);
}

export function resolveHouseProgressDisplay({ inventory = {}, jobState = {}, house = {} } = {}) {
  const normalizedInventory = normalizeInventoryState(inventory);
  const completed = completedSet(jobState);
  const unlocked = Boolean(house?.unlocked);
  const trophies = unlocked ? STORY_TROPHIES
    .map((trophy) => {
      const hasItem = (normalizedInventory[trophy.itemName] || 0) > 0;
      const completedJob = trophy.completedJobId ? completed.has(trophy.completedJobId) : false;
      if (!hasItem && !completedJob) return null;
      return {
        id: trophy.id,
        itemName: trophy.itemName,
        completedJobId: trophy.completedJobId,
        label: trophy.label,
        status: completedJob ? "completed" : "carried",
        line: completedJob ? trophy.completedLine : trophy.carriedLine,
        planningLine: trophy.planningLine,
        leadLine: completedJob ? trophy.completedLead : trophy.openLead,
        x: trophy.x,
        y: trophy.y,
        color: trophy.color,
      };
    })
    .filter(Boolean) : [];
  const planningCards = trophies.map((trophy) => ({
    id: trophy.id,
    label: trophy.label,
    status: trophy.status,
    line: trophy.leadLine,
  }));
  const trophyLine = trophies.length
    ? trophies.map((trophy) => trophy.line).join(" / ")
    : unlocked
      ? "No trophies yet"
      : "House locked";
  const openLead = planningCards.find((card) => card.status === "carried");
  const planningLine = openLead
    ? openLead.line
    : planningCards.length
      ? planningCards[0].line
    : unlocked
      ? "Bring story loot home to turn finds into plans."
      : "Unlock the house to display story finds.";
  return {
    unlocked,
    trophies,
    planningCards,
    trophyLine,
    planningLine,
    trophyCount: trophies.length,
  };
}

export function resolveHouseTrophyInspection({ player = {}, inventory = {}, jobState = {}, house = {}, maxDistance = 1.35 } = {}) {
  const display = resolveHouseProgressDisplay({ inventory, jobState, house });
  let nearest = null;
  let nearestDistance = Infinity;
  for (const trophy of display.trophies) {
    const distance = Math.hypot((trophy.x || 0) - (player.x || 0), (trophy.y || 0) - (player.y || 0));
    if (distance <= maxDistance && distance < nearestDistance) {
      nearest = trophy;
      nearestDistance = distance;
    }
  }
  if (!nearest) return null;
  return {
    ...nearest,
    distance: Number(nearestDistance.toFixed(2)),
    message: `${nearest.label}: ${nearest.line}. ${nearest.planningLine}`,
  };
}
