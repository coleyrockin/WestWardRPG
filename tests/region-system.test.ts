import { describe, it, expect } from "vitest";
import {
  createInitialRegionState,
  unlockRegion,
  rollRegionEvent,
  resolveRegionEventModifiers,
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

  it("resolves no modifiers when no events are active", () => {
    const state = createInitialRegionState();
    const mods = resolveRegionEventModifiers(state.events);
    expect(mods.priceMult).toBe(1);
    expect(mods.spawnDensityMult).toBe(1);
    expect(mods.banner).toBeNull();
  });

  it("market crash reduces prices, civic unrest raises spawn density", () => {
    const events = {
      market_crash: { severity: 2, timer: 5 },
      civic_unrest: { severity: 1, timer: 5 },
      patrol_crackdown: { severity: 0, timer: 0 },
    };
    const mods = resolveRegionEventModifiers(events);
    expect(mods.priceMult).toBeLessThan(1);
    expect(mods.spawnDensityMult).toBeGreaterThan(1);
    expect(mods.banner).toContain("Market Crash");
    expect(mods.banner).toContain("Civic Unrest");
  });

  it("handles missing events object safely", () => {
    const mods = resolveRegionEventModifiers(undefined);
    expect(mods.priceMult).toBe(1);
    expect(mods.banner).toBeNull();
  });

  it("tracks mini-boss defeat flags in default state", () => {
    const state = createInitialRegionState();
    expect(state.miniBosses.ashfall_scrap_tyrant.defeated).toBe(false);
    expect(state.miniBosses.ashfall_scorch_engine.defeated).toBe(false);
    expect(state.miniBosses.lantern_overseer.defeated).toBe(false);
    expect(state.miniBosses.lantern_iron_chanter.defeated).toBe(false);
  });

  it("preserves mini-boss defeat flags across serialization shape", () => {
    const state = createInitialRegionState();
    state.miniBosses.ashfall_scrap_tyrant.defeated = true;
    state.miniBosses.lantern_overseer.defeated = true;
    const roundTrip = JSON.parse(JSON.stringify(state));
    expect(roundTrip.miniBosses.ashfall_scrap_tyrant.defeated).toBe(true);
    expect(roundTrip.miniBosses.lantern_overseer.defeated).toBe(true);
    expect(roundTrip.miniBosses.ashfall_scorch_engine.defeated).toBe(false);
  });
});
