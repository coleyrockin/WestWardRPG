import { TAU } from "./constants.js";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeOutCubic(t) {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

export function normalizeAngle(angle) {
  let a = angle % TAU;
  if (a < -Math.PI) a += TAU;
  if (a > Math.PI) a -= TAU;
  return a;
}

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function vecLength(x, y) {
  return Math.hypot(x, y);
}

export function normalizeVec(x, y) {
  const mag = Math.hypot(x, y) || 1;
  return { x: x / mag, y: y / mag };
}

export function clampVec(x, y, maxLen) {
  const mag = Math.hypot(x, y);
  if (mag <= maxLen || mag <= 0.0001) return { x, y };
  const scale = maxLen / mag;
  return { x: x * scale, y: y * scale };
}

export function choice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function numberOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function noise2D(x, y, seed) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 73.97) * 43758.5453;
  return n - Math.floor(n);
}

export function shadeHex(hex, mult) {
  const m = clamp(mult, 0, 2.5);
  const r = clamp(Math.floor(parseInt(hex.slice(1, 3), 16) * m), 0, 255);
  const g = clamp(Math.floor(parseInt(hex.slice(3, 5), 16) * m), 0, 255);
  const b = clamp(Math.floor(parseInt(hex.slice(5, 7), 16) * m), 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}
