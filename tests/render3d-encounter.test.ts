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

describe("render3d encounter system — player death (ironman stakes)", () => {
  it("deals contact damage at point-blank (attack) range", () => {
    const encounter = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 40,
      playerDamagePerSecond: 10,
    });
    // Player standing on the slime → attack range.
    const state = encounter.update({ x: 10, z: 5 }, 0.5);
    expect(state.slime).toBe("attack");
    expect(encounter.getState().playerHp).toBeCloseTo(35); // 40 - 10*0.5
    expect(encounter.getState().playerMaxHp).toBe(40);
  });

  it("also chips the player across the engaged (aggro) range, not just point-blank", () => {
    const encounter = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 40,
      playerDamagePerSecond: 10,
    });
    // Player at distance 3 from the slime: inside aggro (4) but outside attack (1.5).
    const state = encounter.update({ x: 7, z: 5 }, 0.5);
    expect(state.slime).toBe("aggro");
    expect(encounter.getState().playerHp).toBeCloseTo(35); // engaged → still taking damage
  });

  it("respects canDamagePlayer gate (no damage when the fight isn't live)", () => {
    const onPlayerDeath = vi.fn();
    const encounter = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 40,
      playerDamagePerSecond: 100,
      canDamagePlayer: () => false,
      onPlayerDeath,
    });
    encounter.update({ x: 10, z: 5 }, 1.0); // in attack range but gate is closed
    expect(encounter.getState().playerHp).toBe(40);
    expect(onPlayerDeath).not.toHaveBeenCalled();
  });

  it("does no damage out of range / before engagement", () => {
    const onPlayerDeath = vi.fn();
    const encounter = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 40,
      playerDamagePerSecond: 100,
      onPlayerDeath,
    });
    encounter.update({ x: 0, z: 0 }, 1.0); // far → patrol
    expect(encounter.getState().playerHp).toBe(40);
    expect(onPlayerDeath).not.toHaveBeenCalled();
  });

  it("respects the canDamagePlayer gate (closed → no damage even in range)", () => {
    const onPlayerDeath = vi.fn();
    const encounter = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 40,
      playerDamagePerSecond: 100,
      canDamagePlayer: () => false, // e.g. not the slime-fight phase yet
      onPlayerDeath,
    });
    encounter.update({ x: 10, z: 5 }, 0.5); // in range, but the gate is closed
    expect(encounter.getState().playerHp).toBe(40);
    expect(onPlayerDeath).not.toHaveBeenCalled();
  });

  it("fires onPlayerDeath exactly once when playerHp hits zero", () => {
    const onPlayerDeath = vi.fn();
    const encounter = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 10,
      playerDamagePerSecond: 100,
      onPlayerDeath,
    });
    encounter.update({ x: 10, z: 5 }, 0.2); // 20 dmg → 0
    expect(encounter.getState().playerHp).toBe(0);
    expect(encounter.getState().playerDefeated).toBe(true);
    expect(onPlayerDeath).toHaveBeenCalledTimes(1);

    encounter.update({ x: 10, z: 5 }, 0.2); // still standing in it
    expect(onPlayerDeath).toHaveBeenCalledTimes(1); // not re-fired
  });

  it("stops the bleed once the slime is defeated (loop stays winnable)", () => {
    const onPlayerDeath = vi.fn();
    const mesh = fakeSlimeMesh();
    const encounter = createEncounterSystem(null, SNAPSHOT, {
      initialPlayerHp: 40,
      playerDamagePerSecond: 10,
      onPlayerDeath,
      slimeMesh: mesh,
    });
    encounter.update({ x: 10, z: 5 }, 0.1); // engage + 1 dmg → 39
    encounter.strike({ x: 10, z: 5 });
    encounter.strike({ x: 10, z: 5 });
    encounter.strike({ x: 10, z: 5 }); // slime dead
    expect(encounter.getState().slime).toBe("dead");

    encounter.update({ x: 10, z: 5 }, 5.0); // dead slime can't deal damage
    expect(encounter.getState().playerHp).toBeCloseTo(39);
    expect(onPlayerDeath).not.toHaveBeenCalled();
  });
});
