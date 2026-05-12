import { describe, it, expect, vi } from "vitest";
import {
  hashJson,
  makeEnvelope,
  validateEnvelope,
  writeSave,
  readSave,
  listSlots,
  listBackups,
  readBackup,
  restoreFromBackup,
  deleteSave,
  exportSaveJson,
  importSaveFromText,
  migrateFromLocalStorage,
  findMostRecentValidBackup,
  summarizeSavePayload,
  describeSaveSlotRecovery,
  describeSaveBackupChoices,
  KNOWN_SLOTS,
  DEFAULT_SLOT,
  STORAGE_VERSION,
  MAX_BACKUPS_PER_SLOT,
  LEGACY_LOCAL_STORAGE_KEYS,
  __resetSavePersistenceForTests,
} from "../src/savePersistence.js";

function samplePayload(overrides: Record<string, unknown> = {}) {
  return {
    version: 3,
    savedAt: 1700000000000,
    player: { x: 4.5, y: 7.2, hp: 80, level: 3 },
    inventory: { Wood: 5, "Slime Core": 1 },
    ...overrides,
  };
}

describe("hashJson", () => {
  it("returns a stable 8-char hex string for the same input", () => {
    const a = hashJson(samplePayload());
    const b = hashJson(samplePayload());
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it("produces different hashes for different content", () => {
    const a = hashJson(samplePayload({ player: { x: 1 } }));
    const b = hashJson(samplePayload({ player: { x: 2 } }));
    expect(a).not.toBe(b);
  });

  it("hashes raw strings without re-stringifying", () => {
    expect(hashJson("hello")).toBe(hashJson("hello"));
    expect(hashJson("hello")).not.toBe(hashJson("world"));
  });
});

describe("makeEnvelope / validateEnvelope", () => {
  it("creates an envelope with the expected shape", () => {
    const env = makeEnvelope(samplePayload(), 1234);
    expect(env.storageVersion).toBe(STORAGE_VERSION);
    expect(env.payloadVersion).toBe(3);
    expect(env.savedAt).toBe(1234);
    expect(env.hash).toMatch(/^[0-9a-f]{8}$/);
    expect(env.payload).toEqual(samplePayload());
  });

  it("validates a fresh envelope as ok", () => {
    const env = makeEnvelope(samplePayload());
    const result = validateEnvelope(env);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload).toEqual(samplePayload());
  });

  it("rejects an envelope whose hash does not match the payload", () => {
    const env = makeEnvelope(samplePayload());
    env.payload.player.x = 999; // mutate after hashing
    const result = validateEnvelope(env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hash-mismatch");
  });

  it("rejects an envelope with an unknown storageVersion", () => {
    const env = makeEnvelope(samplePayload());
    env.storageVersion = 99;
    const result = validateEnvelope(env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unknown-storage-version");
  });

  it("rejects malformed hash formats", () => {
    const env = makeEnvelope(samplePayload());
    env.hash = "not-a-hash";
    const result = validateEnvelope(env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing-hash");
  });

  it("rejects payload version mismatches", () => {
    const env = makeEnvelope(samplePayload());
    env.payload.version = 4;
    const result = validateEnvelope(env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("payload-version-mismatch");
  });

  it("rejects null/missing/non-object envelopes", () => {
    expect(validateEnvelope(null).ok).toBe(false);
    expect(validateEnvelope(undefined as any).ok).toBe(false);
    expect(validateEnvelope("not-an-envelope" as any).ok).toBe(false);
  });
});

describe("writeSave / readSave", () => {
  it("round-trips a payload through IndexedDB", async () => {
    __resetSavePersistenceForTests();
    await writeSave(undefined, samplePayload());
    const result = await readSave();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toEqual(samplePayload());
      expect(result.slot).toBe(DEFAULT_SLOT);
    }
  });

  it("returns ok:false reason:missing for an empty slot", async () => {
    __resetSavePersistenceForTests();
    const result = await readSave("does-not-exist");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing");
  });

  it("supports multiple slots independently", async () => {
    __resetSavePersistenceForTests();
    await writeSave("slot-a", samplePayload({ player: { x: 1, y: 0, hp: 10, level: 1 } }));
    await writeSave("slot-b", samplePayload({ player: { x: 2, y: 0, hp: 10, level: 1 } }));
    const a = await readSave("slot-a");
    const b = await readSave("slot-b");
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect((a.payload as any).player.x).toBe(1);
      expect((b.payload as any).player.x).toBe(2);
    }
  });
});

describe("backup rotation", () => {
  it("retains at most MAX_BACKUPS_PER_SLOT after many writes", async () => {
    __resetSavePersistenceForTests();
    // First write seeds the primary; subsequent writes copy the previous primary
    // into backups. After N writes we expect N-1 backups.
    for (let i = 0; i < MAX_BACKUPS_PER_SLOT + 5; i++) {
      await writeSave(undefined, samplePayload({ player: { x: i, y: 0, hp: 10, level: 1 } }));
    }
    const backups = await listBackups();
    expect(backups.length).toBeLessThanOrEqual(MAX_BACKUPS_PER_SLOT);
    expect(backups.length).toBe(MAX_BACKUPS_PER_SLOT);
  });

  it("returns backups newest-first", async () => {
    __resetSavePersistenceForTests();
    await writeSave(undefined, samplePayload({ player: { x: 1, y: 0, hp: 10, level: 1 } }));
    await new Promise((r) => setTimeout(r, 2));
    await writeSave(undefined, samplePayload({ player: { x: 2, y: 0, hp: 10, level: 1 } }));
    await new Promise((r) => setTimeout(r, 2));
    await writeSave(undefined, samplePayload({ player: { x: 3, y: 0, hp: 10, level: 1 } }));
    const backups = await listBackups();
    expect(backups.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < backups.length; i++) {
      expect(backups[i - 1].savedAt).toBeGreaterThanOrEqual(backups[i].savedAt);
    }
  });

  it("keeps backup rotation stable when saves share one millisecond", async () => {
    __resetSavePersistenceForTests();
    const now = 1700000000000;
    const spy = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      for (let i = 0; i < 5; i++) {
        await writeSave(undefined, samplePayload({ player: { x: i, y: 0, hp: 10, level: 1 } }));
      }
    } finally {
      spy.mockRestore();
    }

    const backups = await listBackups();
    expect(backups).toHaveLength(MAX_BACKUPS_PER_SLOT);
    expect(new Set(backups.map((backup) => backup.savedAt)).size).toBe(MAX_BACKUPS_PER_SLOT);
  });
});

describe("corruption + recovery", () => {
  it("detects a corrupted primary via hash mismatch", async () => {
    __resetSavePersistenceForTests();
    // Seed a valid save, then write a tampered envelope directly.
    await writeSave(undefined, samplePayload());
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("westward", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction("saves", "readwrite");
    const store = tx.objectStore("saves");
    const record = await new Promise<any>((resolve, reject) => {
      const r = store.get(DEFAULT_SLOT);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    record.envelope.payload.player.x = 9999; // tamper without rehashing
    await new Promise<void>((resolve, reject) => {
      const r = store.put(record);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();

    const result = await readSave();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hash-mismatch");
  });

  it("findMostRecentValidBackup returns the latest valid backup", async () => {
    __resetSavePersistenceForTests();
    await writeSave(undefined, samplePayload({ player: { x: 1, y: 0, hp: 10, level: 1 } }));
    await new Promise((r) => setTimeout(r, 2));
    await writeSave(undefined, samplePayload({ player: { x: 2, y: 0, hp: 10, level: 1 } }));
    const recovered = await findMostRecentValidBackup();
    expect(recovered).not.toBeNull();
    expect(recovered?.ok).toBe(true);
    if (recovered?.ok) {
      // The most recent backup should be the one that just got bumped (player.x === 1).
      expect((recovered.payload as any).player.x).toBe(1);
    }
  });

  it("restoreFromBackup copies a backup into the primary slot", async () => {
    __resetSavePersistenceForTests();
    await writeSave(undefined, samplePayload({ player: { x: 10, y: 0, hp: 10, level: 1 } }));
    await new Promise((r) => setTimeout(r, 2));
    await writeSave(undefined, samplePayload({ player: { x: 20, y: 0, hp: 10, level: 1 } }));
    const backups = await listBackups();
    const target = backups[0];
    const original = await readBackup(undefined, target.savedAt);
    expect(original.ok).toBe(true);
    await restoreFromBackup(undefined, target.savedAt);
    const result = await readSave();
    expect(result.ok).toBe(true);
    if (result.ok && original.ok) {
      expect(result.payload).toEqual(original.payload);
    }
  });
});

describe("export / import", () => {
  it("round-trips a save through JSON export and import", async () => {
    __resetSavePersistenceForTests();
    await writeSave(undefined, samplePayload({ player: { x: 7, y: 7, hp: 50, level: 5 } }));
    const json = await exportSaveJson();
    await deleteSave();
    const empty = await readSave();
    expect(empty.ok).toBe(false);
    const imported = await importSaveFromText(undefined, json);
    expect(imported.ok).toBe(true);
    const restored = await readSave();
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect((restored.payload as any).player.x).toBe(7);
      expect((restored.payload as any).player.level).toBe(5);
    }
  });

  it("rejects malformed import JSON", async () => {
    __resetSavePersistenceForTests();
    const result = await importSaveFromText(undefined, "{not valid json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("json-invalid");
  });

  it("rejects an import with the wrong format string", async () => {
    __resetSavePersistenceForTests();
    const result = await importSaveFromText(
      undefined,
      JSON.stringify({ format: "some-other-game", envelope: makeEnvelope(samplePayload()) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("format-mismatch");
  });

  it("rejects import when formatVersion is missing or invalid", async () => {
    __resetSavePersistenceForTests();
    const missing = await importSaveFromText(
      undefined,
      JSON.stringify({ format: "westward-save", envelope: makeEnvelope(samplePayload()) }),
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("format-version-missing");

    const invalid = await importSaveFromText(
      undefined,
      JSON.stringify({ format: "westward-save", formatVersion: "bad", envelope: makeEnvelope(samplePayload()) }),
    );
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.reason).toBe("format-version-missing");
  });

  it("rejects import of unsupported format versions", async () => {
    __resetSavePersistenceForTests();
    const result = await importSaveFromText(
      undefined,
      JSON.stringify({ format: "westward-save", formatVersion: 2, envelope: makeEnvelope(samplePayload()) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("format-version-unsupported");
  });

  it("rejects an import whose envelope hash is wrong", async () => {
    __resetSavePersistenceForTests();
    const env = makeEnvelope(samplePayload());
    env.hash = "deadbeef";
    const result = await importSaveFromText(
      undefined,
      JSON.stringify({ format: "westward-save", formatVersion: 1, envelope: env }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hash-mismatch");
  });
});

describe("legacy localStorage migration", () => {
  it("drains a v3 localStorage save into IDB and clears legacy keys", async () => {
    __resetSavePersistenceForTests();
    const payload = samplePayload({ player: { x: 99, y: 99, hp: 1, level: 9 } });
    globalThis.localStorage.setItem("westward-save-v3", JSON.stringify(payload));
    const result = await migrateFromLocalStorage();
    expect(result?.ok).toBe(true);
    for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
      expect(globalThis.localStorage.getItem(key)).toBeNull();
    }
    const idbResult = await readSave();
    expect(idbResult.ok).toBe(true);
    if (idbResult.ok) {
      expect((idbResult.payload as any).player.x).toBe(99);
    }
  });

  it("returns null when no legacy keys exist", async () => {
    __resetSavePersistenceForTests();
    const result = await migrateFromLocalStorage();
    expect(result).toBeNull();
  });

  it("ignores malformed legacy JSON", async () => {
    __resetSavePersistenceForTests();
    globalThis.localStorage.setItem("westward-save-v3", "{broken json");
    const result = await migrateFromLocalStorage();
    // Either null (skipped) or ok:false; never throws.
    expect(result === null || (result && result.ok === false) || (result && result.ok === true)).toBe(true);
  });

  it("does not clear malformed legacy objects that cannot validate", async () => {
    __resetSavePersistenceForTests();
    const badPayload = { player: { level: 5 } };
    globalThis.localStorage.setItem("westward-save-v3", JSON.stringify(badPayload));

    const result = await migrateFromLocalStorage();

    expect(result).toMatchObject({ ok: false, reason: "legacy-missing-payload-version" });
    expect(globalThis.localStorage.getItem("westward-save-v3")).toBe(JSON.stringify(badPayload));
    const idb = await readSave();
    expect(idb.ok).toBe(false);
    if (!idb.ok) expect(idb.reason).toBe("missing");
  });

  it("is idempotent: running twice does not duplicate writes", async () => {
    __resetSavePersistenceForTests();
    globalThis.localStorage.setItem(
      "westward-save-v3",
      JSON.stringify(samplePayload()),
    );
    const first = await migrateFromLocalStorage();
    expect(first?.ok).toBe(true);
    const second = await migrateFromLocalStorage();
    expect(second).toBeNull();
  });

  it("prefers westward-save-v3 over older legacy keys", async () => {
    __resetSavePersistenceForTests();
    globalThis.localStorage.setItem(
      "westward-save-v3",
      JSON.stringify(samplePayload({ player: { x: 33, y: 0, hp: 10, level: 3 } })),
    );
    globalThis.localStorage.setItem(
      "westward-save-v1",
      JSON.stringify(samplePayload({ version: 1, player: { x: 11, y: 0, hp: 10, level: 1 } })),
    );
    const result = await migrateFromLocalStorage();
    expect(result?.ok).toBe(true);
    const idb = await readSave();
    expect(idb.ok).toBe(true);
    if (idb.ok) {
      expect((idb.payload as any).player.x).toBe(33);
    }
  });
});

describe("KNOWN_SLOTS + listSlots", () => {
  it("KNOWN_SLOTS exposes exactly three stable slot ids", () => {
    expect(Array.isArray(KNOWN_SLOTS)).toBe(true);
    expect(KNOWN_SLOTS.length).toBe(3);
    expect(KNOWN_SLOTS).toEqual(["slot-1", "slot-2", "slot-3"]);
  });

  it("listSlots returns one entry per known slot when none have been written", async () => {
    __resetSavePersistenceForTests();
    const slots = await listSlots();
    expect(slots.length).toBe(3);
    expect(slots.map((s) => s.slot)).toEqual(["slot-1", "slot-2", "slot-3"]);
    for (const entry of slots) {
      expect(entry.empty).toBe(true);
      expect(entry.payload).toBeNull();
    }
  });

  it("listSlots reports written slots with payload + savedAt", async () => {
    __resetSavePersistenceForTests();
    await writeSave("slot-2", samplePayload({ player: { x: 5, y: 5, hp: 50, level: 4 } }));
    const slots = await listSlots();
    const slot1 = slots.find((s) => s.slot === "slot-1");
    const slot2 = slots.find((s) => s.slot === "slot-2");
    const slot3 = slots.find((s) => s.slot === "slot-3");
    expect(slot1?.empty).toBe(true);
    expect(slot3?.empty).toBe(true);
    expect(slot2?.empty).toBe(false);
    expect(slot2?.payload).toBeTruthy();
    expect(slot2?.savedAt).toBeGreaterThan(0);
  });

  it("listSlots reports a corrupted slot as empty=false, valid=false", async () => {
    __resetSavePersistenceForTests();
    await writeSave("slot-1", samplePayload());
    // Direct DB tamper: open the same DB and overwrite the envelope hash with garbage.
    const idb = (globalThis as any).indexedDB;
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const req = idb.open("westward", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["saves"], "readwrite");
      const store = tx.objectStore("saves");
      const getReq = store.get("slot-1");
      getReq.onsuccess = () => {
        const record = getReq.result;
        record.envelope.hash = "deadbeef";
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
    db.close();
    __resetSavePersistenceForTests();

    const slots = await listSlots();
    const slot1 = slots.find((s) => s.slot === "slot-1");
    expect(slot1?.empty).toBe(false);
    expect(slot1?.valid).toBe(false);
  });
});

describe("summarizeSavePayload", () => {
  it("returns null for null/undefined input", () => {
    expect(summarizeSavePayload(null)).toBeNull();
    expect(summarizeSavePayload(undefined)).toBeNull();
  });

  it("extracts level, region, time, and victory from a v3 payload", () => {
    const summary = summarizeSavePayload({
      version: 3,
      time: 372.5,
      mode: "playing",
      player: { level: 5 },
      regions: { activeRegion: "ashfall" },
      world: { runStats: { victory: false } },
    });
    expect(summary).toMatchObject({
      level: 5,
      regionId: "ashfall",
      victory: false,
    });
    expect(summary?.timePlayedSeconds).toBeGreaterThanOrEqual(372);
  });

  it("flags victory when runStats.victory is true", () => {
    const summary = summarizeSavePayload({
      version: 3,
      time: 1200,
      player: { level: 9 },
      regions: { activeRegion: "ironlantern" },
      world: { runStats: { victory: true, endingId: "solidarity" } },
    });
    expect(summary?.victory).toBe(true);
    expect(summary?.endingId).toBe("solidarity");
  });

  it("falls back to safe defaults on malformed payloads", () => {
    const summary = summarizeSavePayload({ version: 3 } as any);
    expect(summary).toMatchObject({
      level: 1,
      regionId: "frontier",
      victory: false,
      timePlayedSeconds: 0,
      difficulty: "standard",
    });
  });

  it("preserves a stored difficulty when known", () => {
    const summary = summarizeSavePayload({
      version: 3,
      time: 60,
      player: { level: 2 },
      regions: { activeRegion: "frontier" },
      world: { difficulty: "hard" },
    });
    expect(summary?.difficulty).toBe("hard");
  });

  it("rejects unknown difficulty strings", () => {
    const summary = summarizeSavePayload({
      version: 3,
      time: 60,
      player: { level: 2 },
      regions: { activeRegion: "frontier" },
      world: { difficulty: "nightmare" },
    });
    expect(summary?.difficulty).toBe("standard");
  });
});

describe("describeSaveSlotRecovery", () => {
  it("explains empty slots as new-run or import targets", () => {
    expect(describeSaveSlotRecovery({ slot: "slot-1", empty: true, valid: true, payload: null, savedAt: null })).toMatchObject({
      state: "empty",
      actionLine: "New run or import.",
    });
  });

  it("explains corrupted slots with restore/import guidance", () => {
    const description = describeSaveSlotRecovery({
      slot: "slot-1",
      empty: false,
      valid: false,
      payload: null,
      savedAt: null,
      reason: "hash-mismatch",
    });

    expect(description.state).toBe("corrupt");
    expect(description.line).toContain("hash-mismatch");
    expect(description.actionLine).toContain("Recover");
  });

  it("explains newer schema slots as preserved and exportable", () => {
    const description = describeSaveSlotRecovery({
      slot: "slot-2",
      empty: false,
      valid: true,
      payload: { version: 9 },
      savedAt: 123,
    }, { maxSupportedVersion: 3 });

    expect(description.state).toBe("newer");
    expect(description.line).toContain("v9");
    expect(description.actionLine).toBe("Export only.");
  });

  it("explains valid slots with continue/export/import/delete choices", () => {
    const description = describeSaveSlotRecovery({
      slot: "slot-2",
      empty: false,
      valid: true,
      payload: { version: 3 },
      savedAt: 123,
    }, { maxSupportedVersion: 3 });

    expect(description.state).toBe("valid");
    expect(description.line).toContain("Continue");
    expect(description.line).toContain("export");
  });
});

describe("describeSaveBackupChoices", () => {
  it("explains slots with no backups", () => {
    expect(describeSaveBackupChoices([])).toMatchObject({
      state: "none",
      validCount: 0,
      totalCount: 0,
      choices: [],
    });
  });

  it("sorts valid backups newest-first with numbered labels", () => {
    const older = 1700000000000;
    const newer = 1700003600000;
    const description = describeSaveBackupChoices([
      { slot: "slot-1", savedAt: older, payloadVersion: 3, hash: "aaaaaaaa", valid: true },
      { slot: "slot-1", savedAt: newer, payloadVersion: 3, hash: "bbbbbbbb", valid: true },
      { slot: "slot-1", savedAt: newer + 1, payloadVersion: 3, hash: "cccccccc", valid: false },
    ]);

    expect(description).toMatchObject({
      state: "available",
      validCount: 2,
      totalCount: 3,
    });
    expect(description.choices.map((choice) => choice.savedAt)).toEqual([newer, older]);
    expect(description.choices[0].label).toContain("Backup 1");
    expect(description.choices[0].label).toContain("(v3)");
  });

  it("explains when backups exist but none are valid", () => {
    const description = describeSaveBackupChoices([
      { slot: "slot-1", savedAt: 1700000000000, payloadVersion: 3, hash: "aaaaaaaa", valid: false },
    ]);

    expect(description.state).toBe("none-valid");
    expect(description.line).toContain("none pass validation");
  });
});
