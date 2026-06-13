import { describe, it, expect } from "vitest";
import {
  RUN_SLOT,
  RUN_SCHEMA,
  RUN_VERSION,
  buildRunPayload,
  migrateRunPayload,
  loadRun,
  writeRun,
  sealRun,
} from "../src/render3d/runSave.js";
import { readSave } from "../src/savePersistence.js";

function sampleCtx(overrides: Record<string, any> = {}) {
  return {
    mode: "playing",
    seed: 12345,
    time: 42,
    player: { x: 3.5, z: -8.1, yaw: 1.2 },
    loopState: {
      phase: "road_walk",
      boardChoice: "accept_bounty",
      routeBeats: { boardChoice: true, roadSign: true },
      inventoryPreview: { "Map Scrap": 1 },
      completedInteractions: ["board_choice_accept_bounty", "marshal_road_sign_read"],
      encounterState: { slime: "idle", slimeHp: 3, slimeHits: 0, slimeDefeated: false, playerHp: 28 },
      // view-layer fields that must be stripped on persist:
      activePrompt: "E — Hear Pearl's Warning",
      objectiveText: "Hear the warning before leaving Dustward's lamp line.",
    },
    world: { dayTime: 0.333, weatherKind: "clear" },
    ...overrides,
  };
}

describe("buildRunPayload", () => {
  it("produces a versioned frontier-run payload with safe defaults", () => {
    const p = buildRunPayload({}, 1700000000000);
    expect(p.schema).toBe(RUN_SCHEMA);
    expect(p.version).toBe(RUN_VERSION);
    expect(p.mode).toBe("playing");
    expect(p.runRules).toEqual({ permadeath: true, saveScummable: false });
    expect(p.player).toEqual({ x: 0, z: 0, yaw: 0 });
    expect(p.loopState.phase).toBe("spawn");
    expect(p.savedAt).toBe(1700000000000);
  });

  it("strips view-layer fields from the loopState snapshot", () => {
    const p = buildRunPayload(sampleCtx(), 1700000000000);
    expect(p.loopState).toEqual({
      phase: "road_walk",
      activeMission: null,
      boardChoice: "accept_bounty",
      routeBeats: { boardChoice: true, roadSign: true },
      inventoryPreview: { "Map Scrap": 1 },
      completedInteractions: ["board_choice_accept_bounty", "marshal_road_sign_read"],
      encounterState: { slime: "idle", slimeHp: 3, slimeHits: 0, slimeDefeated: false, playerHp: 28 },
    });
    expect(p.loopState).not.toHaveProperty("activePrompt");
    expect(p.loopState).not.toHaveProperty("objectiveText");
  });

  it("carries seed + inputLogTail forward for staged determinism", () => {
    const p = buildRunPayload(sampleCtx({ seed: 999, inputLogTail: [{ t: 1 }] }), 1700000000000);
    expect(p.seed).toBe(999);
    expect(p.inputLogTail).toEqual([{ t: 1 }]);
  });
});

describe("migrateRunPayload", () => {
  it("is identity for a current v2 payload", () => {
    const p = buildRunPayload(sampleCtx(), 1700000000000);
    expect(p.version).toBe(RUN_VERSION);
    expect(migrateRunPayload(p)).toBe(p);
  });

  it("backfills a v1 payload to v2 with game:null (loader builds + reconciles)", () => {
    const v1 = { ...buildRunPayload(sampleCtx(), 1700000000000), version: 1 };
    delete (v1 as Record<string, unknown>).game;
    const migrated = migrateRunPayload(v1);
    expect(migrated?.version).toBe(RUN_VERSION);
    expect(migrated?.game).toBeNull();
    expect(migrated?.loopState.phase).toBe(v1.loopState.phase); // run progress kept
  });

  it("rejects non-frontier-run / malformed / future payloads", () => {
    expect(migrateRunPayload(null)).toBeNull();
    expect(migrateRunPayload({ schema: "westward-render-snapshot", version: 1 })).toBeNull();
    expect(migrateRunPayload([])).toBeNull();
    expect(migrateRunPayload({ schema: RUN_SCHEMA, version: RUN_VERSION + 1 })).toBeNull();
  });

  it("carries the game slice through buildRunPayload verbatim", () => {
    const game = { player: { level: 2, gold: 50 }, inventory: { Potion: 1 } };
    const p = buildRunPayload(sampleCtx({ game }), 1700000000000);
    expect(p.game).toEqual(game);
    const bare = buildRunPayload(sampleCtx(), 1700000000000);
    expect(bare.game).toBeNull();
  });
});

describe("writeRun / loadRun round-trip", () => {
  it("round-trips a playing run through the frontier-ironman slot", async () => {
    const p = buildRunPayload(sampleCtx(), 1700000000000);
    await writeRun(p);
    const loaded = await loadRun();
    expect(loaded).toEqual(p);
    expect(loaded?.mode).toBe("playing");
    expect(loaded?.loopState.phase).toBe("road_walk");
    expect(loaded?.player).toEqual({ x: 3.5, z: -8.1, yaw: 1.2 });
    expect(loaded?.world.dayTime).toBeCloseTo(0.333);
  });

  it("writes to the dedicated slot, not the Canvas default slot", async () => {
    await writeRun(buildRunPayload(sampleCtx(), 1700000000000));
    const onSlot = await readSave(RUN_SLOT);
    const onDefault = await readSave("slot-1");
    expect(onSlot.ok).toBe(true);
    expect(onDefault.ok).toBe(false); // Canvas slot untouched
  });

  it("returns null when no run is saved", async () => {
    expect(await loadRun()).toBeNull();
  });
});

describe("sealRun (death = sealed, not deleted)", () => {
  it("flips mode to sealed and stamps runStats without deleting the slot", async () => {
    const playing = buildRunPayload(sampleCtx({ loopState: { ...sampleCtx().loopState, phase: "slime_fight" } }), 1700000000000);
    await writeRun(playing);

    const sealed = await sealRun(playing, "slain by the roadside slime", 1700000050000);
    expect(sealed.mode).toBe("sealed");
    expect(sealed.runStats.cause).toBe("slain by the roadside slime");
    expect(sealed.runStats.endedAt).toBe(1700000050000);
    expect(sealed.runStats.victory).toBe(false);
    expect(sealed.runStats.phaseReached).toBe("slime_fight");

    // Persisted to the SAME slot, readable, still a valid frontier-run.
    const loaded = await loadRun();
    expect(loaded?.mode).toBe("sealed");
    expect(loaded?.runStats.cause).toBe("slain by the roadside slime");
    expect(loaded?.schema).toBe(RUN_SCHEMA);
  });
});
