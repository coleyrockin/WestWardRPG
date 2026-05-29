// Selectable time-of-day palettes for the render3d spike.
//
// Pure data + helpers (no Three.js) so palette selection and tweening are
// unit-testable in the node test env. atmosphere.js consumes a palette and
// drives the sky shader, lights, fog, exposure, and post-bloom strength.
//
// A palette is a flat descriptor of every mood-driving value at one time of
// day. lerpPalette() blends two palettes so the renderer can smoothly drift
// between states instead of hard-cutting.

export const TIME_KEYS = Object.freeze(["dusk", "goldenHour", "night"]);

export const PALETTES = Object.freeze({
  dusk: {
    key: "dusk",
    label: "Dusk",
    sky: { top: "#1a0f33", mid: "#472a6b", horizon: "#d0784a" },
    fog: { color: "#8a6a9a", density: 0.02 },
    sun: { color: "#ffae6a", intensity: 1.3, dir: { x: -8, y: 6, z: -5 }, disc: 0.02, glow: 0.13 },
    hemi: { sky: "#5a2890", ground: "#1e0e04", intensity: 0.6 },
    rim: { color: "#5a6bd0", intensity: 0.35, dir: { x: 9, y: 5, z: 6 } },
    exposure: 1.05,
    stars: 0.12,
    bloom: 0.75,
    grade: { tint: "#ff8a4a", amount: 0.12 },
    bodyBg: "#1a1226",
  },
  goldenHour: {
    key: "goldenHour",
    label: "Golden Hour",
    sky: { top: "#2a3a6b", mid: "#c4825a", horizon: "#ffd27a" },
    fog: { color: "#c9a07a", density: 0.011 },
    sun: { color: "#ffd9a0", intensity: 1.85, dir: { x: -11, y: 4.5, z: -4 }, disc: 0.032, glow: 0.2 },
    hemi: { sky: "#8aa0d0", ground: "#3a2a18", intensity: 0.85 },
    rim: { color: "#7aa0ff", intensity: 0.25, dir: { x: 9, y: 5, z: 6 } },
    exposure: 1.16,
    stars: 0,
    bloom: 0.5,
    grade: { tint: "#ffb060", amount: 0.15 },
    bodyBg: "#2a1f2e",
  },
  night: {
    key: "night",
    label: "Night",
    sky: { top: "#05071a", mid: "#121636", horizon: "#2a2350" },
    fog: { color: "#12162c", density: 0.03 },
    sun: { color: "#aeb8ff", intensity: 0.55, dir: { x: 8, y: 8, z: -3 }, disc: 0.026, glow: 0.1 },
    hemi: { sky: "#20284a", ground: "#050507", intensity: 0.35 },
    rim: { color: "#ff9a5a", intensity: 0.18, dir: { x: -7, y: 4, z: 6 } },
    exposure: 1.0,
    stars: 1.0,
    bloom: 1.25,
    grade: { tint: "#5a6bd0", amount: 0.12 },
    bodyBg: "#05060f",
  },
});

export function getPalette(key) {
  return PALETTES[key] || PALETTES.dusk;
}

export function nextTimeKey(key) {
  const i = TIME_KEYS.indexOf(key);
  return TIME_KEYS[(i + 1) % TIME_KEYS.length] || "dusk";
}

const lerp = (a, b, t) => a + (b - a) * t;

function hexToRgb(h) {
  const n = parseInt(String(h).slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// Blend two sRGB hex colors. Good enough for atmosphere tweening.
export function lerpColor(h1, h2, t) {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  return rgbToHex({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });
}

const lerpVec = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

// Blend two palettes. t in [0,1]; t<0.5 keeps p1's key/label, else p2's.
export function lerpPalette(p1, p2, t) {
  return {
    key: t < 0.5 ? p1.key : p2.key,
    label: t < 0.5 ? p1.label : p2.label,
    sky: {
      top: lerpColor(p1.sky.top, p2.sky.top, t),
      mid: lerpColor(p1.sky.mid, p2.sky.mid, t),
      horizon: lerpColor(p1.sky.horizon, p2.sky.horizon, t),
    },
    fog: { color: lerpColor(p1.fog.color, p2.fog.color, t), density: lerp(p1.fog.density, p2.fog.density, t) },
    sun: {
      color: lerpColor(p1.sun.color, p2.sun.color, t),
      intensity: lerp(p1.sun.intensity, p2.sun.intensity, t),
      dir: lerpVec(p1.sun.dir, p2.sun.dir, t),
      disc: lerp(p1.sun.disc, p2.sun.disc, t),
      glow: lerp(p1.sun.glow, p2.sun.glow, t),
    },
    hemi: {
      sky: lerpColor(p1.hemi.sky, p2.hemi.sky, t),
      ground: lerpColor(p1.hemi.ground, p2.hemi.ground, t),
      intensity: lerp(p1.hemi.intensity, p2.hemi.intensity, t),
    },
    rim: {
      color: lerpColor(p1.rim.color, p2.rim.color, t),
      intensity: lerp(p1.rim.intensity, p2.rim.intensity, t),
      dir: t < 0.5 ? p1.rim.dir : p2.rim.dir,
    },
    exposure: lerp(p1.exposure, p2.exposure, t),
    stars: lerp(p1.stars, p2.stars, t),
    bloom: lerp(p1.bloom, p2.bloom, t),
    grade: { tint: lerpColor(p1.grade.tint, p2.grade.tint, t), amount: lerp(p1.grade.amount, p2.grade.amount, t) },
    bodyBg: lerpColor(p1.bodyBg, p2.bodyBg, t),
  };
}
