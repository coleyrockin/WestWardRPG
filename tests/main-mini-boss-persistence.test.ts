import { describe, it, expect } from "vitest";
import { migrateSaveToV3 } from "../src/saveMigration.js";

describe("main mini-boss persistence contract", () => {
  it("keeps miniBoss defeated flags through v3 migration", () => {
    const migrated = migrateSaveToV3({
      version: 2,
      regions: {
        activeRegion: "ashfall",
        discovered: ["frontier", "ashfall"],
        miniBosses: {
          ashfall_scrap_tyrant: { defeated: true },
          ashfall_scorch_engine: { defeated: false },
          lantern_overseer: { defeated: false },
          lantern_iron_chanter: { defeated: false },
        },
      },
    });
    expect(migrated?.regions?.miniBosses?.ashfall_scrap_tyrant?.defeated).toBe(true);
    expect(migrated?.regions?.miniBosses?.ashfall_scorch_engine?.defeated).toBe(false);
  });
});
