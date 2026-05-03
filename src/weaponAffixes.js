// Weapon affixes — pure data + helpers.
//
// Each weapon can carry one prefix and one suffix. Affixes layer additively
// onto the existing combat pipeline: arc/stagger bonuses feed `applySwingLoadout`,
// statusOnHit feeds the per-swing status application path, and lifestealPct
// feeds the post-hit damage settlement.

export const AFFIX_SLOTS = ["prefix", "suffix"];

export const AFFIXES = {
  searing: {
    id: "searing",
    label: "Searing",
    slot: "prefix",
    tier: 1,
    statusOnHit: "burn",
    statusMagnitude: 1,
    description: "Hits inflict +1 burn magnitude.",
  },
  counterweighted: {
    id: "counterweighted",
    label: "Counterweighted",
    slot: "prefix",
    tier: 2,
    staggerBonus: 0.1,
    description: "+0.1 stagger on hit.",
  },
  bleeding: {
    id: "bleeding",
    label: "Bleeding",
    slot: "prefix",
    tier: 3,
    statusOnHit: "bleed",
    statusMagnitude: 1,
    description: "Hits apply +1 bleed magnitude.",
  },
  hungering: {
    id: "hungering",
    label: "Hungering",
    slot: "suffix",
    tier: 2,
    lifestealPct: 0.02,
    description: "Heals 2% of damage dealt.",
  },
  resonant: {
    id: "resonant",
    label: "Resonant",
    slot: "suffix",
    tier: 1,
    arcBonus: 0.06,
    description: "+0.06 arc — wider strikes.",
  },
  ironbound: {
    id: "ironbound",
    label: "Ironbound",
    slot: "suffix",
    tier: 3,
    reachBonus: 0.12,
    description: "+0.12 reach — strikes connect from further out.",
  },
};

export function listAffixes() {
  return Object.values(AFFIXES);
}

export function getAffix(id) {
  return AFFIXES[id] || null;
}

export function affixesForSlot(slot) {
  return Object.values(AFFIXES).filter((entry) => entry.slot === slot);
}

export function rollAffix(slot, rng = Math.random) {
  const pool = affixesForSlot(slot);
  if (pool.length === 0) return null;
  const idx = Math.floor(rng() * pool.length);
  return pool[Math.min(pool.length - 1, Math.max(0, idx))];
}

export function attachAffix(equipment, affixId) {
  const affix = AFFIXES[affixId];
  if (!affix) return false;
  if (!Array.isArray(equipment.affixes)) equipment.affixes = [];
  const existingSlotIdx = equipment.affixes.findIndex(
    (id) => AFFIXES[id]?.slot === affix.slot,
  );
  if (existingSlotIdx >= 0) {
    equipment.affixes[existingSlotIdx] = affixId;
  } else {
    equipment.affixes.push(affixId);
  }
  return true;
}

export function buildAffixModifiers(affixIds) {
  const mods = {
    arcBonus: 0,
    reachBonus: 0,
    staggerBonus: 0,
    lifestealPct: 0,
    statusOnHit: [],
  };
  if (!Array.isArray(affixIds)) return mods;
  for (const id of affixIds) {
    const affix = AFFIXES[id];
    if (!affix) continue;
    mods.arcBonus += affix.arcBonus || 0;
    mods.reachBonus += affix.reachBonus || 0;
    mods.staggerBonus += affix.staggerBonus || 0;
    mods.lifestealPct += affix.lifestealPct || 0;
    if (affix.statusOnHit) {
      mods.statusOnHit.push({
        kind: affix.statusOnHit,
        magnitude: affix.statusMagnitude || 1,
      });
    }
  }
  return mods;
}

export function describeAffixes(affixIds) {
  if (!Array.isArray(affixIds) || affixIds.length === 0) return "Plain";
  return affixIds
    .map((id) => AFFIXES[id]?.label || id)
    .join(" · ");
}
