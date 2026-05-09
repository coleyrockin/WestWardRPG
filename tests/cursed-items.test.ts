import { describe, it, expect } from "vitest";
import { CURSED_ITEMS, getCursedItemById, getCursedItemsForRegion, applyCarriedCurse, resolveActiveCurseEffects, resolveCurseNpcReaction } from "../src/cursedItems.js";

describe("cursedItems — CURSED_ITEMS", () => {
  it("has at least 4 cursed items", () => {
    expect(CURSED_ITEMS.length).toBeGreaterThanOrEqual(4);
  });

  it("each item has id, name, description, buff, debuff, npcReactionLine", () => {
    for (const c of CURSED_ITEMS) {
      expect(typeof c.id).toBe("string");
      expect(typeof c.name).toBe("string");
      expect(typeof c.buff.stat).toBe("string");
      expect(typeof c.buff.delta).toBe("number");
      expect(typeof c.debuff.stat).toBe("string");
      expect(typeof c.debuff.delta).toBe("number");
      expect(typeof c.npcReactionLine).toBe("string");
    }
  });

  it("buff and debuff affect different stats", () => {
    for (const c of CURSED_ITEMS) {
      expect(c.buff.stat).not.toBe(c.debuff.stat);
    }
  });
});

describe("cursedItems — lookups", () => {
  it("getCursedItemById returns item for known id", () => {
    const item = getCursedItemById("cursed_ring_of_hunger");
    expect(item).not.toBeNull();
    expect(item?.id).toBe("cursed_ring_of_hunger");
  });

  it("getCursedItemById returns null for unknown id", () => {
    expect(getCursedItemById("nope")).toBeNull();
  });

  it("getCursedItemsForRegion returns items for frontier", () => {
    const items = getCursedItemsForRegion("frontier");
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("getCursedItemsForRegion returns empty for unknown region", () => {
    expect(getCursedItemsForRegion("nowhere")).toEqual([]);
  });
});

describe("cursedItems — effects", () => {
  it("applyCarriedCurse adds curse to player", () => {
    const player = { curses: [] };
    const result = applyCarriedCurse(player, "cursed_ring_of_hunger");
    expect(result).toBe(true);
    expect(player.curses).toContain("cursed_ring_of_hunger");
  });

  it("applyCarriedCurse does not apply duplicate", () => {
    const player = { curses: ["cursed_ring_of_hunger"] };
    const result = applyCarriedCurse(player, "cursed_ring_of_hunger");
    expect(result).toBe(false);
    expect(player.curses).toHaveLength(1);
  });

  it("resolveActiveCurseEffects returns combined effects", () => {
    const player = { curses: ["cursed_ring_of_hunger"] };
    const effects = resolveActiveCurseEffects(player);
    expect(effects.attackMult).toBeGreaterThan(0);
    expect(effects.staminaRegen).toBeLessThan(0);
  });

  it("resolveActiveCurseEffects returns empty object with no curses", () => {
    const player = { curses: [] };
    expect(resolveActiveCurseEffects(player)).toEqual({});
  });

  it("resolveActiveCurseEffects handles null player gracefully", () => {
    expect(() => resolveActiveCurseEffects(null)).not.toThrow();
  });
});

describe("cursedItems — NPC reaction", () => {
  it("returns reaction line for known curse", () => {
    const reaction = resolveCurseNpcReaction("elder", ["cursed_ring_of_hunger"]);
    expect(reaction).not.toBeNull();
    expect(typeof reaction?.line).toBe("string");
    expect(reaction?.line.length).toBeGreaterThan(0);
  });

  it("returns null for no curses", () => {
    expect(resolveCurseNpcReaction("elder", [])).toBeNull();
  });
});
