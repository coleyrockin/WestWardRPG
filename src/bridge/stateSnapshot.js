import {
  resolveFirstFiveMinuteLoop,
  resolveFirstMinutePressure,
  resolveOpeningFightCue,
} from "../gameFeel.js";
import { resolveFirstRoadMemoryStatus } from "../firstRoadMemory.js";

export const RENDER_SNAPSHOT_VERSION = 1;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function round(value, digits = 2) {
  const n = finite(value, 0);
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function compactMarker(marker = null) {
  if (!marker || !Number.isFinite(marker.x) || !Number.isFinite(marker.y)) return null;
  return {
    id: text(marker.id, null),
    kind: text(marker.kind, "marker"),
    label: text(marker.label, "Marker"),
    x: round(marker.x),
    y: round(marker.y),
    color: text(marker.color, "#ffd77b"),
    size: round(Number.isFinite(marker.size) ? marker.size : 0.8),
    action: text(marker.action, null),
    distanceLine: text(marker.distanceLine, null),
    regionHint: text(marker.regionHint, null),
    returnTarget: Boolean(marker.returnTarget),
    blocking: Boolean(marker.blocking),
  };
}

function compactActor(actor = {}) {
  if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return null;
  return {
    id: text(actor.id, null),
    kind: text(actor.kind || actor.type, "actor"),
    label: text(actor.label || actor.name, "Actor"),
    x: round(actor.x),
    y: round(actor.y),
    hp: Number.isFinite(actor.hp) ? Math.max(0, Math.round(actor.hp)) : null,
    alive: actor.alive !== false,
    behavior: text(actor.behavior, null),
    color: text(actor.color, null),
    openingPatrol: Boolean(actor.openingPatrol),
  };
}

function compactLight(light = {}) {
  if (!Number.isFinite(light.x) || !Number.isFinite(light.y)) return null;
  return {
    id: text(light.id, null),
    kind: text(light.kind, "light"),
    x: round(light.x),
    y: round(light.y),
    radius: round(light.radius, 1),
    intensity: round(light.intensity, 2),
    color: text(light.color, "#ffd77b"),
  };
}

function compactPlacement(placement = {}) {
  if (!Number.isFinite(placement.x) || !Number.isFinite(placement.y)) return null;
  return {
    id: text(placement.id, null),
    kind: text(placement.kind, "prop"),
    label: text(placement.label, "Prop"),
    x: round(placement.x),
    y: round(placement.y),
    color: text(placement.color, "#d8a84f"),
    size: round(Number.isFinite(placement.size) ? placement.size : 0.8),
    depthLane: text(placement.depthLane, null),
  };
}

function compactObjective(loop = null) {
  if (!loop) return null;
  return {
    id: text(loop.id, "first-five-minute-loop"),
    title: text(loop.title, "Mission"),
    phase: text(loop.phase, "unknown"),
    currentTarget: text(loop.currentTarget, ""),
    nextAction: text(loop.nextAction, ""),
    objectiveLine: text(loop.objectiveLine || loop.actionLine, ""),
    secondaryLine: text(loop.secondaryLine, ""),
    payoffLine: text(loop.payoffLine, ""),
    urgency: text(loop.urgency, "medium"),
    regionHint: text(loop.regionHint, ""),
    marker: compactMarker(loop.marker),
  };
}

function compactList(values, mapper) {
  return (Array.isArray(values) ? values : [])
    .map(mapper)
    .filter(Boolean);
}

function uniqueByPosition(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = [value.kind, value.id || value.label, value.x, value.y].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createRenderSnapshot(state = {}, options = {}) {
  const playerSource = options.player || state.player || {};
  const regions = state.regions || options.regions || {};
  const regionId = text(options.regionId || regions.activeRegion || playerSource.regionId, "frontier");
  const mode = text(options.mode || state.mode, "playing");
  const timeValue = finite(options.time ?? state.time, 0);
  const inHouse = Boolean(options.inHouse ?? playerSource.inHouse ?? state.player?.inHouse);
  const inventory = options.inventory || state.inventory || {};
  const quests = options.quests || state.quests || {};
  const world = state.world || {};
  const jobState = options.jobState || world.jobs || state.jobState || {};
  const house = options.house || state.house || {};
  const narrative = options.narrative || state.narrative || {};
  const weather = options.weather || state.weather || {};
  const player = {
    x: round(playerSource.x ?? 9.5),
    y: round(playerSource.y ?? 8.5),
    angle: round(playerSource.angle ?? playerSource.a ?? 0, 3),
    regionId,
    inHouse,
  };

  const boardProp = options.boardProp || state.boardProp || null;
  const roadDiscoveryLead = options.roadDiscoveryLead || state.roadDiscoveryLead || null;
  const activeJob = options.activeJob || state.activeJob || null;
  const jobMarker = options.jobMarker || state.jobMarker || null;
  const enemies = options.enemies || state.enemies || [];
  const pressure = options.pressure || resolveFirstMinutePressure({
    mode,
    time: timeValue,
    inHouse,
    regionId,
    player,
    inventory,
    quests,
  });
  const fightCue = options.fightCue || resolveOpeningFightCue({
    mode,
    time: timeValue,
    inHouse,
    regionId,
    player,
    inventory,
    quests,
    pressure,
    enemies,
  });
  const firstRoadMemory = options.firstRoadMemory || resolveFirstRoadMemoryStatus({
    regions,
    inventory,
    jobState,
    house,
    narrative,
    regionId,
  });
  const firstFiveMinuteLoop = options.firstFiveMinuteLoop || resolveFirstFiveMinuteLoop({
    mode,
    inHouse,
    regionId,
    regionLabel: text(options.regionLabel || regions.activeRegionLabel, "Westward Frontier"),
    player,
    inventory,
    activeJob,
    boardProp,
    jobMarker,
    firstRoadMemory,
    pressure,
    fightCue,
    chest: options.chest || state.chest || {},
    roadDiscoveryLead,
  });
  const objective = compactObjective(firstFiveMinuteLoop);
  const pressureMarker = compactMarker(pressure?.marker);
  const fightMarker = compactMarker(fightCue?.marker);
  const boardMarker = compactMarker(boardProp);
  const roadDiscoveryMarker = compactMarker(roadDiscoveryLead);
  const jobRouteMarker = compactMarker(jobMarker);

  const routeMarkers = uniqueByPosition([
    jobRouteMarker,
    objective?.marker,
    pressureMarker,
    fightMarker,
  ].filter(Boolean));
  const interactables = uniqueByPosition([
    boardMarker,
    pressureMarker,
    roadDiscoveryMarker,
    ...compactList(options.interactables || state.interactables, compactMarker),
  ].filter(Boolean));

  const snapshot = {
    schemaVersion: RENDER_SNAPSHOT_VERSION,
    kind: "westward-render-snapshot",
    mode,
    player,
    region: {
      id: regionId,
      label: text(options.regionLabel || regions.activeRegionLabel, "Westward Frontier"),
    },
    time: {
      elapsed: round(timeValue, 2),
      dayTime: round(options.dayTime ?? world.timeOfDay ?? 0, 3),
    },
    weather: {
      kind: text(weather.kind, "clear"),
      rain: round(weather.rain, 3),
      fog: round(weather.fog, 3),
      wind: round(weather.wind, 3),
      lightning: round(weather.lightning, 3),
      quality: text(weather.quality, "balanced"),
    },
    objective,
    firstFiveMinuteLoop: objective,
    firstRoadMemory: {
      phase: text(firstRoadMemory?.phase, "visible"),
      title: text(firstRoadMemory?.title, "First Road Memory"),
      nextStep: text(firstRoadMemory?.nextStep, ""),
      runSummaryLine: text(firstRoadMemory?.runSummaryLine, ""),
    },
    interactables,
    npcs: compactList(options.npcs || state.npcs, compactActor),
    enemies: compactList(enemies, compactActor),
    pois: compactList(options.pois || state.pois, compactMarker),
    routeMarkers,
    lights: compactList(options.lights || state.lights, compactLight),
    combatCues: compactList([fightCue?.marker], compactMarker),
    worldObjects: compactList(options.worldObjects || state.worldObjects, compactPlacement),
  };

  return JSON.parse(JSON.stringify(snapshot));
}
