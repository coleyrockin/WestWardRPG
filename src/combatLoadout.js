import { clamp } from "./math.js";

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
  let staminaCost = baseSwing.stamina * style.staminaCostMult;
  let damage = baseSwing.damage * style.attackDamageMult;
  let arc = baseSwing.arc + style.attackArcBonus;

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
  return {
    blocked: Math.max(1, Math.floor(baseDamage * blockedMult)),
    glancing: Math.max(1, Math.floor(baseDamage * glancingMult)),
  };
}

export function getSprintModifier(combatProgression) {
  return combatProgression?.style?.sprintMult || 1;
}
