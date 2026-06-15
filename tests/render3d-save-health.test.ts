import { describe, expect, it } from "vitest";
import { createSaveHealth, SAVE_FAILING_THRESHOLD } from "../src/render3d/saveHealth.js";

describe("saveHealth — status tracking", () => {
  it("starts in the 'ok' status", () => {
    const health = createSaveHealth();
    expect(health.status).toBe("ok");
  });

  it("exposes a failure threshold of 3 consecutive misses", () => {
    expect(SAVE_FAILING_THRESHOLD).toBe(3);
  });

  it("stays 'ok' while consecutive failures are below the threshold", () => {
    const health = createSaveHealth();
    for (let i = 0; i < SAVE_FAILING_THRESHOLD - 1; i++) {
      health.recordFailure();
      expect(health.status).toBe("ok");
    }
  });

  it("flips to 'failing' at exactly the threshold of consecutive failures", () => {
    const health = createSaveHealth();
    for (let i = 0; i < SAVE_FAILING_THRESHOLD; i++) health.recordFailure();
    expect(health.status).toBe("failing");
  });

  it("stays 'failing' for further failures past the threshold", () => {
    const health = createSaveHealth();
    for (let i = 0; i < SAVE_FAILING_THRESHOLD + 4; i++) health.recordFailure();
    expect(health.status).toBe("failing");
  });

  it("a success resets the consecutive-failure count back to 'ok'", () => {
    const health = createSaveHealth();
    for (let i = 0; i < SAVE_FAILING_THRESHOLD; i++) health.recordFailure();
    expect(health.status).toBe("failing");
    health.recordSuccess();
    expect(health.status).toBe("ok");
  });

  it("requires the full threshold again after a reset (no carry-over)", () => {
    const health = createSaveHealth();
    health.recordFailure();
    health.recordFailure();
    health.recordSuccess(); // resets the streak
    health.recordFailure();
    health.recordFailure();
    expect(health.status).toBe("ok"); // only 2 since reset, still below threshold
    health.recordFailure();
    expect(health.status).toBe("failing");
  });

  it("exposes the live consecutive-failure count", () => {
    const health = createSaveHealth();
    expect(health.consecutiveFailures).toBe(0);
    health.recordFailure();
    health.recordFailure();
    expect(health.consecutiveFailures).toBe(2);
    health.recordSuccess();
    expect(health.consecutiveFailures).toBe(0);
  });
});
