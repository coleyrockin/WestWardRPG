// Weather — resolves the snapshot weather state into visual intensities the
// render shell drives (rain, blowing dust, fog boost, lightning), plus a debug
// cycle. Pure logic (no Three.js) so it's node-testable; the particle systems,
// lightning flash, and FogExp2 modulation live in the spike shell.
//
// Frontier weather is clear / dust / storm (rain). Sandstorm is an Ashfall
// thing for a later region.

export const WEATHER_KINDS = Object.freeze(["clear", "dust", "storm"]);

const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

// Per-kind visual presets. `rain`/`dust` are particle densities [0,1];
// `fogBoost` adds to the palette fog density; `lightning` is flash probability;
// `darken` multiplies the palette exposure (storms are dim — this also gives the
// rain streaks contrast against the bright dusk). `windSpeed` is the shared
// motion/audio scalar (R1): windmill rotor rate, tumbleweed drift, and the
// ambient wind-bed filter cutoff all multiply by it.
const PRESETS = Object.freeze({
  clear: { rain: 0, dust: 0.12, fogBoost: 0, lightning: 0, darken: 1, windSpeed: 1 },
  dust: { rain: 0, dust: 0.8, fogBoost: 0.014, lightning: 0, darken: 0.9, windSpeed: 1.8 },
  storm: { rain: 0.8, dust: 0.1, fogBoost: 0.024, lightning: 0.4, darken: 0.6, windSpeed: 2.6 },
});

// Map a snapshot weather field {kind, rain, wind, ...} to render intensities.
// An explicit numeric rain on a storm overrides the preset (data-driven).
export function resolveWeather(state = {}) {
  const kind = WEATHER_KINDS.includes(state.kind) ? state.kind : "clear";
  const preset = PRESETS[kind];
  const rain = kind === "storm" && Number.isFinite(state.rain) ? clamp01(state.rain) : preset.rain;
  return {
    kind,
    rain,
    dust: preset.dust,
    fogBoost: preset.fogBoost,
    lightning: preset.lightning,
    darken: preset.darken,
    windSpeed: preset.windSpeed,
    wind: clamp01(state.wind ?? 0.15),
  };
}

export function nextWeatherKind(kind) {
  const i = WEATHER_KINDS.indexOf(kind);
  return WEATHER_KINDS[(i + 1) % WEATHER_KINDS.length] || "clear";
}
