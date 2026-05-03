function bool(value) {
  return Boolean(value);
}

export function resolveHitFeedback(input = {}) {
  const hitCount = Math.max(0, Math.floor(input.hitCount || 0));
  const comboStep = Math.max(1, Math.floor(input.comboStep || 1));
  const maxDamage = Math.max(0, Math.floor(input.maxDamage || 0));
  const killed = bool(input.killed);
  const interrupted = bool(input.interrupted);

  if (hitCount <= 0) {
    return {
      hitStop: 0,
      hitPulse: 0,
      screenShake: 0,
      cameraKick: 0,
      particleBurst: 0,
      floatingTextLife: 0.72,
      message: "miss",
    };
  }

  const finisher = comboStep >= 3;
  const heavy = maxDamage >= 24 || finisher;
  const spike = (killed ? 0.04 : 0) + (interrupted ? 0.035 : 0) + (hitCount > 1 ? 0.025 : 0);
  return {
    hitStop: Math.min(0.13, 0.035 + hitCount * 0.014 + (heavy ? 0.026 : 0) + spike),
    hitPulse: Math.min(0.38, 0.22 + hitCount * 0.035 + (killed ? 0.06 : 0)),
    screenShake: Math.min(0.72, 0.12 + hitCount * 0.09 + (heavy ? 0.08 : 0) + (killed ? 0.08 : 0)),
    cameraKick: Math.min(1.15, 0.14 + hitCount * 0.13 + (heavy ? 0.08 : 0)),
    particleBurst: 5 + hitCount * 3 + (heavy ? 4 : 0) + (killed ? 5 : 0),
    floatingTextLife: Math.min(1.0, 0.72 + (heavy ? 0.08 : 0) + (killed ? 0.12 : 0)),
    message: interrupted ? "interrupt" : killed ? "kill" : hitCount > 1 ? "cleave" : heavy ? "heavy" : "hit",
  };
}

export function resolveOpeningObjective(input = {}) {
  if (input.mode !== "playing" || input.inHouse) return null;
  const time = Math.max(0, input.time || 0);
  if (time > 85) return null;

  const quests = input.quests || {};
  const slime = quests.slime || {};
  const crystal = quests.crystal || {};
  const inventory = input.inventory || {};
  if ((slime.progress || 0) > 0 || (crystal.progress || 0) > 0 || (inventory["Slime Core"] || 0) > 0) return null;

  return {
    title: "First move",
    line: "Talk to the Marshal or hunt one slime. The valley should push back fast.",
    urgency: time < 18 ? "soft" : "high",
  };
}
