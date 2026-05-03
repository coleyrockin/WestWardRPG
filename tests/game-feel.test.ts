import { describe, expect, it } from "vitest";
import { resolveHitFeedback, resolveOpeningObjective } from "../src/gameFeel.js";

describe("gameFeel", () => {
  it("scales hit feedback for heavy kills and cleaves", () => {
    const light = resolveHitFeedback({ hitCount: 1, comboStep: 1, maxDamage: 12 });
    const heavyKill = resolveHitFeedback({ hitCount: 2, comboStep: 3, maxDamage: 30, killed: true });

    expect(heavyKill.hitStop).toBeGreaterThan(light.hitStop);
    expect(heavyKill.screenShake).toBeGreaterThan(light.screenShake);
    expect(heavyKill.particleBurst).toBeGreaterThan(light.particleBurst);
    expect(heavyKill.message).toBe("kill");
  });

  it("marks interrupts as the strongest feedback message", () => {
    const feedback = resolveHitFeedback({ hitCount: 1, comboStep: 2, maxDamage: 18, killed: true, interrupted: true });

    expect(feedback.message).toBe("interrupt");
    expect(feedback.hitStop).toBeGreaterThan(0.07);
  });

  it("shows an opening objective before the player makes progress", () => {
    const objective = resolveOpeningObjective({
      mode: "playing",
      time: 22,
      inHouse: false,
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    });

    expect(objective?.title).toBe("First move");
    expect(objective?.urgency).toBe("high");
  });

  it("hides the opening objective after progress", () => {
    expect(resolveOpeningObjective({
      mode: "playing",
      time: 22,
      inHouse: false,
      inventory: { "Slime Core": 1 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    })).toBeNull();
  });
});
