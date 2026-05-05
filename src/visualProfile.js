export const VISUAL_QUALITY_PRESETS = {
  cinematic: { fogWeight: 1, particlesWeight: 1, shimmerWeight: 1, vignetteWeight: 1, rainDepthWeight: 1, lightWeight: 1 },
  balanced: { fogWeight: 0.82, particlesWeight: 0.85, shimmerWeight: 0.8, vignetteWeight: 0.9, rainDepthWeight: 0.8, lightWeight: 0.78 },
  performance: { fogWeight: 0.64, particlesWeight: 0.6, shimmerWeight: 0.5, vignetteWeight: 0.75, rainDepthWeight: 0.56, lightWeight: 0.6 },
};

export function resolveVisualQuality(qualitySetting = "balanced") {
  return VISUAL_QUALITY_PRESETS[qualitySetting] || VISUAL_QUALITY_PRESETS.balanced;
}

const BIOME_GRADE_PROFILES = {
  frontier: { r: 0, g: 0, b: 0, contrast: 1 },
  ashfall: { r: 18, g: -8, b: -16, contrast: 1.08 },
  ironlantern: { r: -6, g: 4, b: 20, contrast: 1.12 },
};

export function buildVisualMood({ weather, chapterIndex, day, qualitySetting, biome = "frontier" }) {
  const quality = resolveVisualQuality(qualitySetting);
  const chapterBoost = Math.max(0, chapterIndex) * 0.06;
  const stormBoost = weather.kind === "storm" ? 0.22 : weather.kind === "rain" ? 0.12 : 0;
  const sandstormBoost = weather.kind === "sandstorm" ? 0.2 : 0;
  const duskFactor = 1 - Math.abs(day - 0.5) * 2;
  const nightStrength = Math.max(0, Math.min(1, (0.34 - day) / 0.34));
  const duskStrength = Math.max(0, Math.min(1, duskFactor));
  const biomeGrade = BIOME_GRADE_PROFILES[biome] || BIOME_GRADE_PROFILES.frontier;
  return {
    fogStrength: (weather.fog * (0.75 + chapterBoost) + stormBoost + sandstormBoost) * quality.fogWeight,
    vignetteStrength: (0.25 + stormBoost + (1 - day) * 0.2 + nightStrength * 0.18) * quality.vignetteWeight,
    particleMultiplier: (0.7 + weather.rain * 0.9 + chapterBoost) * quality.particlesWeight,
    shimmerStrength: (weather.rain * 0.28 + weather.wind * 0.22) * quality.shimmerWeight,
    bloomStrength: (0.15 + stormBoost * 0.5 + duskFactor * 0.2 + nightStrength * 0.16 + chapterBoost * 0.3) * quality.shimmerWeight,
    gradeStrength: 0.12 + chapterBoost * 0.26 + stormBoost * 0.15,
    rainDepthStrength: (weather.rain * 0.8 + stormBoost + sandstormBoost * 0.4) * quality.rainDepthWeight,
    dynamicLightStrength: (0.35 + nightStrength * 0.42 + duskStrength * 0.12 + weather.lightning * 0.4 + stormBoost * 0.4) * quality.lightWeight,
    nightStrength,
    duskStrength,
    silhouetteStrength: 0.16 + chapterBoost * 0.12 + stormBoost * 0.08,
    factionCueStrength: 0.22 + chapterBoost * 0.08,
    weatherHazardTint: sandstormBoost > 0 ? { r: 190, g: 126, b: 78, a: 0.22 + sandstormBoost * 0.2 } : null,
    skyTint: {
      r: 16 + biomeGrade.r + Math.floor(duskFactor * 36),
      g: 18 + biomeGrade.g + Math.floor((1 - day) * 20 + chapterBoost * 22),
      b: 28 + biomeGrade.b + Math.floor(day * 24 + stormBoost * 26),
    },
    contrastBoost: Math.max(1, biomeGrade.contrast + stormBoost * 0.1),
  };
}
