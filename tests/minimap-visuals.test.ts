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

  it("clamps route line alpha while increasing night readability", () => {
    const style = resolveMinimapPolylineStyle({ alpha: 0.78, lineWidth: 1.5, nightStrength: 1 });

    expect(style.alpha).toBe(0.82);
    expect(style.lineWidth).toBeCloseTo(2.05, 5);
    expect(style.shadowBlur).toBe(5);
  });
});
