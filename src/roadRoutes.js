function finiteNumberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value : null;
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

export function normalizeRoadRouteState(route) {
  if (!route || typeof route !== "object" || Array.isArray(route)) return null;
  const targetId = textOrNull(route.targetId);
  const targetLabel = textOrNull(route.targetLabel);
  if (!targetId || !targetLabel) return null;

  return {
    active: route.active !== false,
    source: textOrNull(route.source) || "road_sign",
    targetId,
    targetLabel,
    targetKind: textOrNull(route.targetKind) || "place",
    targetX: finiteNumberOrNull(route.targetX),
    targetY: finiteNumberOrNull(route.targetY),
    regionId: textOrNull(route.regionId),
    dangerHint: textOrNull(route.dangerHint) || "",
    returnReason: textOrNull(route.returnReason) || "",
    distanceLine: textOrNull(route.distanceLine) || "",
    startedAt: Number.isFinite(route.startedAt) ? Math.max(0, route.startedAt) : 0,
  };
}

export function createRoadRouteFromSignPrompt(prompt, context = {}) {
  if (!prompt || typeof prompt !== "object") return null;
  return normalizeRoadRouteState({
    active: true,
    source: "road_sign",
    targetId: prompt.targetId,
    targetLabel: prompt.targetLabel,
    targetKind: prompt.targetKind,
    targetX: prompt.targetX,
    targetY: prompt.targetY,
    regionId: context.regionId || prompt.regionId,
    dangerHint: prompt.dangerHint,
    returnReason: prompt.returnReason,
    distanceLine: prompt.distanceLine,
    startedAt: Number.isFinite(context.time) ? context.time : 0,
  });
}

export function resolveRoadRouteObjective(routeState, playerX, playerY, activeRegionId, options = {}) {
  const route = normalizeRoadRouteState(routeState);
  if (!route || route.active === false) return null;
  if (route.regionId && activeRegionId && route.regionId !== activeRegionId) return null;

  const arrivalRadius = Number.isFinite(options.arrivalRadius) ? Math.max(0, options.arrivalRadius) : 1.5;
  const hasTargetPosition = Number.isFinite(route.targetX) && Number.isFinite(route.targetY);
  const distance = hasTargetPosition ? Number(Math.hypot(route.targetX - playerX, route.targetY - playerY).toFixed(1)) : null;
  const direction = hasTargetPosition ? directionLabel(route.targetX - playerX, route.targetY - playerY) : null;
  const distanceLine = distance === null ? route.distanceLine : `${distance} tiles ${direction}`;
  const arrived = distance !== null && distance <= arrivalRadius;
  const kind = route.targetKind === "place" ? "destination" : route.targetKind;
  const objectiveLine = arrived
    ? `Arrived: ${route.targetLabel} ${kind}`
    : `Follow sign: ${route.targetLabel} ${kind}${distanceLine ? ` - ${distanceLine}` : ""}`;
  const secondaryLine = [route.dangerHint, route.returnReason].filter(Boolean).join(" ");

  return {
    id: `road-route-${route.targetId}`,
    title: "Pinned road",
    status: arrived ? "arrived" : "active",
    targetId: route.targetId,
    targetKind: route.targetKind,
    targetLabel: route.targetLabel,
    x: route.targetX,
    y: route.targetY,
    distance,
    direction,
    distanceLine,
    urgency: arrived || route.dangerHint.startsWith("High danger") ? "high" : "medium",
    objectiveLine,
    secondaryLine,
    line: `${objectiveLine}. ${secondaryLine}`,
  };
}
