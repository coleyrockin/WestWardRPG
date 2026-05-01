import { describe, it, expect } from "vitest";
import {
  createInitialNarrativeState,
  applyMajorDecision,
  resolveNarrativeEnding,
  migrateNarrativeState,
  syncChapterFromProgress,
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

  it("migrates v1 saves into narrative defaults", () => {
    const migrated = migrateNarrativeState({ version: 1 });
    expect(migrated.chapter).toBe("act1");
    expect(migrated.decisions).toEqual([]);
  });
});
