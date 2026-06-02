import { describe, expect, it, vi } from "vitest";
import {
  canStrikeSlime,
  createEncounterSystem,
  getNextSlimeState,
} from "../src/render3d/encounterSystem.js";

const SLIME = { kind: "roadSlime", label: "Road Slime", x: 10, y: 5, size: 1 };
const SNAPSHOT = { worldObjects: [SLIME] };

function fakeSlimeMesh() {
  return {
    position: { x: 10, y: 0, z: 5 },
    scale: { y: 1 },
    material: { emissiveIntensity: 1 },
    userData: {},
  };
}

describe("render3d encounter system — pure slime state", () => {
  it("transitions by distance from patrol to aggro to attack", () => {
    expect(getNextSlimeState({
      state: "patrol",
      playerPos: { x: 0, z: 0 },
      slimePos: { x: 10, z: 5 },
    })).toBe("patrol");

    expect(getNextSlimeState({
      state: "patrol",
      playerPos: { x: 7, z: 5 },
      slimePos: { x: 10, z: 5 },
    })).toBe("aggro");

    expect(getNextSlimeState({
      state: "aggro",
      playerPos: { x: 9, z: 5 },
      slimePos: { x: 10, z: 5 },
    })).toBe("attack");
  });

  it("keeps dead slimes dead", () => {
    expect(getNextSlimeState({
      state: "dead",
      playerPos: { x: 10, z: 5 },
      slimePos: { x: 10, z: 5 },
    })).toBe("dead");
  });

  it("only allows strikes in range and before death", () => {
    expect(canStrikeSlime({
      state: "aggro",
      playerPos: { x: 7, z: 5 },
      slimePos: { x: 10, z: 5 },
    })).toBe(true);
    expect(canStrikeSlime({
      state: "dead",
      playerPos: { x: 10, z: 5 },
      slimePos: { x: 10, z: 5 },
    })).toBe(false);
  });
});

describe("render3d encounter system — controller shell", () => {
  it("notifies once when the slime engages", () => {
    const onSlimeEngage = vi.fn();
    const encounter = createEncounterSystem(null, SNAPSHOT, { onSlimeEngage });

    expect(encounter.update({ x: 7, z: 5 }, 0.1).slime).toBe("aggro");
    encounter.update({ x: 6.5, z: 5 }, 0.1);

    expect(onSlimeEngage).toHaveBeenCalledTimes(1);
  });

  it("retries engagement notification when the callback defers it", () => {
    const onSlimeEngage = vi.fn(() => false);
    const encounter = createEncounterSystem(null, SNAPSHOT, { onSlimeEngage });

    encounter.update({ x: 7, z: 5 }, 0.1);
    encounter.update({ x: 7, z: 5 }, 0.1);

    expect(onSlimeEngage).toHaveBeenCalledTimes(2);
    expect(encounter.getState().engaged).toBe(false);
  });

  it("can explicitly engage the slime after the cache opens", () => {
    const onSlimeEngage = vi.fn();
    const encounter = createEncounterSystem(null, SNAPSHOT, { onSlimeEngage });

    expect(encounter.engage().slime).toBe("aggro");
    expect(onSlimeEngage).toHaveBeenCalledTimes(1);
  });

  it("requires three valid strikes, fires death once, and prevents re-aggro", () => {
    const onSlimeDeath = vi.fn();
    const onSlimeHit = vi.fn();
    const mesh = fakeSlimeMesh();
    const encounter = createEncounterSystem(null, SNAPSHOT, { onSlimeDeath, onSlimeHit, slimeMesh: mesh });

    encounter.update({ x: 7, z: 5 }, 0.1);
    expect(encounter.strike({ x: 7, z: 5 })).toBe(true);
    expect(encounter.getState()).toMatchObject({ slime: "attack", hp: 2, hitCount: 1, defeated: false });
    expect(onSlimeDeath).not.toHaveBeenCalled();

    expect(encounter.strike({ x: 7, z: 5 })).toBe(true);
    expect(encounter.getState()).toMatchObject({ hp: 1, hitCount: 2, defeated: false });

    expect(encounter.strike({ x: 7, z: 5 })).toBe(true);
    expect(encounter.getState().slime).toBe("dead");
    expect(encounter.getState()).toMatchObject({ hp: 0, hitCount: 3, maxHp: 3, defeated: true });
    expect(mesh.scale.y).toBeCloseTo(0.02);

    encounter.update({ x: 10, z: 5 }, 0.1);
    expect(encounter.getState().slime).toBe("dead");
    expect(encounter.strike({ x: 10, z: 5 })).toBe(false);
    expect(onSlimeHit).toHaveBeenCalledTimes(3);
    expect(onSlimeDeath).toHaveBeenCalledTimes(1);
  });

  it("does not strike from outside aggro range", () => {
    const onSlimeDeath = vi.fn();
    const encounter = createEncounterSystem(null, SNAPSHOT, { onSlimeDeath });

    expect(encounter.strike({ x: 0, z: 0 })).toBe(false);
    expect(encounter.getState().slime).toBe("patrol");
    expect(onSlimeDeath).not.toHaveBeenCalled();
  });

  it("reports disposed state without continuing updates", () => {
    const encounter = createEncounterSystem(null, SNAPSHOT);
    encounter.dispose();
    expect(encounter.update({ x: 10, z: 5 }, 0.1).disposed).toBe(true);
  });
});

describe("render3d encounter system — real-time combat", () => {
  it("registerHit lands one hit and fires death on the third", () => {
    const onSlimeDeath = vi.fn();
    const e = createEncounterSystem(null, SNAPSHOT, { onSlimeDeath, slimeMesh: fakeSlimeMesh() });
    expect(e.registerHit().defeated).toBe(false);
    expect(e.getState().hitCount).toBe(1);
    e.registerHit();
    const third = e.registerHit();
    expect(third.defeated).toBe(true);
    expect(third.slime).toBe("dead");
    expect(onSlimeDeath).toHaveBeenCalledTimes(1);
    e.registerHit(); // already dead → no-op
    expect(onSlimeDeath).toHaveBeenCalledTimes(1);
  });

  it("a lunge contact deals burst damage, negated by i-frames, lethal at zero", () => {
    const onPlayerDeath = vi.fn();
    let invuln = false;
    const e = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 20,
      lungeDamage: 14,
      canDamagePlayer: () => true,
      playerInvulnerable: () => invuln,
      onPlayerDeath,
      slimeMesh: fakeSlimeMesh(),
    });
    e.applyLungeContact(); // 20 - 14 → 6
    expect(e.getState().playerHp).toBe(6);
    invuln = true;
    e.applyLungeContact(); // i-frames negate it
    expect(e.getState().playerHp).toBe(6);
    invuln = false;
    e.applyLungeContact(); // 6 - 14 → 0 → death
    expect(e.getState().playerDefeated).toBe(true);
    expect(onPlayerDeath).toHaveBeenCalledTimes(1);
    e.applyLungeContact(); // already dead → not re-fired
    expect(onPlayerDeath).toHaveBeenCalledTimes(1);
  });

  it("a lunge does no damage when the fight isn't live (canDamagePlayer false)", () => {
    const onPlayerDeath = vi.fn();
    const e = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 40,
      lungeDamage: 14,
      canDamagePlayer: () => false,
      onPlayerDeath,
      slimeMesh: fakeSlimeMesh(),
    });
    e.applyLungeContact();
    expect(e.getState().playerHp).toBe(40);
    expect(onPlayerDeath).not.toHaveBeenCalled();
  });

  it("legacy proximity strike still lands and kills in three", () => {
    const onSlimeDeath = vi.fn();
    const e = createEncounterSystem(null, SNAPSHOT, { onSlimeDeath, slimeMesh: fakeSlimeMesh() });
    expect(e.strike({ x: 10, z: 5 })).toBe(true);
    e.strike({ x: 10, z: 5 });
    e.strike({ x: 10, z: 5 });
    expect(e.getState().slime).toBe("dead");
    expect(e.strike({ x: 10, z: 5 })).toBe(false); // dead → no hit
    expect(onSlimeDeath).toHaveBeenCalledTimes(1);
  });
});
