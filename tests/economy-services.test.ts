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
      identity: { attributes: { Craft: 4, Speech: 1 } },
      house: { workstation: { level: 2 } },
    });

    expect(merchant).toMatchObject({
      id: "merchant",
      role: "merchant",
      title: "Frontier Provisioner",
      regionHint: "Dustward Frontier",
    });
    expect(merchant.serviceLine).toContain("regional staples");
    expect(smith.title).toBe("Smith Varo's Forge");
    expect(smith.serviceLine).toContain("Craft 4");
    expect(smith.priceNote).toContain("Workbench II");
  });

  it("builds a compact economy snapshot for debug and smoke surfaces", () => {
    const snapshot = buildEconomySnapshot({
      regionId: "frontier",
      identity: { attributes: { Craft: 3, Speech: 2 } },
      house: { workstation: { level: 3 } },
      activeJob: { title: "Town Watch Patrol", rewardLine: "+28g, +14 XP, +1 Tonic" },
    });

    expect(snapshot.regionPriceNote).toContain("Dustward Frontier");
    expect(snapshot.activeGoldSinkLine).toContain("repair");
    expect(snapshot.jobIncomeLine).toContain("Town Watch Patrol");
    expect(snapshot.vendorServices.map((service: any) => service.id)).toEqual(["merchant", "smith", "apothecary", "warden"]);
  });
});
