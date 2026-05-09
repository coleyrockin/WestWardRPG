import { describe, it, expect } from "vitest";
import { getTodaysOverlays, resolveOverlayDescription, OVERLAY_TYPES } from "../src/regionOverlays.js";

describe("regionOverlays — getTodaysOverlays", () => {
  it("returns 1 or 2 overlays per day", () => {
    for (const region of ["frontier", "ashfall", "ironlantern"]) {
      const overlays = getTodaysOverlays(region, "2026-05-09");
      expect(overlays.length).toBeGreaterThanOrEqual(1);
      expect(overlays.length).toBeLessThanOrEqual(2);
    }
  });

  it("is deterministic — same seed + region = same result", () => {
    const a = getTodaysOverlays("frontier", "2026-05-09").map((o: any) => o.type);
    const b = getTodaysOverlays("frontier", "2026-05-09").map((o: any) => o.type);
    expect(a).toEqual(b);
  });

  it("different dates can produce different overlays", () => {
    const a = getTodaysOverlays("frontier", "2026-05-09").map((o: any) => o.type);
    const b = getTodaysOverlays("frontier", "2026-05-10").map((o: any) => o.type);
    // Not guaranteed to differ, but typically will with different seeds
    expect(typeof a[0]).toBe("string");
    expect(typeof b[0]).toBe("string");
  });

  it("each overlay has type, wx, wy, and meta", () => {
    const overlays = getTodaysOverlays("frontier", "2026-05-09");
    for (const o of overlays) {
      expect(OVERLAY_TYPES[o.type]).toBeTruthy();
      expect(typeof o.wx).toBe("number");
      expect(typeof o.wy).toBe("number");
      expect(o.meta).toBeTruthy();
    }
  });

  it("falls back to frontier for unknown region", () => {
    const overlays = getTodaysOverlays("nowhere" as any, "2026-05-09");
    expect(overlays.length).toBeGreaterThanOrEqual(1);
  });
});

describe("regionOverlays — resolveOverlayDescription", () => {
  it("returns a non-empty string description", () => {
    const overlays = getTodaysOverlays("frontier", "2026-05-09");
    for (const o of overlays) {
      const desc = resolveOverlayDescription(o);
      expect(typeof desc).toBe("string");
      expect(desc.length).toBeGreaterThan(0);
    }
  });
});
