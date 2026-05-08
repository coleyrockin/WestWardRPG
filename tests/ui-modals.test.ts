import { describe, it, expect } from "vitest";
import { createInitialUiModalState, normalizeUiModalState } from "../src/uiModals.js";

describe("uiModals", () => {
  it("createInitialUiModalState returns zeroed selection indices for the five tracked modals", () => {
    const state = createInitialUiModalState();
    expect(state).toEqual({
      dialogue: 0,
      questOutcome: 0,
      jobBoard: 0,
      codexTab: 0,
      settings: 0,
    });
  });

  it("createInitialUiModalState returns a fresh object each call", () => {
    const a = createInitialUiModalState();
    const b = createInitialUiModalState();
    expect(a).not.toBe(b);
    a.dialogue = 7;
    expect(b.dialogue).toBe(0);
  });

  it("normalizeUiModalState fills defaults for null/undefined input", () => {
    expect(normalizeUiModalState(null)).toEqual(createInitialUiModalState());
    expect(normalizeUiModalState(undefined)).toEqual(createInitialUiModalState());
  });

  it("normalizeUiModalState backfills missing fields", () => {
    expect(normalizeUiModalState({ dialogue: 2 })).toEqual({
      dialogue: 2,
      questOutcome: 0,
      jobBoard: 0,
      codexTab: 0,
      settings: 0,
    });
  });

  it("normalizeUiModalState preserves valid integer indices", () => {
    expect(normalizeUiModalState({
      dialogue: 1,
      questOutcome: 2,
      jobBoard: 3,
      codexTab: 4,
      settings: 5,
    })).toEqual({
      dialogue: 1,
      questOutcome: 2,
      jobBoard: 3,
      codexTab: 4,
      settings: 5,
    });
  });

  it("normalizeUiModalState clamps negative indices to zero", () => {
    const out = normalizeUiModalState({ dialogue: -3, codexTab: -1 });
    expect(out.dialogue).toBe(0);
    expect(out.codexTab).toBe(0);
  });

  it("normalizeUiModalState floors fractional indices", () => {
    const out = normalizeUiModalState({ dialogue: 2.7, jobBoard: 1.4 });
    expect(out.dialogue).toBe(2);
    expect(out.jobBoard).toBe(1);
  });

  it("normalizeUiModalState rejects non-numeric values and falls back to zero", () => {
    const out = normalizeUiModalState({
      dialogue: "5",
      questOutcome: NaN,
      jobBoard: Infinity,
      codexTab: null,
      settings: undefined,
    });
    expect(out).toEqual(createInitialUiModalState());
  });

  it("normalizeUiModalState ignores unknown fields", () => {
    const out = normalizeUiModalState({ dialogue: 1, unknownField: 999 });
    expect(out).toEqual({
      dialogue: 1,
      questOutcome: 0,
      jobBoard: 0,
      codexTab: 0,
      settings: 0,
    });
    expect((out as any).unknownField).toBeUndefined();
  });

  it("normalizeUiModalState rejects array input and returns defaults", () => {
    expect(normalizeUiModalState([1, 2, 3] as any)).toEqual(createInitialUiModalState());
  });

  it("normalizeUiModalState rejects primitive input and returns defaults", () => {
    expect(normalizeUiModalState("abc" as any)).toEqual(createInitialUiModalState());
    expect(normalizeUiModalState(42 as any)).toEqual(createInitialUiModalState());
  });
});
