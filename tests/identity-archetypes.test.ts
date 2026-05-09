import { describe, it, expect } from "vitest";
import { resolvePlayerArchetype, IDENTITY_ARCHETYPES, ARCHETYPE_NPC_REACTIONS, ARCHETYPE_JOB_HOOKS } from "../src/characterIdentity.js";

function makeIdentity(attrs: Record<string, number>) {
  return { originId: "exiled_marshal", attributes: { might: 2, grit: 2, cunning: 2, craft: 2, speech: 2, lore: 2, ...attrs } };
}

describe("identity archetypes — catalog", () => {
  it("has 10 archetypes", () => {
    expect(IDENTITY_ARCHETYPES).toHaveLength(10);
  });

  it("each archetype has id, label, condition", () => {
    for (const arch of IDENTITY_ARCHETYPES) {
      expect(typeof arch.id).toBe("string");
      expect(typeof arch.label).toBe("string");
      expect(typeof arch.condition).toBe("function");
    }
  });

  it("ARCHETYPE_NPC_REACTIONS covers recognized archetypes", () => {
    const reactionIds = Object.keys(ARCHETYPE_NPC_REACTIONS);
    expect(reactionIds.length).toBeGreaterThanOrEqual(8);
  });
});

describe("identity archetypes — resolvePlayerArchetype", () => {
  it("returns null when no archetype conditions are met", () => {
    const arch = resolvePlayerArchetype(makeIdentity({}));
    expect(arch).toBeNull();
  });

  it("resolves heavy_bounty_hunter for high might + grit", () => {
    const arch = resolvePlayerArchetype(makeIdentity({ might: 6, grit: 6 }));
    expect(arch?.id).toBe("heavy_bounty_hunter");
  });

  it("resolves survivalist_scout for high grit + cunning", () => {
    const arch = resolvePlayerArchetype(makeIdentity({ grit: 7, cunning: 4 }));
    expect(arch?.id).toBe("survivalist_scout");
  });

  it("resolves silver_tongue_trader for high speech + craft", () => {
    const arch = resolvePlayerArchetype(makeIdentity({ speech: 7, craft: 4 }));
    expect(arch?.id).toBe("silver_tongue_trader");
  });

  it("resolves alchemist_drifter for high craft + lore", () => {
    const arch = resolvePlayerArchetype(makeIdentity({ craft: 7, lore: 4 }));
    expect(arch?.id).toBe("alchemist_drifter");
  });

  it("resolves faction_loyalist with high faction rep", () => {
    const arch = resolvePlayerArchetype(makeIdentity({}), [], { civicCouncil: 50, workersGuild: 0, marketCartel: 0 });
    expect(arch?.id).toBe("faction_loyalist");
  });

  it("resolves cursed_wanderer with 2+ curses", () => {
    const arch = resolvePlayerArchetype(makeIdentity({}), ["curse_a", "curse_b"]);
    expect(arch?.id).toBe("cursed_wanderer");
  });
});
