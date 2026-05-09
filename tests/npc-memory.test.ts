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

  it("reacts to the completed canonical starter road loop", () => {
    const memory = createInitialNpcMemoryState();

    const line = resolveNpcReactiveLine("warden", memory, {
      completedJobIds: ["frontier_slime_bounty"],
    });

    expect(line).toContain("First road loop");
    expect(line).toContain("watchtower");
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

  describe("quest outcome reactions", () => {
    it("elder reacts to archive truth outcome", () => {
      const memory = createInitialNpcMemoryState();
      const line = resolveNpcReactiveLine("elder", memory, {
        questOutcomes: { archive: "truth" },
      });
      expect(line).toContain("Mayor Clem");
      expect(line).toMatch(/archive/i);
    });

    it("elder reacts to archive comfort with different copy than truth", () => {
      const memory = createInitialNpcMemoryState();
      const truth = resolveNpcReactiveLine("elder", memory, {
        questOutcomes: { archive: "truth" },
      });
      const comfort = resolveNpcReactiveLine("elder", memory, {
        questOutcomes: { archive: "comfort" },
      });
      expect(truth).not.toBe(comfort);
      expect(truth).toBeTruthy();
      expect(comfort).toBeTruthy();
    });

    it("warden reacts to ashfall_boss mercy outcome", () => {
      const memory = createInitialNpcMemoryState();
      const line = resolveNpcReactiveLine("warden", memory, {
        questOutcomes: { ashfall_boss: "mercy" },
      });
      expect(line).toContain("Marshal Boone");
      expect(line).toMatch(/spared|crew|witness/i);
    });

    it("warden reacts to ashfall_boss purge with different copy", () => {
      const memory = createInitialNpcMemoryState();
      const mercy = resolveNpcReactiveLine("warden", memory, {
        questOutcomes: { ashfall_boss: "mercy" },
      });
      const purge = resolveNpcReactiveLine("warden", memory, {
        questOutcomes: { ashfall_boss: "purge" },
      });
      expect(mercy).not.toBe(purge);
    });

    it("innkeeper reacts to wood solidarity outcome", () => {
      const memory = createInitialNpcMemoryState();
      const line = resolveNpcReactiveLine("innkeeper", memory, {
        questOutcomes: { wood: "solidarity" },
      });
      expect(line).toContain("Nora Knuckles");
      expect(line).toMatch(/plan|workers|round|drink/i);
    });

    it("prefers a later-quest outcome when multiple are present", () => {
      const memory = createInitialNpcMemoryState();
      const line = resolveNpcReactiveLine("elder", memory, {
        questOutcomes: { archive: "truth", lantern_revolt: "guild" },
      });
      expect(line).toMatch(/lantern|guild/i);
    });

    it("falls back to other reactions when no quest outcome matches", () => {
      const memory = createInitialNpcMemoryState();
      recordNpcMemoryEvent(memory, "elder", {
        type: "poi_discovered",
        poiId: "frontier_old_well",
        poiLabel: "Old Well",
        regionId: "frontier",
      });
      const line = resolveNpcReactiveLine("elder", memory, {
        questOutcomes: {},
      });
      expect(line).toContain("Old Well");
    });

    it("completed-job reaction still beats outcome reaction (more specific recent action)", () => {
      const memory = createInitialNpcMemoryState();
      const line = resolveNpcReactiveLine("warden", memory, {
        questOutcomes: { ashfall_boss: "mercy" },
        completedJobIds: ["frontier_map_survey"],
      });
      expect(line).toContain("road survey");
    });

    it("ignores unknown outcome ids and falls through", () => {
      const memory = createInitialNpcMemoryState();
      recordNpcMemoryEvent(memory, "elder", {
        type: "poi_discovered",
        poiLabel: "Old Well",
        regionId: "frontier",
      });
      const line = resolveNpcReactiveLine("elder", memory, {
        questOutcomes: { archive: "not-a-real-outcome" },
      });
      expect(line).toContain("Old Well");
    });

    it("returns first-meeting line when greetings count is 0", () => {
      const memory = createInitialNpcMemoryState();
      const line = resolveNpcReactiveLine("elder", memory, {});
      expect(line).toBeTruthy();
      expect(line).toMatch(/mayor clem/i);
    });

    it("returns first-meeting line for warden before any interaction", () => {
      const memory = createInitialNpcMemoryState();
      const line = resolveNpcReactiveLine("warden", memory, {});
      expect(line).toMatch(/marshal boone/i);
    });

    it("does not return first-meeting line after a greeting has been recorded", () => {
      const memory = createInitialNpcMemoryState();
      recordNpcMemoryEvent(memory, "elder", { type: "greeting", regionId: "frontier" });
      const line = resolveNpcReactiveLine("elder", memory, {});
      expect(line).toBeNull();
    });

    it("returns high-affinity line when npcAffinity >= 40 and not first meeting", () => {
      const memory = createInitialNpcMemoryState();
      recordNpcMemoryEvent(memory, "smith", { type: "greeting", regionId: "frontier" });
      const line = resolveNpcReactiveLine("smith", memory, {
        npcAffinity: { smith: 40 },
      });
      expect(line).toBeTruthy();
      expect(line).toMatch(/professor cogwheel/i);
    });

    it("does not return high-affinity line when affinity is below threshold", () => {
      const memory = createInitialNpcMemoryState();
      recordNpcMemoryEvent(memory, "merchant", { type: "greeting", regionId: "frontier" });
      const line = resolveNpcReactiveLine("merchant", memory, {
        npcAffinity: { merchant: 39 },
      });
      expect(line).toBeNull();
    });

    it("specific reactions beat high-affinity fallback", () => {
      const memory = createInitialNpcMemoryState();
      recordNpcMemoryEvent(memory, "warden", { type: "greeting", regionId: "frontier" });
      const line = resolveNpcReactiveLine("warden", memory, {
        npcAffinity: { warden: 80 },
        questOutcomes: { ashfall_boss: "mercy" },
      });
      expect(line).toBeTruthy();
      expect(line).not.toMatch(/earned some trust/i);
      expect(line).not.toMatch(/marshal boone.*trust/i);
    });
  });
});
