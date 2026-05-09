import { describe, it, expect } from "vitest";
import { resolveNarrativeEnding, ENDING_CATALOG } from "../src/decisionEngine.js";

function makeNarrative(overrides = {}) {
  return {
    thematicAxes: { controlVsFreedom: 0, truthVsComfort: 0, solidarityVsStatus: 0 },
    factionRep: { civicCouncil: 0, workersGuild: 0, marketCartel: 0 },
    globalFlags: {},
    questOutcomes: {},
    npcAffinity: {},
    ...overrides,
  };
}

describe("endings — catalog", () => {
  it("has at least 13 endings", () => {
    expect(ENDING_CATALOG.length).toBeGreaterThanOrEqual(13);
  });

  it("each ending has id, title, summary", () => {
    for (const e of ENDING_CATALOG) {
      expect(typeof e.id).toBe("string");
      expect(typeof e.title).toBe("string");
      expect(typeof e.summary).toBe("string");
    }
  });

  it("elite_rotation is the fallback (last in catalog)", () => {
    const last = ENDING_CATALOG[ENDING_CATALOG.length - 1];
    expect(last.id).toBe("elite_rotation");
  });
});

describe("endings — resolveNarrativeEnding", () => {
  it("falls back to elite_rotation when no conditions match", () => {
    // ash_drift_detente catches balanced axes — use extreme values to bypass all specific rules
    const ending = resolveNarrativeEnding(makeNarrative({
      thematicAxes: { controlVsFreedom: 15, truthVsComfort: -5, solidarityVsStatus: -5 },
    }));
    expect(ending.id).toBe("elite_rotation");
  });

  it("resolves ash_drift_detente for balanced runs (all axes near zero)", () => {
    const ending = resolveNarrativeEnding(makeNarrative());
    expect(ending.id).toBe("ash_drift_detente");
  });

  it("resolves ledger_wakes when flags + axes + rep match", () => {
    const ending = resolveNarrativeEnding(makeNarrative({
      globalFlags: { ledgerPublished: true },
      thematicAxes: { truthVsComfort: 20, controlVsFreedom: 0, solidarityVsStatus: 0 },
      factionRep: { workersGuild: 20, civicCouncil: 0, marketCartel: 0 },
    }));
    expect(ending.id).toBe("ledger_wakes");
  });

  it("resolves order_without_truth for high control + low truth", () => {
    const ending = resolveNarrativeEnding(makeNarrative({
      thematicAxes: { controlVsFreedom: 30, truthVsComfort: -15, solidarityVsStatus: 0 },
    }));
    expect(ending.id).toBe("order_without_truth");
  });

  it("resolves solidarity_with_witness when companion is active", () => {
    const ending = resolveNarrativeEnding(
      makeNarrative({
        thematicAxes: { solidarityVsStatus: 20, controlVsFreedom: 0, truthVsComfort: 0 },
        factionRep: { workersGuild: 15, civicCouncil: 0, marketCartel: 0 },
      }),
      { active: true }
    );
    expect(ending.id).toBe("solidarity_with_witness");
  });

  it("resolves ledger_without_bearer when companion downed + ledger published", () => {
    const ending = resolveNarrativeEnding(
      makeNarrative({
        globalFlags: { ledgerPublished: true },
        thematicAxes: { truthVsComfort: 15, controlVsFreedom: 0, solidarityVsStatus: 0 },
      }),
      { downed: true }
    );
    expect(ending.id).toBe("ledger_without_bearer");
  });

  it("resolves mercy_at_the_threshold when both quests mercy and control axis outside balance zone", () => {
    // Use slightly-imbalanced axes so ash_drift_detente doesn't fire first
    const ending = resolveNarrativeEnding(makeNarrative({
      questOutcomes: { ashfall_boss: "mercy", lantern_revolt: "mercy" },
      thematicAxes: { controlVsFreedom: 3, truthVsComfort: 10, solidarityVsStatus: 0 },
    }));
    expect(ending.id).toBe("mercy_at_the_threshold");
  });

  it("handles null narrativeState gracefully (returns a valid ending)", () => {
    const ending = resolveNarrativeEnding(null);
    expect(typeof ending.id).toBe("string");
    expect(ending.id.length).toBeGreaterThan(0);
  });
});
