import { describe, expect, it } from "vitest";
import { createInitialCharacterIdentity } from "../src/characterIdentity.js";
import { createInitialProgressionState } from "../src/progressionSystem.js";
import {
  createInitialWorkstationState,
  getAvailableCraftingActions,
  normalizeWorkstationState,
  resolveCraftingAction,
} from "../src/craftingStation.js";

function makeContext() {
  const progression = createInitialProgressionState();
  progression.identity = createInitialCharacterIdentity("ash_salvager");
  progression.equipment.ownedArmorPieces = ["salvage_gloves"];
  progression.equipment.weaponFamilyTokens = ["hammer"];
  return {
    inventory: { Wood: 4, Stone: 2, Ashglass: 3, "Scrap Coil": 2, Potion: 0 },
    progression,
    house: { unlocked: true, workstation: createInitialWorkstationState() },
  };
}

describe("craftingStation", () => {
  it("lists available workstation actions from resources and owned gear", () => {
    const context = makeContext();
    const actions = getAvailableCraftingActions(context);
    expect(actions.map((a) => a.id)).toEqual(expect.arrayContaining(["craft_potion", "fit_salvage_gloves", "prepare_refine_kit", "fit_weapon_hammer"]));
  });

  it("crafts potions with Craft-driven yield", () => {
    const context = makeContext();
    const result = resolveCraftingAction("craft_potion", context, { rng: () => 0.01 });

    expect(result.ok).toBe(true);
    expect(result.inventory.Wood).toBe(2);
    expect(result.inventory.Stone).toBe(1);
    expect(result.inventory.Potion).toBe(2);
    expect(result.house.workstation.craftsCompleted).toBe(1);
  });

  it("fits owned armor pieces through the station", () => {
    const context = makeContext();
    const result = resolveCraftingAction("fit_salvage_gloves", context);

    expect(result.ok).toBe(true);
    expect(result.progression.equipment.armorSlots.hands).toBe("salvage_gloves");
    expect(result.message).toContain("Salvage Gloves");
  });

  it("prepares a refine kit with resource costs and blocks duplicates", () => {
    const context = makeContext();
    const prepared = resolveCraftingAction("prepare_refine_kit", context);
    expect(prepared.ok).toBe(true);
    expect(prepared.inventory.Ashglass).toBe(1);
    expect(prepared.house.workstation.preparedUpgrade).toBe("refine_weapon");

    const duplicate = resolveCraftingAction("prepare_refine_kit", prepared);
    expect(duplicate.ok).toBe(false);
  });

  it("spends weapon family tokens deliberately", () => {
    const context = makeContext();
    const result = resolveCraftingAction("fit_weapon_hammer", context);

    expect(result.ok).toBe(true);
    expect(result.progression.equipment.weaponFamily).toBe("hammer");
    expect(result.progression.equipment.weaponFamilyTokens).toEqual([]);
    expect(result.message).toContain("Hammer");
  });

  it("normalizes missing workstation save data", () => {
    expect(normalizeWorkstationState({ craftsCompleted: 2 }).craftsCompleted).toBe(2);
    expect(normalizeWorkstationState({ preparedUpgrade: 42 }).preparedUpgrade).toBe(null);
  });

  it("upgrades the house workstation with resource costs", () => {
    const context = makeContext();
    context.inventory.Wood = 8;
    context.inventory.Stone = 5;

    expect(getAvailableCraftingActions(context).map((a) => a.id)).toContain("upgrade_workstation_2");

    const result = resolveCraftingAction("upgrade_workstation_2", context);

    expect(result.ok).toBe(true);
    expect(result.inventory.Wood).toBe(0);
    expect(result.inventory.Stone).toBe(1);
    expect(result.house.workstation.level).toBe(2);
    expect(result.house.workstation.craftsCompleted).toBe(1);
    expect(result.message).toContain("level 2");
  });
});
