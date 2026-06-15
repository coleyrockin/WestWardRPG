// saveHealth — pure, dependency-free tracker for autosave reliability.
//
// The ironman run autosaves in the background (persistRun in spike.js). A single
// transient write miss is tolerable, but a *streak* of failures means the run the
// player believes is being saved is actually being lost silently. This module
// turns a stream of success/failure events into a stable "ok" | "failing" status
// the HUD can surface — without spamming on one bad write.
//
// Status flips to "failing" only after SAVE_FAILING_THRESHOLD *consecutive*
// failures; any success resets the streak and returns to "ok".

// Consecutive failed writes required before we declare the save unhealthy.
export const SAVE_FAILING_THRESHOLD = 3;

export function createSaveHealth(options = {}) {
  const threshold = Math.max(1, Math.floor(options.threshold ?? SAVE_FAILING_THRESHOLD));
  let consecutiveFailures = 0;

  return {
    // Call after a successful write — clears the failure streak.
    recordSuccess() {
      consecutiveFailures = 0;
    },

    // Call after a failed write — advances the streak toward "failing".
    recordFailure() {
      consecutiveFailures += 1;
    },

    // "ok" until the streak reaches the threshold, then "failing".
    get status() {
      return consecutiveFailures >= threshold ? "failing" : "ok";
    },

    // Live streak length (0 when healthy).
    get consecutiveFailures() {
      return consecutiveFailures;
    },
  };
}
