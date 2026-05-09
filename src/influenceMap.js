// Faction influence maps. Each faction's rep score (-100..100) blends into a
// per-region influence value that modulates spawn density and route tinting.
//
// The map is intentionally low-tech: no spatial grid needed at this scale.
// Instead, we compute a simple blend coefficient per faction per region and
// expose helpers that consumers (spawn density, UI) can call cheaply.

const FACTIONS = ["civicCouncil", "workersGuild", "marketCartel"];

// Base influence weight per faction per region. Values are design constants —
// each faction has presence in certain regions. Range 0..1.
const REGION_FACTION_WEIGHT = {
  frontier: { civicCouncil: 0.6, workersGuild: 0.3, marketCartel: 0.1 },
  ashfall:  { civicCouncil: 0.2, workersGuild: 0.7, marketCartel: 0.1 },
  ironlantern: { civicCouncil: 0.1, workersGuild: 0.3, marketCartel: 0.6 },
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// Convert a rep score (-100..100) to a 0..1 influence coefficient.
// Negative rep → low influence (hostile/absent), positive → high influence.
function repToInfluence(rep) {
  return clamp01((rep + 100) / 200);
}

// Returns a blend coefficient [0..1] for each faction in the given region,
// scaled by both base regional weight and current rep.
export function resolveRegionInfluence(regionId, factionRep = {}) {
  const weights = REGION_FACTION_WEIGHT[regionId] || REGION_FACTION_WEIGHT.frontier;
  const result = {};
  for (const faction of FACTIONS) {
    const rep = typeof factionRep[faction] === "number" ? factionRep[faction] : 0;
    result[faction] = clamp01(weights[faction] * repToInfluence(rep));
  }
  return result;
}

// Spawn density multiplier for a region given current faction influence.
// High civic-council rep → more patrols (denser friendly spawn suppression of hostiles).
// High workers-guild rep → less hostile density in Ashfall (guild keeps areas safer).
// High market-cartel rep → more cartel-aligned encounters in Iron Lantern.
// Returns a multiplier in [0.5..1.5] applied to hostile spawn density.
export function resolveInfluenceSpawnMult(regionId, factionRep = {}) {
  const influence = resolveRegionInfluence(regionId, factionRep);

  if (regionId === "frontier") {
    // Civic council patrols suppress hostile density
    return clamp01(1.0 - influence.civicCouncil * 0.4 + influence.marketCartel * 0.2);
  }
  if (regionId === "ashfall") {
    // Workers guild controls Ashfall — high rep means fewer hostile encounters
    return clamp01(1.0 - influence.workersGuild * 0.35 + influence.civicCouncil * 0.15);
  }
  if (regionId === "ironlantern") {
    // Cartel dominance makes Iron Lantern more dangerous when allied
    return clamp01(1.0 + influence.marketCartel * 0.3 - influence.civicCouncil * 0.2);
  }
  return 1.0;
}

// Route tint color derived from the dominant faction in a region.
// Returns an rgba string for overlaying on road markers.
export function resolveInfluenceRouteTint(regionId, factionRep = {}) {
  const influence = resolveRegionInfluence(regionId, factionRep);
  let dominant = "civicCouncil";
  let maxVal = -Infinity;
  for (const [faction, val] of Object.entries(influence)) {
    if (val > maxVal) { maxVal = val; dominant = faction; }
  }
  const alpha = clamp01(maxVal * 0.45).toFixed(2);
  if (dominant === "civicCouncil") return `rgba(100, 160, 220, ${alpha})`;
  if (dominant === "workersGuild") return `rgba(180, 130, 60, ${alpha})`;
  if (dominant === "marketCartel") return `rgba(160, 90, 160, ${alpha})`;
  return `rgba(128, 128, 128, ${alpha})`;
}
