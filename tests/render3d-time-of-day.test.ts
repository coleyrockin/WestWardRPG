import { describe, it, expect } from "vitest";
import {
  TIME_KEYS,
  ARC_KEYS,
  PALETTES,
  getPalette,
  nextTimeKey,
  lerpColor,
  lerpPalette,
  sunArc,
  type Palette,
  type TimeKey,
} from "../src/render3d/timeOfDay.js";

describe("timeOfDay — keys & palette table", () => {
  it("exposes the three time keys in cycle order", () => {
    expect([...TIME_KEYS]).toEqual(["dusk", "goldenHour", "night"]);
  });

  it("freezes the keys and palette table", () => {
    expect(Object.isFrozen(TIME_KEYS)).toBe(true);
    expect(Object.isFrozen(PALETTES)).toBe(true);
  });

  it("has a fully-formed palette for every key", () => {
    for (const key of TIME_KEYS) {
      const p = PALETTES[key];
      expect(p.key).toBe(key); // self-identifying
      expect(typeof p.label).toBe("string");
      for (const stop of [p.sky.top, p.sky.mid, p.sky.horizon, p.fog.color, p.sun.color, p.bodyBg]) {
        expect(stop).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
      for (const axis of ["x", "y", "z"] as const) {
        expect(Number.isFinite(p.sun.dir[axis])).toBe(true);
        expect(Number.isFinite(p.rim.dir[axis])).toBe(true);
      }
      for (const n of [p.sun.intensity, p.hemi.intensity, p.rim.intensity, p.exposure, p.stars, p.bloom]) {
        expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  it("night is the only fully-starred palette and golden hour has none", () => {
    expect(PALETTES.night.stars).toBe(1);
    expect(PALETTES.goldenHour.stars).toBe(0);
    expect(PALETTES.dusk.stars).toBeGreaterThan(0);
    expect(PALETTES.dusk.stars).toBeLessThan(1);
  });
});

describe("getPalette", () => {
  it("returns the matching palette", () => {
    expect(getPalette("goldenHour")).toBe(PALETTES.goldenHour);
    expect(getPalette("night")).toBe(PALETTES.night);
  });

  it("falls back to dusk for unknown keys", () => {
    expect(getPalette("midnight-snack")).toBe(PALETTES.dusk);
    expect(getPalette("")).toBe(PALETTES.dusk);
  });
});

describe("nextTimeKey", () => {
  it("cycles dusk → goldenHour → night → dusk", () => {
    expect(nextTimeKey("dusk")).toBe("goldenHour");
    expect(nextTimeKey("goldenHour")).toBe("night");
    expect(nextTimeKey("night")).toBe("dusk");
  });

  it("returns to dusk from an unknown key", () => {
    expect(nextTimeKey("nope")).toBe("dusk");
  });

  it("visits every key exactly once per full cycle", () => {
    const seen: TimeKey[] = [];
    let k: TimeKey = "dusk";
    for (let i = 0; i < TIME_KEYS.length; i++) {
      seen.push(k);
      k = nextTimeKey(k);
    }
    expect(new Set(seen).size).toBe(TIME_KEYS.length);
    expect(k).toBe("dusk"); // closed loop
  });
});

describe("lerpColor", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(lerpColor("#1a2b3c", "#ffffff", 0)).toBe("#1a2b3c");
    expect(lerpColor("#1a2b3c", "#aabbcc", 1)).toBe("#aabbcc");
  });

  it("blends to the rounded midpoint", () => {
    // black → white at t=0.5: round(127.5) = 128 = 0x80
    expect(lerpColor("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("blends each channel independently", () => {
    expect(lerpColor("#ff0000", "#0000ff", 0.5)).toBe("#800080");
  });
});

describe("lerpPalette", () => {
  const a: Palette = PALETTES.dusk;
  const b: Palette = PALETTES.night;

  it("reproduces p1 at t=0 and p2 at t=1", () => {
    const at0 = lerpPalette(a, b, 0);
    expect(at0.key).toBe(a.key);
    expect(at0.exposure).toBeCloseTo(a.exposure, 6);
    expect(at0.sky.top).toBe(a.sky.top);

    const at1 = lerpPalette(a, b, 1);
    expect(at1.key).toBe(b.key);
    expect(at1.exposure).toBeCloseTo(b.exposure, 6);
    expect(at1.sky.top).toBe(b.sky.top);
  });

  it("interpolates scalar fields at the midpoint", () => {
    const mid = lerpPalette(a, b, 0.5);
    expect(mid.exposure).toBeCloseTo((a.exposure + b.exposure) / 2, 6);
    expect(mid.bloom).toBeCloseTo((a.bloom + b.bloom) / 2, 6);
    expect(mid.sun.dir.x).toBeCloseTo((a.sun.dir.x + b.sun.dir.x) / 2, 6);
  });

  it("switches key/label at the t=0.5 boundary", () => {
    expect(lerpPalette(a, b, 0.49).key).toBe(a.key);
    expect(lerpPalette(a, b, 0.5).key).toBe(b.key);
    expect(lerpPalette(a, b, 0.49).label).toBe(a.label);
    expect(lerpPalette(a, b, 0.5).label).toBe(b.label);
  });

  it("steps rim.dir (no lerp) across the boundary", () => {
    expect(lerpPalette(a, b, 0.25).rim.dir).toEqual(a.rim.dir);
    expect(lerpPalette(a, b, 0.75).rim.dir).toEqual(b.rim.dir);
  });
});

describe("sunArc — continuous day/night cycle", () => {
  it("cycles through goldenHour → dusk → night at the segment anchors", () => {
    expect([...ARC_KEYS]).toEqual(["goldenHour", "dusk", "night"]);
    // anchors land exactly on a source palette's scalar values
    expect(sunArc(0).sun.intensity).toBeCloseTo(PALETTES.goldenHour.sun.intensity, 6);
    expect(sunArc(1 / 3).sun.intensity).toBeCloseTo(PALETTES.dusk.sun.intensity, 6);
    expect(sunArc(2 / 3).sun.intensity).toBeCloseTo(PALETTES.night.sun.intensity, 6);
  });

  it("wraps: t and t+1 (and t=1) resolve identically", () => {
    expect(sunArc(1).sun.intensity).toBeCloseTo(sunArc(0).sun.intensity, 6);
    expect(sunArc(1.25).bloom).toBeCloseTo(sunArc(0.25).bloom, 6);
    expect(sunArc(-1 / 3).sun.color).toBe(sunArc(2 / 3).sun.color);
  });

  it("is continuous — a tiny step makes a tiny change (no hard cuts)", () => {
    const p0 = sunArc(0.2);
    const p1 = sunArc(0.205);
    expect(Math.abs(p1.exposure - p0.exposure)).toBeLessThan(0.05);
    expect(Math.abs(p1.sun.dir.x - p0.sun.dir.x)).toBeLessThan(1);
  });

  it("returns a well-formed palette tagged 'arc' with finite/valid fields", () => {
    const p = sunArc(0.42);
    expect(p.key).toBe("arc");
    for (const stop of [p.sky.top, p.sky.mid, p.sky.horizon, p.sun.color, p.grade.tint]) {
      expect(stop).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    expect(Number.isFinite(p.bloom)).toBe(true);
    expect(Number.isFinite(p.sun.dir.y)).toBe(true);
  });

  it("guards bad input", () => {
    expect(sunArc(NaN).key).toBe("arc");
    // @ts-expect-error — defensive: undefined coerces to 0
    expect(sunArc(undefined).sun.intensity).toBeCloseTo(PALETTES.goldenHour.sun.intensity, 6);
  });
});
