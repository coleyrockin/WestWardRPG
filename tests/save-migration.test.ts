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

  it("backfills world.timeOfDay on v3 saves missing it", () => {
    const save = { version: 3, savedAt: 99, world: {} };
    const out = migrateSaveToV3(save);
    expect(typeof out?.world?.timeOfDay).toBe("number");
    expect(out?.world?.timeOfDay).toBeGreaterThanOrEqual(0);
    expect(out?.world?.timeOfDay).toBeLessThan(1);
  });

  it("preserves existing world.timeOfDay on v3 saves", () => {
    const save = { version: 3, savedAt: 99, world: { timeOfDay: 0.7 } };
    const out = migrateSaveToV3(save);
    expect(out?.world?.timeOfDay).toBe(0.7);
  });

  it("v2 to v3 migration seeds a valid timeOfDay", () => {
    const out = migrateSaveToV3({ version: 2, savedAt: 1 });
    expect(typeof out?.world?.timeOfDay).toBe("number");
  });

  it("backfills companion world fields without selecting a companion", () => {
    const save = { version: 3, savedAt: 99, world: { timeOfDay: 0.4 } };
    const out = migrateSaveToV3(save);
    expect(out?.world?.companionId).toBeNull();
    expect(out?.world?.companionHp).toBeNull();
    expect(out?.world?.companionDowned).toBe(false);
    expect(out?.world?.companionRecoveryTimer).toBe(0);
  });

  it("backfills run summary stats on v3 saves missing them", () => {
    const save = { version: 3, savedAt: 99, time: 42, world: { timeOfDay: 0.4 } };
    const out = migrateSaveToV3(save);
    expect(out?.world?.runStats).toMatchObject({
      startedAt: 42,
      endedAt: null,
      victory: false,
      endingId: null,
      kills: 0,
      miniBossKills: 0,
      resourcesHarvested: 0,
      questOutcomesCount: 0,
    });
  });

  it("preserves existing run summary stats through v3 backfill", () => {
    const save = {
      version: 3,
      savedAt: 99,
      world: {
        runStats: {
          startedAt: 4,
          endedAt: 250,
          victory: true,
          endingId: "solidarity",
          kills: 12,
          miniBossKills: 3,
          resourcesHarvested: 18,
          questOutcomesCount: 5,
        },
      },
    };
    const out = migrateSaveToV3(save);
    expect(out?.world?.runStats).toMatchObject(save.world.runStats);
  });

  it("backfills equipment.affixes on v3 saves missing it", () => {
    const save = {
      version: 3,
      savedAt: 99,
      player: { equipment: { weaponTier: "Refined", armorMods: ["stamina_regen"] } },
    };
    const out = migrateSaveToV3(save);
    expect(Array.isArray(out?.player?.equipment?.affixes)).toBe(true);
    expect(out?.player?.equipment?.affixes).toEqual([]);
    expect(out?.player?.equipment?.weaponTier).toBe("Refined");
    expect(out?.player?.equipment?.armorMods).toEqual(["stamina_regen"]);
  });

  it("backfills character identity on v3 saves missing it", () => {
    const save = { version: 3, savedAt: 99, progression: { equipment: { weaponTier: "Common" } } };
    const out = migrateSaveToV3(save);
    expect(out?.progression?.identity?.originId).toBe("exiled_marshal");
    expect(out?.progression?.identity?.attributes?.grit).toBeGreaterThan(0);
  });

  it("backfills weapon families and armor slots on v3 progression saves", () => {
    const save = { version: 3, savedAt: 99, progression: { equipment: { weaponTier: "Refined" } } };
    const out = migrateSaveToV3(save);
    expect(out?.progression?.equipment?.weaponFamily).toBe("saber");
    expect(out?.progression?.equipment?.armorSlots?.body).toBe("travel_duster");
    expect(out?.progression?.equipment?.armorSlots?.feet).toBe("trail_boots");
  });

  it("preserves existing character identity through v3 backfill", () => {
    const save = {
      version: 3,
      savedAt: 99,
      progression: {
        identity: {
          originId: "lantern_defector",
          attributes: { might: 2, grit: 3, cunning: 4, craft: 2, speech: 3, lore: 5 },
          unspentAttributePoints: 2,
        },
      },
    };
    const out = migrateSaveToV3(save);
    expect(out?.progression?.identity).toMatchObject(save.progression.identity);
  });

  it("preserves existing equipment.affixes through v3 backfill", () => {
    const save = {
      version: 3,
      savedAt: 99,
      player: { equipment: { weaponTier: "Relic", armorMods: [], affixes: ["searing", "hungering"] } },
    };
    const out = migrateSaveToV3(save);
    expect(out?.player?.equipment?.affixes).toEqual(["searing", "hungering"]);
  });

  it("v2 to v3 migration seeds an empty affixes array", () => {
    const out = migrateSaveToV3({
      version: 2,
      savedAt: 1,
      player: { equipment: { weaponTier: "Common", armorMods: [] } },
    });
    expect(out?.player?.equipment?.affixes).toEqual([]);
  });
});
