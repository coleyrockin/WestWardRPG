import { describe, it, expect } from "vitest";
import { migrateSaveToV3 } from "../src/saveMigration.js";

describe("saveMigration", () => {
  it("migrates v2 save payloads to v3 defaults", () => {
    const migrated = migrateSaveToV3({
      version: 2,
      savedAt: 123,
      player: { level: 4, loadout: { stance: "balanced", weapon: "Frontier Saber" } },
      inventory: { "Crystal Shard": 2, Wood: 1, Stone: 1, Potion: 1, "Slime Core": 0 },
      quests: { crystal: { status: "active", progress: 2 } },
    });
    expect(migrated?.version).toBe(3);
    expect(migrated?.player?.equipment?.weaponTier).toBe("Common");
    expect(migrated?.progression?.skillTree?.survival).toBe(0);
    expect(migrated?.regions?.activeRegion).toBe("frontier");
    expect(migrated?.graphics?.preset).toBe("balanced");
  });

  it("preserves v3 saves untouched", () => {
    const save = { version: 3, savedAt: 99, player: { level: 2 } };
    expect(migrateSaveToV3(save)).toBe(save);
  });
});
