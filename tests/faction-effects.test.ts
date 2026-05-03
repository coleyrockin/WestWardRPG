import { describe, it, expect } from "vitest";
import {
  FACTION_TIERS,
  FACTION_NAMES,
  resolveFactionTier,
  resolveShopPriceMultiplier,
  canSmithUpgradeWeapon,
  resolvePatrolModifier,
  resolveAllFactionEffects,
} from "../src/factionEffects.js";

describe("factionEffects — tiers", () => {
  it("hostile at <= -25", () => {
    expect(resolveFactionTier(-100)).toBe("hostile");
    expect(resolveFactionTier(-25)).toBe("hostile");
  });

  it("neutral in (-25, 25)", () => {
    expect(resolveFactionTier(0)).toBe("neutral");
    expect(resolveFactionTier(20)).toBe("neutral");
    expect(resolveFactionTier(-10)).toBe("neutral");
  });

  it("allied at >= 25", () => {
    expect(resolveFactionTier(25)).toBe("allied");
    expect(resolveFactionTier(100)).toBe("allied");
  });

  it("treats NaN/non-finite as 0", () => {
    expect(resolveFactionTier(NaN)).toBe("neutral");
    expect(resolveFactionTier(Infinity)).toBe("neutral");
  });

  it("FACTION_NAMES covers all three factions", () => {
    expect(FACTION_NAMES.civicCouncil).toBeTruthy();
    expect(FACTION_NAMES.workersGuild).toBeTruthy();
    expect(FACTION_NAMES.marketCartel).toBeTruthy();
  });
});

describe("factionEffects — shop pricing", () => {
  it("allied cartel reduces prices below 1.0", () => {
    expect(resolveShopPriceMultiplier({ marketCartel: 50 })).toBeLessThan(1.0);
  });

  it("hostile cartel raises prices above 1.0", () => {
    expect(resolveShopPriceMultiplier({ marketCartel: -50 })).toBeGreaterThan(1.0);
  });

  it("neutral cartel is exactly 1.0", () => {
    expect(resolveShopPriceMultiplier({ marketCartel: 0 })).toBe(1.0);
  });

  it("missing factionRep is treated as neutral", () => {
    expect(resolveShopPriceMultiplier(null as any)).toBe(1.0);
    expect(resolveShopPriceMultiplier({} as any)).toBe(1.0);
  });
});

describe("factionEffects — smith gates", () => {
  it("Common→Refined always allowed regardless of rep", () => {
    expect(canSmithUpgradeWeapon({ workersGuild: -100 }, "Common")).toBe(true);
    expect(canSmithUpgradeWeapon({ workersGuild: 100 }, "Common")).toBe(true);
  });

  it("Refined→Relic requires workersGuild >= 0", () => {
    expect(canSmithUpgradeWeapon({ workersGuild: -1 }, "Refined")).toBe(false);
    expect(canSmithUpgradeWeapon({ workersGuild: 0 }, "Refined")).toBe(true);
    expect(canSmithUpgradeWeapon({ workersGuild: 50 }, "Refined")).toBe(true);
  });

  it("future tiers require workersGuild >= 25", () => {
    expect(canSmithUpgradeWeapon({ workersGuild: 24 }, "Relic")).toBe(false);
    expect(canSmithUpgradeWeapon({ workersGuild: 25 }, "Relic")).toBe(true);
  });
});

describe("factionEffects — patrol density", () => {
  it("allied civic council brings friendly patrols, suppresses hostile", () => {
    const m = resolvePatrolModifier({ civicCouncil: 50 });
    expect(m.friendlyMult).toBeGreaterThan(1);
    expect(m.hostileMult).toBeLessThan(1);
  });

  it("hostile civic council does the opposite", () => {
    const m = resolvePatrolModifier({ civicCouncil: -50 });
    expect(m.friendlyMult).toBeLessThan(1);
    expect(m.hostileMult).toBeGreaterThan(1);
  });

  it("neutral civic council yields baseline 1.0/1.0", () => {
    const m = resolvePatrolModifier({ civicCouncil: 0 });
    expect(m.friendlyMult).toBe(1.0);
    expect(m.hostileMult).toBe(1.0);
  });
});

describe("factionEffects — composite", () => {
  it("resolveAllFactionEffects bundles every output", () => {
    const out = resolveAllFactionEffects({ civicCouncil: 30, workersGuild: -10, marketCartel: 50 });
    expect(out.shopPriceMult).toBeLessThan(1);
    expect(out.patrol.friendlyMult).toBeGreaterThan(1);
    expect(out.tiers.civicCouncil).toBe("allied");
    expect(out.tiers.workersGuild).toBe("neutral");
    expect(out.tiers.marketCartel).toBe("allied");
  });
});
