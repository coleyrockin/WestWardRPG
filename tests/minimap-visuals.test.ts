import { describe, expect, it } from "vitest";
import {
  resolveMinimapDotStyle,
  resolveMinimapMarkerStyle,
  resolveMinimapPolylineStyle,
} from "../src/minimapVisuals.js";

describe("minimapVisuals", () => {
  it("boosts dot visibility at night", () => {
    const day = resolveMinimapDotStyle(2.5, 0);
    const night = resolveMinimapDotStyle(2.5, 1);

    expect(night.glowSize).toBeGreaterThan(day.glowSize);
    expect(night.glowAlpha).toBeGreaterThan(day.glowAlpha);
    expect(night.coreSize).toBeGreaterThan(day.coreSize);
  });

  it("adds marker rings only when night visibility needs help", () => {
    expect(resolveMinimapMarkerStyle(3, 0.1).ringVisible).toBe(false);
    const night = resolveMinimapMarkerStyle(3, 0.9);

    expect(night.ringVisible).toBe(true);
    expect(night.ringSize).toBeGreaterThan(night.glowSize);
  });

  it("boosts focused route markers before ambient minimap dots", () => {
    const ambient = resolveMinimapMarkerStyle(3, 0.1);
    const focused = resolveMinimapMarkerStyle(3, 0.1, { focus: true });

    expect(focused.glowSize).toBeGreaterThan(ambient.glowSize);
    expect(focused.glowAlpha).toBeGreaterThan(ambient.glowAlpha);
    expect(focused.ringVisible).toBe(true);
    expect(focused.coreScale).toBeGreaterThan(ambient.coreScale);
  });

  it("clamps route line alpha while increasing night readability", () => {
    const style = resolveMinimapPolylineStyle({ alpha: 0.78, lineWidth: 1.5, nightStrength: 1 });

    expect(style.alpha).toBe(0.82);
    expect(style.lineWidth).toBeCloseTo(2.05, 5);
    expect(style.shadowBlur).toBe(5);
  });

  it("boosts focused route polylines without exceeding alpha limits", () => {
    const ambient = resolveMinimapPolylineStyle({ alpha: 0.3, lineWidth: 1.5, nightStrength: 0.2 });
    const focused = resolveMinimapPolylineStyle({ alpha: 0.3, lineWidth: 1.5, nightStrength: 0.2, focus: true });

    expect(focused.alpha).toBeGreaterThan(ambient.alpha);
    expect(focused.alpha).toBeLessThanOrEqual(0.88);
    expect(focused.lineWidth).toBeGreaterThan(ambient.lineWidth);
    expect(focused.shadowBlur).toBeGreaterThan(ambient.shadowBlur);
  });
});
