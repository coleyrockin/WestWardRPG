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
  // Dusk is the hero showcase moment (the ?visual capture pins here) — pushed to a
  // dramatic golden-hour-western mood: low warm amber sun for long raking shadows,
  // warm (not purple-milk) haze, cut fill so shadows read, cool rim for silhouette pop.
  dusk: {
    key: "dusk",
    label: "Dusk",
    // Sunset gradient with real depth: deep indigo zenith → violet mid → warm amber
    // horizon. Tamed so lit walls/roofs hold detail instead of blowing to white.
    sky: { top: "#253449", mid: "#75675e", horizon: "#d08a54" },
    fog: { color: "#765d45", density: 0.0058 },
    sun: { color: "#ffbd6e", intensity: 1.05, dir: { x: -10, y: 5.2, z: -5 }, disc: 0.026, glow: 0.055 },
    // Warmer, brighter ground bounce lifts shadowed faces so the foreground reads
    // instead of crushing to dead black — shadows stay rich but not empty.
    hemi: { sky: "#7d8190", ground: "#765027", intensity: 0.82 },
    rim: { color: "#7b87c2", intensity: 0.44, dir: { x: 9, y: 5, z: 6 } },
    exposure: 0.96,
    stars: 0.12,
    bloom: 0.13,
    grade: { tint: "#e6a060", amount: 0.014, contrast: 1.04, saturation: 1.06, shadowTint: "#4b5362", highlightTint: "#e6a060" },
    bodyBg: "#17131d",
  },
  goldenHour: {
    key: "goldenHour",
    label: "Golden Hour",
    sky: { top: "#2a3a6b", mid: "#c4825a", horizon: "#ffd27a" },
    fog: { color: "#caa074", density: 0.008 },
    sun: { color: "#ffcf86", intensity: 3.0, dir: { x: -12, y: 3, z: -4 }, disc: 0.034, glow: 0.22 },
    hemi: { sky: "#8aa0d0", ground: "#3a2a18", intensity: 0.34 },
    rim: { color: "#6a8fff", intensity: 0.85, dir: { x: 9, y: 5, z: 6 } },
    exposure: 1.32,
    stars: 0,
    bloom: 0.55,
    grade: { tint: "#ffb060", amount: 0.04, contrast: 1.08, saturation: 1.08, shadowTint: "#46527a", highlightTint: "#ffc880" },
    bodyBg: "#2a1f2e",
  },
  night: {
    key: "night",
    label: "Night",
    sky: { top: "#05071a", mid: "#121636", horizon: "#2a2350" },
    fog: { color: "#12162c", density: 0.028 },
    sun: { color: "#aeb8ff", intensity: 0.5, dir: { x: 8, y: 8, z: -3 }, disc: 0.026, glow: 0.1 },
    hemi: { sky: "#20284a", ground: "#050507", intensity: 0.24 },
    rim: { color: "#6a7aff", intensity: 0.5, dir: { x: -7, y: 4, z: 6 } },
    exposure: 0.85,
    stars: 1.0,
    bloom: 1.2,
    grade: { tint: "#5a6bd0", amount: 0.05, contrast: 1.12, saturation: 1.08, shadowTint: "#2a3a6a", highlightTint: "#aac0ff" },
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

// Continuous day/night arc (docs/roadmap.md §3, Bet 4) — the smooth-cycle
// successor to the 3 discrete keys. `dayTime01` in [0,1) wraps around the clock:
// 0 = golden hour, ~1/3 = dusk, ~2/3 = night, back to golden. Returns a palette
// blended across the bracketing keys (smoothstep eased), so the sun colour,
// direction, fog, exposure, bloom, and grade all drift continuously rather than
// hard-cutting. Pure — reuses lerpPalette so it's covered by the same tests.
export const ARC_KEYS = Object.freeze(["goldenHour", "dusk", "night"]);

export function sunArc(dayTime01) {
  const t = (((Number(dayTime01) || 0) % 1) + 1) % 1;
  const n = ARC_KEYS.length;
  const scaled = t * n;
  const i = Math.floor(scaled) % n;
  const f = scaled - Math.floor(scaled);
  const ease = f * f * (3 - 2 * f); // smoothstep
  const p = lerpPalette(getPalette(ARC_KEYS[i]), getPalette(ARC_KEYS[(i + 1) % n]), ease);
  p.key = "arc";
  p.label = "Sun Arc";
  return p;
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
      dir: lerpVec(p1.rim.dir, p2.rim.dir, t),
    },
    exposure: lerp(p1.exposure, p2.exposure, t),
    stars: lerp(p1.stars, p2.stars, t),
    bloom: lerp(p1.bloom, p2.bloom, t),
    grade: {
      tint: lerpColor(p1.grade.tint, p2.grade.tint, t),
      amount: lerp(p1.grade.amount, p2.grade.amount, t),
      contrast: lerp(p1.grade.contrast ?? 1.5, p2.grade.contrast ?? 1.5, t),
      saturation: lerp(p1.grade.saturation ?? 1.4, p2.grade.saturation ?? 1.4, t),
      shadowTint: lerpColor(p1.grade.shadowTint ?? "#1a0a2e", p2.grade.shadowTint ?? "#1a0a2e", t),
      highlightTint: lerpColor(p1.grade.highlightTint ?? "#ffb040", p2.grade.highlightTint ?? "#ffb040", t),
    },
    bodyBg: lerpColor(p1.bodyBg, p2.bodyBg, t),
  };
}
