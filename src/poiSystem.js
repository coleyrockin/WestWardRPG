// POIs (Points of Interest) — pure module.
//
// Each region exposes a small set of POIs (caches, shrines, camps, and road hooks).
// Discovery state lives in `state.regions.poisDiscovered` (array of ids).
// Proximity test is O(N_pois) per tick; tiny so brute force is fine.

export const POI_KINDS = {
  cache: { label: "Cache", radius: 1.6, color: "#d8bc6a" },
  shrine: { label: "Shrine", radius: 1.4, color: "#cdb8ff" },
  camp: { label: "Camp", radius: 1.8, color: "#f0adb4" },
  wagon: { label: "Wagon", radius: 1.55, color: "#d89f62" },
  mine: { label: "Mine", radius: 1.7, color: "#b8a77a" },
  ruin: { label: "Ruin", radius: 1.6, color: "#aeb7c4" },
  hideout: { label: "Hideout", radius: 1.8, color: "#d88f62" },
  stranger: { label: "Stranger", radius: 1.5, color: "#90d0bd" },
};

// Hand-placed POI definitions. Coordinates assume the existing 60×60 world.
export const POI_DEFINITIONS = {
  frontier: [
    {
      id: "frontier_broken_wagon",
      kind: "wagon",
      roadside: true,
      x: 13.5,
      y: 10.5,
      label: "Broken Wagon",
      loot: { gold: 8, items: { Wood: 1, "Map Scrap": 1 } },
      rollLoot: false,
      regionHint: "Westward Frontier marshal road",
      roadHook: "a slime-scarred wagon with cut cargo straps in the wheel ruts east of Boone",
      dangerHint: "Low danger: close to town, but green slime burns mark the road edge.",
      mysteryLine: "The cargo straps were cut from the inside.",
      returnReason: "The map scrap can open Boone's road survey work.",
      loreHint: "Tally Men script, half-burned. Even out here, the marker finds you.",
    },
    {
      id: "frontier_wayside_shrine",
      kind: "shrine",
      roadside: true,
      x: 15.5,
      y: 12.5,
      label: "Wayside Shrine",
      buff: { stamina: 10 },
      loot: { gold: 5 },
      rollLoot: false,
      regionHint: "Westward Frontier south fork",
      roadHook: "a thumb-high lantern shrine tucked under a fence rail",
      dangerHint: "Low danger: a safe breath before the south road opens up.",
      mysteryLine: "The candle is fresh, but the wax runs uphill.",
      returnReason: "A quick stamina blessing makes early patrol and courier work less punishing.",
      loreHint: "Circuit Riders keep these lit — part church, part relay tower for the debt the Severance left behind.",
    },
    {
      id: "frontier_abandoned_lunchfire",
      kind: "camp",
      roadside: true,
      x: 8.5,
      y: 13.5,
      label: "Abandoned Lunchfire",
      loot: { gold: 4, items: { Potion: 1, Wood: 1 } },
      rollLoot: false,
      regionHint: "Westward Frontier ranch road",
      roadHook: "a lunchfire still smoking beside a ranch-side trail",
      dangerHint: "Medium danger: whoever left ran before finishing supper.",
      mysteryLine: "Three cups sit out. One is still warm.",
      returnReason: "A free potion is the first hint that roads can fund survival.",
    },
    {
      id: "frontier_old_well",
      kind: "cache",
      x: 12.5,
      y: 22.5,
      label: "Old Well",
      loot: { gold: 35, items: { Potion: 1 } },
      regionHint: "Westward Frontier road",
      roadHook: "a cracked well sign leaning past Boone's south road",
      dangerHint: "Low danger: old boards, thirsty slimes, and one useful cache.",
      mysteryLine: "The bucket rope is wet even when the desert wind is dry.",
      returnReason: "Good first stop for potion money and a water-rights clue.",
      loreHint: "Before the Severance this well fed the first Cross claim — water was the only law that ever held out here.",
    },
    {
      id: "frontier_drifter_camp",
      kind: "camp",
      x: 30.5,
      y: 14.5,
      label: "Drifter Camp",
      loot: { gold: 18, items: { Wood: 2, Stone: 1 } },
      regionHint: "Westward Frontier north road",
      roadHook: "thin camp smoke behind a crooked fence line",
      dangerHint: "Medium danger: camp noise can pull scavengers off the road.",
      mysteryLine: "The bedrolls are warm, but no one answers Boone's name.",
      returnReason: "Wood and stone make this a practical early workbench detour.",
    },
    {
      id: "frontier_chapel_shrine",
      kind: "shrine",
      x: 18.5,
      y: 36.5,
      label: "Frontier Chapel",
      buff: { hp: 8, stamina: 12 },
      loot: { gold: 6 },
      regionHint: "Westward Frontier chapel road",
      roadHook: "a broken chapel bell catching the sun beyond the south fork",
      dangerHint: "Low danger: quiet ruins, useful rest, and open sight lines.",
      mysteryLine: "Someone keeps sweeping dust away from the altar.",
      returnReason: "The stamina blessing makes it worth revisiting before jobs.",
    },
    {
      id: "frontier_sunken_coach",
      kind: "ruin",
      x: 24.5,
      y: 20.5,
      label: "Sunken Coach Ruins",
      loot: { gold: 22, items: { "Map Scrap": 1, Wood: 1 } },
      regionHint: "Westward Frontier stage road",
      roadHook: "wagon ribs half-buried beside the old stage road",
      dangerHint: "Medium danger: broken cover, open angles, and scavenger tracks.",
      mysteryLine: "A marshal seal is carved into the coach door from the inside.",
      returnReason: "Map scraps can point future jobs toward better routes.",
      loreHint: "A drowned-valley relic, hauled up from the Caldera salt. They say the water there has a long memory.",
    },
    {
      id: "frontier_dry_gulch_hideout",
      kind: "hideout",
      x: 34.5,
      y: 31.5,
      label: "Dry Gulch Hideout",
      loot: { gold: 44, items: { "Worn Badge": 1, Potion: 1 } },
      regionHint: "Westward Frontier ridge road",
      roadHook: "fresh boot prints cutting away from the ridge road",
      dangerHint: "High danger: outlaw cover and poor retreat lanes.",
      mysteryLine: "The badge is Boone's style, but the scratches are newer.",
      returnReason: "A recovered badge should change what law-minded NPCs say later.",
      loreHint: "Helios-Pacific posts bounties on freeholders who never signed the charter — out here, a debt is just a leash with a longer rope.",
    },
    {
      id: "frontier_saltback_stranger",
      kind: "stranger",
      x: 40.5,
      y: 18.5,
      label: "Saltback Stranger",
      loot: { gold: 12, items: { "Sealed Note": 1 } },
      regionHint: "Westward Frontier east road",
      roadHook: "a lone figure waving beside a salt-white milepost",
      dangerHint: "Unknown danger: no weapon drawn, no tracks leading in.",
      mysteryLine: "The stranger knows which job you almost accepted.",
      returnReason: "The sealed note can become a non-combat rumor thread.",
    },
    // The Drift — badlands bounty country east of the wagon (treatment: dead
    // satellites, buried data vaults, feral ag-machines). Ride-to-discover beats
    // that pay off the empty open range. Coords match the DRIFT_BADLANDS props in
    // frontierLayout; all off the east road corridor + far from the dusk frame.
    {
      id: "drift_downed_satellite",
      kind: "ruin",
      x: 70.0,
      y: 19.5,
      label: "Downed Satellite",
      loot: { gold: 34, items: { "Scrap Coil": 1 } },
      mysteryLine: "Solar wings half-buried in the dust — and warm to the touch.",
      loreHint: "Pre-Severance comms array. Someone pried the data core out years ago.",
    },
    {
      id: "drift_sealed_vault",
      kind: "hideout",
      x: 80.0,
      y: 7.5,
      label: "Sealed Vault",
      loot: { gold: 48, items: { "Sealed Note": 1 } },
      buff: { stamina: 8 },
      mysteryLine: "A bunker hatch, seam glowing faint under the rust.",
      loreHint: "Helios-Pacific cached more than water out here before the charter.",
    },
    {
      id: "drift_machine_graveyard",
      kind: "mine",
      x: 68.0,
      y: 24.0,
      label: "Machine Graveyard",
      loot: { gold: 28, items: { "Scrap Coil": 2 } },
      mysteryLine: "Oil-black sand and the hulks of harvesters that went feral.",
      loreHint: "The ag-machines stopped taking orders the year the wells were seized.",
    },
  ],
  ashfall: [
    {
      id: "ashfall_scrap_pile",
      kind: "cache",
      x: 38.5,
      y: 28.5,
      label: "Scrap Pile",
      loot: { gold: 50, items: { "Scrap Coil": 1, Ashglass: 2 } },
      regionHint: "Ashfall Basin slag road",
      roadHook: "a glittering scrap drift where the road sinks into ash",
      dangerHint: "Medium danger: hot footing and salvage thieves.",
      mysteryLine: "Three crew tags are wired to the same broken coil.",
      returnReason: "Scrap and ashglass keep Craft builds upgrading outside shops.",
    },
    {
      id: "ashfall_blacksmith_kiln",
      kind: "shrine",
      x: 32.5,
      y: 42.5,
      label: "Smolder Kiln",
      buff: { hp: 10, stamina: 0 },
      loot: { gold: 12 },
      regionHint: "Ashfall Basin kiln road",
      roadHook: "an orange kiln glow below a road of black slag",
      dangerHint: "Low danger: heat pressure, but strong shelter from ranged fire.",
      mysteryLine: "The kiln burns without coal when faction patrols pass.",
      returnReason: "The kiln is a natural forge hook for later Workbench III actions.",
    },
    {
      id: "ashfall_outlaw_camp",
      kind: "camp",
      x: 44.5,
      y: 22.5,
      label: "Outlaw Camp",
      loot: { gold: 28, items: { Potion: 1, "Heat Resin": 1 } },
      regionHint: "Ashfall Basin ridge road",
      roadHook: "red pennants flickering from a ridge camp above the road",
      dangerHint: "High danger: lookouts and heat resin traps.",
      mysteryLine: "Their wanted posters are printed before the crimes happen.",
      returnReason: "Heat resin is a clear reason for weapon refits and fire upgrades.",
    },
    {
      id: "ashfall_cinder_mine",
      kind: "mine",
      x: 48.5,
      y: 35.5,
      label: "Cinder Mine",
      loot: { gold: 36, items: { "Iron Ore": 2, "Miner Helmet": 1 } },
      regionHint: "Ashfall Basin mine road",
      roadHook: "a mine cart track vanishing under warm gray smoke",
      dangerHint: "High danger: tight lanes, bad visibility, and missing workers.",
      mysteryLine: "The last shift clock keeps stamping tomorrow's date.",
      returnReason: "Ore makes this the first real armor and repair route.",
    },
    {
      id: "ashfall_glass_ruins",
      kind: "ruin",
      x: 27.5,
      y: 34.5,
      label: "Glassmaker Ruins",
      loot: { gold: 26, items: { Ashglass: 1, "Map Scrap": 1 } },
      regionHint: "Ashfall Basin glass road",
      roadHook: "green glass teeth jutting out beside the old trade road",
      dangerHint: "Medium danger: sharp cover and strange reflections.",
      mysteryLine: "Your silhouette appears in the glass a step late.",
      returnReason: "Ashglass is a regional crafting identity, not shop filler.",
    },
  ],
  ironlantern: [
    {
      id: "lantern_archive_drop",
      kind: "cache",
      x: 14.5,
      y: 30.5,
      label: "Archive Drop",
      loot: { gold: 64, items: { "Cipher Lens": 1, "Lantern Filament": 1 } },
      regionHint: "Iron Lantern checkpoint road",
      roadHook: "a sealed archive tube under a blue checkpoint lamp",
      dangerHint: "Medium danger: patrol sight lines and silent alarms.",
      mysteryLine: "The memo inside is addressed to whoever finds it second.",
      returnReason: "Cipher gear should make Lantern NPCs notice your work.",
    },
    {
      id: "lantern_overseer_shrine",
      kind: "shrine",
      x: 8.5,
      y: 42.5,
      label: "Overseer's Vigil",
      buff: { hp: 12, stamina: 18 },
      loot: { gold: 16 },
      regionHint: "Iron Lantern vigil road",
      roadHook: "a pale shrine light looking back from the checkpoint ditch",
      dangerHint: "Low danger: watched ground, but little cover.",
      mysteryLine: "Every prayer scratch is in the same handwriting.",
      returnReason: "A stamina blessing helps heavy armor builds push deeper.",
    },
    {
      id: "lantern_chanter_camp",
      kind: "camp",
      x: 20.5,
      y: 24.5,
      label: "Chanter Camp",
      loot: { gold: 32, items: { "Pressurized Ink": 1 } },
      regionHint: "Iron Lantern signal road",
      roadHook: "low chanting from canvas tents behind a signal mast",
      dangerHint: "Medium danger: sound carries and reinforcements answer fast.",
      mysteryLine: "The chant stops whenever you look at the mast.",
      returnReason: "Pressurized ink gives dialogue, faction, and gear hooks room to grow.",
    },
    {
      id: "lantern_broken_relay",
      kind: "ruin",
      x: 24.5,
      y: 34.5,
      label: "Broken Relay",
      loot: { gold: 42, items: { "Lantern Filament": 1, "Map Scrap": 1 } },
      regionHint: "Iron Lantern relay road",
      roadHook: "a dead relay mast sparking above the road shoulder",
      dangerHint: "High danger: light bursts can mask enemy windups.",
      mysteryLine: "The relay repeats one word in Boone's voice.",
      returnReason: "Relay parts should unlock future map-table and faction consequences.",
    },
    {
      id: "lantern_curfew_hideout",
      kind: "hideout",
      x: 12.5,
      y: 18.5,
      label: "Curfew Hideout",
      loot: { gold: 48, items: { "Worn Badge": 1, "Cipher Lens": 1 } },
      regionHint: "Iron Lantern curfew road",
      roadHook: "chalk curfew marks leading off the checkpoint road",
      dangerHint: "High danger: patrols can box you in from both ends.",
      mysteryLine: "The hideout door has a keyhole on both sides.",
      returnReason: "The badge and lens should feed future faction recognition.",
    },
  ],
};

export function getPOIsForRegion(regionId) {
  return POI_DEFINITIONS[regionId] || [];
}

export function getTotalPOICount() {
  return Object.values(POI_DEFINITIONS).reduce((sum, pois) => sum + pois.length, 0);
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

const ROAD_DISCOVERY_KINDS = new Set(["cache", "camp", "shrine", "wagon", "mine", "ruin", "hideout", "stranger"]);

export function isRoadsideDiscovery(poi) {
  return Boolean(poi?.roadside);
}

export function getRoadsideDiscoveriesForRegion(regionId) {
  return getPOIsForRegion(regionId).filter(isRoadsideDiscovery);
}

export function findNearbyRoadsideDiscoveries(regions, regionId, x, y, maxDistance = 12) {
  const limit = Number.isFinite(maxDistance) ? Math.max(0, maxDistance) : 12;
  return getRoadsideDiscoveriesForRegion(regionId)
    .filter((poi) => !isPOIDiscovered(regions, poi.id))
    .map((poi) => ({
      ...poi,
      distance: Number(Math.hypot(poi.x - x, poi.y - y).toFixed(1)),
      direction: directionLabel(poi.x - x, poi.y - y),
      color: (POI_KINDS[poi.kind] || POI_KINDS.cache).color,
    }))
    .filter((poi) => poi.distance <= limit)
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
}

function fallbackRegionHint(regionId) {
  if (regionId === "ashfall") return "Ashfall Basin road";
  if (regionId === "ironlantern") return "Iron Lantern road";
  return "Westward Frontier road";
}

function fallbackRoadHook(poi, kind) {
  const label = kind?.label ? kind.label.toLowerCase() : "place";
  return `a marked ${label} just off the road`;
}

function fallbackDangerHint(poi) {
  if (poi.kind === "hideout") return "High danger: hostile cover and a risky retreat.";
  if (poi.kind === "mine") return "High danger: tight lanes and poor visibility.";
  if (poi.kind === "camp") return "Medium danger: people were here recently.";
  if (poi.kind === "ruin") return "Medium danger: old walls can hide new trouble.";
  if (poi.kind === "stranger") return "Unknown danger: the road feels watched.";
  return "Low danger: useful supplies before the next fight.";
}

function fallbackMysteryLine(poi) {
  return `${poi.label} looks ordinary until the road noise drops away.`;
}

function fallbackReturnReason(poi) {
  return `Worth checking because ${rewardHintForPOI(poi)} can feed the next route.`;
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

export function resolveRoadDiscoveryLead(regions, regionId, x, y, options = {}) {
  const maxDistance = Number.isFinite(options.maxDistance) ? Math.max(0, options.maxDistance) : 34;
  const list = getPOIsForRegion(regionId);
  let best = null;
  let bestScore = Infinity;
  let bestDistance = Infinity;

  for (const poi of list) {
    if (!ROAD_DISCOVERY_KINDS.has(poi.kind)) continue;
    if (isPOIDiscovered(regions, poi.id)) continue;
    const dx = poi.x - x;
    const dy = poi.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance > maxDistance) continue;
    const authoredWeight = poi.roadHook ? -3 : 0;
    const roadsideWeight = poi.roadside ? -4 : 0;
    const storyWeight = poi.kind === "mine" || poi.kind === "ruin" || poi.kind === "hideout" || poi.kind === "stranger" ? -1.25 : 0;
    const score = distance + authoredWeight + storyWeight + roadsideWeight;
    if (score >= bestScore) continue;
    best = { poi, dx, dy };
    bestScore = score;
    bestDistance = distance;
  }

  if (!best) return null;
  const kind = POI_KINDS[best.poi.kind] || POI_KINDS.cache;
  const direction = directionLabel(best.dx, best.dy);
  const distance = Number(bestDistance.toFixed(1));
  const distanceLine = `${distance} tiles ${direction}`;
  const rewardHint = rewardHintForPOI(best.poi);
  const regionHint = best.poi.regionHint || fallbackRegionHint(regionId);
  const hookLine = best.poi.roadHook || fallbackRoadHook(best.poi, kind);
  const dangerHint = best.poi.dangerHint || fallbackDangerHint(best.poi);
  const mysteryLine = best.poi.mysteryLine || fallbackMysteryLine(best.poi);
  const returnReason = best.poi.returnReason || fallbackReturnReason(best.poi);
  const loreHint = best.poi.loreHint || null;
  const urgentKinds = new Set(["hideout", "mine"]);
  return {
    id: best.poi.id,
    title: best.poi.roadside ? "Roadside find" : "Road hook",
    kind: best.poi.kind,
    kindLabel: kind.label,
    label: best.poi.label,
    roadside: Boolean(best.poi.roadside),
    x: best.poi.x,
    y: best.poi.y,
    direction,
    distance,
    distanceLine,
    color: kind.color,
    urgency: urgentKinds.has(best.poi.kind) || distance <= 8 ? "high" : "medium",
    action: best.poi.roadside ? "inspect" : "investigate",
    actionLabel: best.poi.roadside ? "Inspect" : "Investigate",
    regionHint,
    hookLine,
    dangerHint,
    mysteryLine,
    returnReason,
    loreHint,
    rewardHint,
    objectiveLine: `${best.poi.label}: ${best.poi.roadside ? "inspect" : "investigate"} ${distanceLine} on the ${regionHint}.`,
    secondaryLine: `${dangerHint} ${returnReason}`,
    line: `You were heading toward the ${regionHint}, then saw ${hookLine} ${direction}. ${distanceLine}. ${dangerHint}`,
  };
}

const EXPLORATION_RENOWN_REWARDS = {
  3: { title: "Trail Scout", xp: 30, gold: 18, upgradePoints: 1 },
  6: { title: "Frontier Surveyor", xp: 55, gold: 32, upgradePoints: 1 },
  9: { title: "Open-Road Cartographer", xp: 90, gold: 55, upgradePoints: 2 },
};

export function resolveExplorationRenownReward(discoveredCount) {
  const count = Number.isFinite(discoveredCount) ? Math.max(0, Math.floor(discoveredCount)) : 0;
  const reward = EXPLORATION_RENOWN_REWARDS[count];
  if (!reward) return null;
  return {
    discoveredCount: count,
    ...reward,
    summary: `${reward.title}: +${reward.xp} XP, +${reward.gold}g, +${reward.upgradePoints} upgrade point${reward.upgradePoints === 1 ? "" : "s"}`,
  };
}

export function resolveExplorationRenownStatus(discoveredCount, totalCount = getTotalPOICount()) {
  const discovered = Number.isFinite(discoveredCount) ? Math.max(0, Math.floor(discoveredCount)) : 0;
  const total = Number.isFinite(totalCount) ? Math.max(discovered, Math.floor(totalCount)) : discovered;
  const milestones = Object.keys(EXPLORATION_RENOWN_REWARDS).map((value) => Number(value)).sort((a, b) => a - b);
  const earned = milestones.filter((value) => discovered >= value);
  const currentMilestone = earned.length > 0 ? earned[earned.length - 1] : 0;
  const nextMilestone = milestones.find((value) => value > discovered) || null;
  const title = currentMilestone > 0 ? EXPLORATION_RENOWN_REWARDS[currentMilestone].title : "Unmapped Drifter";
  const nextLine = nextMilestone ? `next: ${nextMilestone}` : "all known POI milestones claimed";
  return {
    title,
    discoveredCount: discovered,
    totalCount: total,
    currentMilestone,
    nextMilestone,
    progressLine: `${title} - POIs ${discovered}/${total}, ${nextLine}`,
  };
}

// Job-board POIs — extracted from jobBoard.js so POI placement (coordinates,
// labels, region tinting) lives next to the rest of the world's POI data.
// jobBoard.js consumes these via getJobBoardProp().
export const JOB_BOARD_PROPS = {
  frontier: {
    id: "frontier_job_board",
    kind: "job_board",
    label: "Boone's Job Board",
    npcId: "warden",
    regionId: "frontier",
    x: 12.35,
    y: 8.55,
    color: "#d8a84f",
  },
  ashfall: {
    id: "ashfall_job_board",
    kind: "job_board",
    label: "Ashfall Warrant Board",
    npcId: "warden",
    regionId: "ashfall",
    x: 41.25,
    y: 39.65,
    color: "#ff9f5f",
  },
  ironlantern: {
    id: "ironlantern_job_board",
    kind: "job_board",
    label: "Lantern Quiet Board",
    npcId: "warden",
    regionId: "ironlantern",
    x: 15.25,
    y: 39.35,
    color: "#9bd3ff",
  },
};
