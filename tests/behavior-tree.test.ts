import { describe, it, expect } from "vitest";
import { sequence, selector, action, condition, inverter, tick, BT_SUCCESS, BT_FAILURE, BT_RUNNING } from "../src/behaviorTree.js";

describe("behaviorTree — primitives", () => {
  it("action returning true maps to success", () => {
    const node = action(() => true);
    expect(tick(node, {}, {})).toBe(BT_SUCCESS);
  });

  it("action returning false maps to failure", () => {
    const node = action(() => false);
    expect(tick(node, {}, {})).toBe(BT_FAILURE);
  });

  it("action returning 'running' passes through", () => {
    const node = action(() => BT_RUNNING);
    expect(tick(node, {}, {})).toBe(BT_RUNNING);
  });

  it("condition true → success", () => {
    const node = condition(() => true);
    expect(tick(node, {}, {})).toBe(BT_SUCCESS);
  });

  it("condition false → failure", () => {
    const node = condition(() => false);
    expect(tick(node, {}, {})).toBe(BT_FAILURE);
  });

  it("inverter flips success to failure", () => {
    const node = inverter(action(() => true));
    expect(tick(node, {}, {})).toBe(BT_FAILURE);
  });

  it("inverter flips failure to success", () => {
    const node = inverter(action(() => false));
    expect(tick(node, {}, {})).toBe(BT_SUCCESS);
  });

  it("inverter passes running through unchanged", () => {
    const node = inverter(action(() => BT_RUNNING));
    expect(tick(node, {}, {})).toBe(BT_RUNNING);
  });
});

describe("behaviorTree — sequence", () => {
  it("succeeds when all children succeed", () => {
    const node = sequence([action(() => true), action(() => true)]);
    expect(tick(node, {}, {})).toBe(BT_SUCCESS);
  });

  it("fails on first failure and stops evaluating", () => {
    let secondCalled = false;
    const node = sequence([
      action(() => false),
      action(() => { secondCalled = true; return true; }),
    ]);
    expect(tick(node, {}, {})).toBe(BT_FAILURE);
    expect(secondCalled).toBe(false);
  });

  it("returns running if a child is running", () => {
    const node = sequence([action(() => true), action(() => BT_RUNNING), action(() => true)]);
    expect(tick(node, {}, {})).toBe(BT_RUNNING);
  });
});

describe("behaviorTree — selector", () => {
  it("succeeds on first success and stops evaluating", () => {
    let secondCalled = false;
    const node = selector([
      action(() => true),
      action(() => { secondCalled = true; return false; }),
    ]);
    expect(tick(node, {}, {})).toBe(BT_SUCCESS);
    expect(secondCalled).toBe(false);
  });

  it("fails when all children fail", () => {
    const node = selector([action(() => false), action(() => false)]);
    expect(tick(node, {}, {})).toBe(BT_FAILURE);
  });

  it("returns running when a child is running", () => {
    const node = selector([action(() => false), action(() => BT_RUNNING)]);
    expect(tick(node, {}, {})).toBe(BT_RUNNING);
  });
});

describe("npcBehaviors — day/night routing", () => {
  const baseNpc = () => ({
    x: 10, y: 10, homeX: 10, homeY: 10,
    wanderRadius: 1, wanderAngle: 0, wanderTimer: 0,
  });

  const baseCtx = (timeOfDay: number) => ({
    dt: 0.016,
    timeOfDay,
    isBlocking: () => false,
    dist: (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y),
    player: { x: 50, y: 50 },
    TAU: Math.PI * 2,
  });

  it("during the day NPC wanders (wander timer decrements)", async () => {
    const { tickNpc } = await import("../src/npcBehaviors.js");
    const npc = { ...baseNpc(), wanderTimer: 5 };
    tickNpc(npc, baseCtx(0.3));
    expect(npc.wanderTimer).toBeLessThan(5);
  });

  it("at night NPC moves toward home, not wander target", async () => {
    const { tickNpc } = await import("../src/npcBehaviors.js");
    const npc = { ...baseNpc(), x: 12, y: 12, homeX: 10, homeY: 10, wanderAngle: Math.PI };
    tickNpc(npc, baseCtx(0.85));
    // Should move toward home (10,10), not away from it
    const distBefore = Math.hypot(12 - 10, 12 - 10);
    const distAfter = Math.hypot(npc.x - 10, npc.y - 10);
    expect(distAfter).toBeLessThan(distBefore);
  });
});
