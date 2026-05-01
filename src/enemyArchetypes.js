export const ENEMY_ARCHETYPES = {
  slime: {
    label: "Slime",
    hp: 48,
    speed: 1.35,
    reach: 1.22,
    baseDamage: 7,
    damageVariance: 6,
    color: "#6be873",
    behavior: "balanced",
  },
  charger: {
    label: "Railboar Charger",
    hp: 62,
    speed: 1.9,
    reach: 1.15,
    baseDamage: 10,
    damageVariance: 7,
    color: "#f2b063",
    behavior: "charge",
  },
  spitter: {
    label: "Mist Spitter",
    hp: 38,
    speed: 1.15,
    reach: 2.1,
    baseDamage: 8,
    damageVariance: 5,
    color: "#8fc9ff",
    behavior: "ranged",
  },
  brute: {
    label: "Sump Brute",
    hp: 94,
    speed: 0.94,
    reach: 1.35,
    baseDamage: 13,
    damageVariance: 6,
    color: "#c98e8e",
    behavior: "tank",
  },
  suppressor: {
    label: "Suppressor Sentinel",
    hp: 58,
    speed: 1.08,
    reach: 2.35,
    baseDamage: 9,
    damageVariance: 5,
    color: "#8fb2ff",
    behavior: "control",
  },
  skirmisher: {
    label: "Skirmisher Flanker",
    hp: 52,
    speed: 2.05,
    reach: 1.22,
    baseDamage: 10,
    damageVariance: 7,
    color: "#ffb26d",
    behavior: "flank",
  },
  shield_brute: {
    label: "Bulwark Brute",
    hp: 120,
    speed: 0.82,
    reach: 1.45,
    baseDamage: 14,
    damageVariance: 5,
    color: "#c9a1ff",
    behavior: "shield",
  },
};

export function listEnemyArchetypes() {
  return Object.keys(ENEMY_ARCHETYPES);
}

export function chooseEnemyType(level, weatherKind, roll = Math.random()) {
  if (level < 3) return "slime";
  if (level < 5) return roll < 0.78 ? "slime" : "charger";
  if (weatherKind === "sandstorm") return roll < 0.4 ? "skirmisher" : roll < 0.7 ? "suppressor" : "shield_brute";
  if (weatherKind === "neon_rain") return roll < 0.45 ? "suppressor" : roll < 0.8 ? "spitter" : "shield_brute";
  if (weatherKind === "mist") return roll < 0.45 ? "spitter" : roll < 0.75 ? "slime" : "charger";
  if (weatherKind === "storm") return roll < 0.34 ? "brute" : roll < 0.64 ? "charger" : "slime";
  return roll < 0.35 ? "slime" : roll < 0.55 ? "charger" : roll < 0.72 ? "spitter" : roll < 0.84 ? "suppressor" : roll < 0.93 ? "skirmisher" : "brute";
}

export function createEnemyStats(type, level) {
  const archetype = ENEMY_ARCHETYPES[type] || ENEMY_ARCHETYPES.slime;
  const levelScale = Math.max(1, level);
  return {
    type,
    label: archetype.label,
    color: archetype.color,
    behavior: archetype.behavior,
    maxHp: Math.round(archetype.hp + levelScale * 4.5),
    hp: Math.round(archetype.hp + levelScale * 4.5),
    speed: archetype.speed + Math.min(0.55, levelScale * 0.04),
    attackReach: archetype.reach,
    baseDamage: archetype.baseDamage + Math.floor(levelScale * 0.4),
    damageVariance: archetype.damageVariance,
  };
}

export const BEHAVIOR_TUNING = {
  charge:  { kiteDistance: 0,    strafeWeight: 0,    speedMult: 1.0,  windupTime: 0.55, dashTime: 0.4, dashMult: 1.85 },
  ranged:  { kiteDistance: 3.4,  strafeWeight: 0.25, speedMult: 1.0,  windupTime: 0,    dashTime: 0,   dashMult: 1.0  },
  control: { kiteDistance: 3.0,  strafeWeight: 0.15, speedMult: 1.0,  windupTime: 0,    dashTime: 0,   dashMult: 1.0  },
  flank:   { kiteDistance: 1.4,  strafeWeight: 0.7,  speedMult: 1.05, windupTime: 0,    dashTime: 0,   dashMult: 1.0  },
  tank:    { kiteDistance: 0,    strafeWeight: 0,    speedMult: 0.92, windupTime: 0,    dashTime: 0,   dashMult: 1.0  },
  shield:  { kiteDistance: 0,    strafeWeight: 0,    speedMult: 0.9,  windupTime: 0,    dashTime: 0,   dashMult: 1.0  },
  balanced:{ kiteDistance: 0,    strafeWeight: 0,    speedMult: 1.0,  windupTime: 0,    dashTime: 0,   dashMult: 1.0  },
};

export function getBehaviorTuning(behavior) {
  return BEHAVIOR_TUNING[behavior] || BEHAVIOR_TUNING.balanced;
}

export function resolveBehaviorMove(enemy, ctx) {
  const tuning = getBehaviorTuning(enemy.behavior);
  const { nx, ny, distance, dt } = ctx;
  let mx = nx;
  let my = ny;
  let speedMult = tuning.speedMult;

  if (tuning.kiteDistance > 0) {
    const inner = tuning.kiteDistance - 0.6;
    const outer = tuning.kiteDistance + 0.6;
    if (distance < inner) {
      mx = -nx;
      my = -ny;
    } else if (distance < outer) {
      mx = 0;
      my = 0;
    }
  }

  if (tuning.strafeWeight > 0) {
    const sign = enemy._strafeSign || (enemy._strafeSign = Math.random() < 0.5 ? -1 : 1);
    if (Math.random() < dt * 0.4) enemy._strafeSign = -sign;
    const strafeX = -ny * sign;
    const strafeY = nx * sign;
    const w = tuning.strafeWeight;
    mx = mx * (1 - w) + strafeX * w;
    my = my * (1 - w) + strafeY * w;
  }

  if (tuning.windupTime > 0) {
    enemy._chargeCd = Math.max(0, (enemy._chargeCd || 0) - dt);
    if (!(enemy._dashTimer > 0) && !(enemy._windupTimer > 0) && enemy._chargeCd <= 0 && distance < 5) {
      enemy._windupTimer = tuning.windupTime;
      enemy._chargeCd = 2.6;
    }
    if (enemy._dashTimer > 0) {
      enemy._dashTimer -= dt;
      speedMult *= tuning.dashMult;
    } else if (enemy._windupTimer > 0) {
      enemy._windupTimer -= dt;
      speedMult *= 0.25;
      if (enemy._windupTimer <= 0) {
        enemy._dashTimer = tuning.dashTime;
      }
    }
  }

  return { mx, my, speedMult };
}

export function createEnemyCombatProfile(enemy, playerLevel) {
  const archetype = ENEMY_ARCHETYPES[enemy.type] || ENEMY_ARCHETYPES.slime;
  const aggression =
    archetype.behavior === "charge" ? 1.25 :
      archetype.behavior === "ranged" ? 0.82 :
        archetype.behavior === "flank" ? 1.32 :
          archetype.behavior === "control" ? 0.9 : 1;
  const pacing =
    archetype.behavior === "tank" || archetype.behavior === "shield" ? 1.4 :
      archetype.behavior === "flank" ? 0.88 : 1;
  return {
    pursuitRange: 8.8 + Math.min(3.2, playerLevel * 0.24 * aggression),
    attackRange: (enemy.attackReach || archetype.reach) + (archetype.behavior === "control" ? 0.25 : 0),
    cooldownFactor: pacing,
  };
}
