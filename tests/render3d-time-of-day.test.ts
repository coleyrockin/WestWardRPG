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
  calcWindowGlowFactor,
  type Palette,
  type TimeKey,
} from "../src/render3d/timeOfDay.js";

describe("timeOfDay — keys & palette table", () => {
  it("exposes the four time keys in cycle order", () => {
    expect([...TIME_KEYS]).toEqual(["day", "dusk", "goldenHour", "night"]);
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
      for (const n of [p.sun.intensity, p.hemi.intensity, p.rim.intensity, p.exposure, p.stars, p.bloom, p.envIntensity]) {
        expect(Number.isFinite(n)).toBe(true);
      }
      // dusk's env intensity must stay pinned to the boot 0.9 (golden frame).
      if (p.key === "dusk") expect(p.envIntensity).toBe(0.9);
    }
  });

  it("night is the only fully-starred palette; day and golden hour have none", () => {
    expect(PALETTES.night.stars).toBe(1);
    expect(PALETTES.goldenHour.stars).toBe(0);
    expect(PALETTES.day.stars).toBe(0);
    expect(PALETTES.dusk.stars).toBeGreaterThan(0);
    expect(PALETTES.dusk.stars).toBeLessThan(1);
  });

  it("day is the de-orange anchor: blue sky top, high sun, cool shadow fill", () => {
    const d = PALETTES.day;
    expect(d.sun.dir.y).toBeGreaterThanOrEqual(10); // high noon-ish sun
    expect(d.stars).toBe(0);
    // blue-dominant sky top and cool hemisphere sky bounce
    const blueTop = parseInt(d.sky.top.slice(5, 7), 16);
    const redTop = parseInt(d.sky.top.slice(1, 3), 16);
    expect(blueTop).toBeGreaterThan(redTop);
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
  it("cycles day → dusk → goldenHour → night → day", () => {
    expect(nextTimeKey("day")).toBe("dusk");
    expect(nextTimeKey("dusk")).toBe("goldenHour");
    expect(nextTimeKey("goldenHour")).toBe("night");
    expect(nextTimeKey("night")).toBe("day");
  });

  it("returns to day from an unknown key", () => {
    expect(nextTimeKey("nope")).toBe("day");
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
    expect(mid.envIntensity).toBeCloseTo((a.envIntensity + b.envIntensity) / 2, 6);
    expect(mid.sun.dir.x).toBeCloseTo((a.sun.dir.x + b.sun.dir.x) / 2, 6);
  });

  it("switches key/label at the t=0.5 boundary", () => {
    expect(lerpPalette(a, b, 0.49).key).toBe(a.key);
    expect(lerpPalette(a, b, 0.5).key).toBe(b.key);
    expect(lerpPalette(a, b, 0.49).label).toBe(a.label);
    expect(lerpPalette(a, b, 0.5).label).toBe(b.label);
  });

  it("lerps rim.dir smoothly across the boundary (no hard-cut pop)", () => {
    // rim.dir now interpolates (was a t<0.5 step that popped dusk→night when the
    // two dirs are on opposite sides). Endpoints still land on the source dirs.
    expect(lerpPalette(a, b, 0).rim.dir).toEqual(a.rim.dir);
    expect(lerpPalette(a, b, 1).rim.dir).toEqual(b.rim.dir);
    const mid = lerpPalette(a, b, 0.5).rim.dir;
    expect(mid.x).toBeCloseTo((a.rim.dir.x + b.rim.dir.x) / 2, 6);
    expect(mid.y).toBeCloseTo((a.rim.dir.y + b.rim.dir.y) / 2, 6);
    expect(mid.z).toBeCloseTo((a.rim.dir.z + b.rim.dir.z) / 2, 6);
  });

  it("carries the cinematic grade knobs (godray/split/vignette/threshold) the renderer reads live", () => {
    // Regression: these four were dropped here, so the per-frame sun arc + the
    // ?visual capture silently fell back to the postStacks defaults and every
    // per-palette value was dead. Endpoints must equal the source palettes' grades.
    const at0 = lerpPalette(a, b, 0).grade;
    expect(at0.godrayStrength).toBeCloseTo(a.grade.godrayStrength!, 6);
    expect(at0.splitStrength).toBeCloseTo(a.grade.splitStrength!, 6);
    expect(at0.vignetteStrength).toBeCloseTo(a.grade.vignetteStrength!, 6);
    expect(at0.bloomThreshold).toBeCloseTo(a.grade.bloomThreshold!, 6);
    const at1 = lerpPalette(a, b, 1).grade;
    expect(at1.godrayStrength).toBeCloseTo(b.grade.godrayStrength!, 6);
    expect(at1.bloomThreshold).toBeCloseTo(b.grade.bloomThreshold!, 6);
    // And they interpolate at the midpoint.
    const mid = lerpPalette(a, b, 0.5).grade;
    expect(mid.godrayStrength).toBeCloseTo((a.grade.godrayStrength! + b.grade.godrayStrength!) / 2, 6);
  });

  it("falls back to the postStacks defaults when a palette omits a knob", () => {
    // A palette with no cinematic knobs must yield the renderer's constructor
    // defaults (split 0.06 / godray 0.08 / vignette 0.045 / threshold 0.95) so
    // omitting them is a true no-op, not an undefined that breaks applyPalette.
    const bare: Palette = { ...PALETTES.dusk, grade: { tint: "#ffffff", amount: 0.1 } } as Palette;
    const g = lerpPalette(bare, bare, 0.5).grade;
    expect(g.godrayStrength).toBeCloseTo(0.08, 6);
    expect(g.splitStrength).toBeCloseTo(0.06, 6);
    expect(g.vignetteStrength).toBeCloseTo(0.045, 6);
    expect(g.bloomThreshold).toBeCloseTo(0.95, 6);
  });
});

describe("sunArc — continuous day/night cycle", () => {
  it("cycles through day → goldenHour → dusk → night at the segment anchors", () => {
    expect([...ARC_KEYS]).toEqual(["day", "goldenHour", "dusk", "night"]);
    // anchors land exactly on a source palette's scalar values
    expect(sunArc(0).sun.intensity).toBeCloseTo(PALETTES.day.sun.intensity, 6);
    expect(sunArc(1 / 4).sun.intensity).toBeCloseTo(PALETTES.goldenHour.sun.intensity, 6);
    expect(sunArc(1 / 2).sun.intensity).toBeCloseTo(PALETTES.dusk.sun.intensity, 6);
    expect(sunArc(3 / 4).sun.intensity).toBeCloseTo(PALETTES.night.sun.intensity, 6);
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
    // @ts-expect-error — defensive: undefined coerces to 0 (= the day anchor)
    expect(sunArc(undefined).sun.intensity).toBeCloseTo(PALETTES.day.sun.intensity, 6);
  });
});

describe("calcWindowGlowFactor — window-glow day/night ramp", () => {
  it("is off through daylight and full from dusk through night, easing at the edges", () => {
    expect(calcWindowGlowFactor(0.0)).toBe(0); // day — windows dark
    expect(calcWindowGlowFactor(0.28)).toBeCloseTo(0, 6); // before the rise
    expect(calcWindowGlowFactor(0.3)).toBe(0); // rise edge
    expect(calcWindowGlowFactor(0.39)).toBeCloseTo(0.5, 1); // mid-rise
    expect(calcWindowGlowFactor(0.48)).toBe(1); // full by dusk
    expect(calcWindowGlowFactor(0.75)).toBe(1); // night
    expect(calcWindowGlowFactor(0.93)).toBe(1); // hold until dawn fade
    expect(calcWindowGlowFactor(0.965)).toBeCloseTo(0.5, 1); // mid-fall
    expect(calcWindowGlowFactor(1.0)).toBe(0); // back to day
  });

  it("returns EXACTLY 1.0 at dusk (0.5) so the ?visual-pinned dusk frame holds 0.28", () => {
    // load-bearing: the golden dusk baseline depends on glow==1 → emissive 0.28
    expect(calcWindowGlowFactor(0.5)).toBe(1);
  });
});

describe("day palette tuning is locked (commit 7a88800 — daylight drama + neon)", () => {
  it("keeps the tuned exposure/contrast/saturation/bloom/split/threshold", () => {
    const d = PALETTES.day;
    expect(d.exposure).toBe(1.12);
    expect(d.bloom).toBe(0.4);
    expect(d.grade.contrast).toBe(1.18);
    expect(d.grade.saturation).toBe(1.13);
    expect(d.grade.splitStrength).toBe(0.3);
    expect(d.grade.bloomThreshold).toBe(0.85);
  });
});
