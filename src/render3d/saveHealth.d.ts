export type SaveHealthStatus = "ok" | "failing";

/** Consecutive failed writes required before status flips to "failing". */
export const SAVE_FAILING_THRESHOLD: number;

export interface SaveHealth {
  /** Reset the failure streak after a successful write. */
  recordSuccess(): void;
  /** Advance the failure streak after a failed write. */
  recordFailure(): void;
  /** "ok" until the streak reaches the threshold, then "failing". */
  readonly status: SaveHealthStatus;
  /** Live consecutive-failure count (0 when healthy). */
  readonly consecutiveFailures: number;
}

export function createSaveHealth(options?: { threshold?: number }): SaveHealth;
