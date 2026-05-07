import { describe, it, expect } from "vitest";
import {
  createInitialNarrativeState,
  applyMajorDecision,
  resolveNarrativeEnding,
  migrateNarrativeState,
  syncChapterFromProgress,
  applyQuestOutcome,
  ENDING_CATALOG,
} from "../src/decisionEngine.js";

describe("decisionEngine", () => {
  it("creates a stable initial narrative state", () => {
    const state = createInitialNarrativeState();
    expect(state.chapter).toBe("act1");
    expect(state.decisions).toEqual([]);
    expect(state.thematicAxes.controlVsFreedom).toBe(0);
  });

  it("applies each major decision only once", () => {
    const state = createInitialNarrativeState();
    const first = applyMajorDecision(state, "elder");
    const second = applyMajorDecision(state, "elder");
    expect(first?.id).toBe("publish_ledger");
    expect(second).toBeNull();
    expect(state.decisions).toHaveLength(1);
  });

  it("maps progress to chapter progression", () => {
    const state = createInitialNarrativeState();
    syncChapterFromProgress(state, 1);
    expect(state.chapter).toBe("act1");
    syncChapterFromProgress(state, 5);
    expect(state.chapter).toBe("act2");
    syncChapterFromProgress(state, 9);
    expect(state.chapter).toBe("act3");
  });

  it("resolves endings from thematic axes", () => {
    const state = createInitialNarrativeState();
    state.thematicAxes.controlVsFreedom = 45;
    state.thematicAxes.truthVsComfort = -30;
    expect(resolveNarrativeEnding(state).id).toBe("order_without_truth");

    state.thematicAxes.controlVsFreedom = -10;
    state.thematicAxes.truthVsComfort = 25;
    state.thematicAxes.solidarityVsStatus = 30;
    expect(resolveNarrativeEnding(state).id).toBe("messy_commons");
  });

  it("falls back to elite_rotation when no rule matches", () => {
    const state = createInitialNarrativeState();
    state.thematicAxes.controlVsFreedom = 12;
    state.thematicAxes.truthVsComfort = -3;
    state.thematicAxes.solidarityVsStatus = 12;
    expect(resolveNarrativeEnding(state).id).toBe("elite_rotation");
  });

  it("returns ash_drift_detente for low-engagement runs", () => {
    const state = createInitialNarrativeState();
    expect(resolveNarrativeEnding(state).id).toBe("ash_drift_detente");
  });

  it("returns ledger_wakes when whistleblowing pays off", () => {
    const state = createInitialNarrativeState();
    state.globalFlags.ledgerPublished = true;
    state.thematicAxes.truthVsComfort = 22;
    state.factionRep.workersGuild = 18;
    expect(resolveNarrativeEnding(state).id).toBe("ledger_wakes");
  });

  it("returns open_forge_compact when worker tooling commons takes hold", () => {
    const state = createInitialNarrativeState();
    state.globalFlags.toolCommonsCreated = true;
    state.thematicAxes.solidarityVsStatus = 20;
    state.factionRep.workersGuild = 25;
    expect(resolveNarrativeEnding(state).id).toBe("open_forge_compact");
  });

  it("returns curfew_pact for normalized hard-order runs", () => {
    const state = createInitialNarrativeState();
    state.globalFlags.curfewNormalized = true;
    state.thematicAxes.controlVsFreedom = 24;
    state.factionRep.civicCouncil = 18;
    expect(resolveNarrativeEnding(state).id).toBe("curfew_pact");
  });

  it("returns iron_lantern_doctrine for transparent authoritarian runs", () => {
    const state = createInitialNarrativeState();
    state.thematicAxes.controlVsFreedom = 30;
    state.thematicAxes.truthVsComfort = 14;
    state.factionRep.civicCouncil = 25;
    expect(resolveNarrativeEnding(state).id).toBe("iron_lantern_doctrine");
  });

  it("returns cartel_quietus when the cartel is broken from below", () => {
    const state = createInitialNarrativeState();
    state.thematicAxes.controlVsFreedom = -20;
    state.thematicAxes.solidarityVsStatus = 18;
    state.factionRep.marketCartel = -28;
    expect(resolveNarrativeEnding(state).id).toBe("cartel_quietus");
  });

  it("exposes a deduplicated ending catalog", () => {
    const ids = ENDING_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("order_without_truth");
    expect(ids).toContain("messy_commons");
    expect(ids).toContain("ledger_wakes");
    expect(ids.length).toBeGreaterThanOrEqual(8);
  });

  it("migrates v1 saves into narrative defaults", () => {
    const migrated = migrateNarrativeState({ version: 1 });
    expect(migrated.chapter).toBe("act1");
    expect(migrated.decisions).toEqual([]);
  });

  it("tracks quest outcomes separately from major decisions", () => {
    const state = createInitialNarrativeState();
    const result = applyQuestOutcome(state, "crystal", "truth");
    const duplicate = applyQuestOutcome(state, "crystal", "truth");

    expect(result?.id).toBe("truth");
    expect(duplicate).toBeNull();
    expect(state.questOutcomes.crystal).toBe("truth");
    expect(state.thematicAxes.truthVsComfort).toBeGreaterThan(0);
    expect(state.factionRep.workersGuild).toBeGreaterThan(0);
    expect(state.globalFlags.surveyPublished).toBe(true);
    expect(state.decisions.at(-1)?.id).toBe("quest_crystal_truth");
  });

  it("backfills quest outcome storage on existing narrative saves", () => {
    const migrated = migrateNarrativeState({
      version: 3,
      narrative: {
        ...createInitialNarrativeState(),
        questOutcomes: undefined,
      },
    });

    expect(migrated.questOutcomes).toEqual({});
  });
});
