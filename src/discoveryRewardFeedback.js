const KIND_LABELS = {
  cache: "Cache",
  shrine: "Shrine",
  camp: "Camp",
  wagon: "Wagon",
  mine: "Mine",
  ruin: "Ruin",
  hideout: "Hideout",
  stranger: "Stranger",
};

const KIND_COLORS = {
  cache: "#d8bc6a",
  shrine: "#cdb8ff",
  camp: "#f0adb4",
  wagon: "#d89f62",
  mine: "#b8a77a",
  ruin: "#aeb7c4",
  hideout: "#d88f62",
  stranger: "#90d0bd",
};

function safeCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function formatDiscoveryRewardLine(reward = {}) {
  const pieces = [];
  const gold = safeCount(reward.gold);
  if (gold > 0) pieces.push(`+${gold}g`);
  for (const [name, count] of Object.entries(reward.items || {})) {
    const amount = safeCount(count);
    if (amount > 0) pieces.push(`+${amount} ${name}`);
  }
  const hp = safeCount(reward.hp);
  if (hp > 0) pieces.push(`+${hp} HP`);
  const stamina = safeCount(reward.stamina);
  if (stamina > 0) pieces.push(`+${stamina} stamina`);
  return pieces.length > 0 ? pieces.join(", ") : "New clue recorded";
}

export function resolveDiscoveryRewardFeedback({
  poi = {},
  reward = {},
  codexUnlock = null,
  renownReward = null,
  routeReward = null,
} = {}) {
  const kind = typeof poi.kind === "string" ? poi.kind : "cache";
  const kindLabel = KIND_LABELS[kind] || "Discovery";
  const label = typeof poi.label === "string" && poi.label.trim() ? poi.label.trim() : "Unknown Place";
  const rewardLine = formatDiscoveryRewardLine(reward);
  const codexLine = codexUnlock?.title ? `Letter unlocked: ${codexUnlock.title}` : "";
  const renownLine = renownReward?.summary ? renownReward.summary : "";
  const routeLine = routeReward?.summary ? routeReward.summary : "";
  const hookLine = poi.returnReason || poi.mysteryLine || poi.dangerHint || "";
  const lines = [rewardLine, hookLine, codexLine, renownLine, routeLine].filter(Boolean);

  return {
    title: `${label} discovered`,
    subtitle: `${kindLabel}${poi.regionHint ? ` • ${poi.regionHint}` : ""}`,
    rewardLine,
    hookLine,
    codexLine,
    renownLine,
    routeLine,
    lines,
    color: KIND_COLORS[kind] || "#d8bc6a",
    kind,
    kindLabel,
    ttl: 5.2,
  };
}
