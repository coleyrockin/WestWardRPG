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

const FIRST_CACHE_REWARD_BY_REGION = {
  frontier: {
    gold: 12,
    xp: 6,
    items: { Potion: 1, "Slime Core": 1 },
    summary: "Smoke Cache: +12g, +1 Potion, +1 Slime Core",
  },
  ashfall: {
    gold: 16,
    xp: 8,
    items: { Potion: 1, Ashglass: 1 },
    summary: "Heat Flag Cache: +16g, +1 Potion, +1 Ashglass",
  },
  ironlantern: {
    gold: 18,
    xp: 8,
    items: { Potion: 1, "Lantern Filament": 1 },
    summary: "Signal Flare Cache: +18g, +1 Potion, +1 Lantern Filament",
  },
};

function formatRewardLine(reward = {}) {
  const items = Object.entries(reward.items || {})
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `+${count} ${name}`);
  return [`+${reward.gold || 0}g`, `+${reward.xp || 0} XP`, ...items].join(", ");
}

function distanceLine(player = {}, marker = {}) {
  if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) return "";
  const distance = Math.hypot((marker.x || 0) - player.x, (marker.y || 0) - player.y);
  if (!Number.isFinite(distance)) return "";
  return `${Math.max(1, Math.round(distance))}m`;
}

function markerActionLine(marker = {}) {
  if (!marker) return "";
  const action = marker.action === "checkpoint" ? "Reach"
    : marker.action === "pickup" ? "Pick up"
      : marker.action === "dropoff" || marker.action === "deliver" ? "Deliver"
        : marker.returnTarget ? "Return"
          : "Follow";
  const distance = marker.distanceLine ? ` • ${marker.distanceLine}` : "";
  const count = marker.checkpointIndex && marker.checkpointTotal ? ` • ${marker.checkpointIndex}/${marker.checkpointTotal}` : "";
  return `${action}: ${marker.label || "route marker"}${distance}${count}`;
}

function isAliveEnemy(enemy = {}) {
  return enemy.alive !== false;
}

export function resolveOpeningFightCue(input = {}) {
  if (input.mode !== "playing" || input.inHouse) return null;
  const time = Math.max(0, input.time || 0);
  if (time > 600 || hasOpeningProgress(input)) return null;

  const enemies = Array.isArray(input.enemies) ? input.enemies.filter(isAliveEnemy) : [];
  if (!enemies.length) return null;
  const pressure = input.pressure || resolveFirstMinutePressure(input);
  const target = enemies
    .map((enemy) => {
      const marker = pressure?.marker || input.player || {};
      const markerDistance = Math.hypot((enemy.x || 0) - (marker.x || 0), (enemy.y || 0) - (marker.y || 0));
      const playerDistance = Math.hypot((enemy.x || 0) - (input.player?.x || 0), (enemy.y || 0) - (input.player?.y || 0));
      const openingBias = enemy.openingPatrol || enemy.id === "opening-patrol" ? -6 : 0;
      return { enemy, markerDistance, playerDistance, score: markerDistance + playerDistance * 0.2 + openingBias };
    })
    .sort((a, b) => a.score - b.score)[0];
  if (!target || target.playerDistance > 14) return null;

  const label = target.enemy.label || "Road Slime";
  const distance = distanceLine(input.player, target.enemy);
  const nearLabel = pressure?.marker?.label ? `near ${pressure.marker.label}` : "near the first reward";

  return {
    id: "opening-fight-cue",
    title: "First threat",
    targetId: target.enemy.id || "",
    targetLabel: label,
    actionLabel: "Fight",
    distanceLine: distance,
    rewardHint: "+10g, +22 XP, +1 Slime Core",
    threatLine: `Threat: ${label} guarding the first reward.`,
    objectiveLine: `Fight: ${label}${distance ? ` • ${distance}` : ""} • ${nearLabel}`,
    marker: {
      kind: "enemy-threat",
      label,
      x: Number((target.enemy.x || 0).toFixed(2)),
      y: Number((target.enemy.y || 0).toFixed(2)),
      color: target.enemy.color || "#92f0a3",
      size: 0.78,
      blocking: false,
    },
  };
}

export function resolveFirstMinutePressure(input = {}) {
  if (input.mode !== "playing" || input.inHouse) return null;
  const time = Math.max(0, input.time || 0);
  if (time > 90 || hasOpeningProgress(input)) return null;

  const regionId = input.regionId || "frontier";
  const config = FIRST_PRESSURE_BY_REGION[regionId] || FIRST_PRESSURE_BY_REGION.frontier;
  const x = config.anchorX + config.offsetX;
  const y = config.anchorY + config.offsetY;
  const marker = {
    kind: "pressure",
    label: config.label,
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    color: config.color,
    size: 0.82,
    blocking: false,
  };
  const reward = FIRST_CACHE_REWARD_BY_REGION[regionId] || FIRST_CACHE_REWARD_BY_REGION.frontier;
  const rewardLine = formatRewardLine(reward);
  const routeDistance = distanceLine(input.player, marker);
  const actionLabel = "Open cache";

  return {
    id: `${regionId}-first-pressure`,
    title: config.title,
    line: config.line,
    objectiveLine: `${actionLabel}: ${config.label}${routeDistance ? ` • ${routeDistance}` : ""} • ${rewardLine}`,
    actionLabel,
    distanceLine: routeDistance,
    rewardLine,
    routeLabel: config.routeLabel,
    rewardHint: config.rewardHint,
    threatHint: config.threatHint,
    urgency: time < 18 ? "soft" : time < 55 ? "high" : "urgent",
    marker,
  };
}

export function resolveOpeningRouteGuide(input = {}) {
  if (input.mode !== "playing" || input.inHouse) return null;
  const time = Math.max(0, input.time || 0);
  if (time > 600 || hasOpeningProgress(input)) return null;

  const pressure = input.pressure || resolveFirstMinutePressure(input);
  const activeJob = input.activeJob || null;
  const jobMarker = input.jobMarker || null;
  const boardProp = input.boardProp || null;
  const regionHint = input.regionLabel || input.regionId || "";
  const steps = [];

  if (pressure) {
    steps.push({
      kind: "cache",
      line: pressure.objectiveLine,
    });
  }

  if (activeJob && jobMarker) {
    const markerLine = markerActionLine(jobMarker);
    steps.push({
      kind: "job",
      line: `${activeJob.title}: ${markerLine}${activeJob.rewardLine ? ` • ${activeJob.rewardLine}` : ""}`,
    });
  } else if (boardProp) {
    const boardDistance = distanceLine(input.player, boardProp);
    steps.push({
      kind: "board",
      line: `${boardProp.label || "Boone Job Board"}${boardDistance ? ` • ${boardDistance}` : ""}`,
    });
  }

  const fightCue = input.fightCue || resolveOpeningFightCue({ ...input, pressure });
  const threatLine = fightCue?.objectiveLine || pressure?.threatHint || "Expect a visible patrol before the route pays out.";
  if (threatLine) {
    steps.push({
      kind: "threat",
      line: `Threat: ${threatLine}`,
    });
  }

  if (steps.length === 0) return null;

  const primaryLine = activeJob && jobMarker
    ? steps.find((step) => step.kind === "job")?.line
    : pressure?.objectiveLine || steps[0].line;
  const secondaryParts = steps
    .filter((step) => step.line !== primaryLine)
    .slice(0, 2)
    .map((step) => step.line);

  return {
    id: "opening-route-guide",
    title: "Opening route",
    line: primaryLine,
    objectiveLine: primaryLine,
    secondaryLine: secondaryParts.join("  |  "),
    urgency: pressure?.urgency === "urgent" ? "urgent" : "high",
    stepCount: steps.length,
    steps,
    regionHint,
  };
}

export function resolveFirstMinuteCacheReward(input = {}) {
  if (input.opened || input.claimed) {
    return {
      ok: false,
      reason: "already_claimed",
      gold: 0,
      xp: 0,
      items: {},
      summary: "Opening cache already claimed",
    };
  }

  const regionId = input.regionId || "frontier";
  const reward = FIRST_CACHE_REWARD_BY_REGION[regionId] || FIRST_CACHE_REWARD_BY_REGION.frontier;
  return {
    ok: true,
    regionId,
    gold: reward.gold,
    xp: reward.xp,
    items: { ...reward.items },
    summary: reward.summary,
  };
}

export function resolveFirstMinuteCache(input = {}) {
  if (input.opened || input.claimed) return null;
  const pressure = resolveFirstMinutePressure(input);
  if (!pressure) return null;

  const regionId = input.regionId || "frontier";
  return {
    id: `${regionId}-opening-cache`,
    title: pressure.title,
    line: pressure.line,
    marker: pressure.marker,
    interactionRadius: 1.75,
    reward: resolveFirstMinuteCacheReward({
      regionId,
      opened: false,
      claimed: false,
    }),
  };
}
