type RGB = { r: number; g: number; b: number };

type AtmosphereResult = {
  stormShade: number;
  skyTop: RGB;
  skyBottom: RGB;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function toChannel(value: number): number {
  return Math.floor(clamp(value, 0, 255));
}

function computeAtmosphere(day: number, rain: number, fog: number): AtmosphereResult {
  const safeDay = clamp(day, 0, 1);
  const safeRain = clamp(rain, 0, 1);
  const safeFog = clamp(fog, 0, 1);

  const stormShade = safeRain * 0.28 + safeFog * 0.24;

  const skyTop: RGB = {
    r: toChannel(lerp(9, 109, safeDay) * (1 - stormShade)),
    g: toChannel(lerp(16, 164, safeDay) * (1 - stormShade * 0.9)),
    b: toChannel(lerp(32, 220, safeDay) * (1 - stormShade * 0.7)),
  };

  const skyBottom: RGB = {
    r: toChannel(lerp(40, 182, safeDay) * (1 - stormShade * 0.9)),
    g: toChannel(lerp(62, 204, safeDay) * (1 - stormShade * 0.82)),
    b: toChannel(lerp(94, 235, safeDay) * (1 - stormShade * 0.65)),
  };

  return { stormShade, skyTop, skyBottom };
}

declare global {
  interface Window {
    DustwardTS?: {
      computeAtmosphere: (day: number, rain: number, fog: number) => AtmosphereResult;
    };
  }
}

window.DustwardTS = {
  computeAtmosphere,
};

export { };
