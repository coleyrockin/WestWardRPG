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

const REGION_PRESENTATION = {
  frontier: {
    anchor: { x: 9.5, y: 8.5 },
    routeLine: "marshal road east past the town circle",
    landmark: { kind: "landmark", label: "North Watchtower", dx: 4.7, dy: -1.25, color: "#d9b66d", size: 1.38 },
    props: [
      { kind: "sign", label: "Road Sign", dx: 2.0, dy: 0.6, color: "#d7b06d", size: 0.58 },
      { kind: "fence", label: "Split Fence", dx: 2.8, dy: 1.2, color: "#a47b4c", size: 0.52 },
      { kind: "cart", label: "Supply Cart", dx: 3.6, dy: -0.5, color: "#b9824d", size: 0.72 },
      { kind: "lamp", label: "Camp Lantern", dx: 4.25, dy: 0.55, color: "#ffd77b", size: 0.48 },
      { kind: "smoke", label: "Road Smoke", dx: 3.15, dy: 0.25, color: "#c8bfa4", size: 0.7 },
    ],
  },
  ashfall: {
    anchor: { x: 39.5, y: 39.5 },
    routeLine: "slag road between mine ribs and cooling wells",
    landmark: { kind: "landmark", label: "Slag Tower", dx: 3.9, dy: -1.6, color: "#e08a4a", size: 1.46 },
    props: [
      { kind: "sign", label: "Heat Flag", dx: 1.8, dy: 0.4, color: "#ffb06a", size: 0.62 },
      { kind: "rail", label: "Mine Rail", dx: 2.8, dy: 1.1, color: "#80533d", size: 0.58 },
      { kind: "pipe", label: "Bent Pipe", dx: 3.6, dy: -0.6, color: "#9b6753", size: 0.72 },
      { kind: "seam", label: "Ashglass Seam", dx: 4.1, dy: 0.55, color: "#ffc087", size: 0.54 },
      { kind: "smoke", label: "Heat Shimmer", dx: 3.2, dy: 0.1, color: "#e9a06c", size: 0.78 },
    ],
  },
  ironlantern: {
    anchor: { x: 14.5, y: 39.5 },
    routeLine: "signal lane under the blue checkpoint mast",
    landmark: { kind: "landmark", label: "Signal Mast", dx: 4.2, dy: -1.35, color: "#8fc8ff", size: 1.5 },
    props: [
      { kind: "sign", label: "Curfew Placard", dx: 1.8, dy: 0.35, color: "#c8a8ff", size: 0.62 },
      { kind: "cable", label: "Cable Post", dx: 2.7, dy: 1.0, color: "#7e8bb0", size: 0.64 },
      { kind: "lamp", label: "Blue Lamp", dx: 3.6, dy: -0.45, color: "#9bd3ff", size: 0.56 },
      { kind: "relay", label: "Glass Relay", dx: 4.1, dy: 0.5, color: "#bca8ff", size: 0.6 },
      { kind: "gate", label: "Iron Gate", dx: 3.0, dy: -1.05, color: "#657a9b", size: 0.76 },
    ],
  },
};

function numberOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

const PLACEMENT_NUDGES = [
  [0, 0],
  [0.45, 0],
  [-0.45, 0],
  [0, 0.45],
  [0, -0.45],
  [0.7, 0.35],
  [-0.7, 0.35],
  [0.7, -0.35],
  [-0.7, -0.35],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function pointAt(anchor, spec, nudge = [0, 0]) {
  return {
    x: Number((anchor.x + spec.dx + nudge[0]).toFixed(2)),
    y: Number((anchor.y + spec.dy + nudge[1]).toFixed(2)),
  };
}

function passesPlacement(point, spec, context) {
  if (typeof context.isPassable === "function" && !context.isPassable(point.x, point.y, spec)) return false;
  if (typeof context.isVisible === "function" && !context.isVisible(point.x, point.y, spec)) return false;
  return true;
}

function placeSpec(spec, anchor, context = {}) {
  const base = pointAt(anchor, spec);
  const selected = PLACEMENT_NUDGES
    .map((nudge, index) => ({ ...pointAt(anchor, spec, nudge), index }))
    .find((point) => passesPlacement(point, spec, context));
  const point = selected || base;

  return {
    kind: spec.kind,
    label: spec.label,
    x: point.x,
    y: point.y,
    color: spec.color,
    size: spec.size,
    blocking: false,
    placement: selected ? (selected.index === 0 ? "anchored" : "adjusted") : "unvalidated",
  };
}

export function buildRegionWorldPresentation(regionId, context = {}) {
  const profile = getRegionVisualIdentity(regionId);
  const config = REGION_PRESENTATION[profile.id] || REGION_PRESENTATION.frontier;
  const anchor = {
    x: numberOr(context.playerX, config.anchor.x),
    y: numberOr(context.playerY, config.anchor.y),
  };

  return {
    regionId: profile.id,
    label: profile.label,
    routeLine: config.routeLine,
    landmark: placeSpec(config.landmark, anchor, context),
    props: config.props.map((prop) => placeSpec(prop, anchor, context)),
  };
}
