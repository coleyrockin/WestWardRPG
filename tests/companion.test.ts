import { describe, it, expect } from "vitest";
import {
  createInitialCompanionRuntime,
  chooseEligibleCompanion,
  updateCompanionRuntime,
  applyCompanionAttack,
  applyCompanionDamage,
  tickCompanionRecovery,
  applyCompanionThreat,
} from "../src/companion.js";

describe("companion", () => {
  it("selects the highest-affinity eligible NPC", () => {
    const selected = chooseEligibleCompanion({
      elder: 45,
      smith: 61,
      innkeeper: 74,
    });

    expect(selected?.id).toBe("innkeeper");
    expect(selected?.name).toBe("Nora Vale");
  });

  it("does not select a companion below the affinity threshold", () => {
    expect(chooseEligibleCompanion({ smith: 59 })).toBeNull();
  });

  it("moves an active companion toward the player leash point", () => {
    const runtime = createInitialCompanionRuntime();
    runtime.active = true;
    runtime.id = "smith";
    runtime.x = 0;
    runtime.y = 0;

    updateCompanionRuntime(runtime, { x: 4, y: 0 }, [], 1, () => false);

    expect(runtime.x).toBeGreaterThan(0);
    expect(runtime.y).toBe(0);
  });

  it("damages the nearest enemy when attack cooldown is ready", () => {
    const runtime = createInitialCompanionRuntime();
    runtime.active = true;
    runtime.id = "smith";
    runtime.x = 0;
    runtime.y = 0;
    runtime.attackCooldown = 0;
    const enemies = [
      { id: "far", x: 5, y: 0, hp: 20, alive: true },
      { id: "near", x: 1, y: 0, hp: 20, alive: true },
    ];

    const hit = applyCompanionAttack(runtime, enemies);

    expect(hit?.id).toBe("near");
    expect(enemies[1].hp).toBe(12);
    expect(runtime.attackCooldown).toBeGreaterThan(0);
  });

  it("downs a companion and applies an affinity penalty", () => {
    const runtime = createInitialCompanionRuntime();
    runtime.active = true;
    runtime.id = "smith";
    runtime.name = "Professor Cogwheel";
    runtime.hp = 6;
    const affinity = { smith: 70 };

    const downed = applyCompanionDamage(runtime, 8, affinity);

    expect(downed?.id).toBe("smith");
    expect(runtime.active).toBe(false);
    expect(runtime.downed).toBe(true);
    expect(runtime.recoveryTimer).toBeGreaterThan(0);
    expect(affinity.smith).toBe(55);
  });

  it("recovers a downed companion near the player after the timer expires", () => {
    const runtime = createInitialCompanionRuntime();
    runtime.id = "warden";
    runtime.name = "Marshal Boone";
    runtime.downed = true;
    runtime.recoveryTimer = 0.1;

    const recovered = tickCompanionRecovery(runtime, { x: 4, y: 5 }, 0.2);

    expect(recovered).toBe(true);
    expect(runtime.active).toBe(true);
    expect(runtime.downed).toBe(false);
    expect(runtime.x).toBeCloseTo(3.25);
    expect(runtime.hp).toBeGreaterThan(0);
  });

  it("lets nearby enemies threaten the companion", () => {
    const runtime = createInitialCompanionRuntime();
    runtime.active = true;
    runtime.id = "innkeeper";
    runtime.x = 0;
    runtime.y = 0;
    runtime.hp = 20;
    const enemies = [{ x: 0.7, y: 0, alive: true, baseDamage: 6, attackReach: 1 }];

    const result = applyCompanionThreat(runtime, enemies, 1, { innkeeper: 80 });

    expect(result?.damage).toBe(6);
    expect(runtime.hp).toBe(14);
    expect(runtime.threatCooldown).toBeGreaterThan(0);
  });
});
