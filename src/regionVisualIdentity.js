export const REGION_VISUAL_IDENTITIES = {
  frontier: {
    id: "frontier",
    label: "Dustward Frontier",
    mood: "wide, survivable, half-wild",
    dangerIdentity: "Coyotes of commerce, marsh slimes, and civic trouble at sundown.",
    skyTint: "#d8bc6a",
    hazeTint: "#8fbf9c",
    groundPalette: ["#7a6a3d", "#5a915c", "#3f5f42"],
    landmarkHints: ["town circle", "north watchtower", "ranch house", "marsh road"],
    propPalette: ["split-rail fences", "supply crates", "weathered signs", "camp lanterns"],
    encounterTone: "frontier law and small-town bargains",
    screenshotCue: "warm dusk, green marsh bands, timber homestead silhouettes",
  },
  ashfall: {
    id: "ashfall",
    label: "Ashfall Basin",
    mood: "hot, industrial, scavenged",
    dangerIdentity: "Heat shimmer hides scrap tyrants, pressure engines, and ruined supply roads.",
    skyTint: "#e08a4a",
    hazeTint: "#9e5139",
    groundPalette: ["#8d4e35", "#5f4035", "#c07a49"],
    landmarkHints: ["slag towers", "scrap ravines", "cooling wells", "red glass flats"],
    propPalette: ["bent pipework", "ashglass seams", "broken pumps", "heat flags"],
    encounterTone: "salvage rights, labor fights, and machines that never cooled",
    screenshotCue: "orange haze, dark slag ridges, bright ashglass flecks",
  },
  ironlantern: {
    id: "ironlantern",
    label: "Iron Lantern District",
    mood: "watched, metallic, neon-lit",
    dangerIdentity: "Lantern patrol logic, coded signals, and control archetypes tighten every street.",
    skyTint: "#6aa8d8",
    hazeTint: "#7b6ad8",
    groundPalette: ["#2f4355", "#38405c", "#657a9b"],
    landmarkHints: ["surveillance pylons", "ledger offices", "signal bridges", "blue-lit alleys"],
    propPalette: ["neon shutters", "cable posts", "iron placards", "glass relays"],
    encounterTone: "curfew pressure, surveillance politics, and coded rebellion",
    screenshotCue: "cool blue skyline, violet haze, hard iron silhouettes",
  },
};

export function getRegionVisualIdentity(regionId) {
  return REGION_VISUAL_IDENTITIES[regionId] || REGION_VISUAL_IDENTITIES.frontier;
}

export function buildRegionIdentityLine(regionId) {
  const profile = getRegionVisualIdentity(regionId);
  return `${profile.label}: ${profile.mood}. Landmarks: ${profile.landmarkHints.slice(0, 3).join(", ")}. Danger: ${profile.dangerIdentity}`;
}
