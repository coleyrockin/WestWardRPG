function numberOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function baseCue(state, label, urgency, color, meter, extras = {}) {
  return {
    state,
    label,
    urgency,
    color,
    meter: clamp(meter, 0, 1),
    silhouette: extras.silhouette || "neutral",
    actionLine: extras.actionLine || "",
    outlineAlpha: clamp(numberOr(extras.outlineAlpha, 0), 0, 1),
    bodyScale: clamp(numberOr(extras.bodyScale, 1), 0.85, 1.18),
    pulseRate: Math.max(0, numberOr(extras.pulseRate, 0)),
    ringColor: extras.ringColor || color,
    fillAlpha: clamp(numberOr(extras.fillAlpha, 0), 0, 1),
  };
}

function formatItemLine(items = {}) {
  return Object.entries(items)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .map(([name, count]) => `+${Math.floor(count)} ${name}`);
}

export function resolveEnemyReadabilityCue(enemy = {}) {
  if (enemy.alive === false) {
    return baseCue("dead", "DOWN", "low", "#ff6b6b", 0, {
      silhouette: "defeated",
      actionLine: "Reward secured.",
      outlineAlpha: 0.22,
      bodyScale: 0.94,
      ringColor: "#ffb199",
    });
  }

  const windup = numberOr(enemy.windupTimer, 0);
  if (windup > 0) {
    const windupMax = Math.max(0.01, numberOr(enemy.windupMax, windup));
    return baseCue("windup", "WINDUP", "high", "#ff4f3a", windup / windupMax, {
      silhouette: "danger",
      actionLine: "Interrupt, block, or backstep now.",
      outlineAlpha: 0.78,
      bodyScale: 1.08,
      pulseRate: 18,
      ringColor: "#ffd77b",
      fillAlpha: 0.18,
    });
  }

  if (numberOr(enemy.stagger, 0) > 0) {
    return baseCue("stagger", "STAGGER", "medium", "#ffe16a", numberOr(enemy.stagger, 0), {
      silhouette: "opened",
      actionLine: "Safe opening: press the attack.",
      outlineAlpha: 0.62,
      bodyScale: 0.97,
      pulseRate: 7,
      ringColor: "#ffe16a",
      fillAlpha: 0.1,
    });
  }

  if (numberOr(enemy.phase, 1) >= 2 || enemy.phaseLabel) {
    return baseCue("phase", `PHASE ${Math.max(2, Math.floor(numberOr(enemy.phase, 2)))}`, "high", "#ffc490", 1, {
      silhouette: "phase",
      actionLine: enemy.phaseLabel ? String(enemy.phaseLabel) : "Pattern changed.",
      outlineAlpha: 0.72,
      bodyScale: 1.05,
      pulseRate: 10,
      ringColor: "#ffc490",
      fillAlpha: 0.12,
    });
  }

  if (numberOr(enemy.flashTimer, 0) > 0) {
    return baseCue("hit", "HIT", "medium", "#fff1d0", numberOr(enemy.flashTimer, 0) / 0.15, {
      silhouette: "impact",
      actionLine: "Hit confirmed.",
      outlineAlpha: 0.46,
      bodyScale: 1.02,
      pulseRate: 14,
      ringColor: "#fff1d0",
      fillAlpha: 0.16,
    });
  }

  return baseCue("aggro", "HOSTILE", "low", "#92f0a3", 0, {
    silhouette: "hostile",
    actionLine: "Hostile nearby.",
    outlineAlpha: 0.2,
    bodyScale: 1,
    ringColor: "#92f0a3",
  });
}

export function resolveEnemyDefeatCallout(options = {}) {
  const label = options.label || "Enemy";
  const gold = Math.max(0, Math.floor(numberOr(options.gold, 0)));
  const xp = Math.max(0, Math.floor(numberOr(options.xp, 0)));
  const itemParts = formatItemLine(options.items || {});
  const rewardParts = [
    gold > 0 ? `+${gold}g` : "",
    xp > 0 ? `+${xp}XP` : "",
    ...itemParts,
  ].filter(Boolean);
  const logParts = [
    gold > 0 ? `+${gold}g` : "",
    xp > 0 ? `+${xp} XP` : "",
    ...itemParts,
  ].filter(Boolean);
  const prefix = options.miniBoss ? "BOSS " : "";

  return {
    floatingText: rewardParts.length ? `${prefix}${rewardParts.join(" ")}` : `${prefix}REWARD`,
    logLine: `${label}${options.miniBoss ? " defeated" : " down"}: ${logParts.length ? logParts.join(", ") : "reward secured"}.`,
    particleColor: options.color || "#6be873",
    particleBurst: options.miniBoss ? 24 : 12,
    screenShake: options.miniBoss ? 0.18 : 0.06,
  };
}
