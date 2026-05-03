import { describe, it, expect } from "vitest";
import {
  createInitialCompanionRuntime,
  chooseEligibleCompanion,
  updateCompanionRuntime,
  applyCompanionAttack,
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
});
