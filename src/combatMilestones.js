export const MINI_BOSS_PHASE_TWO = {
  ashfall_scrap_tyrant: {
    behavior: "charge",
    baseType: "charger",
    label: "Scrap Tyrant Overdrive",
    speedMult: 1.18,
    damageMult: 1.08,
  },
  ashfall_scorch_engine: {
    behavior: "tank",
    baseType: "brute",
    label: "Scorch Engine Lockdown",
    speedMult: 0.92,
    damageMult: 1.18,
  },
  lantern_overseer: {
    behavior: "control",
    baseType: "suppressor",
    label: "Lantern Overseer Override",
    speedMult: 1.02,
    damageMult: 1.12,
  },
  lantern_iron_chanter: {
    behavior: "flank",
    baseType: "skirmisher",
    label: "Iron Chanter Breakstep",
    speedMult: 1.22,
    damageMult: 1.04,
  },
};

export const CHARGED_ATTACK = {
  minStamina: 24,
  reserveCost: 6,
  cancelRefund: 6,
  windup: 0.3,
  orderKeeperWindup: 0.24,
};

export const PARRY_CHAIN = {
  window: 2.5,
  normalRefund: 8,
  chainRefund: 14,
  normalStagger: 1.5,
  chainStagger: 2.05,
};

export function getMiniBossPhaseTwo(bossId) {
  return MINI_BOSS_PHASE_TWO[bossId] || null;
}

export function shouldTransitionMiniBossPhase(enemy) {
  if (!enemy || !enemy.miniBossId || !enemy.alive) return false;
  if ((enemy.phase || 1) >= 2) return false;
  if (!Number.isFinite(enemy.hp) || !Number.isFinite(enemy.maxHp) || enemy.maxHp <= 0) return false;
  return enemy.hp <= enemy.maxHp * 0.5;
}

export function buildMiniBossPhaseTransition(enemy, phaseTwo = getMiniBossPhaseTwo(enemy?.miniBossId)) {
  if (!phaseTwo || !shouldTransitionMiniBossPhase(enemy)) return null;
  const hpFloor = Math.max(1, Math.ceil(enemy.maxHp * 0.5));
  return {
    phase: 2,
    type: phaseTwo.baseType || enemy.type,
    behavior: phaseTwo.behavior || enemy.behavior,
    phaseLabel: phaseTwo.label || "Phase Two",
    hp: Math.max(enemy.hp, hpFloor),
    invulnTimer: 0.6,
    stagger: Math.max(enemy.stagger || 0, 0.6),
    attackCooldown: Math.max(enemy.attackCooldown || 0, 0.75),
    speed: enemy.speed * (phaseTwo.speedMult || 1),
    baseDamage: Math.max(1, Math.round((enemy.baseDamage || 1) * (phaseTwo.damageMult || 1))),
    windupTimer: 0,
    windupConsumed: false,
  };
}

export function applyMiniBossPhaseTransition(enemy, phaseTwo = getMiniBossPhaseTwo(enemy?.miniBossId)) {
  const transition = buildMiniBossPhaseTransition(enemy, phaseTwo);
  if (!transition) return null;
  Object.assign(enemy, transition);
  return transition;
}

export function tickMiniBossInvulnerability(enemy, dt) {
  if (!enemy || !(enemy.invulnTimer > 0)) return 0;
  enemy.invulnTimer = Math.max(0, enemy.invulnTimer - Math.max(0, dt));
  return enemy.invulnTimer;
}

export function resolveParryChain(player) {
  const chained = (player?.parryChainTimer || 0) > 0;
  return {
    chained,
    text: chained ? "CHAIN!" : "PARRY!",
    staminaRefund: chained ? PARRY_CHAIN.chainRefund : PARRY_CHAIN.normalRefund,
    stagger: chained ? PARRY_CHAIN.chainStagger : PARRY_CHAIN.normalStagger,
    nextTimer: PARRY_CHAIN.window,
  };
}

export function tickParryChain(player, dt) {
  if (!player) return 0;
  player.parryChainTimer = Math.max(0, (player.parryChainTimer || 0) - Math.max(0, dt));
  return player.parryChainTimer;
}

export function resetParryChain(player) {
  if (!player) return;
  player.parryChainTimer = 0;
}

export function canStartChargedAttack(player, mode = "playing") {
  return Boolean(
    mode === "playing"
    && player
    && !(player.chargeAttackWindup > 0)
    && !(player.attackCooldown > 0)
    && (player.stamina || 0) >= CHARGED_ATTACK.minStamina,
  );
}

export function startChargedAttack(player, traits = [], mode = "playing") {
  if (!canStartChargedAttack(player, mode)) return false;
  const orderKeeper = Array.isArray(traits) && traits.includes("order_keeper");
  const windup = orderKeeper ? CHARGED_ATTACK.orderKeeperWindup : CHARGED_ATTACK.windup;
  player.chargeAttackWindup = windup;
  player.chargeAttackWindupMax = windup;
  player.stamina = Math.max(0, (player.stamina || 0) - CHARGED_ATTACK.reserveCost);
  player.blocking = false;
  return true;
}

export function tickChargedAttack(player, dt) {
  if (!player || !(player.chargeAttackWindup > 0)) return false;
  player.chargeAttackWindup = Math.max(0, player.chargeAttackWindup - Math.max(0, dt));
  return player.chargeAttackWindup <= 0;
}

export function clearChargedAttack(player) {
  if (!player) return;
  player.chargeAttackWindup = 0;
  player.chargeAttackWindupMax = 0;
}

export function cancelChargedAttack(player) {
  if (!player || !(player.chargeAttackWindup > 0)) return false;
  clearChargedAttack(player);
  player.stamina = Math.min(100, (player.stamina || 0) + CHARGED_ATTACK.cancelRefund);
  return true;
}
