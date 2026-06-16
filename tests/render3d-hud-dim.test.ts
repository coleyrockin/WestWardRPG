import { describe, it, expect } from "vitest";
import {
  HUD_DIM_DELAY,
  HUD_DIM_PANEL_IDS,
  hudIsActive,
  computeHudDimState,
} from "../src/render3d/hudDim.js";

describe("hudDim — constants", () => {
  it("melts the three clutter panels (not objective/prompt/hero)", () => {
    expect([...HUD_DIM_PANEL_IDS]).toEqual(["job-toast", "field-map", "job-tracker"]);
    expect(Object.isFrozen(HUD_DIM_PANEL_IDS)).toBe(true);
  });
  it("waits a few seconds before dimming", () => {
    expect(HUD_DIM_DELAY).toBeGreaterThanOrEqual(2);
    expect(HUD_DIM_DELAY).toBeLessThanOrEqual(6);
  });
});

describe("hudIsActive — the keep-the-HUD-up signal", () => {
  it("is active when near an interactable, board open, or in combat", () => {
    expect(hudIsActive({ nearestPresent: true })).toBe(true);
    expect(hudIsActive({ boardOpen: true })).toBe(true);
    expect(hudIsActive({ inCombat: true })).toBe(true);
  });
  it("is inactive on empty free-roam", () => {
    expect(hudIsActive({})).toBe(false);
    expect(hudIsActive()).toBe(false);
    expect(hudIsActive({ nearestPresent: false, boardOpen: false, inCombat: false })).toBe(false);
  });
});

describe("computeHudDimState — idle-melt timer", () => {
  it("stays visible until the idle delay elapses, then dims", () => {
    let s = computeHudDimState(null, { active: false, dt: 0 });
    expect(s).toEqual({ dimmed: false, idleT: 0 });
    s = computeHudDimState(s, { active: false, dt: HUD_DIM_DELAY - 0.5 });
    expect(s.dimmed).toBe(false);
    s = computeHudDimState(s, { active: false, dt: 1.0 });
    expect(s.dimmed).toBe(true);
  });

  it("snaps back to visible instantly on any activity and resets the timer", () => {
    let s = { dimmed: true, idleT: 99 };
    s = computeHudDimState(s, { active: true, dt: 0.016 });
    expect(s).toEqual({ dimmed: false, idleT: 0 });
  });

  it("does not re-dim for a full delay window after a reveal (no flicker)", () => {
    // just revealed
    let s = computeHudDimState({ dimmed: true, idleT: 99 }, { active: true, dt: 0.1 });
    expect(s.dimmed).toBe(false);
    // a brief idle blip well under the delay must NOT dim
    s = computeHudDimState(s, { active: false, dt: HUD_DIM_DELAY - 0.1 });
    expect(s.dimmed).toBe(false);
  });

  it("stays dimmed once dimmed while still idle", () => {
    let s = { dimmed: true, idleT: HUD_DIM_DELAY + 5 };
    s = computeHudDimState(s, { active: false, dt: 0.016 });
    expect(s.dimmed).toBe(true);
  });

  it("guards non-finite / missing inputs", () => {
    expect(computeHudDimState(undefined, { active: false, dt: NaN })).toEqual({ dimmed: false, idleT: 0 });
    expect(computeHudDimState(null, {})).toEqual({ dimmed: false, idleT: 0 });
    const s = computeHudDimState({ dimmed: false, idleT: NaN }, { active: false, dt: 0.5 });
    expect(s.idleT).toBeCloseTo(0.5, 5);
  });
});
