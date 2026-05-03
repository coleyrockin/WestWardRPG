const COMPANION_THRESHOLD = 60;
const COMPANION_RECOVERY_SECONDS = 24;
const COMPANION_AFFINITY_PENALTY = 15;

export const COMPANION_DEFINITIONS = {
  smith: { id: "smith", name: "Professor Cogwheel", color: "#c9937f", damage: 8, attackRange: 1.65 },
  innkeeper: { id: "innkeeper", name: "Nora Vale", color: "#9f8db2", damage: 9, attackRange: 1.45 },
  warden: { id: "warden", name: "Marshal Boone", color: "#8ab0cf", damage: 7, attackRange: 1.75 },
};

export function createInitialCompanionRuntime() {
  return {
    active: false,
    id: null,
    name: "",
    color: "#cdb8ff",
    x: 0,
    y: 0,
    hp: 45,
    maxHp: 45,
    attackCooldown: 0,
    threatCooldown: 0,
    downed: false,
    recoveryTimer: 0,
  };
}

export function chooseEligibleCompanion(npcAffinity = {}, threshold = COMPANION_THRESHOLD) {
  let best = null;
  for (const def of Object.values(COMPANION_DEFINITIONS)) {
    const affinity = npcAffinity[def.id] || 0;
    if (affinity < threshold) continue;
    if (!best || affinity > best.affinity) {
      best = { ...def, affinity };
    }
  }
  return best;
}

export function activateCompanion(runtime, def, player, savedHp = null) {
  if (!def) return false;
  runtime.active = true;
  runtime.downed = false;
  runtime.id = def.id;
  runtime.name = def.name;
  runtime.color = def.color;
  runtime.x = player.x - 0.75;
  runtime.y = player.y + 0.75;
  runtime.maxHp = 45;
  runtime.hp = Number.isFinite(savedHp) ? Math.max(1, Math.min(runtime.maxHp, savedHp)) : runtime.maxHp;
  runtime.attackCooldown = 0.35;
  runtime.threatCooldown = 0;
  runtime.recoveryTimer = 0;
  return true;
}

export function updateCompanionRuntime(runtime, player, enemies, dt, isBlocking) {
  if (!runtime.active) return null;
  runtime.attackCooldown = Math.max(0, runtime.attackCooldown - dt);
  runtime.threatCooldown = Math.max(0, (runtime.threatCooldown || 0) - dt);

  const dx = player.x - runtime.x;
  const dy = player.y - runtime.y;
  const d = Math.hypot(dx, dy);
  if (d > 1.45) {
    const speed = d > 5 ? 4.2 : 2.35;
    const step = Math.min(d - 1.05, speed * dt);
    const nx = runtime.x + (dx / (d || 1)) * step;
    const ny = runtime.y + (dy / (d || 1)) * step;
    if (!isBlocking(nx, runtime.y)) runtime.x = nx;
    if (!isBlocking(runtime.x, ny)) runtime.y = ny;
  }

  return applyCompanionAttack(runtime, enemies);
}

export function applyCompanionDamage(runtime, amount, npcAffinity = {}) {
  if (!runtime.active || runtime.downed) return null;
  runtime.hp = Math.max(0, runtime.hp - Math.max(0, amount));
  if (runtime.hp > 0) return null;

  const id = runtime.id;
  const name = runtime.name;
  runtime.active = false;
  runtime.downed = true;
  runtime.recoveryTimer = COMPANION_RECOVERY_SECONDS;
  runtime.attackCooldown = 0;
  runtime.threatCooldown = 0;
  if (id) {
    npcAffinity[id] = Math.max(-100, Math.min(100, (npcAffinity[id] || 0) - COMPANION_AFFINITY_PENALTY));
  }
  return { id, name, affinityPenalty: COMPANION_AFFINITY_PENALTY };
}

export function tickCompanionRecovery(runtime, player, dt) {
  if (!runtime.downed) return false;
  runtime.recoveryTimer = Math.max(0, (runtime.recoveryTimer || 0) - dt);
  if (runtime.recoveryTimer > 0) return false;

  runtime.downed = false;
  runtime.active = true;
  runtime.hp = Math.max(1, Math.round((runtime.maxHp || 45) * 0.45));
  runtime.x = player.x - 0.75;
  runtime.y = player.y + 0.75;
  runtime.attackCooldown = 1.2;
  runtime.threatCooldown = 1.2;
  return true;
}

export function applyCompanionThreat(runtime, enemies, dt, npcAffinity = {}) {
  if (!runtime.active || runtime.downed) return null;
  // threatCooldown is already decremented by updateCompanionRuntime each frame;
  // only read it here, don't decrement again.
  if ((runtime.threatCooldown || 0) > 0) return null;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const reach = (enemy.attackReach || 1) + 0.45;
    const d = Math.hypot(enemy.x - runtime.x, enemy.y - runtime.y);
    if (d > reach) continue;
    const damage = Math.max(1, Math.round(enemy.baseDamage || 5));
    const downed = applyCompanionDamage(runtime, damage, npcAffinity);
    if (runtime.active) runtime.threatCooldown = 1.4;
    return { enemy, damage, downed };
  }
  return null;
}

export function applyCompanionAttack(runtime, enemies) {
  if (!runtime.active || runtime.attackCooldown > 0) return null;
  const def = COMPANION_DEFINITIONS[runtime.id] || COMPANION_DEFINITIONS.smith;
  let target = null;
  let bestD = Infinity;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const d = Math.hypot(enemy.x - runtime.x, enemy.y - runtime.y);
    if (d < bestD && d <= def.attackRange) {
      target = enemy;
      bestD = d;
    }
  }
  if (!target) return null;
  target.hp -= def.damage;
  target.flashTimer = Math.max(target.flashTimer || 0, 0.16);
  target.stagger = Math.max(target.stagger || 0, 0.18);
  if (target.hp <= 0) {
    target.alive = false;
    target.respawn = 22;
  }
  runtime.attackCooldown = 1.05;
  return target;
}
