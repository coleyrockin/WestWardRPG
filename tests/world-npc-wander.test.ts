import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { createWander, stepWander } from "../src/game/world/npcWander.js";

const square = [
  { x: 0, z: 0 },
  { x: 4, z: 0 },
  { x: 4, z: 4 },
  { x: 0, z: 4 },
];

describe("npcWander", () => {
  it("starts paused at the first waypoint, not moving", () => {
    const w = createWander({ waypoints: square, pause: 1.0 });
    const s = stepWander(w, 0.5);
    expect(s.moving).toBe(false);
    expect(s.x).toBeCloseTo(0);
    expect(s.z).toBeCloseTo(0);
  });

  it("walks toward the next waypoint after the pause and reports moving", () => {
    const w = createWander({ waypoints: square, speed: 2, pause: 1.0 });
    stepWander(w, 1.0); // drain pause
    const s = stepWander(w, 0.5); // move 1 unit toward (4,0)
    expect(s.moving).toBe(true);
    expect(s.x).toBeGreaterThan(0);
    expect(s.z).toBeCloseTo(0);
  });

  it("faces its movement direction (yaw matches the player convention)", () => {
    const w = createWander({ waypoints: square, speed: 2, pause: 0 });
    const s = stepWander(w, 0.1); // heading toward +x → yaw = atan2(-1, 0) = -PI/2
    expect(s.yaw).toBeCloseTo(-Math.PI / 2, 2);
  });

  it("advances to the next waypoint on arrival and pauses again", () => {
    const w = createWander({ waypoints: square, speed: 100, pause: 0.5 });
    stepWander(w, 0.5); // drain the initial pause
    stepWander(w, 0.1); // move (fast) onto waypoint 1
    stepWander(w, 0.1); // next tick detects arrival → advance + re-pause
    expect(w.idx).toBe(1);
    expect(w.wait).toBeGreaterThan(0);
  });

  it("is deterministic — same inputs produce the same path", () => {
    const run = () => {
      const w = createWander({ waypoints: square, speed: 1.5, pause: 0.5 });
      const pts: number[] = [];
      for (let i = 0; i < 40; i++) {
        const s = stepWander(w, 0.1);
        pts.push(Number(s.x.toFixed(4)), Number(s.z.toFixed(4)));
      }
      return pts.join(",");
    };
    expect(run()).toBe(run());
  });
});
