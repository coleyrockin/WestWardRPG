import { describe, it, expect } from "vitest";
import {
  AFFIXES,
  attachAffix,
  buildAffixModifiers,
  describeAffixes,
  listAffixes,
  rollAffix,
  affixesForSlot,
  getAffix,
} from "../src/weaponAffixes.js";

describe("weaponAffixes", () => {
  it("exposes a non-empty affix table with a known prefix and suffix", () => {
    const list = listAffixes();
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(getAffix("searing")?.slot).toBe("prefix");
    expect(getAffix("hungering")?.slot).toBe("suffix");
    expect(getAffix("nonsense")).toBeNull();
  });

  it("partitions affixes by slot", () => {
    const prefixes = affixesForSlot("prefix");
    const suffixes = affixesForSlot("suffix");
    expect(prefixes.every((a) => a.slot === "prefix")).toBe(true);
    expect(suffixes.every((a) => a.slot === "suffix")).toBe(true);
    expect(prefixes.length).toBeGreaterThan(0);
    expect(suffixes.length).toBeGreaterThan(0);
  });

  it("rolls a deterministic affix for the requested slot", () => {
    const prefix = rollAffix("prefix", () => 0);
    expect(prefix?.slot).toBe("prefix");
    const suffix = rollAffix("suffix", () => 0.999);
    expect(suffix?.slot).toBe("suffix");
  });

  it("attaches a new affix to empty equipment", () => {
    const equipment: { affixes?: string[] } = {};
    expect(attachAffix(equipment, "searing")).toBe(true);
    expect(equipment.affixes).toEqual(["searing"]);
  });

  it("replaces an existing affix in the same slot rather than stacking", () => {
    const equipment = { affixes: ["searing"] };
    attachAffix(equipment, "counterweighted");
    expect(equipment.affixes).toEqual(["counterweighted"]);
  });

  it("keeps a prefix and a suffix together", () => {
    const equipment: { affixes: string[] } = { affixes: [] };
    attachAffix(equipment, "searing");
    attachAffix(equipment, "hungering");
    expect(equipment.affixes).toContain("searing");
    expect(equipment.affixes).toContain("hungering");
    expect(equipment.affixes.length).toBe(2);
  });

  it("rejects unknown affix ids", () => {
    const equipment: { affixes?: string[] } = {};
    expect(attachAffix(equipment, "nonsense")).toBe(false);
    expect(equipment.affixes).toBeUndefined();
  });

  it("aggregates modifiers across attached affixes", () => {
    const mods = buildAffixModifiers(["counterweighted", "resonant"]);
    expect(mods.staggerBonus).toBeCloseTo(AFFIXES.counterweighted.staggerBonus || 0);
    expect(mods.arcBonus).toBeCloseTo(AFFIXES.resonant.arcBonus || 0);
    expect(mods.statusOnHit.length).toBe(0);
  });

  it("records statusOnHit entries with magnitudes", () => {
    const mods = buildAffixModifiers(["searing", "bleeding"]);
    const kinds = mods.statusOnHit.map((entry) => entry.kind).sort();
    expect(kinds).toEqual(["bleed", "burn"]);
    for (const entry of mods.statusOnHit) {
      expect(entry.magnitude).toBeGreaterThan(0);
    }
  });

  it("returns zeroed modifiers for null/undefined input", () => {
    const a = buildAffixModifiers(undefined as unknown as string[]);
    const b = buildAffixModifiers(null as unknown as string[]);
    expect(a.arcBonus).toBe(0);
    expect(a.lifestealPct).toBe(0);
    expect(b.statusOnHit).toEqual([]);
  });

  it("describes empty affix arrays as Plain and joins labels otherwise", () => {
    expect(describeAffixes([])).toBe("Plain");
    expect(describeAffixes(["searing", "resonant"])).toContain("Searing");
    expect(describeAffixes(["searing", "resonant"])).toContain("Resonant");
  });
});
