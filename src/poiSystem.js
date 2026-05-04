// POIs (Points of Interest) — pure module.
//
// Each region exposes a small set of POIs (caches, shrines, camps).
// Discovery state lives in `state.regions.poisDiscovered` (array of ids).
// Proximity test is O(N_pois) per tick; tiny so brute force is fine.

export const POI_KINDS = {
  cache: { label: "Cache", radius: 1.6, color: "#d8bc6a" },
  shrine: { label: "Shrine", radius: 1.4, color: "#cdb8ff" },
  camp: { label: "Camp", radius: 1.8, color: "#f0adb4" },
};

// Hand-placed POI definitions. Coordinates assume the existing 60×60 world.
export const POI_DEFINITIONS = {
  frontier: [
    { id: "frontier_old_well", kind: "cache", x: 12.5, y: 22.5, label: "Old Well", loot: { gold: 35, items: { Potion: 1 } } },
    { id: "frontier_drifter_camp", kind: "camp", x: 30.5, y: 14.5, label: "Drifter Camp", loot: { gold: 18, items: { Wood: 2, Stone: 1 } } },
    { id: "frontier_chapel_shrine", kind: "shrine", x: 18.5, y: 36.5, label: "Frontier Chapel", buff: { hp: 8, stamina: 12 }, loot: { gold: 6 } },
  ],
  ashfall: [
    { id: "ashfall_scrap_pile", kind: "cache", x: 38.5, y: 28.5, label: "Scrap Pile", loot: { gold: 50, items: { "Scrap Coil": 1, Ashglass: 2 } } },
    { id: "ashfall_blacksmith_kiln", kind: "shrine", x: 32.5, y: 42.5, label: "Smolder Kiln", buff: { hp: 10, stamina: 0 }, loot: { gold: 12 } },
    { id: "ashfall_outlaw_camp", kind: "camp", x: 44.5, y: 22.5, label: "Outlaw Camp", loot: { gold: 28, items: { Potion: 1, "Heat Resin": 1 } } },
  ],
  ironlantern: [
    { id: "lantern_archive_drop", kind: "cache", x: 14.5, y: 30.5, label: "Archive Drop", loot: { gold: 64, items: { "Cipher Lens": 1, "Lantern Filament": 1 } } },
    { id: "lantern_overseer_shrine", kind: "shrine", x: 8.5, y: 42.5, label: "Overseer's Vigil", buff: { hp: 12, stamina: 18 }, loot: { gold: 16 } },
    { id: "lantern_chanter_camp", kind: "camp", x: 20.5, y: 24.5, label: "Chanter Camp", loot: { gold: 32, items: { "Pressurized Ink": 1 } } },
  ],
};

export function getPOIsForRegion(regionId) {
  return POI_DEFINITIONS[regionId] || [];
}

export function ensurePoiDefaults(regions) {
  if (!regions || typeof regions !== "object") return;
  if (!Array.isArray(regions.poisDiscovered)) {
    regions.poisDiscovered = [];
  }
}

export function isPOIDiscovered(regions, poiId) {
  if (!regions || !Array.isArray(regions.poisDiscovered)) return false;
  return regions.poisDiscovered.includes(poiId);
}

export function markPOIDiscovered(regions, poiId) {
  if (!regions) return false;
  ensurePoiDefaults(regions);
  if (regions.poisDiscovered.includes(poiId)) return false;
  regions.poisDiscovered.push(poiId);
  return true;
}

// Returns POIs within `pingRadius` of (x,y) for HUD ping rendering.
// Excludes already-discovered POIs.
export function findNearbyPOIs(regions, regionId, x, y, pingRadius = 4) {
  const list = getPOIsForRegion(regionId);
  if (list.length === 0) return [];
  const r2 = pingRadius * pingRadius;
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const poi = list[i];
    if (isPOIDiscovered(regions, poi.id)) continue;
    const dx = poi.x - x;
    const dy = poi.y - y;
    if (dx * dx + dy * dy <= r2) out.push(poi);
  }
  return out;
}

// Returns the POI under interaction range, if any. The host is responsible
// for driving the actual loot/buff application from the returned record.
export function poiUnderInteraction(regions, regionId, x, y) {
  const list = getPOIsForRegion(regionId);
  for (let i = 0; i < list.length; i++) {
    const poi = list[i];
    if (isPOIDiscovered(regions, poi.id)) continue;
    const kind = POI_KINDS[poi.kind] || { radius: 1.4 };
    const dx = poi.x - x;
    const dy = poi.y - y;
    const r = kind.radius;
    if (dx * dx + dy * dy <= r * r) return poi;
  }
  return null;
}

function directionLabel(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < ay * 0.45) return dy >= 0 ? "south" : "north";
  if (ay < ax * 0.45) return dx >= 0 ? "east" : "west";
  if (dx >= 0 && dy >= 0) return "southeast";
  if (dx < 0 && dy >= 0) return "southwest";
  if (dx >= 0 && dy < 0) return "northeast";
  return "northwest";
}

function rewardHintForPOI(poi) {
  const pieces = [];
  if (poi.loot?.gold) pieces.push(`${poi.loot.gold}g`);
  if (poi.loot?.items) {
    for (const [name, count] of Object.entries(poi.loot.items)) {
      pieces.push(`${count} ${name}`);
    }
  }
  if (poi.buff?.hp) pieces.push(`${poi.buff.hp} HP`);
  if (poi.buff?.stamina) pieces.push(`${poi.buff.stamina} stamina`);
  return pieces.length > 0 ? pieces.join(", ") : "regional clue";
}

export function resolvePOILead(regions, regionId, x, y, options = {}) {
  const maxDistance = Number.isFinite(options.maxDistance) ? Math.max(0, options.maxDistance) : Infinity;
  const list = getPOIsForRegion(regionId);
  let best = null;
  let bestDistance = Infinity;

  for (const poi of list) {
    if (isPOIDiscovered(regions, poi.id)) continue;
    const dx = poi.x - x;
    const dy = poi.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance > maxDistance || distance >= bestDistance) continue;
    best = { poi, dx, dy };
    bestDistance = distance;
  }

  if (!best) return null;
  const kind = POI_KINDS[best.poi.kind] || POI_KINDS.cache;
  const direction = directionLabel(best.dx, best.dy);
  const distance = Number(bestDistance.toFixed(1));
  const rewardHint = rewardHintForPOI(best.poi);
  return {
    id: best.poi.id,
    title: "Explore",
    kind: best.poi.kind,
    kindLabel: kind.label,
    label: best.poi.label,
    x: best.poi.x,
    y: best.poi.y,
    direction,
    distance,
    color: kind.color,
    urgency: distance <= 8 ? "high" : "soft",
    rewardHint,
    line: `${best.poi.label} ${kind.label.toLowerCase()} lies ${direction}, about ${distance} tiles away. Reward hint: ${rewardHint}.`,
  };
}
