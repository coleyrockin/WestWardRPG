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

  it("records POI discovery renown for NPC reactions", () => {
    const memory = createInitialNpcMemoryState();
    recordNpcMemoryEvent(memory, "elder", {
      type: "poi_discovered",
      poiId: "frontier_old_well",
      poiLabel: "Old Well",
      regionId: "frontier",
    });
    recordNpcMemoryEvent(memory, "elder", {
      type: "poi_discovered",
      poiId: "frontier_drifter_camp",
      poiLabel: "Drifter Camp",
      regionId: "frontier",
    });

    expect(memory.byNpc.elder.discoveredPoiCount).toBe(2);
    expect(memory.byNpc.elder.recentPoiLabel).toBe("Drifter Camp");
    expect(memory.byNpc.elder.recentPoiId).toBe("frontier_drifter_camp");
  });

  it("resolves NPC lines from POI discovery memory", () => {
    const memory = createInitialNpcMemoryState();
    recordNpcMemoryEvent(memory, "elder", {
      type: "poi_discovered",
      poiId: "frontier_old_well",
      poiLabel: "Old Well",
      regionId: "frontier",
    });

    const line = resolveNpcReactiveLine("elder", memory);

    expect(line).toContain("Mayor Clem");
    expect(line).toContain("Old Well");
  });
});
