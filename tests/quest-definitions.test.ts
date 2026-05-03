import { describe, it, expect } from "vitest";
import {
  QUEST_DEFINITIONS,
  createInitialQuestState,
  updateQuestProgressFromInventoryDataDriven,
} from "../src/questDefinitions.js";

describe("questDefinitions", () => {
  it("includes flagship archive quest definition", () => {
    expect(QUEST_DEFINITIONS.archive).toBeDefined();
    expect(QUEST_DEFINITIONS.archive.branchTag).toBe("truthVsComfort");
    expect(QUEST_DEFINITIONS.archive.need).toBe(4);
  });

  it("creates deterministic initial quest statuses", () => {
    const quests = createInitialQuestState();
    expect(quests.crystal.status).toBe("active");
    expect(quests.archive.status).toBe("locked");
  });

  it("completes crystal quest when enough shards exist", () => {
    const quests = createInitialQuestState();
    const inventory = { "Crystal Shard": 4, Wood: 0, Stone: 0 };
    const logs = updateQuestProgressFromInventoryDataDriven(quests, inventory);
    expect(quests.crystal.status).toBe("complete");
    expect(logs.join(" ")).toContain("Valley Survey");
  });

  it("tracks wood quest from wood + stone requirements", () => {
    const quests = createInitialQuestState();
    quests.wood.status = "active";
    const inventory = { "Crystal Shard": 0, Wood: 6, Stone: 4 };
    updateQuestProgressFromInventoryDataDriven(quests, inventory);
    expect(quests.wood.progress).toBe(10);
    expect(quests.wood.status).toBe("complete");
  });

  it("includes new region quest definitions for v3", () => {
    expect(QUEST_DEFINITIONS.ashfall_intro).toBeDefined();
    expect(QUEST_DEFINITIONS.ashfall_boss).toBeDefined();
    expect(QUEST_DEFINITIONS.lantern_probe).toBeDefined();
    expect(QUEST_DEFINITIONS.lantern_revolt).toBeDefined();
  });

  it("defines two branch outcomes for story-relevant quests", () => {
    expect(QUEST_DEFINITIONS.crystal.outcomes.truth.label).toBe("Publish the survey");
    expect(QUEST_DEFINITIONS.crystal.outcomes.comfort.label).toBe("Quiet the findings");
    expect(QUEST_DEFINITIONS.archive.outcomes.truth.effects.flags.archivePublished).toBe(true);
    expect(QUEST_DEFINITIONS.wood.outcomes.solidarity.effects.factionRep.workersGuild).toBeGreaterThan(0);
  });

  it("defines branch outcomes for regional story quests", () => {
    expect(QUEST_DEFINITIONS.ashfall_intro.outcomes.salvage.effects.flags.ashfallSalvageShared).toBe(true);
    expect(QUEST_DEFINITIONS.ashfall_boss.outcomes.mercy.effects.controlVsFreedom).toBeLessThan(0);
    expect(QUEST_DEFINITIONS.lantern_probe.outcomes.broadcast.effects.truthVsComfort).toBeGreaterThan(0);
    expect(QUEST_DEFINITIONS.lantern_revolt.outcomes.guild.effects.solidarityVsStatus).toBeGreaterThan(0);
  });
});
