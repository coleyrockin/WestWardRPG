import { describe, it, expect, vi } from "vitest";
import {
  STATUS_KINDS,
  STATUS_DEFS,
  applyStatus,
  updateStatuses,
  clearStatuses,
  getStatusSpeedMult,
  hasStatus,
  getStatusMagnitude,
} from "../src/statusEffects.js";

describe("statusEffects — exposure", () => {
  it("exposes the four kinds", () => {
    expect(STATUS_KINDS).toEqual(["burn", "bleed", "shock", "frost"]);
  });

  it("each kind has a definition", () => {
    for (const k of STATUS_KINDS) {
      expect(STATUS_DEFS[k]).toBeTruthy();
      expect(typeof STATUS_DEFS[k].duration).toBe("number");
      expect(typeof STATUS_DEFS[k].slowMult).toBe("number");
    }
  });
});

describe("statusEffects — applyStatus", () => {
  it("creates a new entry on first apply", () => {
    const e: any = {};
    applyStatus(e, "burn");
    expect(e.statuses.length).toBe(1);
    expect(e.statuses[0].kind).toBe("burn");
  });

  it("stacks magnitude up to cap when applied again", () => {
    const e: any = {};
    applyStatus(e, "burn", { magnitude: 1, cap: 3 });
    applyStatus(e, "burn", { magnitude: 1, cap: 3 });
    applyStatus(e, "burn", { magnitude: 1, cap: 3 });
    applyStatus(e, "burn", { magnitude: 1, cap: 3 });
    expect(getStatusMagnitude(e, "burn")).toBe(3);
  });

  it("refreshes duration to the larger value", () => {
    const e: any = {};
    applyStatus(e, "bleed", { duration: 1 });
    applyStatus(e, "bleed", { duration: 5 });
    expect(e.statuses[0].durationLeft).toBe(5);
  });

  it("returns null for unknown kinds", () => {
    const e: any = {};
    expect(applyStatus(e, "garbage")).toBeNull();
  });
});

describe("statusEffects — updateStatuses", () => {
  it("decrements duration and removes expired entries", () => {
    const e: any = {};
    applyStatus(e, "frost", { duration: 1.0 });
    updateStatuses(e, 1.5);
    expect(e.statuses.length).toBe(0);
  });

  it("emits DoT damage for burn at the configured tick rate", () => {
    const e: any = { hp: 100 };
    applyStatus(e, "burn", { magnitude: 1 });
    const dmg = vi.fn((ent: any, amt: number) => { ent.hp -= amt; });
    // 0.5s = 1 tick at 2Hz
    updateStatuses(e, 0.5, { applyDamage: dmg });
    expect(dmg).toHaveBeenCalledTimes(1);
    expect(dmg.mock.calls[0][1]).toBe(STATUS_DEFS.burn.perTickDamage);
  });

  it("frost shatter fires only when magnitude reaches threshold on expiry", () => {
    const e1: any = {};
    applyStatus(e1, "frost", { magnitude: 3 });
    e1.statuses[0].durationLeft = 0.01;
    const shatter1 = vi.fn();
    updateStatuses(e1, 0.5, { spawnShatter: shatter1 });
    expect(shatter1).toHaveBeenCalledTimes(1);

    const e2: any = {};
    applyStatus(e2, "frost", { magnitude: 1 });
    e2.statuses[0].durationLeft = 0.01;
    const shatter2 = vi.fn();
    updateStatuses(e2, 0.5, { spawnShatter: shatter2 });
    expect(shatter2).not.toHaveBeenCalled();
  });

  it("clearStatuses empties the stack", () => {
    const e: any = {};
    applyStatus(e, "burn");
    applyStatus(e, "bleed");
    clearStatuses(e);
    expect(e.statuses.length).toBe(0);
  });
});

describe("statusEffects — speed multiplier", () => {
  it("returns 1.0 with no statuses", () => {
    expect(getStatusSpeedMult({} as any)).toBe(1.0);
  });

  it("multiplies slow mults across active statuses", () => {
    const e: any = {};
    applyStatus(e, "frost", { magnitude: 1 });
    applyStatus(e, "shock", { magnitude: 1 });
    const expected = STATUS_DEFS.frost.slowMult * STATUS_DEFS.shock.slowMult;
    expect(getStatusSpeedMult(e)).toBeCloseTo(expected, 5);
  });

  it("never returns below 0.05 (avoids freeze deadlock)", () => {
    const e: any = {};
    applyStatus(e, "frost");
    applyStatus(e, "shock");
    applyStatus(e, "burn");
    applyStatus(e, "bleed");
    expect(getStatusSpeedMult(e)).toBeGreaterThanOrEqual(0.05);
  });
});

describe("statusEffects — hasStatus", () => {
  it("detects active status by kind", () => {
    const e: any = {};
    expect(hasStatus(e, "burn")).toBe(false);
    applyStatus(e, "burn");
    expect(hasStatus(e, "burn")).toBe(true);
    expect(hasStatus(e, "shock")).toBe(false);
  });
});
