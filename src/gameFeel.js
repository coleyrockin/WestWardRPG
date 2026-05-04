function bool(value) {
  return Boolean(value);
}

function hasOpeningProgress(input = {}) {
  const quests = input.quests || {};
  const slime = quests.slime || {};
  const crystal = quests.crystal || {};
  const inventory = input.inventory || {};
  return (slime.progress || 0) > 0
    || (crystal.progress || 0) > 0
    || (inventory["Slime Core"] || 0) > 0;
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

  if (hasOpeningProgress(input)) return null;

  return {
    title: "First move",
    line: "Talk to the Marshal or hunt one slime. The valley should push back fast.",
    urgency: time < 18 ? "soft" : "high",
  };
}

const FIRST_PRESSURE_BY_REGION = {
  frontier: {
    title: "Smoke on the road",
    label: "Smoke Cache",
    line: "A cache smokes east of town. Follow the road, grab the reward, and expect a slime nearby.",
    rewardHint: "Small cache, Slime Core progress, and early loot pressure.",
    threatHint: "One nearby slime patrol should pull the player into a first fight.",
    routeLabel: "marshal road",
    color: "#ffd77b",
    anchorX: 9.5,
    anchorY: 8.5,
    offsetX: 3.1,
    offsetY: 0.35,
  },
  ashfall: {
    title: "Heat flag ahead",
    label: "Heat Flag",
    line: "A salvage flag snaps near the basin road. The reward is close, but the engine noise is closer.",
    rewardHint: "Ashglass or repair material near the road.",
    threatHint: "A charger or tank should be visible before the player commits.",
    routeLabel: "slag road",
    color: "#ff9f5f",
    anchorX: 39.5,
    anchorY: 39.5,
    offsetX: 2.7,
    offsetY: 0.55,
  },
  ironlantern: {
    title: "Signal flare",
    label: "Signal Flare",
    line: "A blue signal blinks down the lane. Follow it for a reward before the patrol locks in.",
    rewardHint: "Cipher or filament hint near a lit checkpoint.",
    threatHint: "A shield/control enemy should telegraph before contact.",
    routeLabel: "signal lane",
    color: "#9bd3ff",
    anchorX: 14.5,
    anchorY: 39.5,
    offsetX: 2.5,
    offsetY: 0.2,
  },
};

export function resolveFirstMinutePressure(input = {}) {
  if (input.mode !== "playing" || input.inHouse) return null;
  const time = Math.max(0, input.time || 0);
  if (time > 90 || hasOpeningProgress(input)) return null;

  const regionId = input.regionId || "frontier";
  const config = FIRST_PRESSURE_BY_REGION[regionId] || FIRST_PRESSURE_BY_REGION.frontier;
  const x = config.anchorX + config.offsetX;
  const y = config.anchorY + config.offsetY;

  return {
    id: `${regionId}-first-pressure`,
    title: config.title,
    line: config.line,
    routeLabel: config.routeLabel,
    rewardHint: config.rewardHint,
    threatHint: config.threatHint,
    urgency: time < 18 ? "soft" : time < 55 ? "high" : "urgent",
    marker: {
      kind: "pressure",
      label: config.label,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      color: config.color,
      size: 0.82,
      blocking: false,
    },
  };
}
