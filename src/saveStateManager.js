// SaveStateManager — thin wrapper around savePersistence.js that adds:
//   - Auto-save tick with configurable interval
//   - Dirty-flag tracking (only write when state has changed)
//   - Structured save/load result types for consumer error handling
//
// Consumers own their capture/apply serialization (too coupled to their state);
// timing + IDB plumbing lives here.

const DEFAULT_AUTOSAVE_INTERVAL = 90; // seconds between auto-saves

export function createSaveStateManager(options = {}) {
  const { interval = DEFAULT_AUTOSAVE_INTERVAL } = options;
  let timer = 0;
  let dirty = false;
  let lastSavedAt = null;

  return {
    // Call once per frame from the update loop.
    tick(dt, mode, { onAutoSave } = {}) {
      if (mode !== "playing") return;
      timer += dt;
      if (timer >= interval) {
        timer = 0;
        if (dirty && onAutoSave) onAutoSave();
      }
    },

    // Mark state as changed (call after any gameplay state mutation).
    markDirty() { dirty = true; },

    // Call after a successful save to reset dirty flag.
    onSaveSuccess(savedAt = Date.now()) {
      dirty = false;
      lastSavedAt = savedAt;
      timer = 0;
    },

    // Returns seconds since last save (or Infinity if never saved).
    secondsSinceLastSave() {
      if (lastSavedAt === null) return Infinity;
      return (Date.now() - lastSavedAt) / 1000;
    },

    get isDirty() { return dirty; },
    get lastSavedAt() { return lastSavedAt; },
  };
}

// Structured result type for save/load operations.
export function makeSaveResult(ok, reason = null, slot = null) {
  return { ok: Boolean(ok), reason, slot };
}
