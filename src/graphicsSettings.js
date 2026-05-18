export const GRAPHICS_PRESETS = {
  low: {
    fogDensity: 0.55,
    particleDensity: 0.45,
    dynamicLights: 8,
    rainDepth: 0.45,
    postWeight: 0.5,
    vegetationDensity: 0.46,
    propDensity: 0.58,
    skyDetail: 0.56,
  },
  balanced: {
    fogDensity: 0.82,
    particleDensity: 0.8,
    dynamicLights: 14,
    rainDepth: 0.75,
    postWeight: 0.82,
    vegetationDensity: 0.78,
    propDensity: 0.82,
    skyDetail: 0.82,
  },
  high: {
    fogDensity: 1,
    particleDensity: 1,
    dynamicLights: 22,
    rainDepth: 1,
    postWeight: 1,
    vegetationDensity: 1,
    propDensity: 1,
    skyDetail: 1,
  },
  cinematic: {
    fogDensity: 1.08,
    particleDensity: 1.08,
    dynamicLights: 26,
    rainDepth: 1.08,
    postWeight: 1.12,
    vegetationDensity: 1.16,
    propDensity: 1.12,
    skyDetail: 1.18,
  },
};

export const BIOME_GRADING = {
  frontier: { r: 1, g: 1, b: 1, contrast: 1 },
  ashfall: { r: 1.12, g: 0.92, b: 0.82, contrast: 1.08 },
  ironlantern: { r: 0.92, g: 0.98, b: 1.15, contrast: 1.1 },
};

export function resolveRecommendedPreset(metrics = {}) {
  const score = (metrics.width || 1280) * (metrics.height || 720);
  if (score >= 1920 * 1080 && (metrics.deviceMemory || 4) >= 8) return "cinematic";
  if (score >= 1440 * 900 && (metrics.deviceMemory || 4) >= 6) return "high";
  if (score <= 960 * 540 || (metrics.deviceMemory || 4) <= 2) return "low";
  return "balanced";
}

export function resolveVisualQualitySettingForPreset(preset = "balanced") {
  if (preset === "cinematic" || preset === "high") return "cinematic";
  if (preset === "low") return "performance";
  return "balanced";
}

export const COLORBLIND_MODES = ["none", "deuteranopia", "protanopia", "tritanopia"];

export function createInitialGraphicsState() {
  return {
    preset: "balanced",
    autoRecommended: true,
    performance: {
      gradientCache: false,
    },
    accessibility: {
      highContrast: false,
      hitMarkerStrength: 1,
      cameraShake: 1,
      fontScale: 1,
      motionReduction: false,
      combatSubtitles: true,
      combatAudioCues: true,
      colorblindMode: "none",
    },
  };
}

export function applyGraphicsAccessibility(strengths, accessibility) {
  const next = { ...strengths };
  const safeAccessibility = accessibility || {};
  if (safeAccessibility.highContrast) {
    next.contrastBoost = (next.contrastBoost || 0) + 0.2;
  }
  next.hitMarkerStrength = safeAccessibility.hitMarkerStrength ?? 1;
  next.cameraShake = safeAccessibility.motionReduction ? 0 : (safeAccessibility.cameraShake ?? 1);
  if (safeAccessibility.motionReduction) next.particleMultiplier = 0;
  next.fontScale = clampFontScale(safeAccessibility.fontScale);
  next.motionReduction = !!safeAccessibility.motionReduction;
  next.colorblindMode = COLORBLIND_MODES.includes(safeAccessibility.colorblindMode) ? safeAccessibility.colorblindMode : "none";
  return next;
}

function clampFontScale(value) {
  const v = typeof value === "number" && isFinite(value) ? value : 1;
  return Math.max(0.8, Math.min(1.6, v));
}

const COLORBLIND_PALETTES = {
  none: null,
  deuteranopia: { friend: "#6FA8FF", foe: "#FFB347", neutral: "#F5E0A8" },
  protanopia: { friend: "#79B3FF", foe: "#F2A65A", neutral: "#F0DCA0" },
  tritanopia: { friend: "#69D3D6", foe: "#F58A8A", neutral: "#F4E1B5" },
};

export function getColorblindPalette(mode) {
  return COLORBLIND_PALETTES[mode] || null;
}

export const SETTINGS_ROWS = [
  { id: "preset", label: "Graphics Preset", kind: "enum", options: ["low", "balanced", "high", "cinematic"] },
  { id: "gradientCache", label: "Gradient Cache", kind: "bool" },
  { id: "postFx", label: "Post-FX", kind: "bool" },
  { id: "colorblindMode", label: "Colorblind Mode", kind: "enum", options: COLORBLIND_MODES },
  { id: "fontScale", label: "Font Scale", kind: "range", min: 0.8, max: 1.6, step: 0.1, format: (v) => `${v.toFixed(2)}x` },
  { id: "motionReduction", label: "Motion Reduction", kind: "bool" },
  { id: "combatSubtitles", label: "Combat Subtitles", kind: "bool" },
  { id: "combatAudioCues", label: "Combat Audio Cues", kind: "bool" },
  { id: "cameraShake", label: "Camera Shake", kind: "range", min: 0, max: 1.5, step: 0.25, format: (v) => v.toFixed(2) },
];

export function readSettingValue(graphics, id) {
  if (!graphics) return null;
  switch (id) {
    case "preset": return graphics.preset;
    case "gradientCache": return Boolean(graphics.performance?.gradientCache);
    case "postFx": return Boolean(graphics.performance?.postFx);
    case "colorblindMode": return graphics.accessibility?.colorblindMode ?? "none";
    case "fontScale": return Number(graphics.accessibility?.fontScale ?? 1);
    case "motionReduction": return Boolean(graphics.accessibility?.motionReduction);
    case "combatSubtitles": return graphics.accessibility?.combatSubtitles !== false;
    case "combatAudioCues": return graphics.accessibility?.combatAudioCues !== false;
    case "cameraShake": return Number(graphics.accessibility?.cameraShake ?? 1);
    default: return null;
  }
}

export function stepSetting(graphics, id, dir) {
  if (!graphics) return null;
  graphics.performance = graphics.performance || { gradientCache: false };
  graphics.accessibility = graphics.accessibility || {};
  const row = SETTINGS_ROWS.find((r) => r.id === id);
  if (!row) return null;
  const current = readSettingValue(graphics, id);
  if (row.kind === "bool") {
    if (id === "gradientCache") graphics.performance.gradientCache = !current;
    else if (id === "postFx") graphics.performance.postFx = !current;
    else if (id === "motionReduction") graphics.accessibility.motionReduction = !current;
    else if (id === "combatSubtitles") graphics.accessibility.combatSubtitles = !current;
    else if (id === "combatAudioCues") graphics.accessibility.combatAudioCues = !current;
    return readSettingValue(graphics, id);
  }
  if (row.kind === "enum") {
    const idx = row.options.indexOf(current);
    const nextIdx = (idx + (dir > 0 ? 1 : -1) + row.options.length) % row.options.length;
    const next = row.options[nextIdx];
    if (id === "preset") graphics.preset = next;
    else if (id === "colorblindMode") graphics.accessibility.colorblindMode = next;
    return next;
  }
  if (row.kind === "range") {
    const stepped = Number((current + dir * row.step).toFixed(2));
    const clamped = Math.max(row.min, Math.min(row.max, stepped));
    if (id === "fontScale") graphics.accessibility.fontScale = clamped;
    else if (id === "cameraShake") graphics.accessibility.cameraShake = clamped;
    return clamped;
  }
  return null;
}
