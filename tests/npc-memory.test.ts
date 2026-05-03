import { describe, expect, it } from "vitest";
import {
  createInitialNpcMemoryState,
  normalizeNpcMemoryState,
  recordNpcMemoryEvent,
  resolveNpcReactiveLine,
} from "../src/npcMemory.js";

describe("npcMemory", () => {
  it("records greetings, origin, region, house, and gear milestones", () => {
    const memory = createInitialNpcMemoryState();
    recordNpcMemoryEvent(memory, "smith", {
      type: "greeting",
      originId: "ash_salvager",
      regionId: "ashfall",
      houseUnlocked: true,
      gearMilestone: "Refined Hammer",
    });

    expect(memory.byNpc.smith.greetings).toBe(1);
    expect(memory.byNpc.smith.lastOriginId).toBe("ash_salvager");
    expect(memory.byNpc.smith.lastRegionId).toBe("ashfall");
    expect(memory.byNpc.smith.houseUnlocked).toBe(true);
    expect(memory.byNpc.smith.notableGearMilestone).toBe("Refined Hammer");
  });

  it("resolves deterministic reactive lines from memory and context", () => {
    const memory = createInitialNpcMemoryState();
    recordNpcMemoryEvent(memory, "smith", {
      type: "greeting",
      originId: "ash_salvager",
      regionId: "ashfall",
      houseUnlocked: true,
      gearMilestone: "Refined Hammer",
    });

    const line = resolveNpcReactiveLine("smith", memory, {
      factionRep: { workersGuild: 20 },
      recentQuestOutcome: "commons",
    });

    expect(line).toContain("Professor Cogwheel");
    expect(line).toContain("workbench");
  });

  it("normalizes saved memory safely", () => {
    const memory = normalizeNpcMemoryState({ byNpc: { elder: { greetings: 3, lastRegionId: "frontier" } } });
    expect(memory.byNpc.elder.greetings).toBe(3);
    expect(memory.byNpc.elder.lastRegionId).toBe("frontier");
    expect(memory.recentEvents).toEqual([]);
  });
});
