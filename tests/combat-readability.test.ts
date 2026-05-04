import { describe, expect, it } from "vitest";
import { resolveEnemyReadabilityCue } from "../src/combatReadability.js";

describe("combatReadability", () => {
  it("prioritizes windup cues for readable incoming attacks", () => {
    const cue = resolveEnemyReadabilityCue({
      alive: true,
      windupTimer: 0.4,
      windupMax: 0.8,
      flashTimer: 0.1,
      stagger: 0.3,
    });

    expect(cue).toMatchObject({
      state: "windup",
      label: "WINDUP",
      urgency: "high",
      color: "#ff4f3a",
    });
    expect(cue.meter).toBeCloseTo(0.5);
  });

  it("surfaces stagger, phase, and death cues in priority order", () => {
    expect(resolveEnemyReadabilityCue({ alive: true, phase: 2, phaseLabel: "Overdrive" })).toMatchObject({
      state: "phase",
      label: "PHASE 2",
    });
    expect(resolveEnemyReadabilityCue({ alive: true, stagger: 0.5 })).toMatchObject({
      state: "stagger",
      label: "STAGGER",
    });
    expect(resolveEnemyReadabilityCue({ alive: false })).toMatchObject({
      state: "dead",
      label: "DOWN",
    });
  });
});
