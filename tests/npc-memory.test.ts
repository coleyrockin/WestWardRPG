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

  it("lets notable story loot override generic NPC reactions", () => {
    const memory = createInitialNpcMemoryState();
    const line = resolveNpcReactiveLine("warden", memory, {
      inventory: { "Worn Badge": 1 },
    });

    expect(line).toContain("Marshal Boone");
    expect(line).toContain("badge");
  });

  it("lets completed special jobs override carried story loot", () => {
    const memory = createInitialNpcMemoryState();

    const boone = resolveNpcReactiveLine("warden", memory, {
      inventory: { "Map Scrap": 1 },
      completedJobIds: ["frontier_map_survey"],
    });
    const quill = resolveNpcReactiveLine("merchant", memory, {
      inventory: { "Sealed Note": 1 },
      completedJobIds: ["frontier_quiet_note_trace"],
    });

    expect(boone).toContain("road survey");
    expect(boone).toContain("Marshal Boone");
    expect(quill).toContain("copied note");
    expect(quill).toContain("Reverend Quill");
  });

  it("reacts to completed Ashfall helmet salvage work", () => {
    const memory = createInitialNpcMemoryState();

    const smith = resolveNpcReactiveLine("smith", memory, {
      inventory: { "Miner Helmet": 1 },
      completedJobIds: ["ashfall_miner_helmet_salvage"],
    });

    expect(smith).toContain("Professor Cogwheel");
    expect(smith).toContain("slag dust");
  });
});
