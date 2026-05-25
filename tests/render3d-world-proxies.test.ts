// Unit tests for world collision proxies. Drives buildProxies() against the
// real frontier layout so a regression in either module is caught here.

import { describe, expect, it } from "vitest";
import { buildProxies, resolveCollision } from "../src/render3d/worldProxies.js";
import { buildFrontierPlacements, PLAYER_SPAWN } from "../src/render3d/frontierLayout.js";

const KINDS_THAT_BLOCK = new Set([
  "town", "ranch", "gate", "watchtower", "landmark",
  "fence", "sign", "lamp",
  "jobBoard", "smokeCache", "brokenWagon",
  "cart", "crate",
]);
const KINDS_THAT_PASS = new Set(["road", "roadSlime"]);

describe("worldProxies — buildProxies", () => {
  const placements = buildFrontierPlacements();
  const proxies = buildProxies(placements);

  it("emits one proxy per physical placement", () => {
    const expected = placements.filter((p) => KINDS_THAT_BLOCK.has(p.kind)).length;
    expect(proxies.length).toBe(expected);
  });

  it("emits zero proxies for roads and the road slime", () => {
    const passing = placements.filter((p) => KINDS_THAT_PASS.has(p.kind));
    expect(passing.length).toBeGreaterThan(0); // sanity: frontier has these kinds
    for (const p of proxies) {
      expect(KINDS_THAT_PASS.has(p.source.kind)).toBe(false);
    }
  });

  it("each proxy's AABB contains its placement's (x, y)", () => {
    for (const p of proxies) {
      const { x, y } = p.source;
      expect(x).toBeGreaterThanOrEqual(p.minX);
      expect(x).toBeLessThanOrEqual(p.maxX);
      expect(y).toBeGreaterThanOrEqual(p.minZ);
      expect(y).toBeLessThanOrEqual(p.maxZ);
    }
  });

  it("includes the job board, smoke cache, and broken wagon by kind", () => {
    const kinds = new Set(proxies.map((p) => p.source.kind));
    expect(kinds.has("jobBoard")).toBe(true);
    expect(kinds.has("smokeCache")).toBe(true);
    expect(kinds.has("brokenWagon")).toBe(true);
  });

  it("handles unknown kinds with a small generic box (fail-safe)", () => {
    const unknown = [{ kind: "ufo", x: 5, y: 5, size: 1 }];
    const out = buildProxies(unknown);
    expect(out.length).toBe(1);
    expect(out[0].source.kind).toBe("ufo");
  });

  it("skips placements with missing coordinates", () => {
    const bad = [{ kind: "town", size: 1 }, { kind: "town", x: 1, size: 1 }];
    const out = buildProxies(bad as any);
    expect(out.length).toBe(0);
  });
});

describe("worldProxies — resolveCollision", () => {
  // One proxy at world (1, 1)–(2, 2). With default radius 0.3, inflated box
  // is (0.7, 0.7)–(2.3, 2.3).
  const box = { minX: 1, maxX: 2, minZ: 1, maxZ: 2, source: { kind: "town", x: 1.5, y: 1.5 } };

  it("returns the destination unchanged when path is clear", () => {
    const out = resolveCollision({ from: { x: 0, z: 0 }, to: { x: 5, z: 5 } }, []);
    expect(out).toEqual({ x: 5, z: 5 });
  });

  it("stops X motion at the inflated boundary when walking straight into a wall", () => {
    const out = resolveCollision(
      { from: { x: 0, z: 1.5 }, to: { x: 2.5, z: 1.5 } },
      [box],
    );
    expect(out.x).toBeCloseTo(0.7, 6);
    expect(out.z).toBe(1.5);
  });

  it("stops Z motion at the inflated boundary when walking straight into a wall", () => {
    const out = resolveCollision(
      { from: { x: 1.5, z: 0 }, to: { x: 1.5, z: 2.5 } },
      [box],
    );
    expect(out.z).toBeCloseTo(0.7, 6);
    expect(out.x).toBe(1.5);
  });

  it("slides along Z when diagonal motion is blocked on X", () => {
    // From south-west of the box, aiming north-east through its south face.
    const out = resolveCollision(
      { from: { x: 0, z: 1.5 }, to: { x: 2.5, z: 2.5 } },
      [box],
    );
    expect(out.x).toBeCloseTo(0.7, 6);
    // Z motion was unblocked at the post-X column (x=0.7, outside the box).
    expect(out.z).toBeCloseTo(2.5, 6);
  });

  it("snaps strictly-inside points out to the closest inflated edge", () => {
    // Stuck point sits 0.5 east of minX and further from every other edge.
    const out = resolveCollision(
      { from: { x: 1.2, z: 1.5 }, to: { x: 1.2, z: 1.5 } },
      [box],
    );
    expect(out.x).toBeCloseTo(0.7, 6);
    expect(out.z).toBeCloseTo(1.5, 6);
  });

  it("never produces a final point strictly inside any proxy when walking from a valid spawn", () => {
    // Stress-walk small steps from the real frontier spawn — simulates the
    // playerController calling resolveCollision once per frame.
    const proxies = buildProxies(buildFrontierPlacements());
    let pos = { x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.y };

    // Sanity: the spawn must be clear (otherwise the world is unplayable).
    for (const p of proxies) {
      const inside =
        pos.x > p.minX - 0.3 + 1e-9 && pos.x < p.maxX + 0.3 - 1e-9 &&
        pos.z > p.minZ - 0.3 + 1e-9 && pos.z < p.maxZ + 0.3 - 1e-9;
      expect(inside).toBe(false);
    }

    // Walk a quarter unit per step (well under the sprint-frame distance) in a
    // slowly-rotating direction. 200 steps cover ~50 units of arcing path —
    // plenty to bump into nearby dressing.
    for (let i = 0; i < 200; i++) {
      const dir = i * 0.13;
      const to = { x: pos.x + 0.25 * Math.cos(dir), z: pos.z + 0.25 * Math.sin(dir) };
      pos = resolveCollision({ from: pos, to }, proxies);
      for (const p of proxies) {
        const strict =
          pos.x > p.minX - 0.3 + 1e-9 && pos.x < p.maxX + 0.3 - 1e-9 &&
          pos.z > p.minZ - 0.3 + 1e-9 && pos.z < p.maxZ + 0.3 - 1e-9;
        expect(strict).toBe(false);
      }
    }
  });
});
