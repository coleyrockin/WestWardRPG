import { describe, it, expect, vi } from "vitest";
import {
  hexToRgba,
  gradientBucket,
  createGradientCache,
  createRenderHelpers,
  resolveNearWallVisualTreatment,
  resolveObjectiveStripLayout,
  resolveWallProjection,
} from "../src/render.js";

describe("render — hexToRgba", () => {
  it("expands #abc shorthand", () => {
    expect(hexToRgba("#abc", 0.5)).toBe("rgba(170, 187, 204, 0.5)");
  });

  it("parses #aabbcc full hex", () => {
    expect(hexToRgba("#abcdef", 0.25)).toBe("rgba(171, 205, 239, 0.25)");
  });

  it("returns input untouched for non-hex strings", () => {
    expect(hexToRgba("rgb(0,0,0)", 1)).toBe("rgb(0,0,0)");
  });

  it("defaults alpha to 1", () => {
    expect(hexToRgba("#000")).toBe("rgba(0, 0, 0, 1)");
  });
});

describe("render — gradientBucket", () => {
  it("clamps to [0,1] and snaps to bucket", () => {
    expect(gradientBucket(0.5)).toBe(0.5);
    expect(gradientBucket(-1)).toBe(0);
    expect(gradientBucket(2)).toBe(1);
  });

  it("snaps within bucket count", () => {
    expect(gradientBucket(0.05, 4)).toBe(0); // closest to 0
    expect(gradientBucket(0.27, 4)).toBe(0.25);
  });

  it("treats NaN as 0", () => {
    expect(gradientBucket(NaN)).toBe(0);
  });
});

describe("render — createGradientCache", () => {
  it("disabled cache always rebuilds", () => {
    const cache = createGradientCache();
    let calls = 0;
    const a = cache.fetch("k", () => { calls++; return { id: calls }; }, false);
    const b = cache.fetch("k", () => { calls++; return { id: calls }; }, false);
    expect(calls).toBe(2);
    expect(a).not.toBe(b);
    expect(cache.size).toBe(0);
  });

  it("enabled cache memoizes by key", () => {
    const cache = createGradientCache();
    let calls = 0;
    const a = cache.fetch("k", () => { calls++; return { id: calls }; }, true);
    const b = cache.fetch("k", () => { calls++; return { id: calls }; }, true);
    expect(calls).toBe(1);
    expect(a).toBe(b);
    expect(cache.size).toBe(1);
  });

  it("clear empties the store", () => {
    const cache = createGradientCache();
    cache.fetch("k", () => ({}), true);
    cache.fetch("k2", () => ({}), true);
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe("render — resolveWallProjection", () => {
  it("lets very near walls fill past the viewport instead of capping short", () => {
    const projection = resolveWallProjection({
      height: 720,
      horizon: 360,
      correctedDist: 0.08,
      inHouse: false,
      nearClip: 0.24,
    });

    expect(projection.projectedDist).toBe(0.24);
    expect(projection.wallHeight).toBeGreaterThan(720);
    expect(projection.y).toBeLessThan(0);
    expect(projection.bottom).toBeGreaterThan(720);
  });

  it("keeps far walls within a normal projection range", () => {
    const projection = resolveWallProjection({
      height: 720,
      horizon: 360,
      correctedDist: 8,
      inHouse: false,
      nearClip: 0.24,
    });

    expect(projection.wallHeight).toBeLessThan(120);
    expect(projection.y).toBeGreaterThan(250);
  });
});

describe("render — resolveNearWallVisualTreatment", () => {
  it("adds a strong close-wall softening pass near the clip distance", () => {
    const treatment = resolveNearWallVisualTreatment({
      correctedDist: 0.18,
      nearClip: 0.24,
      side: 1,
      inHouse: false,
    });

    expect(treatment.active).toBe(true);
    expect(treatment.alpha).toBeGreaterThan(0.35);
    expect(treatment.edgeAlpha).toBeGreaterThan(0.1);
    expect(treatment.sideShade).toBeGreaterThan(0);
  });

  it("stays off for normal-distance walls", () => {
    expect(resolveNearWallVisualTreatment({
      correctedDist: 1.4,
      nearClip: 0.24,
      side: 0,
      inHouse: false,
    })).toMatchObject({
      active: false,
      alpha: 0,
      edgeAlpha: 0,
    });
  });
});

describe("render — resolveObjectiveStripLayout", () => {
  it("gives two-line opening guidance enough height without crossing the canvas", () => {
    const layout = resolveObjectiveStripLayout({
      canvasWidth: 480,
      canvasHeight: 320,
      margin: 8,
      topX: 8,
      topY: 8,
      topW: 464,
      topH: 78,
      bottomHudY: 218,
      hasSecondaryLine: true,
    });

    expect(layout.h).toBeGreaterThan(36);
    expect(layout.y + layout.h).toBeLessThan(218);
    expect(layout.primaryY).toBeLessThan(layout.secondaryY);
  });

  it("keeps single-line objective strips compact", () => {
    expect(resolveObjectiveStripLayout({
      canvasWidth: 900,
      canvasHeight: 640,
      margin: 12,
      topX: 12,
      topY: 12,
      topW: 600,
      topH: 92,
      bottomHudY: 516,
      hasSecondaryLine: false,
    })).toMatchObject({
      x: 12,
      y: 112,
      h: 28,
      primaryY: 130,
    });
  });
});

function fakeCtx() {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
    textAlign: "left",
    textBaseline: "alphabetic",
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    measureText: (s: string) => ({ width: s.length * 6 }),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
}

describe("render — createRenderHelpers", () => {
  it("fillRoundedRect issues path + fill on ctx", () => {
    const ctx = fakeCtx();
    const h = createRenderHelpers(ctx as any);
    h.fillRoundedRect(0, 0, 10, 10, 4, "#abc");
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillStyle).toBe("#abc");
  });

  it("strokeRoundedRect issues stroke", () => {
    const ctx = fakeCtx();
    const h = createRenderHelpers(ctx as any);
    h.strokeRoundedRect(0, 0, 10, 10, 4, "#fff", 2);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.lineWidth).toBe(2);
  });

  it("drawSoftPanel saves+restores and creates a gradient", () => {
    const ctx = fakeCtx();
    const h = createRenderHelpers(ctx as any);
    h.drawSoftPanel(1, 2, 30, 40, {});
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(1, 2, 1, 42);
  });

  it("fitText returns short text unchanged", () => {
    const ctx = fakeCtx();
    const h = createRenderHelpers(ctx as any);
    expect(h.fitText("hi", 1000)).toBe("hi");
  });

  it("fitText truncates long text with ellipsis", () => {
    const ctx = fakeCtx();
    const h = createRenderHelpers(ctx as any);
    const out = h.fitText("Hello World", 60); // each char = 6 width
    expect(out.endsWith("...")).toBe(true);
    expect(out.length).toBeLessThan("Hello World...".length);
  });

  it("drawClippedText draws via fillText", () => {
    const ctx = fakeCtx();
    const h = createRenderHelpers(ctx as any);
    h.drawClippedText("text", 5, 6, 1000, "#fff");
    expect(ctx.fillText).toHaveBeenCalledWith("text", 5, 6);
    expect(ctx.fillStyle).toBe("#fff");
  });
});
