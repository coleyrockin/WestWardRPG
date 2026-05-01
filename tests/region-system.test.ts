import { describe, it, expect } from "vitest";
import {
  createInitialRegionState,
  unlockRegion,
  rollRegionEvent,
} from "../src/regionSystem.js";

describe("regionSystem", () => {
  it("creates deterministic region defaults", () => {
    const state = createInitialRegionState();
    expect(state.activeRegion).toBe("frontier");
    expect(state.discovered).toContain("frontier");
  });

  it("unlocks region and sets active region", () => {
    const state = createInitialRegionState();
    const unlocked = unlockRegion(state, "ashfall");
    expect(unlocked).toBe(true);
    expect(state.discovered).toContain("ashfall");
    expect(state.activeRegion).toBe("ashfall");
  });

  it("rolls event severities deterministically with seeded rng", () => {
    const state = createInitialRegionState();
    const rng = () => 0.01;
    const events = rollRegionEvent(state, 1, rng);
    expect(events.patrol_crackdown.severity).toBeGreaterThanOrEqual(1);
    expect(events.market_crash.severity).toBeGreaterThanOrEqual(1);
    expect(events.civic_unrest.severity).toBeGreaterThanOrEqual(1);
  });
});
