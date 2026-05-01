export const REGIONS = {
  frontier: {
    id: "frontier",
    name: "WestWard Frontier",
    weatherBias: ["clear", "mist", "rain", "storm"],
    hazard: "baseline",
    resourceYieldMult: 1,
  },
  ashfall: {
    id: "ashfall",
    name: "Ashfall Basin",
    weatherBias: ["sandstorm", "heatwave", "mist", "clear"],
    hazard: "heat_distortion",
    resourceYieldMult: 1.2,
  },
  ironlantern: {
    id: "ironlantern",
    name: "Iron Lantern District",
    weatherBias: ["neon_rain", "mist", "storm", "clear"],
    hazard: "surveillance_pressure",
    resourceYieldMult: 1.1,
  },
};

export const REGION_RESOURCES = {
  ashfall: ["Ashglass", "Scrap Coil", "Heat Resin"],
  ironlantern: ["Lantern Filament", "Cipher Lens", "Pressurized Ink"],
};

export function createInitialRegionState() {
  return {
    activeRegion: "frontier",
    discovered: ["frontier"],
    events: {
      patrol_crackdown: { severity: 0, timer: 0 },
      market_crash: { severity: 0, timer: 0 },
      civic_unrest: { severity: 0, timer: 0 },
    },
    miniBosses: {
      ashfall_scrap_tyrant: { defeated: false },
      ashfall_scorch_engine: { defeated: false },
      lantern_overseer: { defeated: false },
      lantern_iron_chanter: { defeated: false },
    },
  };
}

export function unlockRegion(regionState, regionId) {
  if (!REGIONS[regionId]) return false;
  if (!regionState.discovered.includes(regionId)) {
    regionState.discovered.push(regionId);
  }
  regionState.activeRegion = regionId;
  return true;
}

export function rollRegionEvent(regionState, dt, rng = Math.random) {
  const events = regionState.events;
  for (const eventState of Object.values(events)) {
    eventState.timer = Math.max(0, (eventState.timer || 0) - dt);
    if (eventState.timer > 0) continue;
    if (rng() < dt * 0.04) {
      eventState.severity = Math.min(3, (eventState.severity || 0) + 1);
      eventState.timer = 8 + rng() * 16;
    } else if (eventState.severity > 0) {
      eventState.severity -= 1;
      eventState.timer = 5 + rng() * 7;
    }
  }
  return events;
}
