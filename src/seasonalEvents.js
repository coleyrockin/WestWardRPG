// Seasonal event system. A long real-time cycle (calendarDay increments once
// per ~4 minutes of play, cycling through 4 in-game weeks = 28 days per
// season). Each season has region-specific effects.
//
// calendarDay is stored on state.world and advances during the update loop.

export const SEASON_CYCLE = 28; // days per season
export const SECONDS_PER_DAY = 240; // 4 real minutes = 1 in-game day

export const SEASONS = ["spring", "summer", "fall", "winter"];

export function resolveCurrentSeason(calendarDay = 0) {
  const dayInCycle = Math.floor(Math.abs(calendarDay)) % (SEASON_CYCLE * 4);
  const seasonIdx = Math.floor(dayInCycle / SEASON_CYCLE) % 4;
  return SEASONS[seasonIdx];
}

export function advanceCalendarDay(world, dt) {
  if (!world) return;
  world.calendarDay = (world.calendarDay || 0);
  world.calendarDayTimer = (world.calendarDayTimer || 0) + dt;
  if (world.calendarDayTimer >= SECONDS_PER_DAY) {
    world.calendarDayTimer -= SECONDS_PER_DAY;
    world.calendarDay += 1;
  }
}

// Returns visual + gameplay modifiers for the current season in a region.
export function resolveSeasonModifiers(season, regionId) {
  const mods = {
    spawnMult:     1.0,
    visibilityMod: 0.0, // additive to fog
    vendorBonus:   false,
    eventLabel:    null,
  };

  if (season === "summer") {
    if (regionId === "ashfall") {
      mods.spawnMult = 1.35;
      mods.visibilityMod = 0.12;
      mods.eventLabel = "Heat Season — Ashfall hostiles surge";
    } else if (regionId === "frontier") {
      mods.vendorBonus = true;
      mods.eventLabel = "Frontier Festival — vendors stock seasonal items";
    }
  } else if (season === "winter") {
    if (regionId === "ironlantern") {
      mods.spawnMult = 0.7;
      mods.visibilityMod = 0.18;
      mods.eventLabel = "District Blackout — patrol density drops, stealth window opens";
    } else {
      mods.visibilityMod = 0.08;
      mods.spawnMult = 0.85;
    }
  } else if (season === "fall") {
    if (regionId === "ashfall") {
      mods.visibilityMod = 0.22;
      mods.eventLabel = "Dust Season — visibility reduced in Ashfall";
    }
  }

  return mods;
}

export function resolveSeasonLabel(calendarDay) {
  const season = resolveCurrentSeason(calendarDay);
  const dayInSeason = Math.floor(Math.abs(calendarDay)) % SEASON_CYCLE + 1;
  return `${season.charAt(0).toUpperCase() + season.slice(1)}, Day ${dayInSeason}`;
}
