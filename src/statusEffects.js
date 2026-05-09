// Per-entity status effect stack — burn / bleed / shock / frost.
//
// Effects are timer-driven and additive. Each entity keeps a small array
// `entity.statuses` of { kind, durationLeft, magnitude, sourceTier }.
// updateStatuses(entity, dt, ctxAdapter) decrements timers, applies DoT,
// and prunes expired entries. Effects beyond their per-kind cap stack
// duration; magnitude is capped per kind.
//
// Pure module — does not touch global state. The host wires it in by:
//   1) calling applyStatus(entity, kind, ...) on a hit
//   2) calling updateStatuses(entity, dt, adapter) per tick on each enemy
//   3) reading getStatusModifier(entity, "speed") etc. when applying movement

export const STATUS_KINDS = ["burn", "bleed", "shock", "frost"];

// Per-kind defaults.
export const STATUS_DEFS = {
  burn: { duration: 4.0, tickHz: 2, perTickDamage: 2, slowMult: 1.0 },
  bleed: { duration: 6.0, tickHz: 1, perTickDamage: 3, slowMult: 0.92 },
  shock: { duration: 1.4, tickHz: 4, perTickDamage: 1, slowMult: 0.7, chainOnApply: true },
  frost: { duration: 3.0, tickHz: 0, perTickDamage: 0, slowMult: 0.55, shatterStacks: 3 },
};

export function ensureStatusContainer(entity) {
  if (!entity.statuses) entity.statuses = [];
  if (!entity._statusTickAccum) entity._statusTickAccum = {};
  return entity.statuses;
}

export function applyStatus(entity, kind, opts = {}) {
  if (!STATUS_DEFS[kind]) return null;
  ensureStatusContainer(entity);
  const def = STATUS_DEFS[kind];
  const duration = opts.duration ?? def.duration;
  const magnitude = Math.max(0, Math.min(opts.magnitude ?? 1, opts.cap ?? 3));
  const sourceTier = opts.sourceTier ?? "Common";
  const existing = entity.statuses.find((s) => s.kind === kind);
  if (existing) {
    existing.durationLeft = Math.max(existing.durationLeft, duration);
    existing.magnitude = Math.min((opts.cap ?? 3), existing.magnitude + magnitude);
    return existing;
  }
  const entry = { kind, durationLeft: duration, magnitude, sourceTier };
  entity.statuses.push(entry);
  return entry;
}

export function clearStatuses(entity) {
  if (entity.statuses) entity.statuses.length = 0;
  if (entity._statusTickAccum) entity._statusTickAccum = {};
}

// adapter: { applyDamage(entity, amount, source), spawnShatter?(entity), chainShock?(entity) }
export function updateStatuses(entity, dt, adapter = {}) {
  if (!entity.statuses || entity.statuses.length === 0) return;
  if (!entity._statusTickAccum) entity._statusTickAccum = {};
  for (let i = entity.statuses.length - 1; i >= 0; i--) {
    const s = entity.statuses[i];
    s.durationLeft -= dt;
    const def = STATUS_DEFS[s.kind];
    if (def && def.tickHz > 0 && def.perTickDamage > 0 && adapter.applyDamage) {
      const accum = entity._statusTickAccum[s.kind] = (entity._statusTickAccum[s.kind] || 0) + dt;
      const tickInterval = 1 / def.tickHz;
      if (accum >= tickInterval) {
        const ticks = Math.floor(accum / tickInterval);
        entity._statusTickAccum[s.kind] = accum - ticks * tickInterval;
        adapter.applyDamage(entity, def.perTickDamage * s.magnitude * ticks, s.kind);
      }
    }
    if (s.durationLeft <= 0) {
      // frost shatter on expiry if magnitude maxed
      if (s.kind === "frost" && s.magnitude >= def.shatterStacks && adapter.spawnShatter) {
        adapter.spawnShatter(entity);
      }
      entity.statuses.splice(i, 1);
      if (entity._statusTickAccum) delete entity._statusTickAccum[s.kind];
    }
  }
}

// Returns the cumulative speed multiplier from active statuses (1.0 = normal).
export function getStatusSpeedMult(entity) {
  if (!entity.statuses || entity.statuses.length === 0) return 1.0;
  let mult = 1.0;
  for (const s of entity.statuses) {
    const def = STATUS_DEFS[s.kind];
    if (!def) continue;
    mult *= def.slowMult;
  }
  return Math.max(0.05, mult);
}

export function hasStatus(entity, kind) {
  if (!entity.statuses) return false;
  for (const s of entity.statuses) if (s.kind === kind) return true;
  return false;
}

export function getStatusMagnitude(entity, kind) {
  if (!entity.statuses) return 0;
  for (const s of entity.statuses) if (s.kind === kind) return s.magnitude;
  return 0;
}

// Status synergies. Call after applying a new status to check for combos.
// Returns an array of synergy events { type, burst } for the caller to handle.
export function checkStatusSynergies(entity) {
  if (!entity.statuses || entity.statuses.length < 2) return [];
  const synergies = [];
  const hasBurn  = hasStatus(entity, "burn");
  const hasFrost = hasStatus(entity, "frost");
  const hasBleed = hasStatus(entity, "bleed");
  const hasShock = hasStatus(entity, "shock");

  // Burn + Frost → ice burst AOE (clear both, deal burst damage)
  if (hasBurn && hasFrost) {
    entity.statuses = entity.statuses.filter((s) => s.kind !== "burn" && s.kind !== "frost");
    synergies.push({ type: "ice_burst", burst: 14 });
  }
  // Bleed + Shock → chain jump (shock leaps to nearest other enemy)
  if (hasBleed && hasShock) {
    entity.statuses = entity.statuses.filter((s) => s.kind !== "shock");
    synergies.push({ type: "bleed_chain", burst: 6 });
  }
  return synergies;
}
