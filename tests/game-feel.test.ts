import { describe, expect, it } from "vitest";
import { resolveFirstMinutePressure, resolveHitFeedback, resolveOpeningObjective } from "../src/gameFeel.js";

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

  it("creates a visible first-minute pressure marker before progress", () => {
    const pressure = resolveFirstMinutePressure({
      mode: "playing",
      time: 24,
      inHouse: false,
      regionId: "frontier",
      player: { x: 9.5, y: 8.5 },
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    });

    expect(pressure?.id).toBe("frontier-first-pressure");
    expect(pressure?.marker.label).toContain("Smoke");
    expect(pressure?.marker.x).toBeGreaterThan(10);
    expect(pressure?.rewardHint.length).toBeGreaterThan(8);
    expect(pressure?.threatHint.length).toBeGreaterThan(8);
  });

  it("anchors first-minute pressure to a real region marker instead of player movement", () => {
    const baseInput = {
      mode: "playing",
      time: 24,
      inHouse: false,
      regionId: "frontier",
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    };

    const fromStart = resolveFirstMinutePressure({ ...baseInput, player: { x: 9.5, y: 8.5 } });
    const afterWalking = resolveFirstMinutePressure({ ...baseInput, player: { x: 13.5, y: 11.5 } });

    expect(afterWalking?.marker).toEqual(fromStart?.marker);
  });

  it("hides first-minute pressure after the player earns early progress", () => {
    expect(resolveFirstMinutePressure({
      mode: "playing",
      time: 24,
      inHouse: false,
      regionId: "frontier",
      inventory: { "Slime Core": 1 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    })).toBeNull();
  });
});
