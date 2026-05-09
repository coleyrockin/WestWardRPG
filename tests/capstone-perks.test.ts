import { describe, it, expect } from "vitest";
import { CAPSTONE_PERKS, getUnlockedCapstonePerkIds } from "../src/progressionSystem.js";

function makeProgression(skillTree = {}, attrs = {}) {
  return {
    skillTree: { survival: 0, combat: 0, influence: 0, ...skillTree },
    identity: { attributes: { might: 2, grit: 2, cunning: 2, craft: 2, speech: 2, lore: 2, ...attrs } },
    upgradePoints: 0,
  };
}

describe("capstonePerks — catalog", () => {
  it("has at least 5 capstone perks", () => {
    expect(CAPSTONE_PERKS.length).toBeGreaterThanOrEqual(5);
  });

  it("each perk has id, label, branch, branchLevel, attributeReq, effects", () => {
    for (const p of CAPSTONE_PERKS) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.label).toBe("string");
      expect(typeof p.branch).toBe("string");
      expect(typeof p.branchLevel).toBe("number");
      expect(p.attributeReq).toBeTruthy();
      expect(p.effects).toBeTruthy();
    }
  });
});

describe("capstonePerks — getUnlockedCapstonePerkIds", () => {
  it("returns empty array when nothing is unlocked", () => {
    const ids = getUnlockedCapstonePerkIds(makeProgression());
    expect(ids).toEqual([]);
  });

  it("unlocks iron_constitution with survival 5 and grit 7", () => {
    const ids = getUnlockedCapstonePerkIds(makeProgression({ survival: 5 }, { grit: 7 }));
    expect(ids).toContain("iron_constitution");
  });

  it("unlocks perfect_form with combat 5 and might 6", () => {
    const ids = getUnlockedCapstonePerkIds(makeProgression({ combat: 5 }, { might: 6 }));
    expect(ids).toContain("perfect_form");
  });

  it("does not unlock guild_network without faction rep", () => {
    const ids = getUnlockedCapstonePerkIds(makeProgression({ influence: 5 }, { speech: 6 }), {});
    expect(ids).not.toContain("guild_network");
  });

  it("unlocks guild_network with influence 5, speech 6, workersGuild 20", () => {
    const ids = getUnlockedCapstonePerkIds(makeProgression({ influence: 5 }, { speech: 6 }), { workersGuild: 20 });
    expect(ids).toContain("guild_network");
  });

  it("handles null progression gracefully", () => {
    expect(getUnlockedCapstonePerkIds(null as any)).toEqual([]);
  });
});
