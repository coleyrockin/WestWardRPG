const DEFAULT_REGION_ID = "frontier";

export const REGION_ART_KITS = {
  frontier: {
    id: "frontier",
    label: "Dustward Frontier art kit",
    quality: "full",
    sky: {
      style: "haunted-western-dusk",
      top: "#25254a",
      middle: "#b26358",
      bottom: "#f2b86d",
      haze: "#d99f74",
      shadow: "#191a31",
      cloudPalette: ["#ffd995", "#c77b68", "#424061"],
      sunGlow: "#ffbf68",
      cloudBands: [
        { y: 0.15, scale: 1.34, speed: 0.06, alpha: 0.34 },
        { y: 0.3, scale: 0.98, speed: 0.1, alpha: 0.27 },
        { y: 0.43, scale: 0.66, speed: 0.16, alpha: 0.2 },
      ],
    },
    horizon: {
      style: "haunted-town-mesa-watchtower",
      far: "#332b3c",
      mid: "#5a3b35",
      near: "#201922",
      silhouettes: ["distant mesas", "old town roofline", "north watchtower", "dead cottonwood line", "wanted-board square"],
    },
    terrain: {
      base: "#4c5136",
      near: "#20291f",
      highlight: "#9f8653",
      grass: "#6a7c45",
      scrub: "#364232",
      wildflower: "#e8c56b",
      dust: "#c89352",
    },
    road: {
      style: "wagon-rut-marshal-road",
      base: "#d0914d",
      rut: "#57331d",
      edge: "#ffc775",
      sign: "#ffd36f",
      detail: ["bright wagon ruts", "dusty shoulder", "fence shadows", "marshal chevrons", "lantern road posts"],
    },
    walls: {
      stone: { material: "low marsh fieldstone", visualHeight: 0.42, trim: "#c89654", contact: "#171522", decal: "#41503c", highlight: "#ffd18a" },
      water: { material: "reeded dusk marsh", visualHeight: 0.18, trim: "#8ebc9f", contact: "#101726", decal: "#334c4e", highlight: "#c9ebd5" },
      timber: { material: "sun-cut timber", visualHeight: 0.96, trim: "#e1b46f", contact: "#25170f", decal: "#6c4528", highlight: "#ffe0a1" },
      plaster: { material: "dust plaster", visualHeight: 0.94, trim: "#f0d19b", contact: "#2d2418", decal: "#a4774d", highlight: "#ffe4aa" },
      neon: { material: "frontier signal glass", visualHeight: 0.9, trim: "#9bd3ff", contact: "#112131", decal: "#41536d", highlight: "#e0f5ff" },
    },
    vegetation: [
      { kind: "dead-tree", label: "Dead Cottonwood", dx: 0.72, dy: -1.42, color: "#2d211d", trunkColor: "#6f4b2d", size: 1.3, depthLane: "background" },
      { kind: "tree", label: "Roadside Cottonwood", dx: 2.72, dy: -1.22, color: "#5d7c43", trunkColor: "#7a5231", size: 1.08, depthLane: "midground" },
      { kind: "tree", label: "Marsh Willow", dx: 4.84, dy: 1.18, color: "#596f3e", trunkColor: "#6b4d31", size: 0.92, depthLane: "foreground" },
      { kind: "scrub", label: "Sage Scrub", dx: 1.26, dy: 1.62, color: "#789062", size: 0.54, depthLane: "foreground" },
      { kind: "scrub", label: "Road Grass", dx: 2.3, dy: 1.72, color: "#91a65d", size: 0.48, depthLane: "foreground" },
      { kind: "scrub", label: "Wildflower Patch", dx: 3.52, dy: 1.36, color: "#e8c56b", size: 0.46, depthLane: "foreground" },
      { kind: "dead-tree", label: "Town Gallows Tree", dx: 0.42, dy: -0.72, color: "#2d211d", trunkColor: "#70472b", size: 0.84, depthLane: "midground" },
    ],
    props: [
      { kind: "lantern-post", label: "Road Lantern", dx: 0.84, dy: -0.46, color: "#ffbf68", size: 0.62, depthLane: "midground" },
      { kind: "wanted-board", label: "Wanted Board", dx: 1.2, dy: 0.66, color: "#d19a58", size: 0.86, depthLane: "midground" },
      { kind: "barrel", label: "Water Barrel", dx: 0.86, dy: 1.0, color: "#8a5b35", size: 0.46, depthLane: "foreground" },
      { kind: "hitching-post", label: "Hitching Post", dx: 1.94, dy: -0.68, color: "#9b6a3f", size: 0.52, depthLane: "background" },
      { kind: "banner", label: "Marshal Pennant", dx: 2.84, dy: -0.82, color: "#ffd77b", size: 0.52, depthLane: "background" },
      { kind: "flower", label: "Road Wildflowers", dx: 3.12, dy: 1.48, color: "#e8c56b", size: 0.42, depthLane: "foreground" },
      { kind: "trail-stone", label: "Road Shoulder Stones", dx: 4.34, dy: 1.36, color: "#ada08e", size: 0.48, depthLane: "foreground" },
    ],
    landmark: {
      hero: "North Watchtower Beacon",
      style: "lantern-lit haunted timber silhouette",
      mustReadAtStart: true,
    },
    weatherMood: "purple dusk, warm lantern dust, haunted marshal-road silhouettes",
    minimapTint: "#d6b57b",
  },
  ashfall: {
    id: "ashfall",
    label: "Ashfall Basin art kit",
    quality: "foundation",
    sky: {
      style: "smoke-orange-industrial",
      top: "#64392e",
      middle: "#d06f45",
      bottom: "#ffb06a",
      haze: "#c27a53",
      cloudPalette: ["#ef9a62", "#6d4638"],
      sunGlow: "#ff8a4c",
      cloudBands: [{ y: 0.25, scale: 1, speed: 0.06, alpha: 0.22 }],
    },
    horizon: { style: "slag-mine", far: "#3c3029", mid: "#80533d", near: "#2b211b", silhouettes: ["slag tower", "mine ribs", "cooling wells"] },
    terrain: { base: "#5f4035", near: "#2b211b", highlight: "#c07a49", grass: "#80533d", scrub: "#5a382c", wildflower: "#ffb06a", dust: "#d5834d" },
    road: { style: "slag-road", base: "#d5834d", rut: "#2b211b", edge: "#ffb06a", sign: "#ff9f5f", detail: ["slag ribs", "heat seams", "mine cart lines"] },
    walls: {
      stone: { material: "black slag", visualHeight: 0.76, trim: "#ff9f5f", contact: "#1a1210", decal: "#6d3528", highlight: "#ffc087" },
      water: { material: "cooling runoff", visualHeight: 0.42, trim: "#8ab6c4", contact: "#151b20", decal: "#425764", highlight: "#c9efff" },
      timber: { material: "charred brace", visualHeight: 0.96, trim: "#c07a49", contact: "#1e1713", decal: "#4d3127", highlight: "#ffb06a" },
      plaster: { material: "ash plaster", visualHeight: 0.92, trim: "#d08a5c", contact: "#231815", decal: "#6d4b3a", highlight: "#ffc087" },
      neon: { material: "heat glass", visualHeight: 0.9, trim: "#ff8a4c", contact: "#2b1510", decal: "#805a8e", highlight: "#ffd0a2" },
    },
    vegetation: [{ kind: "scrub", label: "Ash Weed", dx: 1.5, dy: 0.9, color: "#8d5a42", size: 0.42 }],
    props: [{ kind: "trail-stone", label: "Slag Shards", dx: 2.3, dy: 0.8, color: "#c07a49", size: 0.48 }],
    landmark: { hero: "Slag Tower", style: "smoking industrial silhouette", mustReadAtStart: true },
    weatherMood: "heat shimmer, orange smoke, black industrial silhouettes",
    minimapTint: "#e28a55",
  },
  ironlantern: {
    id: "ironlantern",
    label: "Iron Lantern art kit",
    quality: "foundation",
    sky: {
      style: "cold-blue-surveillance",
      top: "#1d2d49",
      middle: "#456c9c",
      bottom: "#8fc8ff",
      haze: "#7b6ad8",
      cloudPalette: ["#9bd3ff", "#38405c"],
      sunGlow: "#9bd3ff",
      cloudBands: [{ y: 0.22, scale: 0.9, speed: 0.09, alpha: 0.18 }],
    },
    horizon: { style: "checkpoint-signal", far: "#25384e", mid: "#41536d", near: "#1c2634", silhouettes: ["signal mast", "checkpoint gate", "cable line"] },
    terrain: { base: "#384c5f", near: "#1c2634", highlight: "#657a9b", grass: "#41536d", scrub: "#2f4355", wildflower: "#9bd3ff", dust: "#8dc5ff" },
    road: { style: "signal-lane", base: "#41536d", rut: "#172231", edge: "#8dc5ff", sign: "#9bd3ff", detail: ["signal plates", "curfew line", "blue lane glow"] },
    walls: {
      stone: { material: "dark iron brick", visualHeight: 0.78, trim: "#8dc5ff", contact: "#0d141f", decal: "#25384e", highlight: "#c8e9ff" },
      water: { material: "blue drainage", visualHeight: 0.42, trim: "#9bd3ff", contact: "#0d1724", decal: "#2f4355", highlight: "#d8f4ff" },
      timber: { material: "painted checkpoint timber", visualHeight: 0.94, trim: "#8dc5ff", contact: "#111a26", decal: "#38405c", highlight: "#c8e9ff" },
      plaster: { material: "ledger plaster", visualHeight: 0.92, trim: "#c8a8ff", contact: "#171526", decal: "#657a9b", highlight: "#eee7ff" },
      neon: { material: "signal glass", visualHeight: 0.9, trim: "#9bd3ff", contact: "#101928", decal: "#7b6ad8", highlight: "#e0f5ff" },
    },
    vegetation: [{ kind: "scrub", label: "Cable Weed", dx: 1.6, dy: 0.8, color: "#657a9b", size: 0.4 }],
    props: [{ kind: "banner", label: "Curfew Strip", dx: 2.2, dy: -0.6, color: "#9bd3ff", size: 0.5 }],
    landmark: { hero: "Signal Mast", style: "blue signal silhouette", mustReadAtStart: true },
    weatherMood: "cold blue haze, watched streets, signal glow",
    minimapTint: "#8fc8ff",
  },
};

function normalizeRegionId(regionId) {
  return REGION_ART_KITS[regionId] ? regionId : DEFAULT_REGION_ID;
}

function normalizePreset(preset) {
  if (preset === "cinematic" || preset === "high") return "cinematic";
  if (preset === "low" || preset === "performance") return "low";
  return "balanced";
}

export function getRegionArtKit(regionId) {
  return REGION_ART_KITS[normalizeRegionId(regionId)];
}

export function resolveOpeningViewComposition(context = {}) {
  const kit = getRegionArtKit(context.regionId);
  return {
    regionId: kit.id,
    artKit: kit.label,
    skyStyle: kit.sky.style,
    horizonStyle: kit.horizon.style,
    roadStyle: kit.road.style,
    landmark: kit.landmark.hero,
    mustShow: [
      "sky",
      "road",
      "landmark",
      "town",
      "job-board",
      "interactable",
    ],
    line: `${kit.landmark.hero} anchors a ${kit.sky.style} above a ${kit.road.style}.`,
  };
}

export function resolveWorldDressingForView(context = {}) {
  const kit = getRegionArtKit(context.regionId);
  const preset = normalizePreset(context.preset);
  const motionReduction = Boolean(context.motionReduction);
  const density = preset === "cinematic" ? 1 : preset === "low" ? 0.55 : 0.78;
  const motionDensity = motionReduction ? Math.min(density, 0.62) : density;
  const takeCount = (items, minimum = 1) => {
    const count = Math.max(minimum, Math.ceil(items.length * motionDensity));
    return items.slice(0, count);
  };

  return {
    regionId: kit.id,
    preset,
    density: Number(motionDensity.toFixed(2)),
    sky: kit.sky,
    horizon: kit.horizon,
    road: kit.road,
    vegetation: takeCount(kit.vegetation || [], kit.id === "frontier" ? 4 : 1),
    props: takeCount(kit.props || [], 1),
    weatherMood: kit.weatherMood,
  };
}

export function resolveWallMaterial(tileType, regionId) {
  const kit = getRegionArtKit(regionId);
  const key = tileType === 2
    ? "water"
    : tileType === 3
      ? "timber"
      : tileType === 4
        ? "plaster"
        : tileType === 5
          ? "neon"
          : "stone";
  return {
    tileType,
    key,
    ...(kit.walls[key] || kit.walls.stone),
  };
}

export function resolveSpriteArtVariant(sprite = {}, regionId) {
  const kit = getRegionArtKit(regionId);
  const kind = sprite.propKind || sprite.poiKind || sprite.kind || "prop";
  const label = String(sprite.label || "").toLowerCase();
  if (kind === "dead-tree" || label.includes("gallows") || label.includes("dead cottonwood")) {
    return { variant: "dead-frontier-tree", silhouette: "forked haunted branches", outline: "#17151d", accent: kit.road.sign, detailLevel: kit.quality };
  }
  if (kind === "tree" || label.includes("cottonwood") || label.includes("willow")) {
    return { variant: "layered-tree", silhouette: "wide canopy", outline: kit.terrain.near, accent: kit.terrain.highlight, detailLevel: kit.quality };
  }
  if (kind === "scrub" || kind === "flower" || label.includes("grass")) {
    return { variant: "ground-vegetation", silhouette: "low clustered brush", outline: kit.terrain.scrub, accent: kit.terrain.wildflower, detailLevel: kit.quality };
  }
  if (kind === "wagon" || label.includes("wagon")) {
    return { variant: "broken-wagon-hero", silhouette: "broken wheel and tilted cargo bed", outline: "#4b2f1e", accent: kit.road.sign, detailLevel: kit.quality };
  }
  if (kind === "job-board" || label.includes("board")) {
    return { variant: "lit-notice-board", silhouette: "large posted board with lamp", outline: "#4b2f1e", accent: kit.road.sign, detailLevel: kit.quality };
  }
  if (kind === "chest" || label.includes("cache")) {
    return { variant: "smoke-cache", silhouette: "glowing cache with smoke plume", outline: "#4b2f1e", accent: kit.road.sign, detailLevel: kit.quality };
  }
  if (kind === "enemy") {
    return { variant: "readable-slime", silhouette: "dark marsh body, hostile rim, windup tell, and reward pop", outline: "#102312", accent: "#92f0a3", detailLevel: kit.quality };
  }
  return { variant: `${kit.id}-${kind}`, silhouette: "grounded prop", outline: kit.horizon.near, accent: kit.road.sign, detailLevel: kit.quality };
}
