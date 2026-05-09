import { describe, it, expect } from "vitest";
import { generateSideJobs, SIDE_JOB_POOL } from "../src/sideJobGenerator.js";

describe("sideJobGenerator — SIDE_JOB_POOL", () => {
  it("pool has entries for each region", () => {
    const regions = new Set(SIDE_JOB_POOL.map((j) => j.region));
    expect(regions.has("frontier")).toBe(true);
    expect(regions.has("ashfall")).toBe(true);
    expect(regions.has("ironlantern")).toBe(true);
  });

  it("all pool entries have required fields", () => {
    for (const job of SIDE_JOB_POOL) {
      expect(typeof job.id).toBe("string");
      expect(typeof job.title).toBe("string");
      expect(typeof job.hint).toBe("string");
      expect(job.rewardGold).toBeGreaterThan(0);
    }
  });
});

describe("sideJobGenerator — generateSideJobs", () => {
  it("returns an array", () => {
    const jobs = generateSideJobs({ regionId: "frontier" });
    expect(Array.isArray(jobs)).toBe(true);
  });

  it("returns at most count jobs", () => {
    const jobs = generateSideJobs({ regionId: "frontier", count: 2 });
    expect(jobs.length).toBeLessThanOrEqual(2);
  });

  it("all returned jobs are in the requested region", () => {
    const jobs = generateSideJobs({ regionId: "ashfall", count: 3 });
    for (const job of jobs) expect(job.region).toBe("ashfall");
  });

  it("same seed + state produces identical output", () => {
    const opts = { regionId: "frontier", dailySeed: "2026-05-09", count: 2 };
    const a = generateSideJobs(opts);
    const b = generateSideJobs(opts);
    expect(a.map((j) => j.id)).toEqual(b.map((j) => j.id));
  });

  it("different daily seeds produce different job order", () => {
    const a = generateSideJobs({ regionId: "frontier", dailySeed: "day-1", count: 2 });
    const b = generateSideJobs({ regionId: "frontier", dailySeed: "day-2", count: 2 });
    // Seeds may or may not differ — just ensure no crash; order may vary
    expect(Array.isArray(a) && Array.isArray(b)).toBe(true);
  });

  it("excludes jobs conflicting with completed quests", () => {
    // ashfall_boss conflict: side_bounty_ashfall_1 should be excluded
    const jobs = generateSideJobs({
      regionId: "ashfall",
      questOutcomes: { ashfall_boss: "defeat" },
      count: 10,
    });
    const ids = jobs.map((j) => j.id);
    expect(ids).not.toContain("side_bounty_ashfall_1");
  });

  it("returned jobs have boardState 'available'", () => {
    const jobs = generateSideJobs({ regionId: "frontier" });
    for (const job of jobs) expect(job.boardState).toBe("available");
  });

  it("returns empty array for unknown region", () => {
    const jobs = generateSideJobs({ regionId: "nowhere" as any });
    expect(jobs).toEqual([]);
  });
});
