// Drives the free-roam discovery loop off the rider's world position.
//
// Each frame the host calls resolveDiscovery with the player's (x, y=worldZ).
// If a not-yet-discovered POI is within its kind radius, it is marked discovered
// and a render-ready event is returned (authored lore line, loot/buff, milestone
// renown). Returns null when nothing fresh is in range. Pure wrapper over
// poiSystem — no Three, node-testable.

import {
  poiUnderInteraction,
  markPOIDiscovered,
  resolveExplorationRenownReward,
} from "../poiSystem.js";

export function resolveDiscovery(regions, regionId, x, y) {
  if (!regions) return null;
  const poi = poiUnderInteraction(regions, regionId, x, y);
  if (!poi) return null;

  const isNew = markPOIDiscovered(regions, poi.id);
  if (!isNew) return null; // already discovered — nothing to surface

  const discoveredCount = regions.poisDiscovered.length;
  return {
    id: poi.id,
    kind: poi.kind,
    label: poi.label,
    loot: poi.loot || null,
    buff: poi.buff || null,
    loreHint: poi.loreHint || null,
    // Prefer the atmospheric mystery line; fall back to the lore hint, then a default.
    line: poi.mysteryLine || poi.loreHint || `${poi.label}: a place worth knowing.`,
    renown: resolveExplorationRenownReward(discoveredCount),
  };
}
