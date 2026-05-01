export const GRAPHICS_PRESETS = {
  low: {
    fogDensity: 0.55,
    particleDensity: 0.45,
    dynamicLights: 8,
    rainDepth: 0.45,
    postWeight: 0.5,
  },
  balanced: {
    fogDensity: 0.82,
    particleDensity: 0.8,
    dynamicLights: 14,
    rainDepth: 0.75,
    postWeight: 0.82,
  },
  high: {
    fogDensity: 1,
    particleDensity: 1,
    dynamicLights: 22,
    rainDepth: 1,
    postWeight: 1,
  },
};

export const BIOME_GRADING = {
  frontier: { r: 1, g: 1, b: 1, contrast: 1 },
  ashfall: { r: 1.12, g: 0.92, b: 0.82, contrast: 1.08 },
  ironlantern: { r: 0.92, g: 0.98, b: 1.15, contrast: 1.1 },
};

export function resolveRecommendedPreset(metrics = {}) {
  const score = (metrics.width || 1280) * (metrics.height || 720);
  if (score >= 1920 * 1080 && (metrics.deviceMemory || 4) >= 8) return "high";
  if (score <= 960 * 540 || (metrics.deviceMemory || 4) <= 2) return "low";
  return "balanced";
}

export function createInitialGraphicsState() {
  return {
    preset: "balanced",
    autoRecommended: true,
    accessibility: {
      highContrast: false,
      hitMarkerStrength: 1,
      cameraShake: 1,
    },
  };
}

export function applyGraphicsAccessibility(strengths, accessibility) {
  const next = { ...strengths };
  if (accessibility.highContrast) {
    next.contrastBoost = (next.contrastBoost || 0) + 0.2;
  }
  next.hitMarkerStrength = accessibility.hitMarkerStrength ?? 1;
  next.cameraShake = accessibility.cameraShake ?? 1;
  return next;
}
