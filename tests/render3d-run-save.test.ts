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
import { createLoopStateMachine } from "../src/render3d/phaseState.js";
import { GRAVESIDE_SPAWN } from "../src/render3d/frontierLayout.js";

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
      objectiveText: "Hear the warning before leaving Westward's lamp line.",
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

  it("persists region/POI discovery, defaulting to [] for saves without it", () => {
    const withDiscovery = buildRunPayload(
      sampleCtx({ world: { dayTime: 0.5, weatherKind: "clear", poisDiscovered: ["frontier_broken_wagon", "smoke_cache"] } }),
      1700000000000,
    );
    expect(withDiscovery.world.poisDiscovered).toEqual(["frontier_broken_wagon", "smoke_cache"]);
    // backward-compatible: a context without the field still produces a []
    const bare = buildRunPayload(sampleCtx(), 1700000000000);
    expect(bare.world.poisDiscovered).toEqual([]);
  });

  it("carries seed + inputLogTail forward for staged determinism", () => {
    const p = buildRunPayload(sampleCtx({ seed: 999, inputLogTail: [{ t: 1 }] }), 1700000000000);
    expect(p.seed).toBe(999);
    expect(p.inputLogTail).toEqual([{ t: 1 }]);
  });
});

describe("migrateRunPayload", () => {
  it("is identity for a current (v3) payload", () => {
    const p = buildRunPayload(sampleCtx(), 1700000000000);
    expect(p.version).toBe(RUN_VERSION);
    expect(migrateRunPayload(p)).toBe(p);
  });

  it("backfills a v1 payload to v3 with game:null, keeping position + progress", () => {
    const v1 = { ...buildRunPayload(sampleCtx(), 1700000000000), version: 1 };
    delete (v1 as Record<string, unknown>).game;
    const migrated = migrateRunPayload(v1);
    expect(migrated?.version).toBe(RUN_VERSION);
    expect(migrated?.game).toBeNull();
    expect(migrated?.loopState.phase).toBe(v1.loopState.phase); // run progress kept
    expect(migrated?.player).toEqual(v1.player); // non-funeral phase → position kept
  });

  it("v2 → v3 resets a stale funeral position to the graveside, keeps other phases", () => {
    // A v2 save taken during the funeral cold-open stored a position at the OLD
    // graveside (the "clogged closet"). v3 relocated the grave, so the migration must
    // snap funeral/implant positions back to GRAVESIDE_SPAWN — and leave everything else.
    const funeralV2 = {
      ...buildRunPayload(
        sampleCtx({
          player: { x: 21.5, z: -4, yaw: Math.PI / 2 },
          loopState: { ...sampleCtx().loopState, phase: "funeral" },
        }),
        1700000000000,
      ),
      version: 2,
    };
    const migrated = migrateRunPayload(funeralV2);
    expect(migrated?.version).toBe(RUN_VERSION);
    expect(migrated?.player).toEqual({ x: GRAVESIDE_SPAWN.x, z: GRAVESIDE_SPAWN.z, yaw: GRAVESIDE_SPAWN.yaw });

    // A non-funeral v2 save keeps its position through the same version bump.
    const roadV2 = { ...buildRunPayload(sampleCtx(), 1700000000000), version: 2 };
    const roadMigrated = migrateRunPayload(roadV2);
    expect(roadMigrated?.version).toBe(RUN_VERSION);
    expect(roadMigrated?.player).toEqual(roadV2.player);
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

describe("new-run payload carries the funeral mission (regression: startNewRun)", () => {
  it("a fresh run built like startNewRun resumes at the funeral cold-open, not spawn", () => {
    // startNewRun (spike.js) seeds loopState from createLoopStateMachine({ activeMission })
    // and writes the run; the page then reloads and boot feeds the saved loopState back
    // through createLoopStateMachine (the resume path). Without activeMission, that path
    // defaults phase to "spawn" and the funeral cold-open is skipped.
    const fresh = buildRunPayload(
      {
        mode: "playing",
        seed: 1,
        time: 0,
        player: { x: GRAVESIDE_SPAWN.x, z: GRAVESIDE_SPAWN.z, yaw: GRAVESIDE_SPAWN.yaw },
        loopState: createLoopStateMachine({ activeMission: "dust_to_dust" }).state,
        world: { dayTime: 0.25, weatherKind: "clear" },
      },
      1700000000000,
    );
    expect(fresh.loopState.activeMission).toBe("dust_to_dust");
    expect(fresh.loopState.phase).toBe("funeral");
    // The resume path must reconstruct the funeral phase, not fall back to "spawn".
    // (Cast mirrors the runtime boundary: boot feeds the persisted RunLoopState — a
    // string-phase snapshot — straight back into createLoopStateMachine.)
    const resumed = createLoopStateMachine(fresh.loopState as any).state;
    expect(resumed.activeMission).toBe("dust_to_dust");
    expect(resumed.phase).toBe("funeral");
  });
});
