import { describe, it, expect } from "vitest";
import {
  COLORBLIND_MODES,
  applyGraphicsAccessibility,
  createInitialGraphicsState,
  getColorblindPalette,
} from "../src/graphicsSettings.js";

describe("graphics accessibility — colorblind", () => {
  it("default state has colorblindMode 'none'", () => {
    const g = createInitialGraphicsState();
    expect(g.accessibility.colorblindMode).toBe("none");
  });

  it("getColorblindPalette returns null for 'none' or unknown mode", () => {
    expect(getColorblindPalette("none")).toBeNull();
    expect(getColorblindPalette(undefined as any)).toBeNull();
    expect(getColorblindPalette("garbage")).toBeNull();
  });

  it.each(["deuteranopia", "protanopia", "tritanopia"])(
    "%s palette exposes friend/foe/neutral hex colors",
    (mode) => {
      const p = getColorblindPalette(mode)!;
      expect(p).not.toBeNull();
      expect(p.friend).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.foe).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.neutral).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  );

  it("applyGraphicsAccessibility passes a valid colorblindMode through", () => {
    const out = applyGraphicsAccessibility({}, { colorblindMode: "deuteranopia" } as any);
    expect(out.colorblindMode).toBe("deuteranopia");
  });

  it("applyGraphicsAccessibility falls back to 'none' for unknown modes", () => {
    const out = applyGraphicsAccessibility({}, { colorblindMode: "bogus" } as any);
    expect(out.colorblindMode).toBe("none");
  });

  it("COLORBLIND_MODES contains exactly the four supported values", () => {
    expect(COLORBLIND_MODES).toEqual([
      "none",
      "deuteranopia",
      "protanopia",
      "tritanopia",
    ]);
  });

  it("foe colors differ across modes (so HUD readouts shift)", () => {
    const d = getColorblindPalette("deuteranopia")!;
    const p = getColorblindPalette("protanopia")!;
    const t = getColorblindPalette("tritanopia")!;
    expect(d.foe).not.toBe(p.foe);
    expect(d.foe).not.toBe(t.foe);
    expect(p.foe).not.toBe(t.foe);
  });
});

import { SETTINGS_ROWS, readSettingValue, stepSetting } from "../src/graphicsSettings.js";

describe("settings modal — stepSetting", () => {
  it("exposes settings rows with required ids", () => {
    const ids = SETTINGS_ROWS.map((r) => r.id);
    expect(ids).toContain("preset");
    expect(ids).toContain("gradientCache");
    expect(ids).toContain("postFx");
    expect(ids).toContain("colorblindMode");
    expect(ids).toContain("fontScale");
    expect(ids).toContain("motionReduction");
    expect(ids).toContain("cameraShake");
  });

  it("toggles bool rows", () => {
    const g = createInitialGraphicsState();
    expect(readSettingValue(g, "gradientCache")).toBe(false);
    stepSetting(g, "gradientCache", 1);
    expect(readSettingValue(g, "gradientCache")).toBe(true);
    stepSetting(g, "gradientCache", -1);
    expect(readSettingValue(g, "gradientCache")).toBe(false);

    expect(readSettingValue(g, "motionReduction")).toBe(false);
    stepSetting(g, "motionReduction", 1);
    expect(readSettingValue(g, "motionReduction")).toBe(true);
  });

  it("cycles enum rows in both directions", () => {
    const g = createInitialGraphicsState();
    expect(readSettingValue(g, "preset")).toBe("balanced");
    stepSetting(g, "preset", 1);
    expect(readSettingValue(g, "preset")).toBe("high");
    stepSetting(g, "preset", 1);
    expect(readSettingValue(g, "preset")).toBe("low");
    stepSetting(g, "preset", -1);
    expect(readSettingValue(g, "preset")).toBe("high");
  });

  it("clamps range rows at min and max", () => {
    const g = createInitialGraphicsState();
    expect(readSettingValue(g, "fontScale")).toBe(1);
    for (let i = 0; i < 20; i++) stepSetting(g, "fontScale", 1);
    expect(readSettingValue(g, "fontScale")).toBe(1.6);
    for (let i = 0; i < 20; i++) stepSetting(g, "fontScale", -1);
    expect(readSettingValue(g, "fontScale")).toBe(0.8);
  });

  it("steps cameraShake by 0.25", () => {
    const g = createInitialGraphicsState();
    stepSetting(g, "cameraShake", 1);
    expect(readSettingValue(g, "cameraShake")).toBe(1.25);
    stepSetting(g, "cameraShake", -1);
    expect(readSettingValue(g, "cameraShake")).toBe(1);
  });

  it("returns null for unknown ids and handles missing graphics gracefully", () => {
    expect(stepSetting(null as any, "preset", 1)).toBeNull();
    const g = createInitialGraphicsState();
    expect(stepSetting(g, "garbage" as any, 1)).toBeNull();
  });
});

describe("graphics accessibility — motionReduction", () => {
  it("zeroes cameraShake when motionReduction is on", () => {
    const mood = applyGraphicsAccessibility({ cameraShake: 1 }, { motionReduction: true });
    expect(mood.cameraShake).toBe(0);
  });

  it("zeroes particleMultiplier when motionReduction is on", () => {
    const mood = applyGraphicsAccessibility({ particleMultiplier: 1 }, { motionReduction: true });
    expect(mood.particleMultiplier).toBe(0);
  });

  it("preserves cameraShake from accessibility settings and particleMultiplier from strengths when motionReduction is off", () => {
    const mood = applyGraphicsAccessibility(
      { particleMultiplier: 0.5 },
      { motionReduction: false, cameraShake: 0.8 },
    );
    expect(mood.cameraShake).toBeCloseTo(0.8);
    expect(mood.particleMultiplier).toBeCloseTo(0.5);
  });
});
