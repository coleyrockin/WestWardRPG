// Unit tests for world collision proxies. Drives buildProxies() against the
// real frontier layout so a regression in either module is caught here.

import { describe, expect, it } from "vitest";
import { buildProxies, resolveCollision } from "../src/render3d/worldProxies.js";
import { buildFrontierPlacements, PLAYER_SPAWN } from "../src/render3d/frontierLayout.js";

const KINDS_THAT_BLOCK = new Set([
  "town", "ranch", "gate", "watchtower", "landmark",
  "fence", "sign", "lamp", "lampTall", "lampLow",
  "jobBoard", "roadSign", "smokeCache", "brokenWagon", "wagonSalvage",
  "cart", "crate",
  // bigger-world expansion
  "mesa", "mesaSilhouette", "cliff", "rock", "boulder", "cactus", "deadTree",
  "saloon", "saloonFacade", "townFacadeWarm", "townFacadeStore", "townFacadeDark", "storefront", "porch",
  "heroTownSaloon", "heroTownStore", "heroTownAssay",
  "brokenFence", "mesaSkyline", "heroMesaSkyline",
  "productionSaloon", "productionStore", "productionAssay", "hitchingRail", "barrelCrateCluster",
  "church", "windmill", "waterTower", "blacksmith", "hotel",
]);
const KINDS_THAT_PASS = new Set([
  "road", "roadPlank", "roadRut", "townBark", "slimeTell", "marshCluster", "slimeTrailHero",
  "roadSlime", "brush", "sagePatch", "sageCluster", "roadGrass", "reeds",
  "productionBoardwalk", "windowGlowPanel", "hangingSign", "npcSilhouette", "lanternString",
  "mudRutDecal", "dustSmokePlume", "bountyEmblem",
]);

describe("worldProxies — buildProxies", () => {
  const placements = buildFrontierPlacements();
  const proxies = buildProxies(placements);

  // Most physical kinds emit exactly one AABB; the walk-in saloon emits a 5-wall
  // ring (back + 2 sides + 2 front segments flanking the doorway gap) and the
  // town gate emits its two posts (the road lane under the beam stays open).
  const SALOON_WALLS = 5;
  const GATE_POSTS = 2;

  it("emits one proxy per physical placement (multi-AABB kinds counted by part)", () => {
    const singles = placements.filter((p) => KINDS_THAT_BLOCK.has(p.kind)).length;
    const saloons = placements.filter((p) => p.kind === "walkInSaloon").length;
    const gates = placements.filter((p) => p.kind === "townGate").length;
    expect(gates).toBeGreaterThan(0); // Dustward v2 has a gateway arch
    expect(proxies.length).toBe(singles + saloons * SALOON_WALLS + gates * GATE_POSTS);
  });

  it("emits zero proxies for roads and the road slime", () => {
    const passing = placements.filter((p) => KINDS_THAT_PASS.has(p.kind));
    expect(passing.length).toBeGreaterThan(0); // sanity: frontier has these kinds
    for (const p of proxies) {
      expect(KINDS_THAT_PASS.has(p.source.kind)).toBe(false);
    }
  });

  it("each single-box proxy's AABB contains its placement's (x, y)", () => {
    for (const p of proxies) {
      // Multi-AABB kinds (saloon wall ring, gate posts) are intentionally offset
      // from the placement centre — the saloon is checked separately below; the
      // gate's posts straddle the road with the lane open between them.
      if (p.source.kind === "walkInSaloon" || p.source.kind === "townGate") continue;
      const { x, y } = p.source;
      expect(x).toBeGreaterThanOrEqual(p.minX);
      expect(x).toBeLessThanOrEqual(p.maxX);
      expect(y).toBeGreaterThanOrEqual(p.minZ);
      expect(y).toBeLessThanOrEqual(p.maxZ);
    }
  });

  it("walk-in saloon emits a solid wall ring with an open doorway gap", () => {
    const walls = proxies.filter((p) => p.source.kind === "walkInSaloon");
    expect(walls.length).toBe(SALOON_WALLS);
    // every wall AABB sits inside the building's overall footprint near the placement
    const s = placements.find((p) => p.kind === "walkInSaloon");
    if (!s) throw new Error("walkInSaloon placement missing");
    for (const w of walls) {
      expect(w.minX).toBeGreaterThanOrEqual(s.x - 3.2);
      expect(w.maxX).toBeLessThanOrEqual(s.x + 3.2);
    }
    // the doorway gap (centre-front) is open: no wall covers the placement's front-centre
    const frontCentre = { x: s.x, z: s.y + 2.4 };
    const covered = walls.some((w) =>
      frontCentre.x > w.minX && frontCentre.x < w.maxX && frontCentre.z > w.minZ && frontCentre.z < w.maxZ);
    expect(covered).toBe(false);
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
    // The fallback pushes the player a tiny epsilon past the inflated minX
    // so next-frame strict-less-than sweep tests see them as outside.
    const out = resolveCollision(
      { from: { x: 1.2, z: 1.5 }, to: { x: 1.2, z: 1.5 } },
      [box],
    );
    expect(out.x).toBeLessThan(0.7); // epsilon nudge past the boundary
    expect(out.x).toBeCloseTo(0.7, 3);
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

describe("worldProxies — diagonal sprint tunneling", () => {
  // One small box at the origin; player approaches diagonally from the SW.
  // Step distance is larger than the box's extent so a naive endpoint test
  // skips the wall entirely. The swept Z-overlap guard must catch it.
  const proxies = [{ minX: -0.1, maxX: 0.1, minZ: -0.1, maxZ: 0.1, source: { kind: "sign", x: 0, y: 0, size: 0.3 } as any }];

  it("diagonal step from outside swept-Z to inside swept-Z is stopped along X", () => {
    // from: (-0.6, -0.6) — well outside Z extent (-0.4 .. 0.4 inflated).
    // to:   ( 0.6,  0.6) — past the box on both axes. Without the swept
    // guard, the X sweep would skip because from.z = -0.6 is outside.
    const out = resolveCollision({ from: { x: -0.6, z: -0.6 }, to: { x: 0.6, z: 0.6 } }, proxies);
    // X must clamp at the inflated minX (-0.1 - 0.3 = -0.4). Z is free to
    // slide once X is sitting on the wall (player is no longer "inside" along X).
    expect(out.x).toBeLessThanOrEqual(-0.4 + 1e-9);
  });

  it("post-snap point is strictly outside every inflated proxy", () => {
    const out = resolveCollision({ from: { x: -0.6, z: -0.6 }, to: { x: 0.6, z: 0.6 } }, proxies);
    for (const p of proxies) {
      const inside =
        out.x > p.minX - 0.3 && out.x < p.maxX + 0.3 &&
        out.z > p.minZ - 0.3 && out.z < p.maxZ + 0.3;
      expect(inside).toBe(false);
    }
  });

  it("stuck-inside fallback ejects the point past the boundary (next-frame safe)", () => {
    // Start the player slightly inside the inflated extent — fallback should
    // push to inf.minX - ε so a re-run sees the point as outside.
    const p = proxies[0];
    const out = resolveCollision({ from: { x: 0, z: 0 }, to: { x: 0, z: 0 } }, proxies);
    const inflated = { minX: p.minX - 0.3, maxX: p.maxX + 0.3, minZ: p.minZ - 0.3, maxZ: p.maxZ + 0.3 };
    const stillInside =
      out.x > inflated.minX && out.x < inflated.maxX &&
      out.z > inflated.minZ && out.z < inflated.maxZ;
    expect(stillInside).toBe(false);
  });
});
