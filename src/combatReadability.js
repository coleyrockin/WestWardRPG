function numberOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function resolveEnemyReadabilityCue(enemy = {}) {
  if (enemy.alive === false) {
    return {
      state: "dead",
      label: "DOWN",
      urgency: "low",
      color: "#ff6b6b",
      meter: 0,
    };
  }

  const windup = numberOr(enemy.windupTimer, 0);
  if (windup > 0) {
    const windupMax = Math.max(0.01, numberOr(enemy.windupMax, windup));
    return {
      state: "windup",
      label: "WINDUP",
      urgency: "high",
      color: "#ff4f3a",
      meter: clamp(windup / windupMax, 0, 1),
    };
  }

  if (numberOr(enemy.stagger, 0) > 0) {
    return {
      state: "stagger",
      label: "STAGGER",
      urgency: "medium",
      color: "#ffe16a",
      meter: clamp(numberOr(enemy.stagger, 0), 0, 1),
    };
  }

  if (numberOr(enemy.phase, 1) >= 2 || enemy.phaseLabel) {
    return {
      state: "phase",
      label: `PHASE ${Math.max(2, Math.floor(numberOr(enemy.phase, 2)))}`,
      urgency: "high",
      color: "#ffc490",
      meter: 1,
    };
  }

  if (numberOr(enemy.flashTimer, 0) > 0) {
    return {
      state: "hit",
      label: "HIT",
      urgency: "medium",
      color: "#fff1d0",
      meter: clamp(numberOr(enemy.flashTimer, 0) / 0.15, 0, 1),
    };
  }

  return {
    state: "aggro",
    label: "HOSTILE",
    urgency: "low",
    color: "#92f0a3",
    meter: 0,
  };
}
