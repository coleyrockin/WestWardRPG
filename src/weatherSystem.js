// Weather simulation — extracted from main.js.
// updateWeather(weather, regionId, dt) advances the weather state in-place.

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const WEATHER_POOLS = {
  ashfall:     (roll) => roll < 0.36 ? "sandstorm" : roll < 0.62 ? "heatwave" : roll < 0.82 ? "mist" : "clear",
  ironlantern: (roll) => roll < 0.34 ? "neon_rain" : roll < 0.62 ? "mist" : roll < 0.84 ? "storm" : "clear",
  frontier:    (roll) => roll < 0.45 ? "clear" : roll < 0.67 ? "mist" : roll < 0.9 ? "rain" : "storm",
};

const WEATHER_TARGETS = {
  clear:     { rain: 0,    fog: 0.11, wind: 0.2  },
  mist:      { rain: 0,    fog: 0.32, wind: 0.12 },
  rain:      { rain: 0.48, fog: 0.22, wind: 0.32 },
  neon_rain: { rain: 0.58, fog: 0.27, wind: 0.35 },
  sandstorm: { rain: 0.1,  fog: 0.52, wind: 0.72 },
  heatwave:  { rain: 0,    fog: 0.2,  wind: 0.48 },
  storm:     { rain: 0.86, fog: 0.36, wind: 0.56 },
};

export function updateWeather(weather, regionId, dt) {
  weather.timer -= dt;
  if (weather.timer <= 0) {
    const roll = Math.random();
    const pool = WEATHER_POOLS[regionId] || WEATHER_POOLS.frontier;
    weather.kind = pool(roll);
    weather.timer = 16 + Math.random() * 26;
  }

  const target = WEATHER_TARGETS[weather.kind] || WEATHER_TARGETS.clear;
  const blend = clamp(dt * 0.65, 0, 1);
  weather.rain  = lerp(weather.rain,  target.rain,  blend);
  weather.fog   = lerp(weather.fog,   target.fog,   blend);
  weather.wind  = lerp(weather.wind,  target.wind,  blend * 0.8);
  weather.lightning = Math.max(0, weather.lightning - dt * 1.7);

  if (weather.kind === "storm" && weather.lightning <= 0 && Math.random() < dt * 0.08) {
    weather.lightning = 1;
  }
}

export function createInitialWeather() {
  return { kind: "clear", rain: 0, fog: 0.1, wind: 0.18, lightning: 0, timer: 22, quality: "balanced" };
}
