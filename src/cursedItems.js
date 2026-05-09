// Cursed item system. Relics found at ruins/shrines that buff one stat and
// debuff another. Each has a hidden NPC reaction line that names the curse.

export const CURSED_ITEMS = [
  {
    id: "cursed_ring_of_hunger",
    name: "Ring of Hollow Hunger",
    description: "+20% attack damage, but stamina regen is halved.",
    buff:  { stat: "attackMult",   delta: 0.2 },
    debuff: { stat: "staminaRegen", delta: -0.5 },
    npcReactionLine: "That ring marks you. The hollow hunger follows its wearers — I've seen it before. It takes more than stamina.",
    loreHint: "Found near old shrines. Origins disputed. Keep it away from the well.",
    regionDrops: ["frontier", "ironlantern"],
  },
  {
    id: "cursed_cloak_of_mist",
    name: "Mist-Eater's Cloak",
    description: "+35% dodge window, but max HP reduced by 25.",
    buff:  { stat: "dodgeWindowMult", delta: 0.35 },
    debuff: { stat: "maxHpFlat",       delta: -25  },
    npcReactionLine: "You're wearing the Mist-Eater's cloth. It makes you fast. It also makes you hollow, eventually.",
    loreHint: "Woven from ashfall silk and something that isn't silk. Don't sleep in it.",
    regionDrops: ["ashfall"],
  },
  {
    id: "cursed_ledger_fragment",
    name: "Ledger Fragment",
    description: "+15% gold from all sources. Faction rep changes are doubled (positive and negative).",
    buff:  { stat: "goldMult",      delta: 0.15 },
    debuff: { stat: "factionRepMult", delta: 2.0  },
    npcReactionLine: "The ledger fragment. I'd put it down if I were you. Every deal you make reads sharper — but so does every debt.",
    loreHint: "Torn from a cartel accounting book. The original owner did not retire.",
    regionDrops: ["ironlantern"],
  },
  {
    id: "cursed_compass_shard",
    name: "Broken Compass Shard",
    description: "+25% XP from exploration. Enemy aggro radius is doubled.",
    buff:  { stat: "exploreXpMult", delta: 0.25 },
    debuff: { stat: "aggroRadiusMult", delta: 2.0 },
    npcReactionLine: "That compass piece? It wants to be found. Everything it calls toward you wants the same.",
    loreHint: "Broken off a navigator's tool. The other half has not been located.",
    regionDrops: ["frontier", "ashfall"],
  },
];

export function getCursedItemById(id) {
  return CURSED_ITEMS.find((c) => c.id === id) || null;
}

export function getCursedItemsForRegion(regionId) {
  return CURSED_ITEMS.filter((c) => c.regionDrops.includes(regionId));
}

export function applyCarriedCurse(player, cursedItemId) {
  const item = getCursedItemById(cursedItemId);
  if (!item) return false;
  if (!player.curses) player.curses = [];
  if (player.curses.includes(cursedItemId)) return false;
  player.curses.push(cursedItemId);
  return true;
}

export function resolveActiveCurseEffects(player) {
  if (!Array.isArray(player?.curses)) return {};
  const effects = {};
  for (const id of player.curses) {
    const item = getCursedItemById(id);
    if (!item) continue;
    const { stat: buffStat, delta: buffDelta } = item.buff;
    const { stat: debuffStat, delta: debuffDelta } = item.debuff;
    effects[buffStat] = (effects[buffStat] || 0) + buffDelta;
    effects[debuffStat] = (effects[debuffStat] || 0) + debuffDelta;
  }
  return effects;
}

export function resolveCurseNpcReaction(npcId, playerCurses = []) {
  for (const curseId of playerCurses) {
    const item = getCursedItemById(curseId);
    if (item) return { curseId, line: item.npcReactionLine };
  }
  return null;
}
