import { describe, it, expect } from "vitest";
import { MUSIC_REGION_PROFILE } from "../src/audio.js";
import { applyOutcomeModulation } from "../src/musicReactivity.js";

describe("applyOutcomeModulation", () => {
  it("returns a clone of the base profile when no outcomes are set", () => {
    const base = MUSIC_REGION_PROFILE.frontier;
    const out = applyOutcomeModulation(base, { questOutcomes: {} });
    expect(out).toEqual(base);
    expect(out).not.toBe(base); // never mutate the source
  });

  it("returns the base profile on null/undefined narrative", () => {
    const base = MUSIC_REGION_PROFILE.frontier;
    expect(applyOutcomeModulation(base, null)).toEqual(base);
    expect(applyOutcomeModulation(base, undefined)).toEqual(base);
  });

  it("preserves base profile shape (all keys present)", () => {
    const base = MUSIC_REGION_PROFILE.frontier;
    const out = applyOutcomeModulation(base, {
      questOutcomes: { archive: "truth" },
    });
    for (const key of Object.keys(base)) {
      expect(out).toHaveProperty(key);
    }
  });

  it("archive truth raises tempo + tension on the frontier profile", () => {
    const base = MUSIC_REGION_PROFILE.frontier;
    const out = applyOutcomeModulation(base, {
      questOutcomes: { archive: "truth" },
    });
    expect(out.tempoBPM).toBeGreaterThan(base.tempoBPM);
    expect(out.tensionMaxGain).toBeGreaterThan(base.tensionMaxGain);
  });

  it("archive comfort lowers tempo + pad gain on the frontier profile", () => {
    const base = MUSIC_REGION_PROFILE.frontier;
    const out = applyOutcomeModulation(base, {
      questOutcomes: { archive: "comfort" },
    });
    expect(out.tempoBPM).toBeLessThan(base.tempoBPM);
    expect(out.padGain).toBeLessThan(base.padGain);
  });

  it("ashfall_boss purge darkens the ashfall profile (lower pad gain, higher tension)", () => {
    const base = MUSIC_REGION_PROFILE.ashfall;
    const out = applyOutcomeModulation(base, {
      questOutcomes: { ashfall_boss: "purge" },
    });
    expect(out.padGain).toBeLessThanOrEqual(base.padGain);
    expect(out.tensionMaxGain).toBeGreaterThan(base.tensionMaxGain);
  });

  it("ashfall_boss mercy brightens the ashfall profile (higher melody gain)", () => {
    const base = MUSIC_REGION_PROFILE.ashfall;
    const out = applyOutcomeModulation(base, {
      questOutcomes: { ashfall_boss: "mercy" },
    });
    expect(out.melodyGain).toBeGreaterThan(base.melodyGain);
  });

  it("lantern_revolt guild brightens iron lantern (higher melody gain, slightly faster)", () => {
    const base = MUSIC_REGION_PROFILE.ironlantern;
    const out = applyOutcomeModulation(base, {
      questOutcomes: { lantern_revolt: "guild" },
    });
    expect(out.melodyGain).toBeGreaterThan(base.melodyGain);
    expect(out.tempoBPM).toBeGreaterThan(base.tempoBPM);
  });

  it("lantern_revolt council quiets iron lantern (lower tension, lower tempo)", () => {
    const base = MUSIC_REGION_PROFILE.ironlantern;
    const out = applyOutcomeModulation(base, {
      questOutcomes: { lantern_revolt: "council" },
    });
    expect(out.tensionMaxGain).toBeLessThan(base.tensionMaxGain);
    expect(out.tempoBPM).toBeLessThan(base.tempoBPM);
  });

  it("multiple outcomes stack — late-chain outcomes apply on top of earlier ones", () => {
    const base = MUSIC_REGION_PROFILE.frontier;
    const truthOnly = applyOutcomeModulation(base, {
      questOutcomes: { archive: "truth" },
    });
    const both = applyOutcomeModulation(base, {
      questOutcomes: { archive: "truth", lantern_revolt: "guild" },
    });
    // Either both have additive effects or the late one dominates; either way, results differ.
    expect(both).not.toEqual(truthOnly);
  });

  it("clamps gain values so a stack of modifications can't go negative", () => {
    const base = MUSIC_REGION_PROFILE.frontier;
    const out = applyOutcomeModulation(base, {
      questOutcomes: {
        archive: "comfort",
        wood: "status",
        crystal: "comfort",
        lantern_revolt: "council",
      },
    });
    expect(out.padGain).toBeGreaterThanOrEqual(0);
    expect(out.melodyGain).toBeGreaterThanOrEqual(0);
    expect(out.tensionMaxGain).toBeGreaterThanOrEqual(0);
    expect(out.tempoBPM).toBeGreaterThan(20); // sanity floor
  });

  it("ignores unknown outcome ids", () => {
    const base = MUSIC_REGION_PROFILE.frontier;
    const out = applyOutcomeModulation(base, {
      questOutcomes: { archive: "not-a-real-outcome" },
    });
    expect(out).toEqual(base);
  });
});
