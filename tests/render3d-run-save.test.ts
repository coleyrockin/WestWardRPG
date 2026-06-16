import { describe, it, expect, vi, afterEach } from "vitest";

// Mock savePersistence so the failure-mode suite can force readSave to hang (timeout)
// or reject (thrown read). Everything else delegates to the REAL implementation, so the
// round-trip / seal suites below still exercise real fake-indexeddb writes + reads.
// `readSaveMock` defaults to passthrough; a test sets `.mockImplementationOnce(...)` to
// override a single load.
const { readSaveMock } = vi.hoisted(() => ({ readSaveMock: vi.fn() }));
vi.mock("../src/savePersistence.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/savePersistence.js")>();
  readSaveMock.mockImplementation((slot?: string) => actual.readSave(slot));
  return { ...actual, readSave: readSaveMock };
});

import {
  RUN_SLOT,
  RUN_SCHEMA,
  RUN_VERSION,
  LOAD_TIMEOUT_MS,
  buildRunPayload,
  migrateRunPayload,
  loadRun,
  writeRun,
  sealRun,
  overlayLiveEncounterState,
} from "../src/render3d/runSave.js";
import { readSave } from "../src/savePersistence.js";
import { createLoopStateMachine } from "../src/render3d/phaseState.js";
import { createEncounterSystem } from "../src/render3d/encounterSystem.js";
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

describe("mid-fight slime resume round-trip (BUG B — the real save path, not just the unit seed)", () => {
  const SLIME = { kind: "roadSlime", label: "Road Slime", x: 10, y: 5, size: 1 };
  const SNAPSHOT = { worldObjects: [SLIME] };
  function fakeSlimeMesh() {
    return { position: { x: 10, y: 0, z: 5 }, scale: { y: 1 }, material: { emissiveIntensity: 1 }, userData: {} };
  }

  it("overlays BOTH live playerHp AND slimeHits onto the persisted encounterState", () => {
    // The save bug: currentRunPayload overlaid only playerHp, leaving slimeHits at the
    // phase-FSM value (0 mid-fight) — so resume re-fought a slime the ledger had credited.
    // The phase snapshot's encounterState has slimeHits:0 mid-fight; the live encounter
    // is the source of truth for landed strikes (it exposes `hits`).
    const live = { playerHp: 24, hits: 2 };
    const snapEncounterState = { slime: "aggro", slimeHp: 3, slimeHits: 0, slimeDefeated: false, playerHp: 40 };
    const overlaid = overlayLiveEncounterState(snapEncounterState, live);
    expect(overlaid.playerHp).toBe(24);
    expect(overlaid.slimeHits).toBe(2);
    // Non-overlaid fields survive; the source object is not mutated.
    expect(overlaid.slime).toBe("aggro");
    expect(snapEncounterState.slimeHits).toBe(0);
  });

  it("ignores a non-finite/absent live encounter (no live fight → snapshot wins)", () => {
    const snap = { slime: "idle", slimeHp: 3, slimeHits: 0, slimeDefeated: false, playerHp: 40 };
    expect(overlayLiveEncounterState(snap, null)).toEqual(snap);
    expect(overlayLiveEncounterState(snap, {})).toEqual(snap);
  });

  it("resumes the slime at 1 HP after a real 2-hit mid-fight quit is round-tripped through the save", async () => {
    // Drive a REAL encounter through two landed strikes (the state the save must capture),
    // overlay the live encounter onto the phase snapshot exactly as currentRunPayload does,
    // persist + load, then re-seed a fresh encounter from the loaded slimeHits — the resume path.
    const fight = createEncounterSystem(null, SNAPSHOT, { initialPlayerHp: 24, maxPlayerHp: 40, slimeMesh: fakeSlimeMesh() });
    fight.registerHit();
    fight.registerHit();
    const liveState = fight.getState();
    expect(liveState.hits).toBe(2);
    expect(liveState.hp).toBe(1);

    // The phase FSM only ever writes slimeHits 0 (appeared) or 3 (defeated): mid-fight it is 0.
    const machine = createLoopStateMachine();
    const snapEncounterState = machine.state.encounterState;
    expect(snapEncounterState.slimeHits).toBe(0); // proves the snapshot alone loses the strikes

    const payload = buildRunPayload({
      mode: "playing",
      seed: 7,
      time: 12,
      player: { x: 9, z: 4, yaw: 0 },
      loopState: { ...machine.state, phase: "slime_fight", encounterState: overlayLiveEncounterState(snapEncounterState, liveState) },
      world: { dayTime: 0.3, weatherKind: "clear" },
    }, 1700000000000);

    await writeRun(payload);
    const loaded = await loadRun();
    expect(loaded?.loopState.encounterState.slimeHits).toBe(2);
    expect(loaded?.loopState.encounterState.playerHp).toBe(24);

    // Resume: spike feeds the persisted slimeHits into initialSlimeHits.
    const resumed = createEncounterSystem(null, SNAPSHOT, {
      initialSlimeHits: loaded?.loopState.encounterState.slimeHits ?? 0,
      initialPlayerHp: loaded?.loopState.encounterState.playerHp ?? 40,
      slimeMesh: fakeSlimeMesh(),
    });
    const st = resumed.getState();
    expect(st.hp).toBe(1); // NOT a re-fight from full 3
    expect(st.hitCount).toBe(2);
    expect(st.playerHp).toBe(24);
    expect(st.playerMaxHp).toBe(40);
    // One clean strike finishes it — the ledger already credited the other two.
    expect(resumed.registerHit().hp).toBe(0);
  });
});

describe("loadRun failure modes (a slow/failed read must NOT masquerade as empty)", () => {
  afterEach(() => {
    vi.useRealTimers();
    // Restore passthrough so later runs of the suite (and round-trip tests) are clean.
    vi.mocked(readSaveMock).mockReset();
    vi.mocked(readSaveMock).mockImplementation(async (slot?: string) => {
      const actual = await vi.importActual<typeof import("../src/savePersistence.js")>(
        "../src/savePersistence.js",
      );
      return actual.readSave(slot);
    });
  });

  it("uses the raised 8000ms timeout, not the dangerous 1000ms", () => {
    expect(LOAD_TIMEOUT_MS).toBe(8000);
    expect(LOAD_TIMEOUT_MS).not.toBe(1000);
  });

  it("still resolves to null when the slot is genuinely empty (start-fresh path)", async () => {
    // Clean !ok read = no save. Must remain a null (boot a fresh run normally).
    readSaveMock.mockImplementationOnce(async () => ({ ok: false }));
    expect(await loadRun()).toBeNull();
  });

  it("still resolves to null for an unmigratable (corrupt-but-safe) payload", async () => {
    // ok read whose payload isn't a frontier-run → migrateRunPayload returns null →
    // safe to start fresh. (Distinct from a FAILED read, which must reject.)
    readSaveMock.mockImplementationOnce(async () => ({
      ok: true,
      payload: { schema: "some-other-schema", version: 1 },
    }));
    expect(await loadRun()).toBeNull();
  });

  it("REJECTS (not silent null) when readSave throws — a real save may exist unread", async () => {
    // The danger: a transient IndexedDB read error must be DISTINGUISHABLE from empty,
    // so the caller can suppress overwriting an existing-but-unread save.
    readSaveMock.mockImplementationOnce(async () => {
      throw new Error("IndexedDB read blew up");
    });
    await expect(loadRun()).rejects.toThrow(/IndexedDB read blew up/);
  });

  it("REJECTS (not silent null) when the read times out — slow device, save still present", async () => {
    vi.useFakeTimers();
    // A read that never settles: the 8000ms timeout must fire and REJECT, not resolve null.
    readSaveMock.mockImplementationOnce(() => new Promise(() => {}));
    const pending = loadRun();
    const assertion = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS + 1);
    await assertion;
  });
});
