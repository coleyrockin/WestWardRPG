// Combat processor — pure combat calculations extracted from main.js.
// No DOM, no canvas, no side effects. All functions are deterministic given
// the same inputs, making them independently testable.

// ─── Combo definitions ────────────────────────────────────────────────────────

export const BASE_COMBOS = [
  { duration: 0.31, cooldown: 0.24, reach: 1.95, arc: 0.85, damage: 16, stamina: 9,  lunge: 0.12, knock: 0.18 },
  { duration: 0.29, cooldown: 0.22, reach: 2.1,  arc: 0.92, damage: 19, stamina: 10, lunge: 0.16, knock: 0.24 },
  { duration: 0.37, cooldown: 0.32, reach: 2.35, arc: 1.08, damage: 28, stamina: 14, lunge: 0.2,  knock: 0.36 },
];

// ─── Combo step ───────────────────────────────────────────────────────────────

// Advances combo step. Returns the new comboStep (1-indexed).
export function resolveNextComboStep(currentStep, comboWindow) {
  if (comboWindow <= 0) return 1;
  return (currentStep % BASE_COMBOS.length) + 1;
}

// Returns the base combo for a given step (1-indexed).
export function getComboForStep(step) {
  return BASE_COMBOS[Math.max(0, step - 1)] || BASE_COMBOS[0];
}

// ─── Attack readiness ─────────────────────────────────────────────────────────

export function canAttack(player, minStamina = 8) {
  if ((player.chargeAttackWindup || 0) > 0) return false;
  if ((player.attackCooldown || 0) > 0) return false;
  if ((player.stamina || 0) < minStamina) return false;
  return true;
}

// ─── Stamina regeneration ─────────────────────────────────────────────────────

const BASE_STAMINA_REGEN = 18;
const BLOCK_REGEN_PENALTY = 0.22;
const GUARD_BROKEN_REGEN_PENALTY = 0.08;
const ATTACK_COOLDOWN_REGEN_PENALTY = 0.35;

export function resolveStaminaRegenRate(player, progressionMods = {}) {
  let rate = BASE_STAMINA_REGEN * (1 + (progressionMods.staminaRegenBonus || 0));
  if (player.blocking) rate *= BLOCK_REGEN_PENALTY;
  if (player.guardBroken) rate *= GUARD_BROKEN_REGEN_PENALTY;
  if ((player.attackCooldown || 0) > 0) rate *= ATTACK_COOLDOWN_REGEN_PENALTY;
  return Math.max(0, rate);
}

// ─── Hit detection ────────────────────────────────────────────────────────────

// Checks if a target at (tx, ty) is within the swing arc.
export function isInSwingArc(playerX, playerY, playerAngle, tx, ty, reach, arc) {
  const dx = tx - playerX;
  const dy = ty - playerY;
  const dist = Math.hypot(dx, dy);
  if (dist > reach) return false;
  const angle = Math.atan2(dy, dx);
  const diff = Math.abs(normalizeAngle(angle - playerAngle));
  return diff < arc / 2;
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// ─── Dodge readiness ─────────────────────────────────────────────────────────

const DODGE_STAMINA_COST = 18;
const DODGE_COOLDOWN = 0.65;

export function canDodge(player) {
  if ((player.dodgeCooldown || 0) > 0) return false;
  if ((player.stamina || 0) < DODGE_STAMINA_COST) return false;
  if (player.guardBroken) return false;
  return true;
}

// Effective dodge cooldown after Cunning's dodgeFocusPct (see
// characterIdentity.deriveAttributeEffects). Reduction is capped at 40% so a
// high-Cunning build sharpens dodge cadence without trivializing it.
const DODGE_FOCUS_REDUCTION_CAP = 40;

export function resolveDodgeCooldown(dodgeFocusPct = 0) {
  const pct = Math.min(DODGE_FOCUS_REDUCTION_CAP, Math.max(0, dodgeFocusPct || 0));
  return DODGE_COOLDOWN * (1 - pct / 100);
}

export { DODGE_STAMINA_COST, DODGE_COOLDOWN };

// ─── Enemy stagger ────────────────────────────────────────────────────────────

export function resolveEnemyStagger(baseDamage, swing, enemy) {
  const knockBase = swing.knock || 0.18;
  const staggerBase = swing.staggerBonus || 0;
  const armorFactor = enemy.armorRating ? Math.max(0.5, 1 - enemy.armorRating * 0.1) : 1;
  return {
    knockback: knockBase * armorFactor,
    stagger: Math.max(0.25, staggerBase * armorFactor + baseDamage * 0.01),
  };
}
