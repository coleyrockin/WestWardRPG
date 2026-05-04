import { describe, expect, it } from "vitest";
import {
  resolveFirstMinuteCache,
  resolveFirstMinuteCacheReward,
  resolveFirstMinutePressure,
  resolveHitFeedback,
  resolveOpeningObjective,
  resolveOpeningRouteGuide,
} from "../src/gameFeel.js";

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

  it("adds first-minute distance, action, and reward text for HUD clarity", () => {
    const pressure = resolveFirstMinutePressure({
      mode: "playing",
      time: 24,
      inHouse: false,
      regionId: "frontier",
      player: { x: 9.5, y: 8.5 },
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    });

    expect(pressure?.actionLabel).toBe("Open cache");
    expect(pressure?.distanceLine).toBe("3m");
    expect(pressure?.rewardLine).toBe("+12g, +6 XP, +1 Potion, +1 Slime Core");
    expect(pressure?.objectiveLine).toContain("3m");
    expect(pressure?.objectiveLine).toContain("+12g");
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

  it("turns first-minute pressure into a reachable cache target", () => {
    const cache = resolveFirstMinuteCache({
      mode: "playing",
      time: 24,
      inHouse: false,
      regionId: "frontier",
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    });
    const pressure = resolveFirstMinutePressure({
      mode: "playing",
      time: 24,
      inHouse: false,
      regionId: "frontier",
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    });

    expect(cache?.id).toBe("frontier-opening-cache");
    expect(cache?.marker).toEqual(pressure?.marker);
    expect(cache?.interactionRadius).toBeGreaterThan(1);
    expect(cache?.reward.items["Slime Core"]).toBe(1);
  });

  it("resolves deterministic first cache rewards once", () => {
    const reward = resolveFirstMinuteCacheReward({ regionId: "frontier", opened: false });

    expect(reward.ok).toBe(true);
    expect(reward.gold).toBeGreaterThan(0);
    expect(reward.items).toMatchObject({ Potion: 1, "Slime Core": 1 });
    expect(resolveFirstMinuteCacheReward({ regionId: "frontier", opened: true }).ok).toBe(false);
    expect(resolveFirstMinuteCacheReward({ regionId: "frontier", claimed: true }).ok).toBe(false);
  });

  it("builds an opening route guide with cache, board, reward, and threat context", () => {
    const pressure = resolveFirstMinutePressure({
      mode: "playing",
      time: 20,
      inHouse: false,
      regionId: "frontier",
      player: { x: 9.5, y: 8.5 },
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    });
    const guide = resolveOpeningRouteGuide({
      mode: "playing",
      time: 20,
      inHouse: false,
      regionId: "frontier",
      player: { x: 9.5, y: 8.5 },
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
      pressure,
      boardProp: { label: "Boone Job Board", x: 10.5, y: 8.5 },
      regionLabel: "Dustward Frontier",
    });

    expect(guide).toMatchObject({
      title: "Opening route",
      urgency: "high",
      stepCount: 3,
    });
    expect(guide?.objectiveLine).toContain("Open cache");
    expect(guide?.objectiveLine).toContain("+12g");
    expect(guide?.secondaryLine).toContain("Boone Job Board");
    expect(guide?.secondaryLine).toContain("Threat");
    expect(guide?.regionHint).toBe("Dustward Frontier");
  });

  it("uses active job route markers in the opening route guide", () => {
    const guide = resolveOpeningRouteGuide({
      mode: "playing",
      time: 40,
      inHouse: false,
      regionId: "frontier",
      player: { x: 9.5, y: 8.5 },
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
      activeJob: { title: "Town Watch Patrol", rewardLine: "+28g, +14 XP", progressLine: "Checkpoint 1/3" },
      jobMarker: { label: "Checkpoint 1", action: "checkpoint", distanceLine: "18m", regionHint: "Frontier road", checkpointIndex: 1, checkpointTotal: 3 },
    });

    expect(guide?.objectiveLine).toContain("Town Watch Patrol");
    expect(guide?.objectiveLine).toContain("Checkpoint 1");
    expect(guide?.objectiveLine).toContain("18m");
  });

  it("hides the opening route guide after the first-minute window or early progress", () => {
    expect(resolveOpeningRouteGuide({
      mode: "playing",
      time: 610,
      inHouse: false,
      inventory: { "Slime Core": 0 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    })).toBeNull();
    expect(resolveOpeningRouteGuide({
      mode: "playing",
      time: 20,
      inHouse: false,
      inventory: { "Slime Core": 1 },
      quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    })).toBeNull();
  });
});
