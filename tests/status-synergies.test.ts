import { describe, it, expect } from "vitest";
import { applyStatus, hasStatus, checkStatusSynergies } from "../src/statusEffects.js";

function makeEnemy() {
  return { hp: 100, statuses: [], _statusTickAccum: {} };
}

describe("status synergies — ice burst (burn + frost)", () => {
  it("triggers ice_burst when burn and frost are both active", () => {
    const e = makeEnemy();
    applyStatus(e, "burn", { magnitude: 1 });
    applyStatus(e, "frost", { magnitude: 1 });
    const synergies = checkStatusSynergies(e);
    expect(synergies.some((s: any) => s.type === "ice_burst")).toBe(true);
  });

  it("clears burn and frost on ice_burst trigger", () => {
    const e = makeEnemy();
    applyStatus(e, "burn", { magnitude: 1 });
    applyStatus(e, "frost", { magnitude: 1 });
    checkStatusSynergies(e);
    expect(hasStatus(e, "burn")).toBe(false);
    expect(hasStatus(e, "frost")).toBe(false);
  });

  it("ice_burst has positive burst damage", () => {
    const e = makeEnemy();
    applyStatus(e, "burn", { magnitude: 1 });
    applyStatus(e, "frost", { magnitude: 1 });
    const syn = checkStatusSynergies(e).find((s: any) => s.type === "ice_burst");
    expect(syn?.burst).toBeGreaterThan(0);
  });
});

describe("status synergies — bleed chain (bleed + shock)", () => {
  it("triggers bleed_chain when bleed and shock are both active", () => {
    const e = makeEnemy();
    applyStatus(e, "bleed", { magnitude: 1 });
    applyStatus(e, "shock", { magnitude: 1 });
    const synergies = checkStatusSynergies(e);
    expect(synergies.some((s: any) => s.type === "bleed_chain")).toBe(true);
  });

  it("clears shock (but preserves bleed) on bleed_chain trigger", () => {
    const e = makeEnemy();
    applyStatus(e, "bleed", { magnitude: 1 });
    applyStatus(e, "shock", { magnitude: 1 });
    checkStatusSynergies(e);
    expect(hasStatus(e, "shock")).toBe(false);
    expect(hasStatus(e, "bleed")).toBe(true);
  });
});

describe("status synergies — no trigger", () => {
  it("returns empty array when no synergy conditions are met", () => {
    const e = makeEnemy();
    applyStatus(e, "burn", { magnitude: 1 });
    expect(checkStatusSynergies(e)).toEqual([]);
  });

  it("returns empty array for entity with no statuses", () => {
    expect(checkStatusSynergies(makeEnemy())).toEqual([]);
  });
});
