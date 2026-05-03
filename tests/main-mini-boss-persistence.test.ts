import { describe, it, expect } from "vitest";
import { migrateSaveToV3 } from "../src/saveMigration.js";

describe("main mini-boss persistence contract", () => {
  it("keeps completed mini-boss flags through v2 to v3 migration", () => {
    const migrated = migrateSaveToV3({
      version: 2,
      regions: {
        activeRegion: "ashfall",
        discovered: ["frontier", "ashfall"],
        miniBosses: {
          ashfall_scrap_tyrant: { defeated: true },
          ashfall_scorch_engine: { defeated: false },
          lantern_overseer: { defeated: true },
          lantern_iron_chanter: { defeated: false },
        },
      },
    });

    expect(migrated?.regions?.miniBosses?.ashfall_scrap_tyrant?.defeated).toBe(true);
    expect(migrated?.regions?.miniBosses?.lantern_overseer?.defeated).toBe(true);
    expect(migrated?.regions?.miniBosses?.ashfall_scorch_engine?.defeated).toBe(false);
    expect(migrated?.regions?.miniBosses?.lantern_iron_chanter?.defeated).toBe(false);
  });

  it("preserves completed mini-boss flags across save serialization", () => {
    const migrated = migrateSaveToV3({
      version: 3,
      regions: {
        activeRegion: "ironlantern",
        discovered: ["frontier", "ashfall", "ironlantern"],
        events: {},
        miniBosses: {
          ashfall_scrap_tyrant: { defeated: true },
          lantern_overseer: { defeated: true },
        },
      },
    });

    const roundTrip = JSON.parse(JSON.stringify(migrated));

    expect(roundTrip.regions.miniBosses.ashfall_scrap_tyrant.defeated).toBe(true);
    expect(roundTrip.regions.miniBosses.lantern_overseer.defeated).toBe(true);
    expect(roundTrip.regions.miniBosses.ashfall_scorch_engine.defeated).toBe(false);
    expect(roundTrip.regions.miniBosses.lantern_iron_chanter.defeated).toBe(false);
  });
});
