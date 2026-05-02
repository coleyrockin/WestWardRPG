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
    expect(migrated?.graphics?.performance?.gradientCache).toBe(false);
  });

  it("preserves v3 saves identity but backfills miniBosses defaults", () => {
    const save = { version: 3, savedAt: 99, player: { level: 2 } };
    const out = migrateSaveToV3(save);
    expect(out).toBe(save);
    expect(out?.regions?.miniBosses?.ashfall_scrap_tyrant?.defeated).toBe(false);
    expect(out?.regions?.miniBosses?.ashfall_scorch_engine?.defeated).toBe(false);
    expect(out?.regions?.miniBosses?.lantern_overseer?.defeated).toBe(false);
    expect(out?.regions?.miniBosses?.lantern_iron_chanter?.defeated).toBe(false);
  });

  it("preserves an existing miniBoss defeated flag through migration", () => {
    const save = {
      version: 3,
      savedAt: 99,
      player: { level: 2 },
      regions: {
        activeRegion: "ashfall",
        discovered: ["frontier", "ashfall"],
        events: {},
        miniBosses: { ashfall_scrap_tyrant: { defeated: true } },
      },
    };
    const out = migrateSaveToV3(save);
    expect(out?.regions?.miniBosses?.ashfall_scrap_tyrant?.defeated).toBe(true);
    // missing siblings still backfilled
    expect(out?.regions?.miniBosses?.ashfall_scorch_engine?.defeated).toBe(false);
    expect(out?.regions?.miniBosses?.lantern_overseer?.defeated).toBe(false);
  });

  it("backfills miniBosses on v2-to-v3 migration", () => {
    const out = migrateSaveToV3({ version: 2, savedAt: 1 });
    expect(out?.regions?.miniBosses).toBeTruthy();
    expect(Object.keys(out?.regions?.miniBosses || {}).length).toBeGreaterThanOrEqual(4);
  });
});
