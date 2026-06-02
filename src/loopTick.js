// Pure helpers lifted out of the main.js update() loop so the game loop can be
// brought under test and carved incrementally. No DOM, no canvas, no module
// state. Functions that decay collections mutate in place (matching the loop's
// allocation-free intent) and return the collection; RNG-driven helpers take an
// injectable `rng` defaulting to Math.random so shipped behavior is unchanged.

// Decrements every message's ttl by dt and removes those that have expired.
export function tickExpiringMessages(messages, dt) {
  for (const m of messages) {
    m.ttl -= dt;
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].ttl <= 0) {
      messages.splice(i, 1);
    }
  }
  return messages;
}

// Decays the player's per-tick combat/feedback timers, each clamped at zero.
// (Parry-chain decay stays in combatProcessor.tickParryChain; weapon sway is
// input-driven and stays in the loop.)
export function tickPlayerCooldowns(player, dt) {
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.hurtCooldown = Math.max(0, player.hurtCooldown - dt);
  player.comboWindow = Math.max(0, player.comboWindow - dt);
  player.swingTimer = Math.max(0, player.swingTimer - dt);
  player.hitPulse = Math.max(0, player.hitPulse - dt * 2.4);
  player.cameraKick = Math.max(0, player.cameraKick - dt * 1.8);
  player.screenShake = Math.max(0, player.screenShake - dt * 7);
  return player;
}

// Decrements each floating text's life, drifts it upward, and removes expired ones.
export function tickFloatingTexts(floatingTexts, dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.life -= dt;
    ft.wy -= 0.55 * dt;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
  return floatingTexts;
}

// Seconds until a defeated enemy respawns: base 22 + up to 8 jitter, scaled
// inversely by region spawn density (denser regions repopulate faster).
export function resolveRespawnDelay(totalDensity, rng = Math.random) {
  return (22 + rng() * 8) / totalDensity;
}
