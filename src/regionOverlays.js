// Procedural region overlays. Per-region, per-day encounter seeds drive a
// small set of overlay events (ambush, wandering trader, downed traveler)
// that appear on roads. Bounded by daily-seed RNG — deterministic per day
// but different from yesterday. Handcrafted POI placement is untouched.

import { dailyRand, todaysSeedString } from "./dailySeedMode.js";

export const OVERLAY_TYPES = {
  ambush:          { color: "#e05c5c", label: "Ambush Point",       threat: "hostile",  symbol: "⚔" },
  wandering_trader:{ color: "#f0c56a", label: "Wandering Trader",   threat: "neutral",  symbol: "💰" },
  downed_traveler: { color: "#8fd0ff", label: "Downed Traveler",    threat: "neutral",  symbol: "?" },
  regional_cache:  { color: "#9be873", label: "Unmarked Cache",     threat: "none",     symbol: "★" },
};

const OVERLAY_POOLS = {
  frontier: [
    { type: "ambush",           wx: 14.5, wy: 10.5, regionHint: "eastern marsh approach" },
    { type: "wandering_trader", wx: 12.0, wy: 14.0, regionHint: "south road past the barn" },
    { type: "downed_traveler",  wx: 18.0, wy: 8.5,  regionHint: "north trail near the ridge" },
    { type: "regional_cache",   wx: 8.5,  wy: 16.0, regionHint: "overgrown lot near the wall" },
  ],
  ashfall: [
    { type: "ambush",           wx: 36.0, wy: 40.5, regionHint: "slag road cut-off" },
    { type: "wandering_trader", wx: 32.0, wy: 44.0, regionHint: "midway between relay posts" },
    { type: "downed_traveler",  wx: 44.0, wy: 36.5, regionHint: "eastern claim boundary" },
    { type: "regional_cache",   wx: 38.5, wy: 48.0, regionHint: "below the heat vent shelf" },
  ],
  ironlantern: [
    { type: "ambush",           wx: 60.0, wy: 12.5, regionHint: "signal tower access road" },
    { type: "wandering_trader", wx: 56.5, wy: 18.0, regionHint: "relay junction plaza" },
    { type: "downed_traveler",  wx: 64.0, wy: 8.0,  regionHint: "district entry checkpoint" },
    { type: "regional_cache",   wx: 52.0, wy: 22.0, regionHint: "decommissioned post alcove" },
  ],
};

// Returns today's active overlay encounters for a region (1-2 per day, seeded).
export function getTodaysOverlays(regionId, dateStr = todaysSeedString()) {
  const pool = OVERLAY_POOLS[regionId] || OVERLAY_POOLS.frontier;
  // Pick 1-2 overlays deterministically from the pool using daily seed
  const count = dailyRand(dateStr, `${regionId}:count`) < 0.5 ? 1 : 2;
  const shuffled = pool
    .map((o, i) => ({ o, sort: dailyRand(dateStr, `${regionId}:${i}`) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ o }) => o);
  return shuffled.slice(0, count).map((overlay) => ({
    ...overlay,
    dateStr,
    meta: OVERLAY_TYPES[overlay.type],
  }));
}

// Returns a flavor description for an overlay encounter.
export function resolveOverlayDescription(overlay) {
  const descs = {
    ambush:          `${overlay.regionHint} — signs of a recent ambush setup. Proceed carefully.`,
    wandering_trader:`${overlay.regionHint} — a lone trader working the road. May have regional stock.`,
    downed_traveler: `${overlay.regionHint} — someone's in trouble. Probably worth a look.`,
    regional_cache:  `${overlay.regionHint} — something stashed and left. Claimed by whoever finds it first.`,
  };
  return descs[overlay.type] || overlay.regionHint;
}
