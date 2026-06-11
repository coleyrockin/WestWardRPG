// Compact route-map HUD for the Three.js first-road slice.
// Pure route projection is exported for tests; DOM sync stays thin.

import { FIRST_FIVE_ROUTE, OPEN_RANGE_BOUNDS, OPEN_RANGE_ROADS, WORLD_MAP_POIS } from "./frontierLayout.js";
import { getPhaseProgress } from "./phaseState.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_SIZE = Object.freeze({ width: 220, height: 142, padding: 17 });

const PHASE_ROUTE_INDEX = Object.freeze({
  spawn: 1,
  board_choice: 1,
  road_sign: 2,
  road_walk: 3,
  cache_clue: 4,
  slime_tell: 5,
  slime_fight: 6,
  wagon_salvage: 7,
  return_to_boone: 8,
  survey_teaser: 8,
});

const KIND_STYLES = Object.freeze({
  spawn: { shape: "player", color: "#fff3c8", size: 4.4 },
  jobBoard: { shape: "square", color: "#ffd77b", size: 6.4 },
  returnJobBoard: { shape: "square", color: "#ffde91", size: 6.4 },
  roadSign: { shape: "circle", color: "#f4c170", size: 4.7 },
  townBark: { shape: "circle", color: "#f6d08b", size: 4.4 },
  smokeCache: { shape: "diamond", color: "#e0bd87", size: 5.2 },
  slimeTell: { shape: "triangle", color: "#8fe66a", size: 5.2 },
  roadSlime: { shape: "triangle", color: "#85d86c", size: 5.4 },
  brokenWagon: { shape: "diamond", color: "#ffbf63", size: 5.7 },
});

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function styleFor(kind, upgraded = false) {
  const base = KIND_STYLES[kind] || { shape: "circle", color: "#f0d6a4", size: 4 };
  if (upgraded && (kind === "jobBoard" || kind === "returnJobBoard" || kind === "brokenWagon")) {
    return { ...base, color: "#ffecad", size: base.size + 0.55 };
  }
  return base;
}

function calculateBounds(route) {
  const xs = route.map((point) => finiteNumber(point.x, 0));
  const ys = route.map((point) => finiteNumber(point.y, 0));
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function createProjector(route, size = DEFAULT_SIZE) {
  const bounds = calculateBounds(route);
  const width = finiteNumber(size.width, DEFAULT_SIZE.width);
  const height = finiteNumber(size.height, DEFAULT_SIZE.height);
  const padding = finiteNumber(size.padding, DEFAULT_SIZE.padding);
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const routeW = spanX * scale;
  const routeH = spanY * scale;
  const offsetX = (width - routeW) / 2;
  const offsetY = (height - routeH) / 2;

  const project = (point) => ({
    mapX: clamp(offsetX + (finiteNumber(point.x, bounds.minX) - bounds.minX) * scale, padding * 0.55, width - padding * 0.55),
    mapY: clamp(offsetY + (finiteNumber(point.y, bounds.minY) - bounds.minY) * scale, padding * 0.55, height - padding * 0.55),
  });

  return { project, width, height, padding, bounds };
}

function worldPointFromPosition(position, fallback = FIRST_FIVE_ROUTE[0]) {
  if (!position) return fallback;
  const x = finiteNumber(position.x, fallback.x);
  const y = finiteNumber(position.z, finiteNumber(position.y, fallback.y));
  return { x, y };
}

function worldDistance(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot(finiteNumber(a.x, 0) - finiteNumber(b.x, 0), finiteNumber(a.y, 0) - finiteNumber(b.y, 0));
}

function formatDistance(distance) {
  if (!Number.isFinite(distance)) return "distance unknown";
  const paces = Math.max(0, Math.round(distance * 5));
  return `${paces} paces`;
}

function choiceCueFor(optionId) {
  if (optionId === "ask_danger") {
    return { optionId, kind: "slimeTell", label: "Marsh warning marked" };
  }
  if (optionId === "inspect_survey") {
    return { optionId, kind: "brokenWagon", label: "Survey scrap lead marked" };
  }
  if (optionId === "accept_bounty") {
    return { optionId, kind: "smokeCache", label: "Bounty cache road marked" };
  }
  return null;
}

function pathD(points) {
  if (!Array.isArray(points) || points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.mapX.toFixed(1)} ${point.mapY.toFixed(1)}`)
    .join(" ");
}

export function buildFieldMapRouteModel(loopState = {}, options = {}) {
  const phase = loopState?.phase || "spawn";
  const activeIndex = PHASE_ROUTE_INDEX[phase] ?? PHASE_ROUTE_INDEX.spawn;
  const progress = getPhaseProgress(phase);
  const projector = createProjector(FIRST_FIVE_ROUTE, options.size);
  const route = FIRST_FIVE_ROUTE.map((point) => ({
    ...point,
    ...projector.project(point),
  }));
  const beats = loopState?.routeBeats || {};
  const upgraded = phase === "survey_teaser" || Boolean(beats.returnToBoone);
  const targetPoint = route[activeIndex] || route[1] || route[0];
  const activePath = route.slice(0, activeIndex + 1);
  const returnUnlocked = Boolean(beats.wagonSalvage) || phase === "return_to_boone" || phase === "survey_teaser";
  const returnPath = returnUnlocked ? route.slice(7, 9) : [];
  const playerWorld = worldPointFromPosition(options.playerPosition || loopState?.playerPosition || loopState?.player, FIRST_FIVE_ROUTE[0]);
  const playerMap = projector.project(playerWorld);
  const distanceToTarget = worldDistance(playerWorld, targetPoint);
  const choiceCue = choiceCueFor(loopState?.boardChoice);

  const points = route.map((point, index) => {
    const style = styleFor(point.kind, upgraded);
    const isThreat = point.kind === "slimeTell" || point.kind === "roadSlime";
    const isChoiceCue = Boolean(choiceCue && point.kind === choiceCue.kind);
    return {
      kind: point.kind,
      label: isChoiceCue ? `${point.label} — ${choiceCue.label}` : point.label,
      x: Number(point.mapX.toFixed(2)),
      y: Number(point.mapY.toFixed(2)),
      shape: style.shape,
      color: isChoiceCue ? "#ffecad" : style.color,
      size: isChoiceCue ? style.size + 0.35 : style.size,
      active: index === activeIndex,
      completed: index < activeIndex || (upgraded && point.kind === "jobBoard"),
      warning: isThreat && activeIndex >= 4,
      muted: isThreat && activeIndex < 4,
      choice: isChoiceCue,
    };
  });

  return {
    phase: progress.phase,
    activeIndex,
    activeKind: targetPoint.kind,
    targetLabel: targetPoint.label,
    progressLabel: `Road beat ${progress.label}`,
    statusLabel: upgraded
      ? "Old Road Survey marked"
      : choiceCue
        ? choiceCue.label
        : `Road beat ${progress.label}`,
    upgraded,
    choiceCue,
    playerPoint: {
      x: Number(playerMap.mapX.toFixed(2)),
      y: Number(playerMap.mapY.toFixed(2)),
      worldX: Number(playerWorld.x.toFixed(2)),
      worldY: Number(playerWorld.y.toFixed(2)),
      label: "You",
    },
    distanceToTarget: Number(distanceToTarget.toFixed(2)),
    distanceLabel: formatDistance(distanceToTarget),
    completedKinds: points.filter((point) => point.completed).map((point) => point.kind),
    warningKinds: points.filter((point) => point.warning).map((point) => point.kind),
    path: pathD(route.slice(0, 8)),
    activePath: pathD(activePath),
    returnPath: pathD(returnPath),
    points,
  };
}

// Per-POI visual styles for the world minimap.
// Dustward is the player hub — warmer and slightly larger.
// Others use muted parchment tones that read as distant waypoints.
const WORLD_POI_STYLES = Object.freeze({
  dustward:  { color: "#ffd77b", size: 7.2 },
  eastwater: { color: "#d4b882", size: 5.8 },
  folly:     { color: "#c9a96e", size: 5.4 },
  wash:      { color: "#b8c49a", size: 5.4 },
  westPass:  { color: "#c8b07a", size: 5.6 },
});

// Build the four corner points of OPEN_RANGE_BOUNDS so createProjector can
// derive bounds from them — reuses the existing calculateBounds math.
function boundsCorners(bounds) {
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
}

export function buildFieldMapWorldModel(loopState = {}, options = {}) {
  const size = options.size || DEFAULT_SIZE;
  const corners = boundsCorners(OPEN_RANGE_BOUNDS);
  const projector = createProjector(corners, size);

  // Roads: each OPEN_RANGE_ROADS segment as a 2-point path,
  // plus FIRST_FIVE_ROUTE as a single polyline.
  const roadPaths = OPEN_RANGE_ROADS.map((seg) => {
    const a = projector.project(seg.from);
    const b = projector.project(seg.to);
    return pathD([a, b]);
  });
  const firstFiveProjected = FIRST_FIVE_ROUTE.map((pt) => projector.project({ x: pt.x, y: pt.y }));
  roadPaths.push(pathD(firstFiveProjected));

  // POIs
  const pois = WORLD_MAP_POIS.map((poi) => {
    const { mapX, mapY } = projector.project({ x: poi.x, y: poi.y });
    const style = WORLD_POI_STYLES[poi.id] || { color: "#c9a96e", size: 5.4 };
    return {
      id: poi.id,
      label: poi.label,
      x: Number(mapX.toFixed(2)),
      y: Number(mapY.toFixed(2)),
      shape: "circle",
      color: style.color,
      size: style.size,
      active: false,
      completed: false,
      warning: false,
      muted: false,
      choice: false,
    };
  });

  // Player position
  const playerWorld = worldPointFromPosition(
    options.playerPosition || loopState?.playerPosition || loopState?.player,
    FIRST_FIVE_ROUTE[0],
  );
  const playerMap = projector.project(playerWorld);

  // Yaw rotation — convention (from docs/roadmap.md §6):
  //   yaw = 0   → player faces world −z (north on map = −y = map UP)
  //   yaw = −π/2 → player faces world +x (east = map RIGHT)
  //
  // In the SVG the cone at yaw=0 points map-up (north), which is rotation 0°.
  // Each step of yaw clockwise (−) in world = clockwise in SVG (+°).
  // So SVG rotation degrees = −yaw * 180/π.
  //   Verify: yaw=0 → 0°  (north, cone up)  ✓
  //           yaw=−π/2 → +90°  (east, cone right)  ✓
  const rawYaw = options.playerYaw !== undefined ? options.playerYaw : null;
  const playerYaw = (rawYaw !== null && Number.isFinite(rawYaw)) ? rawYaw : null;
  const yawDeg = playerYaw !== null ? -(playerYaw) * (180 / Math.PI) : null;

  // Job target
  let jobTarget = null;
  if (options.jobTarget && Number.isFinite(options.jobTarget.x) && Number.isFinite(options.jobTarget.y)) {
    const jt = projector.project({ x: options.jobTarget.x, y: options.jobTarget.y });
    jobTarget = {
      x: Number(jt.mapX.toFixed(2)),
      y: Number(jt.mapY.toFixed(2)),
      label: options.jobTarget.label || "Target",
    };
  }

  // Find the nearest POI to label as the status location
  let nearestPoi = null;
  let nearestDist = Infinity;
  for (const poi of WORLD_MAP_POIS) {
    const d = Math.hypot(playerWorld.x - poi.x, playerWorld.y - poi.y);
    if (d < nearestDist) { nearestDist = d; nearestPoi = poi; }
  }
  const statusLabel = "Open Range";
  const targetLabel = nearestPoi ? nearestPoi.label : "Open Range";

  return {
    roads: roadPaths,
    pois,
    playerPoint: {
      x: Number(playerMap.mapX.toFixed(2)),
      y: Number(playerMap.mapY.toFixed(2)),
      worldX: Number(playerWorld.x.toFixed(2)),
      worldY: Number(playerWorld.y.toFixed(2)),
      label: "You",
    },
    playerYaw,
    yawDeg,
    jobTarget,
    statusLabel,
    targetLabel,
  };
}

// Pure: determines which map mode to render.
// override wins if it is "route" or "world".
// Falls back to "world" at survey_teaser phase, else "route".
export function resolveFieldMapMode(loopState = {}, override = null) {
  if (override === "route" || override === "world") return override;
  if (loopState?.phase === "survey_teaser") return "world";
  return "route";
}

export function createFieldMapDomRefs(rootDocument = globalThis.document) {
  const doc = rootDocument && typeof rootDocument.querySelector === "function"
    ? rootDocument
    : null;
  return {
    root: doc?.querySelector("#field-map") || null,
    svg: doc?.querySelector("#field-map-svg") || null,
    phaseLabel: doc?.querySelector("#field-map .map-phase") || null,
    targetLabel: doc?.querySelector("#field-map .map-target") || null,
    createElementNS: typeof doc?.createElementNS === "function"
      ? doc.createElementNS.bind(doc)
      : null,
  };
}

function svgNode(refs, tag) {
  return refs?.createElementNS ? refs.createElementNS(SVG_NS, tag) : null;
}

function setAttrs(node, attrs) {
  if (!node) return node;
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  }
  return node;
}

function appendPath(refs, parent, className, d) {
  if (!d) return;
  const path = setAttrs(svgNode(refs, "path"), { class: className, d });
  if (path) parent?.appendChild?.(path);
}

function appendMarker(refs, parent, point) {
  const cls = [
    "map-marker",
    `is-${point.shape}`,
    point.active ? "is-active" : "",
    point.completed ? "is-complete" : "",
    point.warning ? "is-warning" : "",
    point.muted ? "is-muted" : "",
    point.choice ? "is-choice" : "",
  ].filter(Boolean).join(" ");
  let node = null;
  const s = point.size;
  if (point.shape === "square" || point.shape === "diamond") {
    node = setAttrs(svgNode(refs, "rect"), {
      class: cls,
      x: point.x - s / 2,
      y: point.y - s / 2,
      width: s,
      height: s,
      rx: point.shape === "square" ? 0.8 : 0.4,
      transform: point.shape === "diamond" ? `rotate(45 ${point.x} ${point.y})` : null,
    });
  } else if (point.shape === "triangle") {
    node = setAttrs(svgNode(refs, "path"), {
      class: cls,
      d: `M ${point.x.toFixed(2)} ${(point.y - s).toFixed(2)} L ${(point.x + s * 0.9).toFixed(2)} ${(point.y + s * 0.72).toFixed(2)} L ${(point.x - s * 0.9).toFixed(2)} ${(point.y + s * 0.72).toFixed(2)} Z`,
    });
  } else {
    node = setAttrs(svgNode(refs, "circle"), {
      class: cls,
      cx: point.x,
      cy: point.y,
      r: s / 2,
    });
  }
  node?.style?.setProperty?.("--marker-color", point.color);
  const title = svgNode(refs, "title");
  if (title) {
    title.textContent = point.label;
    node?.appendChild?.(title);
  }
  if (node) parent?.appendChild?.(node);
}

function appendPlayerMarker(refs, parent, point) {
  if (!point) return;
  const group = setAttrs(svgNode(refs, "g"), {
    class: "map-player",
    transform: `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`,
  });
  const cone = setAttrs(svgNode(refs, "path"), {
    class: "map-player-cone",
    d: "M 0 -8 L 4.4 4.8 L 0 2.4 L -4.4 4.8 Z",
  });
  const ring = setAttrs(svgNode(refs, "circle"), {
    class: "map-player-ring",
    cx: 0,
    cy: 0,
    r: 5.3,
  });
  const dot = setAttrs(svgNode(refs, "circle"), {
    class: "map-player-dot",
    cx: 0,
    cy: 0,
    r: 2.6,
  });
  const title = svgNode(refs, "title");
  if (title) title.textContent = point.label || "You";
  group?.appendChild?.(cone);
  group?.appendChild?.(ring);
  group?.appendChild?.(dot);
  if (title) group?.appendChild?.(title);
  if (group) parent?.appendChild?.(group);
}

// Append a POI name label as SVG <text> under the marker.
function appendPoiLabel(refs, parent, point) {
  const text = setAttrs(svgNode(refs, "text"), {
    class: "map-poi-label",
    x: point.x,
    y: point.y + point.size / 2 + 7,
    "text-anchor": "middle",
  });
  if (text) {
    text.textContent = point.label;
    parent?.appendChild?.(text);
  }
}

// Extended player marker that rotates the cone when yawDeg is a finite number.
// yawDeg = −yaw * 180/π (see buildFieldMapWorldModel for sign derivation).
function appendPlayerMarkerWithYaw(refs, parent, point, yawDeg) {
  if (!point) return;
  const translatePart = `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`;
  const rotatePart = (yawDeg !== null && Number.isFinite(yawDeg))
    ? ` rotate(${yawDeg.toFixed(2)})`
    : "";
  const group = setAttrs(svgNode(refs, "g"), {
    class: "map-player",
    transform: translatePart + rotatePart,
  });
  const cone = setAttrs(svgNode(refs, "path"), {
    class: "map-player-cone",
    d: "M 0 -8 L 4.4 4.8 L 0 2.4 L -4.4 4.8 Z",
  });
  const ring = setAttrs(svgNode(refs, "circle"), {
    class: "map-player-ring",
    cx: 0,
    cy: 0,
    r: 5.3,
  });
  const dot = setAttrs(svgNode(refs, "circle"), {
    class: "map-player-dot",
    cx: 0,
    cy: 0,
    r: 2.6,
  });
  const title = svgNode(refs, "title");
  if (title) title.textContent = point.label || "You";
  group?.appendChild?.(cone);
  group?.appendChild?.(ring);
  group?.appendChild?.(dot);
  if (title) group?.appendChild?.(title);
  if (group) parent?.appendChild?.(group);
}

// syncFieldMapDom options shape (orchestrator wires spike.js to this):
//   options.mode          — "route" | "world" | null/undefined (auto-resolved)
//   options.playerPosition — { x, y } or { x, z } Three.js position
//   options.playerYaw     — number (radians); world yaw=0 faces −z (north/map-up)
//   options.jobTarget     — { x, y, label } active quest destination in world coords
//   options.size          — { width, height, padding } override (rarely needed)
export function syncFieldMapDom(refs, loopState = {}, options = {}) {
  const mode = resolveFieldMapMode(loopState, options.mode || null);

  if (mode === "world") {
    const model = buildFieldMapWorldModel(loopState, options);
    if (refs?.phaseLabel) refs.phaseLabel.textContent = model.statusLabel;
    if (refs?.targetLabel) refs.targetLabel.textContent = model.targetLabel;
    if (refs?.root?.dataset) {
      refs.root.dataset.phase = "world";
      refs.root.dataset.activeKind = "";
      refs.root.dataset.upgraded = "false";
      refs.root.dataset.boardChoice = "";
    }
    if (!refs?.svg || !refs.createElementNS) return model;

    const svg = refs.svg;
    if (typeof svg.replaceChildren === "function") svg.replaceChildren();
    while (svg.firstChild && typeof svg.removeChild === "function") svg.removeChild(svg.firstChild);

    setAttrs(svg, { viewBox: "0 0 220 142", role: "img", "aria-label": "Open Range world map" });
    const layer = svgNode(refs, "g");
    if (layer) svg.appendChild(layer);

    // Draw roads (no mesa/marsh doodles in world mode)
    for (const d of model.roads) appendPath(refs, layer, "map-world-road", d);

    // Draw POI markers with labels
    for (const poi of model.pois) {
      appendMarker(refs, layer, poi);
      appendPoiLabel(refs, layer, poi);
    }

    // Job target as active pulsing marker
    if (model.jobTarget) {
      const jt = {
        ...model.jobTarget,
        shape: "circle",
        color: "#ffd77b",
        size: 6,
        active: true,
        completed: false,
        warning: false,
        muted: false,
        choice: false,
      };
      appendMarker(refs, layer, jt);
    }

    // Player marker with optional yaw rotation
    appendPlayerMarkerWithYaw(refs, layer, model.playerPoint, model.yawDeg);
    return model;
  }

  // Route mode — pixel-identical to the original implementation
  const model = buildFieldMapRouteModel(loopState, options);
  if (refs?.phaseLabel) refs.phaseLabel.textContent = model.statusLabel;
  if (refs?.targetLabel) refs.targetLabel.textContent = model.targetLabel;
  if (refs?.targetLabel && model.distanceLabel) refs.targetLabel.textContent = `${model.targetLabel} · ${model.distanceLabel}`;
  if (refs?.root?.dataset) {
    refs.root.dataset.phase = model.phase;
    refs.root.dataset.activeKind = model.activeKind;
    refs.root.dataset.upgraded = model.upgraded ? "true" : "false";
    refs.root.dataset.boardChoice = model.choiceCue?.optionId || "";
  }
  if (!refs?.svg || !refs.createElementNS) return model;

  const svg = refs.svg;
  if (typeof svg.replaceChildren === "function") svg.replaceChildren();
  while (svg.firstChild && typeof svg.removeChild === "function") svg.removeChild(svg.firstChild);

  setAttrs(svg, { viewBox: "0 0 220 142", role: "img", "aria-label": "Dustward first-road field map" });
  const layer = svgNode(refs, "g");
  svg.appendChild(layer);

  const mesa = setAttrs(svgNode(refs, "path"), {
    class: "map-mesa",
    d: "M 8 39 L 20 29 L 32 36 L 45 24 L 62 39 L 77 31 L 91 40",
  });
  const marsh = setAttrs(svgNode(refs, "ellipse"), {
    class: "map-marsh",
    cx: 172,
    cy: 92,
    rx: 38,
    ry: 16,
  });
  if (mesa) layer?.appendChild?.(mesa);
  if (marsh) layer?.appendChild?.(marsh);

  appendPath(refs, layer, "map-route-shadow", model.path);
  appendPath(refs, layer, "map-route", model.path);
  appendPath(refs, layer, "map-return-route", model.returnPath);
  appendPath(refs, layer, "map-active-route", model.activePath);
  for (const point of model.points) appendMarker(refs, layer, point);
  appendPlayerMarker(refs, layer, model.playerPoint);
  return model;
}
