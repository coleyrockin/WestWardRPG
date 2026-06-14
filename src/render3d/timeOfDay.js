// Selectable time-of-day palettes for the render3d spike.
//
// Pure data + helpers (no Three.js) so palette selection and tweening are
// unit-testable in the node test env. atmosphere.js consumes a palette and
// drives the sky shader, lights, fog, exposure, and post-bloom strength.
//
// A palette is a flat descriptor of every mood-driving value at one time of
// day. lerpPalette() blends two palettes so the renderer can smoothly drift
// between states instead of hard-cutting.

export const TIME_KEYS = Object.freeze(["day", "dusk", "goldenHour", "night"]);

export const PALETTES = Object.freeze({
  // True daylight — the de-orange anchor. Blue sky + neutral-warm high sun +
  // COOL sky-bounce shadows give the frame real warm-vs-cool range; the warm
  // woods/lanterns read as accents against it instead of drowning in amber.
  // This is the boot palette: first impressions happen here.
  day: {
    key: "day",
    label: "Day",
    sky: { top: "#3d6fb8", mid: "#8fa8c8", horizon: "#d8c8a8" },
    // Density lifted 0.006 → 0.0095: at street scale 0.006 read as no haze at
    // all — distant blocks need to soften into the sky for open-world depth.
    fog: { color: "#aeb6c0", density: 0.0095 },
    // High sun (y 12) → short grounded shadows; near-white warm disc.
    sun: { color: "#fff0d8", intensity: 2.2, dir: { x: -4, y: 12, z: -2 }, disc: 0.03, glow: 0.12 },
    // Shadow fill is sky bounce: cool slate-blue from above, neutral slate from
    // the ground. Chroma is deliberately LOW — at #bcd2f0 the bounce painted
    // every shadowed wall violet; shadows should read as cool light, not paint.
    hemi: { sky: "#a6b6d2", ground: "#6b6d5f", intensity: 1.1 }, // sky deepened from #b6c4da for cooler shadow fill (still low-chroma to block violet creep); ground warm
    rim: { color: "#9cacc8", intensity: 0.42, dir: { x: 8, y: 6, z: 6 } },
    fill: { color: "#d8dce4", intensity: 0.4 },
    // Pulled back from 1.18 — the overexposure washed midtones flat and crushed the
    // neon's headroom. Lower exposure + stronger grade gives day the warm-key/cool-
    // shadow drama dusk already has, without touching the (dusk-pinned) golden frame.
    exposure: 1.12,
    stars: 0,
    bloom: 0.4, // was 0.3 — more glow budget so authored neon signs read as neon in daylight
    grade: {
      tint: "#ffd9a0", amount: 0.02, contrast: 1.18, saturation: 1.13,
      shadowTint: "#2e3c6e", highlightTint: "#fff0c8",
      // splitStrength 0.22→0.30 (warm-highlight/cool-shadow separation); bloomThreshold
      // 0.9→0.85 so neon emissives (intensity 2.2) cross into bloom under bright day.
      splitStrength: 0.30, godrayStrength: 0.06, vignetteStrength: 0.05, bloomThreshold: 0.85,
    },
    bodyBg: "#1e2433",
  },
  // Dusk is the hero showcase moment (the ?visual capture pins here). Keep the
  // lanterns warm, but make the world around them cool and contrasty so the
  // frame reads like a playable RPG street instead of a sun-bleached diorama.
  dusk: {
    key: "dusk",
    label: "Dusk",
    sky: { top: "#13203a", mid: "#4f586e", horizon: "#cf8347" },
    fog: { color: "#5e5648", density: 0.016 },
    sun: { color: "#f0a458", intensity: 1.05, dir: { x: -9, y: 4.1, z: -4.8 }, disc: 0.022, glow: 0.045 },
    // Hemisphere is the SHADOW FILL. The dim colors (#4a586e/#3c2c1c) made the
    // fill weak even at higher intensity, so backlit faces stayed near-black —
    // brightened the sky/ground COLORS (cool dusk sky bounce + warm ground bounce)
    // and lifted intensity to 0.66 so unlit faces read. Pairs with the camera-side
    // warm fill light in atmosphere.js.
    hemi: { sky: "#8c9cc0", ground: "#6a5848", intensity: 0.72 },
    rim: { color: "#8ea9d5", intensity: 0.8, dir: { x: 8, y: 4.8, z: 6 } },
    exposure: 1.0,
    stars: 0.18,
    bloom: 0.32,
    grade: {
      // De-orange pass: warm tint eased and split released (0.28 → 0.18) so dusk
      // reads as cool evening light around warm lanterns, not an amber filter.
      tint: "#f3a85e", amount: 0.03, contrast: 1.14, saturation: 1.1,
      shadowTint: "#1a2848", highlightTint: "#f4bb72",
      splitStrength: 0.18, godrayStrength: 0.16, vignetteStrength: 0.08, bloomThreshold: 0.86,
    },
    bodyBg: "#17131d",
  },
  goldenHour: {
    key: "goldenHour",
    label: "Golden Hour",
    // Real vertical range: clear blue up high → dusty rose mid → gold at the
    // horizon. The old pure-orange mid washed the whole sky one hue; the blue top
    // now reads, so the frame has cool-vs-warm range instead of a sepia field.
    sky: { top: "#3a5aa0", mid: "#c0917e", horizon: "#ffcf86" },
    // Neutral dusty haze (was warm tan #bfae98, which tinted every distant building
    // orange) — neutral, not cold-grey, so distance reads hazy not washed-out.
    fog: { color: "#a8a29c", density: 0.01 }, // aerial perspective — see day

    // Key pulled back from 3.1 — at that strength ACES rolled every lit surface to
    // orange-white. 2.5 still dominates as the warm source without nuking the frame.
    sun: { color: "#ffdca6", intensity: 2.5, dir: { x: -9, y: 8.5, z: -4 }, disc: 0.034, glow: 0.2 },
    // Hemisphere is the SHADOW FILL. Slate-blue sky term keeps the warm-vs-cool
    // break; the GROUND term is the up-bounce — warmed from cool slate (#454a60) to
    // a dim earth tone so golden-hour shadows catch a little ground warmth from
    // below and unlit faces read as lit material, not black silhouette.
    hemi: { sky: "#a6b8d4", ground: "#4e4a40", intensity: 1.28 },
    rim: { color: "#8da3d4", intensity: 0.85, dir: { x: 9, y: 5, z: 6 } },
    // Camera-side fill: cool-neutral (was a static warm #ffd0a6) so the shadow-side
    // faces crowding the near/left of frame read cool instead of crushed warm-red.
    // Eased slightly cooler/dimmer so those near faces stay graphic, not muddy.
    fill: { color: "#bcc6dc", intensity: 0.46 },
    exposure: 1.27,
    stars: 0,
    bloom: 0.44,
    // Cinematic grade: a strong cool-shadow / warm-highlight split so the golden key
    // reads as warm light against cool shadow rather than a single-hue orange wash.
    // Deeper/cooler shadow tint + harder split is the decisive anti-orange knob;
    // saturation + warm finishing-tint eased so the orange stops screaming.
    grade: {
      // splitStrength 0.48 was the "purple shadows vs neon orange" clash — at that
      // bite the slate roofs/water tower went violet and every lit face went amber.
      // 0.32 + the deeper/cooler shadowTint pushes the graphic-novel warm-vs-cool
      // bite harder without re-entering the violet clash; saturation eased so wood
      // reads as wood. contrast lifted 1.15→1.2 for darker, more committed shadows.
      tint: "#ffb060", amount: 0.02, contrast: 1.2, saturation: 1.04,
      shadowTint: "#0f1f4a", highlightTint: "#ffc880",
      splitStrength: 0.32, godrayStrength: 0.2, vignetteStrength: 0.06, bloomThreshold: 0.86,
    },
    bodyBg: "#2a1f2e",
  },
  night: {
    key: "night",
    label: "Night",
    // Legibility lift: moonlit blue, not black-red murk. The moon key, hemisphere
    // fill, and exposure all come up so silhouettes, the road, and lamp pools
    // read while stars/lanterns still own the mood.
    sky: { top: "#070b22", mid: "#181f44", horizon: "#33305e" },
    fog: { color: "#161b34", density: 0.024 },
    sun: { color: "#bcc6ff", intensity: 0.78, dir: { x: 8, y: 9, z: -3 }, disc: 0.026, glow: 0.1 },
    hemi: { sky: "#32406e", ground: "#1a1f3a", intensity: 0.42 }, // ground lifted from #101522 so unlit night faces read as material, not black murk
    rim: { color: "#7a8aff", intensity: 0.55, dir: { x: -7, y: 4, z: 6 } },
    exposure: 0.95,
    stars: 1.0,
    bloom: 1.2,
    grade: { tint: "#5a6bd0", amount: 0.05, contrast: 1.1, saturation: 1.08, shadowTint: "#2a3a6a", highlightTint: "#aac0ff" },
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

const smoothstep01 = (x, e0, e1) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Window-glow day/night factor [0,1]: panes/warmth-lights are off through the
// daylit hours, ramp full ON by dusk and hold through night, then ease back
// toward dawn. `dayTime` in [0,1) (0 day, 1/4 golden, 1/2 dusk, 3/4 night).
// At dusk (0.5) it returns EXACTLY 1.0 so the ?visual-pinned dusk frame holds the
// authored emissive (0.28) — keep the rise complete by 0.48 to preserve that.
export function calcWindowGlowFactor(dayTime) {
  const rise = smoothstep01(dayTime, 0.30, 0.48); // off through golden, full by dusk
  const fall = 1 - smoothstep01(dayTime, 0.93, 1.0); // ease back down toward dawn
  return Math.min(rise, fall);
}

// Continuous day/night arc (docs/roadmap.md §3, Bet 4) — the smooth-cycle
// successor to the discrete keys. `dayTime01` in [0,1) wraps around the clock:
// 0 = day, ~1/4 = golden hour, ~1/2 = dusk, ~3/4 = night, back to day. Returns
// a palette blended across the bracketing keys (smoothstep eased), so the sun
// colour, direction, fog, exposure, bloom, and grade all drift continuously
// rather than hard-cutting. Pure — reuses lerpPalette so it's covered by the
// same tests.
export const ARC_KEYS = Object.freeze(["day", "goldenHour", "dusk", "night"]);

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

// The camera-side fill light's constructed default (atmosphere.js). Palettes that
// don't override `fill` blend against THIS, so they render exactly as before.
const DEFAULT_FILL = Object.freeze({ color: "#ffd0a6", intensity: 0.55 });

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
    // Camera-side fill. Palettes that omit `fill` fall back to DEFAULT_FILL, which
    // is the EXACT static default the light is constructed with — so any palette
    // without an explicit fill (dusk, night) renders bit-identically to before and
    // the dusk golden-image baseline is unaffected. Only goldenHour overrides it.
    fill: (() => {
      const f1 = p1.fill ?? DEFAULT_FILL;
      const f2 = p2.fill ?? DEFAULT_FILL;
      return { color: lerpColor(f1.color, f2.color, t), intensity: lerp(f1.intensity, f2.intensity, t) };
    })(),
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
