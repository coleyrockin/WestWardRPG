import { describe, expect, it } from "vitest";
import {
  buildEconomySnapshot,
  getVendorServiceProfile,
} from "../src/economyServices.js";

describe("economyServices", () => {
  it("describes distinct vendor identities with region-aware service notes", () => {
    const merchant = getVendorServiceProfile("merchant", { regionId: "frontier" });
    const smith = getVendorServiceProfile("smith", {
      regionId: "frontier",
      identity: { attributes: { craft: 4, speech: 1 } },
      house: { workstation: { level: 2 } },
    });

    expect(merchant).toMatchObject({
      id: "merchant",
      role: "merchant",
      title: "Frontier Provisioner",
      regionHint: "Westward Frontier",
    });
    expect(merchant.serviceLine).toContain("regional staples");
    expect(smith.title).toBe("Smith Varo's Forge");
    expect(smith.serviceLine).toContain("Craft 4");
    expect(smith.priceNote).toContain("Workbench II");
  });

  it("builds a compact economy snapshot for debug and smoke surfaces", () => {
    const snapshot = buildEconomySnapshot({
      regionId: "frontier",
      identity: { attributes: { craft: 3, speech: 2 } },
      house: { workstation: { level: 3 } },
      activeJob: { title: "Town Watch Patrol", rewardLine: "+28g, +14 XP, +1 Tonic" },
    });

    expect(snapshot.regionPriceNote).toContain("Westward Frontier");
    expect(snapshot.regionPriceNote).toContain("Speech 2");
    expect(snapshot.regionPriceNote).toContain("Craft 3");
    expect(snapshot.activeGoldSinkLine).toContain("repair");
    expect(snapshot.jobIncomeLine).toContain("Town Watch Patrol");
    expect(snapshot.vendorServices.map((service: any) => service.id)).toEqual(["merchant", "smith", "apothecary", "warden"]);
  });

  it("reads attributes case-insensitive — accepts canonical lowercase keys", () => {
    const smith = getVendorServiceProfile("smith", {
      regionId: "frontier",
      identity: { attributes: { craft: 5, speech: 3 } },
      house: { workstation: { level: 1 } },
    });
    expect(smith.serviceLine).toContain("Craft 5");
  });

  describe("outcomeReactionLine", () => {
    it("returns null when no quest outcomes have been resolved", () => {
      const merchant = getVendorServiceProfile("merchant", { regionId: "frontier" });
      expect(merchant.outcomeReactionLine).toBeNull();
    });

    it("returns null when narrative has outcomes but vendor has no matching reactions", () => {
      const merchant = getVendorServiceProfile("merchant", {
        regionId: "frontier",
        narrative: { questOutcomes: { slime: "any-outcome-that-doesnt-exist" } },
      });
      expect(merchant.outcomeReactionLine).toBeNull();
    });

    it("merchant reacts to archive outcome (truth)", () => {
      const merchant = getVendorServiceProfile("merchant", {
        regionId: "frontier",
        narrative: { questOutcomes: { archive: "truth" } },
      });
      expect(merchant.outcomeReactionLine).toMatch(/archive/i);
    });

    it("merchant reacts to archive outcome (comfort) with different copy than truth", () => {
      const truth = getVendorServiceProfile("merchant", {
        regionId: "frontier",
        narrative: { questOutcomes: { archive: "truth" } },
      });
      const comfort = getVendorServiceProfile("merchant", {
        regionId: "frontier",
        narrative: { questOutcomes: { archive: "comfort" } },
      });
      expect(truth.outcomeReactionLine).not.toBe(comfort.outcomeReactionLine);
      expect(truth.outcomeReactionLine).toBeTruthy();
      expect(comfort.outcomeReactionLine).toBeTruthy();
    });

    it("smith reacts to wood outcome (solidarity)", () => {
      const smith = getVendorServiceProfile("smith", {
        regionId: "frontier",
        narrative: { questOutcomes: { wood: "solidarity" } },
      });
      expect(smith.outcomeReactionLine).toBeTruthy();
      expect(smith.outcomeReactionLine).toMatch(/plan|guild|workers/i);
    });

    it("smith reacts to wood outcome (status) with different copy", () => {
      const solidarity = getVendorServiceProfile("smith", {
        regionId: "frontier",
        narrative: { questOutcomes: { wood: "solidarity" } },
      });
      const status = getVendorServiceProfile("smith", {
        regionId: "frontier",
        narrative: { questOutcomes: { wood: "status" } },
      });
      expect(solidarity.outcomeReactionLine).not.toBe(status.outcomeReactionLine);
    });

    it("apothecary reacts to ashfall_boss outcome (mercy)", () => {
      const apothecary = getVendorServiceProfile("apothecary", {
        regionId: "frontier",
        narrative: { questOutcomes: { ashfall_boss: "mercy" } },
      });
      expect(apothecary.outcomeReactionLine).toBeTruthy();
    });

    it("warden reacts to archive outcome (comfort)", () => {
      const warden = getVendorServiceProfile("warden", {
        regionId: "frontier",
        narrative: { questOutcomes: { archive: "comfort" } },
      });
      expect(warden.outcomeReactionLine).toBeTruthy();
    });

    it("prefers a later-quest outcome when multiple are present (lantern_revolt > archive)", () => {
      const merchant = getVendorServiceProfile("merchant", {
        regionId: "frontier",
        narrative: { questOutcomes: { archive: "truth", lantern_revolt: "guild" } },
      });
      // lantern_revolt is the last quest in the chain — its reaction wins.
      expect(merchant.outcomeReactionLine).toMatch(/guild|lantern/i);
    });

    it("ignores unknown outcome ids and falls back to null", () => {
      const merchant = getVendorServiceProfile("merchant", {
        regionId: "frontier",
        narrative: { questOutcomes: { archive: "not-a-real-outcome" } },
      });
      expect(merchant.outcomeReactionLine).toBeNull();
    });

    it("buildEconomySnapshot threads narrative through to all vendor services", () => {
      const snapshot = buildEconomySnapshot({
        regionId: "frontier",
        narrative: { questOutcomes: { archive: "truth", wood: "solidarity" } },
      });
      const merchant = snapshot.vendorServices.find((s: any) => s.id === "merchant");
      const smith = snapshot.vendorServices.find((s: any) => s.id === "smith");
      expect(merchant?.outcomeReactionLine).toBeTruthy();
      expect(smith?.outcomeReactionLine).toBeTruthy();
    });
  });
});
