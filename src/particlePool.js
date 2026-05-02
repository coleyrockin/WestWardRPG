// Pre-allocated particle pool with ring-buffer recycling.
// Avoids per-frame alloc churn from push/splice and keeps a stable
// upper bound on active particles (steady-state cap).

export const DEFAULT_PARTICLE_CAP = 1500;

export function createParticlePool(capacity = DEFAULT_PARTICLE_CAP) {
  const slots = new Array(capacity);
  for (let i = 0; i < capacity; i++) {
    slots[i] = {
      active: false,
      x: 0, y: 0,
      vx: 0, vy: 0,
      life: 0, maxLife: 0,
      color: "#fff",
      size: 0,
    };
  }
  return { slots, capacity, cursor: 0, activeCount: 0 };
}

// Find a free slot; if none, recycle the slot at cursor (drop oldest-style).
function acquireSlot(pool) {
  const cap = pool.capacity;
  // Fast path: scan from cursor for an inactive slot
  for (let probe = 0; probe < cap; probe++) {
    const idx = (pool.cursor + probe) % cap;
    if (!pool.slots[idx].active) {
      pool.cursor = (idx + 1) % cap;
      const slot = pool.slots[idx];
      if (!slot.active) pool.activeCount++;
      return slot;
    }
  }
  // All active — recycle the slot at cursor (oldest-spawn-area).
  const idx = pool.cursor;
  pool.cursor = (idx + 1) % cap;
  return pool.slots[idx];
}

export function spawnParticleInto(pool, x, y, vx, vy, life, color, size) {
  const slot = acquireSlot(pool);
  slot.active = true;
  slot.x = x;
  slot.y = y;
  slot.vx = vx;
  slot.vy = vy;
  slot.life = life;
  slot.maxLife = life;
  slot.color = color;
  slot.size = size;
  return slot;
}

export function updateParticlePool(pool, dt) {
  const cap = pool.capacity;
  let active = 0;
  for (let i = 0; i < cap; i++) {
    const p = pool.slots[i];
    if (!p.active) continue;
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
    } else {
      active++;
    }
  }
  pool.activeCount = active;
}

export function forEachActive(pool, fn) {
  const cap = pool.capacity;
  for (let i = 0; i < cap; i++) {
    const p = pool.slots[i];
    if (p.active) fn(p);
  }
}

export function clearPool(pool) {
  const cap = pool.capacity;
  for (let i = 0; i < cap; i++) pool.slots[i].active = false;
  pool.activeCount = 0;
  pool.cursor = 0;
}

export function getActiveCount(pool) {
  return pool.activeCount;
}
