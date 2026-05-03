import { clamp } from "./math.js";

// Weapon archetype movesets — keyed off the player's current weapon tier.
// `arcMult`, `reachMult`, `staggerBonus` shape the swing geometry while
// the existing damage/stamina pipeline keeps controlling magnitude.
export const MOVESET_DEFINITIONS = {
  light: {
    label: "Light",
    arcMult: 1.18,
    reachMult: 0.94,
    staggerBonus: 0.0,
    recoveryMult: 0.85,
    notes: "Wide quick arc; faster recovery.",
  },
  heavy: {
    label: "Heavy",
    arcMult: 0.82,
    reachMult: 1.18,
    staggerBonus: 0.25,
    recoveryMult: 1.18,
    notes: "Narrow committed arc; more reach and stagger.",
  },
  spear: {
    label: "Spear",
    arcMult: 0.55,
    reachMult: 1.42,
    staggerBonus: 0.08,
    recoveryMult: 1.05,
    notes: "Thrusting line; longest reach, narrow hit.",
  },
};

export function resolveMovesetForWeapon(weaponTier) {
  if (weaponTier === "Refined") return "heavy";
  if (weaponTier === "Relic") return "spear";
  return "light";
}

export function applyMovesetGeometry(baseSwing, weaponTier) {
  const id = resolveMovesetForWeapon(weaponTier || "Common");
  const m = MOVESET_DEFINITIONS[id] || MOVESET_DEFINITIONS.light;
  return {
    ...baseSwing,
    arc: clamp((baseSwing.arc || 1) * m.arcMult, 0.45, 1.5),
    reach: (baseSwing.reach || 1.5) * m.reachMult,
    staggerBonus: (baseSwing.staggerBonus || 0) + m.staggerBonus,
    recoveryMult: m.recoveryMult,
    movesetId: id,
  };
}

const STYLE_DEFINITIONS = {
  civicBulwark: {
    label: "Civic Bulwark",
    attackDamageMult: 0.92,
    attackArcBonus: 0.08,
    staminaCostMult: 0.95,
    blockMitigationBonus: 0.12,
    sprintMult: 0.96,
    notes: "Disciplined guard style: safer defense and wider control.",
  },
  commonsDuelist: {
    label: "Commons Duelist",
    attackDamageMult: 1.08,
    attackArcBonus: 0.02,
    staminaCostMult: 1,
    blockMitigationBonus: 0.04,
    sprintMult: 1.03,
    notes: "Adaptive street style: stronger pressure and momentum.",
  },
  cartelTrickster: {
    label: "Cartel Trickster",
    attackDamageMult: 1.02,
    attackArcBonus: -0.02,
    staminaCostMult: 0.91,
    blockMitigationBonus: 0.02,
    sprintMult: 1.08,
    notes: "Fast opportunist style: efficient and evasive.",
  },
};

const PERK_TIERS = [
  {
    minLevel: 3,
    id: "weatheredGrip",
    label: "Weathered Grip",
    description: "Lower stamina cost while rain or storms pressure movement.",
  },
  {
    minLevel: 6,
    id: "counterweight",
    label: "Counterweight",
    description: "Improved block conversion into reduced incoming damage.",
  },
  {
    minLevel: 9,
    id: "peoplePulse",
    label: "People's Pulse",
    description: "Strikes gain power when solidarity trends upward.",
  },
];

function resolveStyleId(narrativeState) {
  if (!narrativeState?.factionRep) return "commonsDuelist";
  const reps = narrativeState.factionRep;
  const ranking = Object.entries(reps).sort((a, b) => b[1] - a[1]);
  const winner = ranking[0]?.[0];
  if (winner === "civicCouncil") return "civicBulwark";
  if (winner === "marketCartel") return "cartelTrickster";
  return "commonsDuelist";
}

export function resolveCombatProgression(narrativeState, level) {
  const styleId = resolveStyleId(narrativeState);
  const style = STYLE_DEFINITIONS[styleId] || STYLE_DEFINITIONS.commonsDuelist;
  const perks = PERK_TIERS.filter((tier) => level >= tier.minLevel).map((tier) => tier.id);
  const perkDetails = PERK_TIERS.filter((tier) => level >= tier.minLevel);
  return {
    styleId,
    style,
    perks,
    perkDetails,
  };
}

export function applySwingLoadout(baseSwing, combatProgression, context = {}) {
  const style = combatProgression?.style || STYLE_DEFINITIONS.commonsDuelist;
  const perks = new Set(combatProgression?.perks || []);
  const affixMods = context.affixMods || null;
  let staminaCost = baseSwing.stamina * style.staminaCostMult;
  let damage = baseSwing.damage * style.attackDamageMult;
  let arc = baseSwing.arc + style.attackArcBonus + (affixMods?.arcBonus || 0);
  let reach = (baseSwing.reach || 0) + (affixMods?.reachBonus || 0);
  let staggerBonus = (baseSwing.staggerBonus || 0) + (affixMods?.staggerBonus || 0);

  if (perks.has("weatheredGrip") && (context.weatherKind === "rain" || context.weatherKind === "storm")) {
    staminaCost *= 0.88;
  }
  if (perks.has("peoplePulse") && (context.solidarityVsStatus || 0) > 10) {
    damage *= 1.08;
  }

  return {
    ...baseSwing,
    stamina: Math.max(1, Math.round(staminaCost)),
    damage: Math.round(damage),
    arc: clamp(arc, 0.62, 1.4),
    reach: reach > 0 ? reach : baseSwing.reach,
    staggerBonus,
  };
}

export function resolveIncomingDamage(baseDamage, combatProgression, context = {}) {
  const style = combatProgression?.style || STYLE_DEFINITIONS.commonsDuelist;
  const perks = new Set(combatProgression?.perks || []);
  let mitigationBonus = style.blockMitigationBonus;
  if (perks.has("counterweight") && context.blocked) {
    mitigationBonus += 0.1;
  }
  const blockedMult = clamp(0.35 - mitigationBonus, 0.15, 0.4);
  const glancingMult = clamp(0.85 - mitigationBonus * 0.4, 0.55, 0.92);
  const chip = Math.max(1, Math.floor(baseDamage * 0.08));
  return {
    blocked: Math.max(chip, Math.floor(baseDamage * blockedMult)),
    chip,
    glancing: Math.max(1, Math.floor(baseDamage * glancingMult)),
  };
}

export function resolveGuardBreakState(player, dt = 0) {
  const timer = Math.max(0, (player.guardBrokenTimer || 0) - Math.max(0, dt));
  if ((player.stamina || 0) <= 0) {
    return { guardBroken: true, guardBrokenTimer: Math.max(timer, 1.2) };
  }
  if (player.guardBroken && (timer > 0 || (player.stamina || 0) < 25)) {
    return { guardBroken: true, guardBrokenTimer: timer };
  }
  return { guardBroken: false, guardBrokenTimer: 0 };
}

export function getSprintModifier(combatProgression) {
  return combatProgression?.style?.sprintMult || 1;
}
