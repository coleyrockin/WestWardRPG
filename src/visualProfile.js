export const VISUAL_QUALITY_PRESETS = {
  cinematic: { fogWeight: 1, particlesWeight: 1, shimmerWeight: 1, vignetteWeight: 1 },
  balanced: { fogWeight: 0.82, particlesWeight: 0.85, shimmerWeight: 0.8, vignetteWeight: 0.9 },
  performance: { fogWeight: 0.64, particlesWeight: 0.6, shimmerWeight: 0.5, vignetteWeight: 0.75 },
};

export function resolveVisualQuality(qualitySetting = "balanced") {
  return VISUAL_QUALITY_PRESETS[qualitySetting] || VISUAL_QUALITY_PRESETS.balanced;
}

export function buildVisualMood({ weather, chapterIndex, day, qualitySetting }) {
  const quality = resolveVisualQuality(qualitySetting);
  const chapterBoost = Math.max(0, chapterIndex) * 0.06;
  const stormBoost = weather.kind === "storm" ? 0.22 : weather.kind === "rain" ? 0.12 : 0;
  return {
    fogStrength: (weather.fog * (0.75 + chapterBoost) + stormBoost) * quality.fogWeight,
    vignetteStrength: (0.25 + stormBoost + (1 - day) * 0.2) * quality.vignetteWeight,
    particleMultiplier: (0.7 + weather.rain * 0.9 + chapterBoost) * quality.particlesWeight,
    shimmerStrength: (weather.rain * 0.28 + weather.wind * 0.22) * quality.shimmerWeight,
  };
}
