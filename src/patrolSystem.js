// Patrol system. Civic Council patrols suppress hostile density when allied;
// hostile-rep patrols turn on the player. Produces patrol entity descriptors
// that main.js can spawn as friendly or hostile NPCs.

export const PATROL_FACTION = {
  frontier:    "civicCouncil",
  ashfall:     "workersGuild",
  ironlantern: "marketCartel",
};

export const PATROL_DEFS = {
  civicCouncil: {
    label:       "Council Patrol",
    alliedBehavior: "suppress_hostiles",
    hostileBehavior: "engage_player",
    alliedThreshold:  20,
    hostileThreshold: -20,
    spawnColor: "#6fa8dc",
    suppressRadiusTiles: 6,
  },
  workersGuild: {
    label:       "Guild Crew",
    alliedBehavior: "suppress_hostiles",
    hostileBehavior: "engage_player",
    alliedThreshold:  15,
    hostileThreshold: -15,
    spawnColor: "#c87941",
    suppressRadiusTiles: 4,
  },
  marketCartel: {
    label:       "Cartel Enforcer",
    alliedBehavior: "suppress_hostiles",
    hostileBehavior: "engage_player",
    alliedThreshold:  25,
    hostileThreshold: -25,
    spawnColor: "#a060b8",
    suppressRadiusTiles: 5,
  },
};

// Returns the patrol stance for a region given current faction rep.
// "allied" — patrols suppress nearby hostiles
// "neutral" — patrols are present but passive
// "hostile" — patrols engage the player
export function resolvePatrolStance(regionId, factionRep = {}) {
  const factionId = PATROL_FACTION[regionId] || "civicCouncil";
  const def = PATROL_DEFS[factionId];
  const rep = typeof factionRep[factionId] === "number" ? factionRep[factionId] : 0;
  if (rep >= def.alliedThreshold) return "allied";
  if (rep <= def.hostileThreshold) return "hostile";
  return "neutral";
}

// Returns patrol descriptor used for HUD, minimap, and spawn logic.
export function resolvePatrolDescriptor(regionId, factionRep = {}) {
  const factionId = PATROL_FACTION[regionId] || "civicCouncil";
  const def = PATROL_DEFS[factionId];
  const stance = resolvePatrolStance(regionId, factionRep);
  return {
    factionId,
    label: def.label,
    stance,
    color: def.spawnColor,
    suppressRadiusTiles: stance === "allied" ? def.suppressRadiusTiles : 0,
    engagesPlayer: stance === "hostile",
  };
}

// Returns the hostile spawn density multiplier from patrol suppression.
// Allied patrols reduce hostile encounters; hostile patrols increase them.
export function resolvePatrolDensityMult(regionId, factionRep = {}) {
  const stance = resolvePatrolStance(regionId, factionRep);
  if (stance === "allied") return 0.65;
  if (stance === "hostile") return 1.3;
  return 1.0;
}
