import { describe, expect, it } from "vitest";
import {
  REGION_VISUAL_IDENTITIES,
  buildRegionIdentityLine,
  getRegionVisualIdentity,
} from "../src/regionVisualIdentity.js";

describe("regionVisualIdentity", () => {
  it("defines a complete visual identity for each shipped region", () => {
    for (const regionId of ["frontier", "ashfall", "ironlantern"]) {
      const profile = getRegionVisualIdentity(regionId);
      expect(profile.id).toBe(regionId);
      expect(profile.label.length).toBeGreaterThan(4);
      expect(profile.skyTint).toMatch(/^#/);
      expect(profile.groundPalette.length).toBeGreaterThanOrEqual(3);
      expect(profile.landmarkHints.length).toBeGreaterThanOrEqual(3);
      expect(profile.propPalette.length).toBeGreaterThanOrEqual(3);
      expect(profile.dangerIdentity.length).toBeGreaterThan(8);
    }
  });

  it("falls back to Frontier for unknown regions", () => {
    expect(getRegionVisualIdentity("unknown")).toEqual(REGION_VISUAL_IDENTITIES.frontier);
  });

  it("builds a compact debug/readability line", () => {
    const line = buildRegionIdentityLine("ashfall");
    expect(line).toContain("Ashfall");
    expect(line).toContain("Landmarks");
    expect(line).toContain("Danger");
  });
});
