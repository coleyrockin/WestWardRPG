import { deathCollapse, hitFlash, idleBob, interactGlow } from "./animationHelpers.js";

export const SLIME_STATES = Object.freeze(["patrol", "aggro", "attack", "dead"]);

const DEFAULT_AGGRO_RADIUS = 4;
const DEFAULT_ATTACK_RADIUS = 1.5;
const DEFAULT_MAX_HITS = 3;
const DEFAULT_PLAYER_HP = 40;
// Contact damage per second while locked in the fight (player within the slime's
// combat range). The slime is static, so we threaten across the whole engaged
// range — not just the 1.5u attack bubble the player rarely sits in — making the
// fight a real race: strike it down (3 hits) before it chips you out. Tuned so a
// deliberate player wins comfortably but dawdling/AFK is lethal in a few seconds.
const DEFAULT_PLAYER_DAMAGE_PER_SECOND = 7;

function distance2(playerPos, slimePos) {
  if (!playerPos || !slimePos) return Infinity;
  const dx = playerPos.x - slimePos.x;
  const dz = playerPos.z - slimePos.z;
  return dx * dx + dz * dz;
}

function getSlimePosition(slimePlacement) {
  if (!slimePlacement) return null;
  return { x: slimePlacement.x, z: slimePlacement.y };
}

function applyToSlime(root, fn) {
  if (!root || typeof fn !== "function") return false;
  let applied = false;
  const visit = (obj) => {
    if (obj?.material) {
      fn(obj);
      applied = true;
    }
  };
  visit(root);
  root.traverse?.(visit);
  return applied;
}

function flashSlime(root, intensity) {
  const applied = applyToSlime(root, (obj) => hitFlash(obj, intensity));
  if (!applied) hitFlash(root, intensity);
}

function slumpSlime(root, hp, maxHits) {
  if (!root?.scale) return;
  const max = Math.max(1, maxHits);
  const damageRatio = clamp01((max - Math.max(0, hp)) / max);
  const baseY = Number.isFinite(root.userData?.slimeBaseScaleY)
    ? root.userData.slimeBaseScaleY
    : root.scale.y;
  if (root.userData) root.userData.slimeBaseScaleY = baseY;
  root.scale.y = Math.max(0.68, baseY * (1 - damageRatio * 0.22));
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function getNextSlimeState({
  state = "patrol",
  playerPos = null,
  slimePos = null,
  aggroRadius = DEFAULT_AGGRO_RADIUS,
  attackRadius = DEFAULT_ATTACK_RADIUS,
} = {}) {
  if (state === "dead") return "dead";
  const d2 = distance2(playerPos, slimePos);
  if (d2 <= attackRadius * attackRadius) return "attack";
  if (d2 <= aggroRadius * aggroRadius) return "aggro";
  return "patrol";
}

export function canStrikeSlime({
  state = "patrol",
  playerPos = null,
  slimePos = null,
  strikeRadius = DEFAULT_AGGRO_RADIUS,
} = {}) {
  if (state === "dead") return false;
  return distance2(playerPos, slimePos) <= strikeRadius * strikeRadius;
}

export function createEncounterSystem(scene = null, snapshot = null, options = {}) {
  const worldObjects = options.worldObjects || snapshot?.worldObjects || [];
  const slimePlacement = options.slimePlacement || worldObjects.find((obj) => obj?.kind === "roadSlime") || null;
  const slimeMesh = options.slimeMesh || null;
  const slimePos = getSlimePosition(slimePlacement);
  const aggroRadius = options.aggroRadius ?? DEFAULT_AGGRO_RADIUS;
  const attackRadius = options.attackRadius ?? DEFAULT_ATTACK_RADIUS;
  const strikeRadius = options.strikeRadius ?? aggroRadius;
  const maxHits = Math.max(1, Math.round(options.maxHits ?? DEFAULT_MAX_HITS));
  const getPhase = typeof options.getPhase === "function" ? options.getPhase : () => null;
  const onSlimeEngage = typeof options.onSlimeEngage === "function" ? options.onSlimeEngage : () => {};
  const onSlimeAttack = typeof options.onSlimeAttack === "function" ? options.onSlimeAttack : () => {};
  const onSlimeHit = typeof options.onSlimeHit === "function" ? options.onSlimeHit : () => {};
  const onSlimeDeath = typeof options.onSlimeDeath === "function" ? options.onSlimeDeath : () => {};
  const onPlayerDeath = typeof options.onPlayerDeath === "function" ? options.onPlayerDeath : () => {};
  // Gate so contact damage only applies when the consumer says the fight is live
  // (spike passes () => phase === "slime_fight"). Default true for unit isolation.
  const canDamagePlayer = typeof options.canDamagePlayer === "function" ? options.canDamagePlayer : () => true;
  const initialPlayerHp = Number.isFinite(options.initialPlayerHp) ? options.initialPlayerHp : DEFAULT_PLAYER_HP;
  const playerDamagePerSecond = Number.isFinite(options.playerDamagePerSecond)
    ? options.playerDamagePerSecond
    : DEFAULT_PLAYER_DAMAGE_PER_SECOND;
  // Real-time combat: the slime's lunge is the lethal hit (burst damage on contact),
  // negated by player dodge i-frames. spike passes () => player.isInvulnerable.
  const playerInvulnerable = typeof options.playerInvulnerable === "function" ? options.playerInvulnerable : () => false;
  const lungeDamage = Number.isFinite(options.lungeDamage) ? options.lungeDamage : 14;

  let state = "patrol";
  let hitCount = 0;
  let hp = maxHits;
  let elapsed = 0;
  let disposed = false;
  let engageNotified = false;
  let attackNotified = false;
  let deathNotified = false;
  let playerHp = initialPlayerHp;
  let playerDeathNotified = false;
  let flashTimer = 0;
  const FLASH_TIME = 0.18;

  function animate(dt) {
    if (!slimeMesh) return;
    if (state === "dead") {
      deathCollapse(slimeMesh, 1);
      return;
    }
    idleBob(slimeMesh, elapsed);
    if (flashTimer > 0) {
      // Decay the hit flash back toward base instead of a one-frame snap.
      flashTimer = Math.max(0, flashTimer - dt);
      const k = flashTimer / FLASH_TIME; // 1 → 0
      flashSlime(slimeMesh, 0.5 + k * 2.2);
    } else if (state === "aggro" || state === "attack") {
      interactGlow(slimeMesh, elapsed + dt);
    }
  }

  function notifyForState(nextState) {
    if ((nextState === "aggro" || nextState === "attack") && !engageNotified) {
      const accepted = onSlimeEngage({ state: nextState, phase: getPhase(), slimePlacement });
      engageNotified = accepted !== false;
    }
    if (nextState === "attack" && !attackNotified) {
      const accepted = onSlimeAttack({ state: nextState, phase: getPhase(), slimePlacement });
      attackNotified = accepted !== false;
    }
  }

  function update(playerPos, dt = 0) {
    if (disposed) return getState();
    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    elapsed += safeDt;
    const nextState = getNextSlimeState({ state, playerPos, slimePos, aggroRadius, attackRadius });
    state = nextState;
    notifyForState(nextState);
    animate(safeDt);
    return getState(playerPos);
  }

  // Apply one landed melee hit (the caller's hitbox already validated range + the
  // active swing window). Drives flash + slump + death. Returns the new state.
  function registerHit() {
    if (disposed || hp <= 0 || state === "dead") return getState();
    hitCount = Math.min(maxHits, hitCount + 1);
    hp = Math.max(0, maxHits - hitCount);
    flashSlime(slimeMesh, hp <= 0 ? 3.5 : 2.6);
    flashTimer = FLASH_TIME;
    slumpSlime(slimeMesh, hp, maxHits);
    onSlimeHit({ state, phase: getPhase(), slimePlacement, hp, maxHits, hitCount, defeated: hp <= 0 });
    if (hp > 0) {
      state = "attack";
      return getState();
    }
    state = "dead";
    deathCollapse(slimeMesh, 1);
    if (!deathNotified) {
      deathNotified = true;
      onSlimeDeath({ state, phase: getPhase(), slimePlacement, scene, hp, maxHits, hitCount, defeated: true });
    }
    return getState();
  }

  // Legacy proximity-gated strike (older interaction path): validates range, then
  // registers a hit. Returns true if a hit landed.
  function strike(playerPos) {
    if (disposed) return false;
    if (!canStrikeSlime({ state, playerPos, slimePos, strikeRadius })) return false;
    if (hp <= 0 || state === "dead") return false;
    registerHit();
    return true;
  }

  // Burst damage from a slime lunge connecting. spike calls this when slimeBehavior
  // reports contact. Gated by the fight phase and negated by player i-frames.
  function applyLungeContact() {
    if (disposed || playerHp <= 0) return getState();
    if (!canDamagePlayer() || playerInvulnerable()) return getState();
    playerHp = Math.max(0, playerHp - lungeDamage);
    if (playerHp <= 0 && !playerDeathNotified) {
      playerDeathNotified = true;
      onPlayerDeath({ phase: getPhase(), slimePlacement, scene, playerHp: 0 });
    }
    return getState();
  }

  function engage() {
    if (disposed || state === "dead") return getState();
    state = "aggro";
    notifyForState(state);
    animate(0);
    return getState();
  }

  function getState(playerPos = null) {
    return {
      slime: state,
      hp,
      maxHp: maxHits,
      hitCount,
      hits: hitCount,
      defeated: state === "dead" || hp <= 0,
      distance: Number.isFinite(distance2(playerPos, slimePos))
        ? Math.sqrt(distance2(playerPos, slimePos))
        : Infinity,
      engaged: engageNotified,
      playerHp: Math.max(0, playerHp),
      playerMaxHp: initialPlayerHp,
      playerDefeated: playerHp <= 0,
      disposed,
    };
  }

  function dispose() {
    disposed = true;
  }

  return {
    update,
    engage,
    strike,
    registerHit,
    applyLungeContact,
    dispose,
    getState,
  };
}
