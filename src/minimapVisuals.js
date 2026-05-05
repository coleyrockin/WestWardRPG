import { clamp } from "./math.js";

function normalizeNightStrength(value) {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1);
}

export function resolveMinimapDotStyle(size = 2, nightStrength = 0) {
  const night = normalizeNightStrength(nightStrength);
  return {
    glowSize: size + 2 + night * 1.6,
    glowAlpha: 0.35 + night * 0.16,
    coreSize: size + night * 0.25,
  };
}

export function resolveMinimapMarkerStyle(size = 3, nightStrength = 0) {
  const night = normalizeNightStrength(nightStrength);
  const glowSize = size + 2.2 + night * 2.6;
  return {
    glowSize,
    glowAlpha: 0.28 + night * 0.2,
    ringVisible: night > 0.18,
    ringSize: glowSize + 1.8,
    ringAlpha: 0.18 + night * 0.2,
  };
}

export function resolveMinimapPolylineStyle(options = {}) {
  const night = normalizeNightStrength(options.nightStrength);
  const alpha = Number.isFinite(options.alpha) ? options.alpha : 0.3;
  const lineWidth = Number.isFinite(options.lineWidth) ? options.lineWidth : 2;
  return {
    alpha: clamp(alpha + night * 0.18, 0, 0.82),
    lineWidth: lineWidth + night * 0.55,
    shadowAlpha: 0.24 + night * 0.22,
    shadowBlur: night * 5,
  };
}
