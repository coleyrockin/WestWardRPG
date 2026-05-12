import { getPOIsForRegion, POI_KINDS } from "./poiSystem.js";

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
    roadColor: "#d5b178",
    roadEdgeColor: "#8d6c43",
    minimapTint: "#d6b57b",
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
    roadColor: "#d5834d",
    roadEdgeColor: "#5e3629",
    minimapTint: "#e28a55",
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
    roadColor: "#8dc5ff",
    roadEdgeColor: "#41536d",
    minimapTint: "#8fc8ff",
  },
};

export function getRegionVisualIdentity(regionId) {
  return REGION_VISUAL_IDENTITIES[regionId] || REGION_VISUAL_IDENTITIES.frontier;
}

export function buildRegionIdentityLine(regionId) {
  const profile = getRegionVisualIdentity(regionId);
  return `${profile.label}: ${profile.mood}. Landmarks: ${profile.landmarkHints.slice(0, 3).join(", ")}. Danger: ${profile.dangerIdentity}`;
}

const DEFAULT_READABILITY = {
  roadPull: "road edges and repeated props point toward the nearest landmark",
  landmarkCue: "the largest silhouette anchors the first view",
  wallCue: "walls use contact shading and trim to keep close movement readable",
  interactableCue: "interactive props use consistent color and marker language",
};

function cloneReadability(readability) {
  return {
    roadPull: readability?.roadPull || DEFAULT_READABILITY.roadPull,
    landmarkCue: readability?.landmarkCue || DEFAULT_READABILITY.landmarkCue,
    wallCue: readability?.wallCue || DEFAULT_READABILITY.wallCue,
    interactableCue: readability?.interactableCue || DEFAULT_READABILITY.interactableCue,
  };
}

export function resolveRegionReadabilityCues(regionId) {
  const profile = getRegionVisualIdentity(regionId);
  const config = REGION_PRESENTATION[profile.id] || REGION_PRESENTATION.frontier;
  return {
    regionId: profile.id,
    label: profile.label,
    ...cloneReadability(config.readability),
  };
}

const REGION_PRESENTATION = {
  frontier: {
    anchor: { x: 9.5, y: 8.5 },
    routeLine: "marshal road east between fence rails, wagon ruts, and the north watchtower",
    compositionLine: "bright wagon-rut road pulls the eye from Boone's board through town posts toward the watchtower beacon",
    readability: {
      roadPull: "wide wagon ruts, bright edge dust, and repeated mileposts point out of town",
      landmarkCue: "North Watchtower beacon should be the tallest first-view shape",
      wallCue: "Dustward walls need dark contact trim, sunlit upper bands, and fence-shadow decals near the player",
      interactableCue: "job board, road signs, and roadside discoveries share warm gold marker language",
    },
    landmark: { kind: "landmark", variant: "watchtower", label: "North Watchtower Beacon", dx: 4.95, dy: -1.34, color: "#ffd77b", size: 1.62 },
    vistas: [
      { kind: "town", label: "Town Roofline", dx: 1.45, dy: -0.82, color: "#caa66c", size: 1.18 },
      { kind: "watchtower", label: "Watchtower Frame", dx: 4.25, dy: -1.72, color: "#ffd77b", size: 1.12 },
      { kind: "gate", label: "Town Gate Posts", dx: 2.45, dy: -0.88, color: "#b9824d", size: 0.92 },
      { kind: "wagon", label: "Broken Wagon Silhouette", dx: 3.32, dy: 0.72, color: "#d89f62", size: 0.86 },
      { kind: "ranch", label: "Ranch Roof", dx: 0.72, dy: 1.06, color: "#9f7a4e", size: 0.84 },
    ],
    roads: [
      { kind: "road", label: "Marshal Road Post", dx: 1.2, dy: 0.24, color: "#c8a56a", size: 0.46 },
      { kind: "road", label: "Town Circle Marker", dx: 2.14, dy: 0.18, color: "#d7b06d", size: 0.48 },
      { kind: "road", label: "Broken Wagon Roadmark", dx: 3.02, dy: 0.04, color: "#d89f62", size: 0.52 },
      { kind: "road", label: "Watchtower Milepost", dx: 4.0, dy: -0.14, color: "#ffd77b", size: 0.52 },
      { kind: "road", label: "Marsh Fence Marker", dx: 4.78, dy: 0.42, color: "#9fc17c", size: 0.5 },
    ],
    props: [
      { kind: "sign", label: "Boone Road Sign", dx: 1.74, dy: 0.62, color: "#ffd77b", size: 0.68 },
      { kind: "fence", label: "Left Split Fence", dx: 2.5, dy: 1.18, color: "#a47b4c", size: 0.58 },
      { kind: "fence", label: "Right Split Fence", dx: 3.12, dy: -0.82, color: "#a47b4c", size: 0.54 },
      { kind: "cart", label: "Supply Cart", dx: 3.58, dy: -0.48, color: "#b9824d", size: 0.76 },
      { kind: "wagon", label: "Broken Wagon Marker", dx: 3.72, dy: 0.72, color: "#d89f62", size: 0.92 },
      { kind: "lamp", label: "Road Lantern", dx: 4.25, dy: 0.55, color: "#ffd77b", size: 0.58 },
      { kind: "lamp", label: "Board Lantern", dx: 1.18, dy: -0.34, color: "#ffe6a8", size: 0.48 },
      { kind: "smoke", label: "Road Smoke", dx: 3.15, dy: 0.25, color: "#c8bfa4", size: 0.76 },
      { kind: "crate", label: "Barricade Crates", dx: 2.84, dy: 0.92, color: "#b9824d", size: 0.62 },
      { kind: "post", label: "Patrol Post", dx: 4.9, dy: -0.15, color: "#c8a56a", size: 0.58 },
      { kind: "post", label: "Marsh Warning Post", dx: 5.38, dy: 0.35, color: "#9fc17c", size: 0.54 },
    ],
  },
  ashfall: {
    anchor: { x: 39.5, y: 39.5 },
    routeLine: "slag road between mine ribs and cooling wells",
    compositionLine: "slag road frames mine ribs, heat flags, and a smoking tower from the first basin view",
    landmark: { kind: "landmark", variant: "slag_tower", label: "Slag Tower", dx: 3.9, dy: -1.6, color: "#e08a4a", size: 1.46 },
    vistas: [
      { kind: "mine", label: "Mine Rib Silhouette", dx: 1.75, dy: -0.85, color: "#80533d", size: 1.05 },
      { kind: "tower", label: "Smoking Slag Tower", dx: 3.95, dy: -1.85, color: "#e08a4a", size: 1.08 },
      { kind: "gate", label: "Cooling Gate", dx: 2.8, dy: -0.9, color: "#9b6753", size: 0.9 },
    ],
    roads: [
      { kind: "road", label: "Slag Road Rib", dx: 1.25, dy: 0.15, color: "#c07a49", size: 0.44 },
      { kind: "road", label: "Cooling Well Marker", dx: 2.45, dy: 0.05, color: "#e08a4a", size: 0.44 },
      { kind: "road", label: "Mine Cart Milepost", dx: 3.55, dy: -0.25, color: "#9b6753", size: 0.46 },
    ],
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
    compositionLine: "signal lane frames the mast, gate lights, and watched street silhouettes from the first district view",
    landmark: { kind: "landmark", variant: "signal_mast", label: "Signal Mast", dx: 4.2, dy: -1.35, color: "#8fc8ff", size: 1.5 },
    vistas: [
      { kind: "signal", label: "Signal Mast Frame", dx: 4.05, dy: -1.7, color: "#8fc8ff", size: 1.08 },
      { kind: "checkpoint", label: "Checkpoint Silhouette", dx: 2.25, dy: -0.85, color: "#657a9b", size: 0.92 },
      { kind: "gate", label: "Gate Light Pair", dx: 3.1, dy: -0.65, color: "#9bd3ff", size: 0.86 },
    ],
    roads: [
      { kind: "road", label: "Signal Lane Plate", dx: 1.3, dy: 0.18, color: "#8fc8ff", size: 0.44 },
      { kind: "road", label: "Curfew Line Marker", dx: 2.45, dy: 0.02, color: "#c8a8ff", size: 0.44 },
      { kind: "road", label: "Gate Light Milepost", dx: 3.65, dy: -0.2, color: "#9bd3ff", size: 0.46 },
    ],
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

const ROAD_SIGN_OFFSETS = {
  frontier: [
    { dx: 1.5, dy: 0.48 },
    { dx: 2.65, dy: 0.22 },
    { dx: 3.8, dy: -0.06 },
    { dx: 4.9, dy: -0.34 },
  ],
  ashfall: [
    { dx: 1.35, dy: 0.42 },
    { dx: 2.55, dy: 0.12 },
    { dx: 3.7, dy: -0.2 },
    { dx: 4.75, dy: -0.52 },
  ],
  ironlantern: [
    { dx: 1.4, dy: 0.36 },
    { dx: 2.55, dy: 0.08 },
    { dx: 3.65, dy: -0.22 },
    { dx: 4.75, dy: -0.48 },
  ],
};

const ROAD_SIGN_KIND_PRIORITY = {
  mine: 0,
  ruin: 1,
  hideout: 2,
  stranger: 3,
  camp: 4,
  shrine: 5,
  cache: 6,
};

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
  const anchorFallback = {
    x: Number(anchor.x.toFixed(2)),
    y: Number(anchor.y.toFixed(2)),
    index: -1,
  };
  const fallbackPoint = selected ? null : (passesPlacement(base, spec, context)
    ? base
    : passesPlacement(anchorFallback, spec, context)
      ? anchorFallback
      : null);
  if (!selected && !fallbackPoint) return null;
  const point = selected || fallbackPoint;

  return {
    kind: spec.kind,
    variant: spec.variant || null,
    label: spec.label,
    x: point.x,
    y: point.y,
    color: spec.color,
    size: spec.size,
    blocking: false,
    placement: selected ? (selected.index === 0 ? "anchored" : "adjusted") : "fallback",
  };
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

function roadSignSort(anchor) {
  return (a, b) => {
    const priorityA = ROAD_SIGN_KIND_PRIORITY[a.kind] ?? 20;
    const priorityB = ROAD_SIGN_KIND_PRIORITY[b.kind] ?? 20;
    if (priorityA !== priorityB) return priorityA - priorityB;
    const distA = Math.hypot(a.x - anchor.x, a.y - anchor.y);
    const distB = Math.hypot(b.x - anchor.x, b.y - anchor.y);
    return distA - distB;
  };
}

function buildRoadDiscoverySignposts(regionId, anchor, context = {}) {
  const offsets = ROAD_SIGN_OFFSETS[regionId] || ROAD_SIGN_OFFSETS.frontier;
  return getPOIsForRegion(regionId)
    .filter((poi) => poi.roadHook && poi.regionHint)
    .sort(roadSignSort(anchor))
    .slice(0, offsets.length)
    .map((poi, index) => {
      const offset = offsets[index] || offsets[offsets.length - 1];
      const kind = POI_KINDS[poi.kind] || POI_KINDS.cache;
      const distance = Number(Math.hypot(poi.x - anchor.x, poi.y - anchor.y).toFixed(1));
      const direction = directionLabel(poi.x - anchor.x, poi.y - anchor.y);
      const placed = placeSpec({
        kind: "road-sign",
        label: `${poi.label} Sign`,
        dx: offset.dx,
        dy: offset.dy,
        color: kind.color,
        size: 0.58,
      }, anchor, context);
      if (!placed) return null;

      return {
        ...placed,
        targetId: poi.id,
        targetKind: poi.kind,
        targetLabel: poi.label,
        targetX: poi.x,
        targetY: poi.y,
        kindLabel: kind.label,
        regionHint: poi.regionHint,
        dangerHint: poi.dangerHint || "Optional danger off the main road.",
        mysteryLine: poi.mysteryLine || "",
        returnReason: poi.returnReason || "",
        distance,
        direction,
        distanceLine: `${distance} tiles ${direction}`,
        line: `${poi.label} ${kind.label.toLowerCase()}: ${distance} tiles ${direction}. ${poi.dangerHint || "Optional danger off the main road."}`,
      };
    });
}

export function buildRegionWorldPresentation(regionId, context = {}) {
  const profile = getRegionVisualIdentity(regionId);
  const config = REGION_PRESENTATION[profile.id] || REGION_PRESENTATION.frontier;
  const anchor = {
    x: numberOr(context.playerX, config.anchor.x),
    y: numberOr(context.playerY, config.anchor.y),
  };
  const toPlacements = (items) => items.map((item) => placeSpec(item, anchor, context)).filter(Boolean);

  return {
    regionId: profile.id,
    label: profile.label,
    anchor,
    routeLine: config.routeLine,
    compositionLine: config.compositionLine,
    readability: cloneReadability(config.readability),
    landmark: placeSpec(config.landmark, anchor, context) || {
      kind: "landmark",
    variant: null,
      label: `${profile.label} Identity`,
      x: Number(anchor.x.toFixed(2)),
      y: Number(anchor.y.toFixed(2)),
      color: getRegionVisualIdentity(profile.id).minimapTint || "#ffffff",
      size: 1,
      blocking: false,
      placement: "fallback",
    },
    vistas: toPlacements(config.vistas || []),
    roads: toPlacements(config.roads || []),
    props: toPlacements(config.props || []),
    roadSigns: buildRoadDiscoverySignposts(profile.id, anchor, context).filter(Boolean),
  };
}

export function buildRegionRoutePolyline(presentation, options = {}) {
  if (!presentation || typeof presentation !== "object") return [];
  const startX = Number.isFinite(options.startX) ? options.startX : presentation.anchor?.x;
  const startY = Number.isFinite(options.startY) ? options.startY : presentation.anchor?.y;
  const points = [];
  if (Number.isFinite(startX) && Number.isFinite(startY)) {
    points.push({ x: Number(startX.toFixed(2)), y: Number(startY.toFixed(2)), kind: "start", label: "Player" });
  }
  for (const road of Array.isArray(presentation.roads) ? presentation.roads : []) {
    if (!Number.isFinite(road?.x) || !Number.isFinite(road?.y)) continue;
    points.push({ x: road.x, y: road.y, kind: "road", label: road.label, color: road.color });
  }
  const landmark = presentation.landmark;
  if (Number.isFinite(landmark?.x) && Number.isFinite(landmark?.y)) {
    points.push({
      x: landmark.x,
      y: landmark.y,
      kind: "landmark",
      label: landmark.label,
      color: landmark.color,
    });
  }
  return points;
}

export function resolveRoadSignPrompt(roadSigns, x, y, options = {}) {
  if (!Array.isArray(roadSigns) || roadSigns.length === 0) return null;
  const radius = Number.isFinite(options.radius) ? Math.max(0, options.radius) : 1.45;
  let best = null;
  let bestDistance = Infinity;

  for (const sign of roadSigns) {
    if (!sign || !Number.isFinite(sign.x) || !Number.isFinite(sign.y)) continue;
    const distance = Math.hypot(sign.x - x, sign.y - y);
    if (distance > radius || distance >= bestDistance) continue;
    best = sign;
    bestDistance = distance;
  }

  if (!best) return null;
  const distanceToSign = Number(bestDistance.toFixed(2));
  const targetKind = best.kindLabel ? best.kindLabel.toLowerCase() : best.targetKind || "place";
  const destinationLine = `${best.targetLabel} ${targetKind} - ${best.distanceLine}`;
  const secondaryLine = [best.dangerHint, best.returnReason].filter(Boolean).join(" ");
  return {
    id: `road-sign-${best.targetId}`,
    title: "Road sign",
    action: "read",
    actionLabel: "Read sign",
    targetId: best.targetId,
    targetKind: best.targetKind,
    targetLabel: best.targetLabel,
    targetX: best.targetX,
    targetY: best.targetY,
    x: best.x,
    y: best.y,
    color: best.color,
    distanceToSign,
    destinationLine,
    distanceLine: best.distanceLine,
    regionHint: best.regionHint,
    dangerHint: best.dangerHint,
    mysteryLine: best.mysteryLine,
    returnReason: best.returnReason,
    urgency: best.dangerHint?.startsWith("High danger") ? "high" : "medium",
    objectiveLine: `Read sign: ${destinationLine}`,
    secondaryLine,
    line: `Road sign points to ${destinationLine}. ${secondaryLine}`,
  };
}
