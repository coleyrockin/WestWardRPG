// Compact route-map HUD for the Three.js first-road slice.
// Pure route projection is exported for tests; DOM sync stays thin.

import { FIRST_FIVE_ROUTE } from "./frontierLayout.js";
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

function projectRoute(route, size = DEFAULT_SIZE) {
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

  return route.map((point) => ({
    ...point,
    mapX: offsetX + (finiteNumber(point.x, bounds.minX) - bounds.minX) * scale,
    mapY: offsetY + (finiteNumber(point.y, bounds.minY) - bounds.minY) * scale,
  }));
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
  const route = projectRoute(FIRST_FIVE_ROUTE, options.size);
  const beats = loopState?.routeBeats || {};
  const upgraded = phase === "survey_teaser" || Boolean(beats.returnToBoone);
  const targetPoint = route[activeIndex] || route[1] || route[0];
  const activePath = route.slice(0, activeIndex + 1);
  const returnPath = route.slice(7, 9);

  const points = route.map((point, index) => {
    const style = styleFor(point.kind, upgraded);
    const isThreat = point.kind === "slimeTell" || point.kind === "roadSlime";
    return {
      kind: point.kind,
      label: point.label,
      x: Number(point.mapX.toFixed(2)),
      y: Number(point.mapY.toFixed(2)),
      shape: style.shape,
      color: style.color,
      size: style.size,
      active: index === activeIndex,
      completed: index < activeIndex || (upgraded && point.kind === "jobBoard"),
      warning: isThreat && activeIndex >= 4,
      muted: isThreat && activeIndex < 4,
    };
  });

  return {
    phase: progress.phase,
    activeKind: targetPoint.kind,
    targetLabel: targetPoint.label,
    progressLabel: `Road beat ${progress.label}`,
    statusLabel: upgraded ? "Old Road Survey marked" : `Road beat ${progress.label}`,
    upgraded,
    path: pathD(route.slice(0, 8)),
    activePath: pathD(activePath),
    returnPath: pathD(returnPath),
    points,
  };
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

export function syncFieldMapDom(refs, loopState = {}) {
  const model = buildFieldMapRouteModel(loopState);
  if (refs?.phaseLabel) refs.phaseLabel.textContent = model.statusLabel;
  if (refs?.targetLabel) refs.targetLabel.textContent = model.targetLabel;
  if (refs?.root?.dataset) {
    refs.root.dataset.phase = model.phase;
    refs.root.dataset.activeKind = model.activeKind;
    refs.root.dataset.upgraded = model.upgraded ? "true" : "false";
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
  return model;
}
