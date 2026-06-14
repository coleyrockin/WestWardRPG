import { describe, it, expect } from "vitest";
import {
  EXECUTOR_BANDS,
  EXECUTOR_BARKS,
  bandForApproval,
  pickExecutorBark,
} from "../src/render3d/executorBarks.js";

describe("executorBarks — bands & table", () => {
  it("exposes the three approval bands, frozen", () => {
    expect([...EXECUTOR_BANDS]).toEqual(["low", "neutral", "high"]);
    expect(Object.isFrozen(EXECUTOR_BANDS)).toBe(true);
    expect(Object.isFrozen(EXECUTOR_BARKS)).toBe(true);
  });

  it("every trigger has a full {low,neutral,high} set, each an Executor line", () => {
    for (const [trigger, set] of Object.entries(EXECUTOR_BARKS)) {
      for (const band of EXECUTOR_BANDS) {
        const line = set[band];
        expect(typeof line, `${trigger}.${band}`).toBe("string");
        expect(line.startsWith("Executor:"), `${trigger}.${band} cyan-styled`).toBe(true);
      }
    }
  });
});

describe("bandForApproval — the moral instrument", () => {
  it("maps approval to bands at the +/-25 thresholds", () => {
    expect(bandForApproval(0)).toBe("neutral");
    expect(bandForApproval(24)).toBe("neutral");
    expect(bandForApproval(25)).toBe("high");
    expect(bandForApproval(100)).toBe("high");
    expect(bandForApproval(-24)).toBe("neutral");
    expect(bandForApproval(-25)).toBe("low");
    expect(bandForApproval(-100)).toBe("low");
  });

  it("guards non-finite input to neutral", () => {
    expect(bandForApproval(NaN)).toBe("neutral");
    expect(bandForApproval(undefined)).toBe("neutral"); // optional param → default 0
  });
});

describe("pickExecutorBark", () => {
  it("returns the band-appropriate line for a known trigger", () => {
    expect(pickExecutorBark("enter_calico", { approval: 40 })).toBe(EXECUTOR_BARKS.enter_calico.high);
    expect(pickExecutorBark("enter_calico", { approval: 0 })).toBe(EXECUTOR_BARKS.enter_calico.neutral);
    expect(pickExecutorBark("enter_calico", { approval: -40 })).toBe(EXECUTOR_BARKS.enter_calico.low);
  });

  it("defaults to the neutral band when no approval is given", () => {
    expect(pickExecutorBark("bounty_cleared")).toBe(EXECUTOR_BARKS.bounty_cleared.neutral);
  });

  it("returns null for an unknown trigger (caller fires nothing)", () => {
    expect(pickExecutorBark("no_such_trigger", { approval: 50 })).toBe(null);
  });
});
