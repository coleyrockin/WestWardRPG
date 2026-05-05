(() => {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function toChannel(value) {
    return Math.floor(clamp(value, 0, 255));
  }

  function computeAtmosphere(day, rain, fog) {
    const safeDay = clamp(day, 0, 1);
    const safeRain = clamp(rain, 0, 1);
    const safeFog = clamp(fog, 0, 1);

    const stormShade = safeRain * 0.28 + safeFog * 0.24;

    const skyTop = {
      r: toChannel(lerp(9, 109, safeDay) * (1 - stormShade)),
      g: toChannel(lerp(16, 164, safeDay) * (1 - stormShade * 0.9)),
      b: toChannel(lerp(32, 220, safeDay) * (1 - stormShade * 0.7)),
    };

    const skyBottom = {
      r: toChannel(lerp(40, 182, safeDay) * (1 - stormShade * 0.9)),
      g: toChannel(lerp(62, 204, safeDay) * (1 - stormShade * 0.82)),
      b: toChannel(lerp(94, 235, safeDay) * (1 - stormShade * 0.65)),
    };

    return { stormShade, skyTop, skyBottom };
  }

  window.WestWardTS = {
    computeAtmosphere,
  };
  window.DustwardTS = window.WestWardTS;
})();
