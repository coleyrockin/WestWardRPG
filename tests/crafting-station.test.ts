import { describe, expect, it } from "vitest";
import { createInitialCharacterIdentity } from "../src/characterIdentity.js";
import { createInitialProgressionState } from "../src/progressionSystem.js";
import {
  createInitialWorkstationState,
  describeWorkstationState,
  getAvailableCraftingActions,
  getCraftingActionCatalog,
  normalizeWorkstationState,
  resolveCraftingAction,
} from "../src/craftingStation.js";

function makeContext() {
  const progression = createInitialProgressionState();
  progression.identity = createInitialCharacterIdentity("ash_salvager");
  progression.equipment.ownedArmorPieces = ["salvage_gloves", "lantern_charm"];
  progression.equipment.weaponFamilyTokens = ["hammer"];
  return {
    inventory: { Wood: 4, Stone: 2, Ashglass: 3, "Scrap Coil": 2, Potion: 0, "Cipher Lens": 0, "Pressurized Ink": 0 },
    progression,
    house: { unlocked: true, workstation: createInitialWorkstationState() },
  };
}

describe("craftingStation", () => {
  it("lists available workstation actions from resources and owned gear", () => {
    const context = makeContext();
    const actions = getAvailableCraftingActions(context);
    expect(actions.map((a) => a.id)).toEqual(expect.arrayContaining(["craft_potion", "equip_armor_salvage_gloves", "equip_armor_lantern_charm", "prepare_refine_kit", "fit_weapon_hammer"]));
  });

  it("shows blocked recipe requirements and missing resources", () => {
    const context = makeContext();
    context.inventory = { Wood: 1, Stone: 0, Ashglass: 0, "Scrap Coil": 0, Potion: 0, "Cipher Lens": 0, "Pressurized Ink": 0 };

    const catalog = getCraftingActionCatalog(context);
    const potion = catalog.find((action) => action.id === "craft_potion");
    const refine = catalog.find((action) => action.id === "prepare_refine_kit");

    expect(potion?.available).toBe(false);
    expect(potion?.missing).toEqual({ Wood: 1, Stone: 1 });
    expect(refine?.available).toBe(false);
    expect(refine?.blockedReason).toContain("missing");
  });

  it("explains station-gated recipes before they are available", () => {
    const context = makeContext();
    context.house.workstation.level = 2;
    context.inventory["Cipher Lens"] = 1;
    context.inventory["Pressurized Ink"] = 1;

    const mapProject = getCraftingActionCatalog(context).find((action) => action.id === "draft_region_map");

    expect(mapProject?.available).toBe(false);
    expect(mapProject?.blockedReason).toContain("Workbench III");
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
    const result = resolveCraftingAction("equip_armor_salvage_gloves", context);

    expect(result.ok).toBe(true);
    expect(result.progression.equipment.armorSlots.hands).toBe("salvage_gloves");
    expect(result.progression.equipment.ownedArmorPieces).toContain("salvage_gloves");
    expect(result.message).toContain("Salvage Gloves");
  });

  it("equips any owned armor piece by its slot without consuming it", () => {
    const context = makeContext();
    const result = resolveCraftingAction("equip_armor_lantern_charm", context);

    expect(result.ok).toBe(true);
    expect(result.progression.equipment.armorSlots.trinket).toBe("lantern_charm");
    expect(result.progression.equipment.ownedArmorPieces).toContain("lantern_charm");
    expect(result.message).toContain("Lantern Charm");
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

  it("uses owned weapon family tokens as persistent refit unlocks", () => {
    const context = makeContext();
    const result = resolveCraftingAction("fit_weapon_hammer", context);

    expect(result.ok).toBe(true);
    expect(result.progression.equipment.weaponFamily).toBe("hammer");
    expect(result.progression.equipment.weaponFamilyTokens).toEqual(["hammer"]);
    expect(result.message).toContain("Hammer");
  });

  it("unlocks a weapon-family branch through the workbench", () => {
    const context = makeContext();
    context.progression.equipment.weaponFamily = "hammer";
    context.inventory.Stone = 5;

    expect(getAvailableCraftingActions(context).map((a) => a.id)).toContain("unlock_weapon_branch_hammer");

    const result = resolveCraftingAction("unlock_weapon_branch_hammer", context);

    expect(result.ok).toBe(true);
    expect(result.progression.equipment.weaponBranches.hammer).toBe(true);
    expect(result.inventory.Ashglass).toBe(1);
    expect(result.inventory.Stone).toBe(1);
    expect(result.inventory["Scrap Coil"]).toBe(1);
    expect(result.message).toContain("Breaker");
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

  it("makes level 2 potion crafting stronger and refine prep cheaper", () => {
    const context = makeContext();
    context.house.workstation.level = 2;
    context.inventory.Ashglass = 1;
    context.inventory["Scrap Coil"] = 1;

    const potion = resolveCraftingAction("craft_potion", context, { rng: () => 0.99 });
    expect(potion.ok).toBe(true);
    expect(potion.inventory.Potion).toBe(2);
    expect(potion.message).toContain("Workbench II");

    const refine = resolveCraftingAction("prepare_refine_kit", context);
    expect(refine.ok).toBe(true);
    expect(refine.inventory.Ashglass).toBe(0);
    expect(refine.inventory["Scrap Coil"]).toBe(0);
  });

  it("unlocks a persistent map-table project at workstation level 3", () => {
    const context = makeContext();
    context.house.workstation.level = 3;
    context.inventory["Cipher Lens"] = 1;
    context.inventory["Pressurized Ink"] = 1;

    expect(getAvailableCraftingActions(context).map((a) => a.id)).toContain("draft_region_map");

    const result = resolveCraftingAction("draft_region_map", context);

    expect(result.ok).toBe(true);
    expect(result.inventory["Cipher Lens"]).toBe(0);
    expect(result.inventory["Pressurized Ink"]).toBe(0);
    expect(result.house.workstation.stationProjects).toEqual(["region_map"]);
    expect(describeWorkstationState(result.house.workstation).projectsLine).toContain("Region Map");
  });
});
