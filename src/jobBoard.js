import { getRegionVisualIdentity } from "./regionVisualIdentity.js";

const JOB_STATUS = new Set(["active", "ready", "completed"]);

export const JOB_DEFINITIONS = {
  frontier_slime_bounty: {
    id: "frontier_slime_bounty",
    title: "Marsh Slime Bounty",
    kind: "bounty",
    regionId: "frontier",
    npcId: "warden",
    npcName: "Marshal Boone",
    threat: "Low",
    minLevel: 1,
    priority: 10,
    hint: "Clear the marsh slimes harassing the town road.",
    boardNote: "Boone needs the marsh road cleared before traders will risk the town circle.",
    objective: {
      type: "kill",
      enemyType: "slime",
      behavior: "balanced",
      count: 3,
      label: "slimes defeated",
    },
    reward: {
      gold: 38,
      xp: 18,
      items: { Potion: 1 },
    },
  },
  frontier_road_salvage: {
    id: "frontier_road_salvage",
    title: "Roadside Salvage",
    kind: "salvage",
    regionId: "frontier",
    npcId: "warden",
    npcName: "Marshal Boone",
    threat: "Low",
    minLevel: 1,
    priority: 20,
    hint: "Recover sturdy stone from the road edges for town barricades.",
    boardNote: "Road posts and barricades need stone before the next dust squall rolls through.",
    objective: {
      type: "collect",
      item: "Stone",
      resourceType: "rock",
      count: 2,
      label: "road salvage recovered",
    },
    reward: {
      gold: 24,
      xp: 12,
      items: { Ashglass: 1 },
    },
  },
  frontier_courier_orders: {
    id: "frontier_courier_orders",
    title: "Sealed Orders Run",
    kind: "courier",
    regionId: "frontier",
    npcId: "warden",
    npcName: "Marshal Boone",
    threat: "Low",
    minLevel: 1,
    priority: 30,
    hint: "Pick up sealed orders near Boone's board and deliver them to Elder Nira.",
    boardNote: "The Elder wants sealed orders carried by hand, not shouted across the street.",
    objective: {
      type: "delivery",
      count: 2,
      label: "sealed orders delivered",
      pickup: { id: "frontier_orders_cache", label: "Sealed Orders", x: 12.85, y: 8.25 },
      deliveryNpcId: "elder",
      deliveryLabel: "Elder Nira",
    },
    reward: {
      gold: 30,
      xp: 16,
      items: { Potion: 1 },
    },
  },
  frontier_watch_patrol: {
    id: "frontier_watch_patrol",
    title: "Town Watch Patrol",
    kind: "patrol",
    regionId: "frontier",
    npcId: "warden",
    npcName: "Marshal Boone",
    threat: "Low",
    minLevel: 1,
    priority: 40,
    hint: "Walk Boone's road posts, check the marsh fence, and mark the watchtower approach.",
    boardNote: "Boone wants eyes on the road posts before slimes learn the town schedule.",
    objective: {
      type: "patrol",
      count: 3,
      label: "patrol posts checked",
      checkpoints: [
        { id: "frontier_patrol_east_post", label: "East Road Post", x: 13.45, y: 8.95 },
        { id: "frontier_patrol_marsh_fence", label: "Marsh Fence", x: 15.1, y: 10.35 },
        { id: "frontier_patrol_watchtower", label: "Watchtower Approach", x: 14.15, y: 7.15 },
      ],
    },
    reward: {
      gold: 28,
      xp: 14,
      items: { Tonic: 1 },
    },
  },
  frontier_supply_run: {
    id: "frontier_supply_run",
    title: "Forge Supply Run",
    kind: "supply",
    regionId: "frontier",
    npcId: "warden",
    npcName: "Marshal Boone",
    threat: "Low",
    minLevel: 1,
    priority: 50,
    hint: "Pick up a barricade crate near the board and deliver it to Smith Varo's forge.",
    boardNote: "Varo is short on barricade fittings; a fast supply run keeps repairs cheap.",
    objective: {
      type: "supply_run",
      count: 2,
      label: "supply run completed",
      pickup: { id: "frontier_supply_crate", label: "Barricade Crate", x: 12.65, y: 9.05 },
      dropoff: { id: "frontier_smith_supply_drop", label: "Smith Varo's Forge", x: 17.35, y: 10.65 },
    },
    reward: {
      gold: 34,
      xp: 15,
      items: { Stone: 1 },
    },
  },
  ashfall_scrap_warrant: {
    id: "ashfall_scrap_warrant",
    title: "Scrap Warrant",
    kind: "bounty",
    regionId: "ashfall",
    npcId: "warden",
    npcName: "Marshal Boone",
    threat: "Medium",
    minLevel: 2,
    priority: 10,
    hint: "Break Ashfall brutes gathering salvage near the ribs.",
    boardNote: "Ashfall salvage crews pay for proof that the scrap brutes backed off.",
    objective: {
      type: "kill",
      enemyType: "brute",
      behavior: "tank",
      count: 2,
      label: "scrap brutes broken",
    },
    reward: {
      gold: 66,
      xp: 32,
      items: { "Scrap Coil": 1 },
    },
  },
  ironlantern_signal_breaker: {
    id: "ironlantern_signal_breaker",
    title: "Signal Breaker",
    kind: "patrol",
    regionId: "ironlantern",
    npcId: "warden",
    npcName: "Marshal Boone",
    threat: "High",
    minLevel: 4,
    priority: 10,
    hint: "Silence Lantern suppressors guarding signal posts.",
    boardNote: "Iron Lantern work is scarce, watched, and paid through Boone's quiet contacts.",
    objective: {
      type: "kill",
      enemyType: "suppressor",
      behavior: "control",
      count: 2,
      label: "suppressors silenced",
    },
    reward: {
      gold: 92,
      xp: 46,
      items: { "Cipher Lens": 1 },
    },
  },
};

const JOB_BOARD_PROPS = {
  frontier: {
    id: "frontier_job_board",
    kind: "job_board",
    label: "Boone's Job Board",
    npcId: "warden",
    regionId: "frontier",
    x: 12.35,
    y: 8.55,
    color: "#d8a84f",
  },
};

export function getJobBoardProp({ regionId = "frontier" } = {}) {
  const prop = JOB_BOARD_PROPS[regionId] || JOB_BOARD_PROPS.frontier;
  return { ...prop };
}

function knownJob(jobId) {
  return JOB_DEFINITIONS[jobId] || null;
}

function uniqueKnownJobIds(list) {
  const seen = new Set();
  const ids = [];
  for (const jobId of Array.isArray(list) ? list : []) {
    if (typeof jobId !== "string" || !knownJob(jobId) || seen.has(jobId)) continue;
    seen.add(jobId);
    ids.push(jobId);
  }
  return ids;
}

function cloneReward(reward = {}) {
  return {
    gold: Math.max(0, Math.floor(Number.isFinite(reward.gold) ? reward.gold : 0)),
    xp: Math.max(0, Math.floor(Number.isFinite(reward.xp) ? reward.xp : 0)),
    items: Object.fromEntries(
      Object.entries(reward.items || {})
        .filter(([name, count]) => typeof name === "string" && Number.isFinite(count) && count > 0)
        .map(([name, count]) => [name, Math.floor(count)]),
    ),
  };
}

function cloneObjective(objective = {}) {
  return {
    ...objective,
    pickup: objective.pickup ? { ...objective.pickup } : undefined,
    dropoff: objective.dropoff ? { ...objective.dropoff } : undefined,
    checkpoints: Array.isArray(objective.checkpoints)
      ? objective.checkpoints.map((checkpoint) => ({ ...checkpoint }))
      : undefined,
  };
}

function regionHint(regionId) {
  return getRegionVisualIdentity(regionId).label;
}

function normalizeProgress(jobId, source = {}) {
  const job = knownJob(jobId);
  if (!job || !source || typeof source !== "object") return null;
  const status = JOB_STATUS.has(source.status) ? source.status : "active";
  const count = Math.min(
    job.objective.count,
    Math.max(0, Math.floor(Number.isFinite(source.count) ? source.count : 0)),
  );
  return {
    status,
    count,
    rewardClaimed: typeof source.rewardClaimed === "boolean" ? source.rewardClaimed : false,
  };
}

export function createInitialJobBoardState() {
  return {
    activeJobId: null,
    completedJobIds: [],
    progressByJobId: {},
  };
}

export function normalizeJobBoardState(source = {}) {
  const progressByJobId = {};
  if (source?.progressByJobId && typeof source.progressByJobId === "object") {
    for (const [jobId, progress] of Object.entries(source.progressByJobId)) {
      const normalized = normalizeProgress(jobId, progress);
      if (normalized) progressByJobId[jobId] = normalized;
    }
  }

  const completedJobIds = uniqueKnownJobIds(source?.completedJobIds);
  const activeJobId = typeof source?.activeJobId === "string" && knownJob(source.activeJobId)
    && !completedJobIds.includes(source.activeJobId)
    ? source.activeJobId
    : null;
  if (activeJobId && !progressByJobId[activeJobId]) {
    progressByJobId[activeJobId] = { status: "active", count: 0, rewardClaimed: false };
  }

  return {
    activeJobId,
    completedJobIds,
    progressByJobId,
  };
}

function syncJobState(jobState) {
  const normalized = normalizeJobBoardState(jobState);
  Object.assign(jobState, normalized);
  return jobState;
}

function buildProgressLine(job, progress = null) {
  const objective = job.objective || {};
  const count = progress?.count || 0;
  if (objective.type === "delivery") {
    if (progress?.status === "ready" || count >= objective.count) return `Return to ${job.npcName}`;
    if (count <= 0) return `Pick up ${objective.pickup?.label || "orders"}`;
    return `Deliver to ${objective.deliveryLabel || "the destination"}`;
  }
  if (objective.type === "patrol") {
    const checkpoints = Array.isArray(objective.checkpoints) ? objective.checkpoints : [];
    if (progress?.status === "ready" || count >= objective.count || count >= checkpoints.length) return `Return to ${job.npcName}`;
    const checkpoint = checkpoints[count];
    return `Checkpoint ${count + 1}/${checkpoints.length || objective.count}: ${checkpoint?.label || objective.label}`;
  }
  if (objective.type === "supply_run") {
    if (progress?.status === "ready" || count >= objective.count) return `Return to ${job.npcName}`;
    if (count <= 0) return `Pick up ${objective.pickup?.label || "supplies"}`;
    return `Deliver to ${objective.dropoff?.label || "the dropoff"}`;
  }
  return `${count}/${objective.count} ${objective.label}`;
}

function decorateJob(job, progress = null) {
  const reward = cloneReward(job.reward);
  return {
    ...job,
    objective: cloneObjective(job.objective),
    reward,
    regionHint: regionHint(job.regionId),
    boardNote: job.boardNote || job.hint,
    availabilityLine: `${regionHint(job.regionId)} • ${job.threat} threat • ${job.kind}`,
    status: progress?.status || "available",
    progress: progress ? { ...progress } : { status: "available", count: 0, rewardClaimed: false },
    progressLine: buildProgressLine(job, progress),
    rewardLine: `+${reward.gold}g, +${reward.xp} XP${Object.entries(reward.items).map(([name, count]) => `, +${count} ${name}`).join("")}`,
  };
}

export function getJobListings({ regionId = "frontier", playerLevel = 1, jobState = createInitialJobBoardState() } = {}) {
  const safeState = normalizeJobBoardState(jobState);
  const safeLevel = Math.max(1, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1));
  return Object.values(JOB_DEFINITIONS)
    .filter((job) => job.regionId === regionId)
    .filter((job) => job.minLevel <= safeLevel)
    .filter((job) => !safeState.completedJobIds.includes(job.id))
    .map((job) => decorateJob(job, safeState.progressByJobId[job.id]))
    .sort((a, b) => a.minLevel - b.minLevel || (a.priority || 50) - (b.priority || 50) || a.id.localeCompare(b.id));
}

export function getJobDefinition(jobId) {
  const job = knownJob(jobId);
  return job ? decorateJob(job) : null;
}

export function getJobBoardChoices({ regionId = "frontier", playerLevel = 1, jobState = createInitialJobBoardState(), npcId = "warden", limit = 5 } = {}) {
  const active = getActiveJobSummary(jobState);
  if (active?.npcId === npcId) {
    return [{
      ...active,
      boardState: active.status,
      selectable: active.status === "ready",
    }];
  }
  return getJobListings({ regionId, playerLevel, jobState })
    .filter((job) => job.npcId === npcId)
    .slice(0, Math.max(1, Math.floor(limit)))
    .map((job) => ({
      ...job,
      boardState: "available",
      selectable: true,
    }));
}

export function acceptJob(jobState, jobId) {
  const state = syncJobState(jobState);
  const job = knownJob(jobId);
  if (!job) return { ok: false, message: "Job not found.", jobState: state };
  if (state.completedJobIds.includes(jobId)) return { ok: false, message: "Job already completed.", job: decorateJob(job), jobState: state };
  if (state.activeJobId && state.activeJobId !== jobId) {
    return { ok: false, message: "Finish your active job before taking another.", job: decorateJob(job), jobState: state };
  }

  state.activeJobId = jobId;
  state.progressByJobId[jobId] = {
    status: "active",
    count: state.progressByJobId[jobId]?.count || 0,
    rewardClaimed: false,
  };
  return {
    ok: true,
    job: decorateJob(job, state.progressByJobId[jobId]),
    jobState: state,
    message: `Job accepted: ${job.title}. ${job.objective.label} ${state.progressByJobId[jobId].count}/${job.objective.count}.`,
  };
}

function matchesObjective(objective, event = {}) {
  if (objective.type !== event.type) return false;
  if (objective.enemyType && event.enemyType !== objective.enemyType) return false;
  if (objective.behavior && event.behavior !== objective.behavior) return false;
  if (objective.item && event.item !== objective.item) return false;
  if (objective.resourceType && event.resourceType !== objective.resourceType) return false;
  return true;
}

function recordDeliveryEvent(job, progress, event = {}) {
  const objective = job.objective || {};
  if (event.type === "pickup" && progress.count === 0 && event.targetId === objective.pickup?.id) {
    progress.count = 1;
    return {
      ok: true,
      completed: false,
      message: `Job progress: ${job.title} picked up. Deliver to ${objective.deliveryLabel}.`,
    };
  }
  if (event.type === "deliver" && progress.count >= 1 && event.npcId === objective.deliveryNpcId) {
    progress.count = objective.count;
    progress.status = "ready";
    return {
      ok: true,
      completed: true,
      message: `Job ready: ${job.title}. Return to ${job.npcName}.`,
    };
  }
  return { ok: false, completed: false };
}

function recordPatrolEvent(job, progress, event = {}) {
  const objective = job.objective || {};
  const checkpoints = Array.isArray(objective.checkpoints) ? objective.checkpoints : [];
  const next = checkpoints[progress.count];
  if (event.type !== "checkpoint" || !next || event.targetId !== next.id) {
    return { ok: false, completed: false };
  }
  progress.count = Math.min(objective.count, progress.count + 1);
  const completed = progress.count >= objective.count || progress.count >= checkpoints.length;
  if (completed) progress.status = "ready";
  return {
    ok: true,
    completed,
    message: completed
      ? `Job ready: ${job.title}. Return to ${job.npcName}.`
      : `Job progress: ${job.title} checkpoint ${progress.count}/${checkpoints.length}.`,
  };
}

function recordSupplyRunEvent(job, progress, event = {}) {
  const objective = job.objective || {};
  if (event.type === "pickup" && progress.count === 0 && event.targetId === objective.pickup?.id) {
    progress.count = 1;
    return {
      ok: true,
      completed: false,
      message: `Job progress: ${job.title} picked up. Deliver to ${objective.dropoff?.label}.`,
    };
  }
  if (event.type === "dropoff" && progress.count >= 1 && event.targetId === objective.dropoff?.id) {
    progress.count = objective.count;
    progress.status = "ready";
    return {
      ok: true,
      completed: true,
      message: `Job ready: ${job.title}. Return to ${job.npcName}.`,
    };
  }
  return { ok: false, completed: false };
}

export function recordJobEvent(jobState, event = {}) {
  const state = syncJobState(jobState);
  const job = knownJob(state.activeJobId);
  if (!job) return { ok: false, completed: false, message: "No active job.", jobState: state };
  const progress = state.progressByJobId[job.id] || { status: "active", count: 0, rewardClaimed: false };
  state.progressByJobId[job.id] = progress;
  if (progress.status !== "active") {
    return { ok: false, completed: progress.status === "ready", job: decorateJob(job, progress), progress, jobState: state };
  }
  if (job.objective?.type === "delivery") {
    const delivery = recordDeliveryEvent(job, progress, event);
    return {
      ...delivery,
      job: decorateJob(job, progress),
      progress,
      jobState: state,
    };
  }
  if (job.objective?.type === "patrol") {
    const patrol = recordPatrolEvent(job, progress, event);
    return {
      ...patrol,
      job: decorateJob(job, progress),
      progress,
      jobState: state,
    };
  }
  if (job.objective?.type === "supply_run") {
    const supply = recordSupplyRunEvent(job, progress, event);
    return {
      ...supply,
      job: decorateJob(job, progress),
      progress,
      jobState: state,
    };
  }
  if (!matchesObjective(job.objective, event)) {
    return { ok: false, completed: false, job: decorateJob(job, progress), progress, jobState: state };
  }

  progress.count = Math.min(job.objective.count, progress.count + 1);
  const completed = progress.count >= job.objective.count;
  if (completed) progress.status = "ready";
  return {
    ok: true,
    completed,
    job: decorateJob(job, progress),
    progress,
    jobState: state,
    message: completed
      ? `Job ready: ${job.title}. Return to ${job.npcName}.`
      : `Job progress: ${job.title} ${progress.count}/${job.objective.count}.`,
  };
}

export function claimJobReward(jobState, jobId = null) {
  const state = syncJobState(jobState);
  const targetJobId = jobId || state.activeJobId;
  const job = knownJob(targetJobId);
  const progress = targetJobId ? state.progressByJobId[targetJobId] : null;
  if (!job || !progress) return { ok: false, message: "No job reward is ready.", jobState: state };
  if (progress.status !== "ready" || progress.rewardClaimed) {
    return { ok: false, message: "Job reward is not ready.", job: decorateJob(job, progress), jobState: state };
  }

  progress.status = "completed";
  progress.rewardClaimed = true;
  if (!state.completedJobIds.includes(targetJobId)) state.completedJobIds.push(targetJobId);
  if (state.activeJobId === targetJobId) state.activeJobId = null;
  return {
    ok: true,
    job: decorateJob(job, progress),
    reward: cloneReward(job.reward),
    jobState: state,
    message: `Job paid: ${job.title}.`,
  };
}

export function getActiveJobSummary(jobState) {
  const safeState = normalizeJobBoardState(jobState);
  const job = knownJob(safeState.activeJobId);
  if (!job) return null;
  return decorateJob(job, safeState.progressByJobId[job.id]);
}

function distanceFrom(player = {}, target = {}) {
  const dx = (target.x || 0) - (player.x || 0);
  const dy = (target.y || 0) - (player.y || 0);
  return Math.hypot(dx, dy);
}

function nearestMatching(list, player, predicate) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of Array.isArray(list) ? list : []) {
    if (!item || !predicate(item)) continue;
    const distance = distanceFrom(player, item);
    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best ? { target: best, distance: Number(bestDistance.toFixed(2)) } : null;
}

function markerDistanceLine(distance) {
  if (!Number.isFinite(distance)) return "";
  return `${Math.max(1, Math.round(distance))}m`;
}

function staticTarget(target, player) {
  if (!target || typeof target.x !== "number" || typeof target.y !== "number") return null;
  const distance = Number(distanceFrom(player, target).toFixed(2));
  return { target, distance };
}

function routeBase(activeJob, target, player, extra = {}) {
  const resolved = staticTarget(target, player);
  if (!resolved) return null;
  return {
    jobId: activeJob.id,
    x: resolved.target.x,
    y: resolved.target.y,
    distance: resolved.distance,
    distanceLine: markerDistanceLine(resolved.distance),
    regionId: activeJob.regionId,
    regionHint: activeJob.regionHint || regionHint(activeJob.regionId),
    ...extra,
  };
}

export function resolveJobRouteMarker({ jobState, player = {}, resources = [], enemies = [], npcs = [] } = {}) {
  const activeJob = getActiveJobSummary(jobState);
  if (!activeJob) return null;
  const objective = activeJob.objective || {};

  if (activeJob.status === "ready") {
    const npc = nearestMatching(npcs, player, (entry) => entry.id === activeJob.npcId);
    if (!npc) return null;
    return {
      kind: "job_turn_in",
      jobId: activeJob.id,
      title: "Job ready",
      label: `Return to ${activeJob.npcName}`,
      line: `${activeJob.title}: claim ${activeJob.rewardLine}`,
      x: npc.target.x,
      y: npc.target.y,
      color: "#5fe0b5",
      distance: npc.distance,
      distanceLine: markerDistanceLine(npc.distance),
      regionId: activeJob.regionId,
      regionHint: activeJob.regionHint || regionHint(activeJob.regionId),
      action: "turn_in",
      returnTarget: activeJob.npcId,
    };
  }

  if (objective.type === "delivery") {
    if ((activeJob.progress?.count || 0) <= 0) {
      const pickup = routeBase(activeJob, objective.pickup, player, {
        kind: "job_pickup",
        title: "Courier pickup",
        label: `Pick up ${objective.pickup?.label || "orders"}`,
        line: `${activeJob.regionHint}: ${activeJob.progressLine}`,
        color: "#9bd3ff",
        action: "pickup",
        targetId: objective.pickup?.id,
        checkpointIndex: 1,
        checkpointTotal: objective.count,
      });
      if (!pickup) return null;
      return pickup;
    }
    const npc = nearestMatching(npcs, player, (entry) => entry.id === objective.deliveryNpcId);
    if (!npc) return null;
    return {
      kind: "job_delivery",
      jobId: activeJob.id,
      title: "Courier delivery",
      label: `Deliver to ${objective.deliveryLabel || "destination"}`,
      line: `${activeJob.regionHint}: ${activeJob.progressLine}`,
      x: npc.target.x,
      y: npc.target.y,
      color: "#9bd3ff",
      distance: npc.distance,
      distanceLine: markerDistanceLine(npc.distance),
      regionId: activeJob.regionId,
      regionHint: activeJob.regionHint || regionHint(activeJob.regionId),
      action: "deliver",
      npcId: objective.deliveryNpcId,
      checkpointIndex: 2,
      checkpointTotal: objective.count,
    };
  }

  if (objective.type === "patrol") {
    const checkpoints = Array.isArray(objective.checkpoints) ? objective.checkpoints : [];
    const index = activeJob.progress?.count || 0;
    const checkpoint = checkpoints[index];
    if (!checkpoint) return null;
    return routeBase(activeJob, checkpoint, player, {
      kind: "job_patrol",
      title: "Patrol checkpoint",
      label: `Patrol: ${checkpoint.label}`,
      line: `${activeJob.regionHint}: Checkpoint ${index + 1}/${checkpoints.length} • ${checkpoint.label}`,
      color: "#8fd0ff",
      action: "checkpoint",
      targetId: checkpoint.id,
      checkpointIndex: index + 1,
      checkpointTotal: checkpoints.length,
    });
  }

  if (objective.type === "supply_run") {
    if ((activeJob.progress?.count || 0) <= 0) {
      return routeBase(activeJob, objective.pickup, player, {
        kind: "job_supply_pickup",
        title: "Supply pickup",
        label: `Pick up ${objective.pickup?.label || "supplies"}`,
        line: `${activeJob.regionHint}: ${activeJob.progressLine}`,
        color: "#ffd77b",
        action: "pickup",
        targetId: objective.pickup?.id,
        checkpointIndex: 1,
        checkpointTotal: objective.count,
      });
    }
    return routeBase(activeJob, objective.dropoff, player, {
      kind: "job_supply_dropoff",
      title: "Supply dropoff",
      label: `Deliver to ${objective.dropoff?.label || "dropoff"}`,
      line: `${activeJob.regionHint}: ${activeJob.progressLine}`,
      color: "#ffcf7a",
      action: "dropoff",
      targetId: objective.dropoff?.id,
      checkpointIndex: 2,
      checkpointTotal: objective.count,
    });
  }

  if (objective.type === "collect") {
    const resource = nearestMatching(resources, player, (entry) => (
      !entry.harvested
      && (!objective.resourceType || entry.type === objective.resourceType)
      && (!objective.item || entry.item === objective.item || entry.label === objective.item || objective.item === "Stone" && entry.type === "rock")
    ));
    if (!resource) return null;
    return {
      kind: "job_resource",
      jobId: activeJob.id,
      title: "Job target",
      label: activeJob.title,
      line: activeJob.progressLine,
      x: resource.target.x,
      y: resource.target.y,
      color: "#ffd77b",
      distance: resource.distance,
      distanceLine: markerDistanceLine(resource.distance),
      regionId: activeJob.regionId,
      regionHint: activeJob.regionHint || regionHint(activeJob.regionId),
      action: "collect",
      checkpointIndex: Math.min((activeJob.progress?.count || 0) + 1, objective.count),
      checkpointTotal: objective.count,
    };
  }

  if (objective.type === "kill") {
    const enemy = nearestMatching(enemies, player, (entry) => (
      entry.alive !== false
      && (!objective.enemyType || entry.type === objective.enemyType)
      && (!objective.behavior || entry.behavior === objective.behavior)
    ));
    if (!enemy) return null;
    return {
      kind: "job_bounty",
      jobId: activeJob.id,
      title: "Bounty target",
      label: activeJob.title,
      line: activeJob.progressLine,
      x: enemy.target.x,
      y: enemy.target.y,
      color: "#ffb46d",
      distance: enemy.distance,
      distanceLine: markerDistanceLine(enemy.distance),
      regionId: activeJob.regionId,
      regionHint: activeJob.regionHint || regionHint(activeJob.regionId),
      action: "hunt",
      checkpointIndex: Math.min((activeJob.progress?.count || 0) + 1, objective.count),
      checkpointTotal: objective.count,
    };
  }

  return null;
}
