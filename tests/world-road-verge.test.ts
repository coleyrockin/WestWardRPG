import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { roadVergePlacements, createRoadVergeScatter, VERGE_X_MIN, VERGE_X_MAX } from "../src/game/world/scatter.js";

// A synthetic corridor mirroring FIRST_FIVE_ROUTE's east stretch ({ x, y, kind }):
// the road drifts SE from the road sign (x24) out to the broken wagon (x60.5).
// road-verge scatter must reproduce its placement deterministically so the dusk
// golden frame is stable, and must hug the SHOULDERS — never the road lane.
const ROUTE = [
  { x: 9.5, y: 8.5, kind: "spawn" },
  { x: 13.0, y: 5.65, kind: "jobBoard" },
  { x: 24.0, y: 6.3, kind: "roadSign" },
  { x: 32.0, y: 9.2, kind: "townBark" },
  { x: 41.0, y: 13.2, kind: "smokeCache" },
  { x: 48.2, y: 16.4, kind: "slimeTell" },
  { x: 53.5, y: 15.0, kind: "roadSlime" },
  { x: 60.5, y: 12.2, kind: "brokenWagon" },
  { x: 13.0, y: 5.65, kind: "returnJobBoard" },
];

// Min distance from a mote to the road centreline, sampled densely along every
// outbound segment — used to prove motes sit on the verge, not on the lane.
function minDistToCenterline(mx: number, mz: number, route: typeof ROUTE) {
  const pts = route.filter((p) => p.kind !== "returnJobBoard");
  let best = Infinity;
  for (let seg = 1; seg < pts.length; seg++) {
    const a = pts[seg - 1];
    const b = pts[seg];
    for (let s = 0; s <= 40; s++) {
      const t = s / 40;
      const cx = a.x + (b.x - a.x) * t;
      const cz = a.y + (b.y - a.y) * t;
      best = Math.min(best, Math.hypot(mx - cx, mz - cz));
    }
  }
  return best;
}

describe("road-verge scatter — corridor bounds", () => {
  it("exposes the east-corridor x window", () => {
    expect(VERGE_X_MIN).toBeLessThan(VERGE_X_MAX);
    expect(VERGE_X_MIN).toBeGreaterThanOrEqual(20);
    expect(VERGE_X_MAX).toBeLessThanOrEqual(70);
  });
});

describe("road-verge scatter — roadVergePlacements (pure)", () => {
  it("is deterministic / order-stable (golden frame holds)", () => {
    const a = roadVergePlacements(ROUTE);
    const b = roadVergePlacements(ROUTE);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });

  it("ignores returnJobBoard waypoints", () => {
    const withReturn = roadVergePlacements(ROUTE);
    const withoutReturn = roadVergePlacements(ROUTE.filter((p) => p.kind !== "returnJobBoard"));
    expect(withReturn).toEqual(withoutReturn);
  });

  it("keeps every mote inside the east corridor x window", () => {
    for (const m of roadVergePlacements(ROUTE)) {
      expect(m.x).toBeGreaterThanOrEqual(VERGE_X_MIN);
      expect(m.x).toBeLessThanOrEqual(VERGE_X_MAX);
    }
  });

  it("hugs the shoulders — never on the road lane, never in deep field", () => {
    for (const m of roadVergePlacements(ROUTE)) {
      const d = minDistToCenterline(m.x, m.z, ROUTE);
      expect(d).toBeGreaterThanOrEqual(2.5); // off the lane
      expect(d).toBeLessThanOrEqual(8.5); // still the verge
    }
  });

  it("emits finite positions, positive scale, valid kind", () => {
    for (const m of roadVergePlacements(ROUTE)) {
      expect(Number.isFinite(m.x)).toBe(true);
      expect(Number.isFinite(m.z)).toBe(true);
      expect(Number.isFinite(m.rot)).toBe(true);
      expect(m.scale).toBeGreaterThan(0);
      expect(m.kindIdx).toBeGreaterThanOrEqual(0);
      expect(m.kindIdx).toBeLessThan(4);
    }
  });

  it("produces nothing when no segment reaches the corridor (route stays west)", () => {
    const westOnly = [
      { x: 2, y: 8, kind: "spawn" },
      { x: 10, y: 6, kind: "jobBoard" },
      { x: 18, y: 7, kind: "roadSign" },
    ];
    expect(roadVergePlacements(westOnly).length).toBe(0);
  });
});

describe("road-verge scatter — createRoadVergeScatter (InstancedMesh batching)", () => {
  it("batches motes into <=4 InstancedMeshes (one per kind), shadow-correct", () => {
    const group = createRoadVergeScatter(null, { route: ROUTE });
    expect(group.name).toBe("road-verge-scatter");
    expect(group.children.length).toBeGreaterThan(0);
    expect(group.children.length).toBeLessThanOrEqual(4);
    for (const c of group.children) {
      expect(c.isInstancedMesh).toBe(true);
      expect(c.castShadow).toBe(false);
      expect(c.receiveShadow).toBe(true);
    }
  });
});
