// IndexedDB-backed save persistence with backup rotation, integrity hashing,
// corruption detection, export/import, and one-time localStorage migration.
//
// The game payload schema (currently v3) is owned by saveMigration.js.
// This module owns the *storage envelope* (storageVersion 1) which wraps a payload
// with: { storageVersion, payloadVersion, savedAt, hash, payload }.
//
// Rule: do not mutate the payload here. We only ferry it to/from storage.

const DB_NAME = "westward";
const DB_VERSION = 1;
const SAVE_STORE = "saves";
const BACKUP_STORE = "backups";

export const DEFAULT_SLOT = "slot-1";
export const STORAGE_VERSION = 1;
export const MAX_BACKUPS_PER_SLOT = 3;

export const LEGACY_LOCAL_STORAGE_KEYS = [
  "westward-save-v3",
  "westward-save-v2",
  "westward-save-v1",
  "dustward-save-v1",
];

// FNV-1a 32-bit on a JSON serialization. Cheap, deterministic, and good enough
// to detect accidental corruption (single-byte flips, truncation, double writes).
// We only need accident detection, not adversarial integrity.
export function hashJson(value) {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function makeEnvelope(payload, now = Date.now()) {
  return {
    storageVersion: STORAGE_VERSION,
    payloadVersion: payload && typeof payload === "object" && Number.isFinite(payload.version)
      ? payload.version
      : null,
    savedAt: Number.isFinite(now) ? now : Date.now(),
    hash: hashJson(payload),
    payload,
  };
}

export function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object") {
    return { ok: false, reason: "missing" };
  }
  if (envelope.storageVersion !== STORAGE_VERSION) {
    return { ok: false, reason: "unknown-storage-version" };
  }
  if (!envelope.payload || typeof envelope.payload !== "object") {
    return { ok: false, reason: "missing-payload" };
  }
  if (typeof envelope.hash !== "string") {
    return { ok: false, reason: "missing-hash" };
  }
  const expected = hashJson(envelope.payload);
  if (envelope.hash !== expected) {
    return { ok: false, reason: "hash-mismatch" };
  }
  return { ok: true, payload: envelope.payload, savedAt: envelope.savedAt };
}

function reqAsync(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("idb request failed"));
  });
}

function txAsync(db, stores, mode, fn) {
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(stores, mode);
    } catch (err) {
      reject(err);
      return;
    }
    let result;
    let aborted = false;
    tx.onerror = () => {
      if (!aborted) reject(tx.error || new Error("idb transaction errored"));
    };
    tx.onabort = () => {
      aborted = true;
      reject(tx.error || new Error("idb transaction aborted"));
    };
    tx.oncomplete = () => resolve(result);
    Promise.resolve()
      .then(() => fn(tx))
      .then((value) => {
        result = value;
      })
      .catch((err) => {
        try {
          tx.abort();
        } catch {
          // ignore
        }
        if (!aborted) reject(err);
      });
  });
}

let cachedDbPromise = null;

function openDB() {
  if (cachedDbPromise) return cachedDbPromise;
  cachedDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable in this environment"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SAVE_STORE)) {
        db.createObjectStore(SAVE_STORE, { keyPath: "slot" });
      }
      if (!db.objectStoreNames.contains(BACKUP_STORE)) {
        const store = db.createObjectStore(BACKUP_STORE, { keyPath: ["slot", "savedAt"] });
        store.createIndex("by-slot", "slot");
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        try {
          db.close();
        } catch {
          // ignore
        }
        cachedDbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      cachedDbPromise = null;
      reject(req.error || new Error("IndexedDB open failed"));
    };
  });
  return cachedDbPromise;
}

// Test-only: drop the cached connection so a fresh openDB occurs.
export function __resetSavePersistenceForTests() {
  cachedDbPromise = null;
}

export async function writeSave(slot, payload) {
  const slotKey = slot || DEFAULT_SLOT;
  const db = await openDB();
  const envelope = makeEnvelope(payload);
  return txAsync(db, [SAVE_STORE, BACKUP_STORE], "readwrite", async (tx) => {
    const saves = tx.objectStore(SAVE_STORE);
    const backups = tx.objectStore(BACKUP_STORE);

    // 1. If a primary already exists for this slot, copy it to backups before overwriting.
    const current = await reqAsync(saves.get(slotKey));
    if (current && current.envelope) {
      // Ensure the backup key (slot, savedAt) is unique. If two saves landed in the
      // same millisecond, nudge the timestamp by 1 ms to avoid collision.
      let backupAt = current.envelope.savedAt;
      const existing = await reqAsync(backups.get([slotKey, backupAt]));
      if (existing) backupAt += 1;
      await reqAsync(
        backups.put({
          slot: slotKey,
          savedAt: backupAt,
          envelope: { ...current.envelope, savedAt: backupAt },
        }),
      );
    }

    // 2. Write the new primary.
    await reqAsync(saves.put({ slot: slotKey, envelope }));

    // 3. Prune backups for this slot to MAX_BACKUPS_PER_SLOT (newest first).
    const allBackups = await reqAsync(backups.index("by-slot").getAll(slotKey));
    if (allBackups.length > MAX_BACKUPS_PER_SLOT) {
      const sorted = allBackups
        .slice()
        .sort((a, b) => b.savedAt - a.savedAt);
      const toDelete = sorted.slice(MAX_BACKUPS_PER_SLOT);
      for (const entry of toDelete) {
        await reqAsync(backups.delete([slotKey, entry.savedAt]));
      }
    }
    return envelope;
  });
}

export async function readSave(slot) {
  const slotKey = slot || DEFAULT_SLOT;
  let db;
  try {
    db = await openDB();
  } catch (err) {
    return { ok: false, reason: "db-unavailable", error: err };
  }
  const record = await txAsync(db, [SAVE_STORE], "readonly", (tx) =>
    reqAsync(tx.objectStore(SAVE_STORE).get(slotKey)),
  );
  if (!record || !record.envelope) {
    return { ok: false, reason: "missing", slot: slotKey };
  }
  const validation = validateEnvelope(record.envelope);
  if (!validation.ok) {
    return { ...validation, slot: slotKey };
  }
  return {
    ok: true,
    payload: validation.payload,
    savedAt: validation.savedAt,
    slot: slotKey,
  };
}

export async function listBackups(slot) {
  const slotKey = slot || DEFAULT_SLOT;
  const db = await openDB();
  return txAsync(db, [BACKUP_STORE], "readonly", async (tx) => {
    const idx = tx.objectStore(BACKUP_STORE).index("by-slot");
    const all = await reqAsync(idx.getAll(slotKey));
    return all
      .map((r) => {
        const validation = validateEnvelope(r.envelope);
        return {
          slot: slotKey,
          savedAt: r.savedAt,
          payloadVersion: r.envelope?.payloadVersion ?? null,
          hash: r.envelope?.hash ?? null,
          valid: validation.ok,
        };
      })
      .sort((a, b) => b.savedAt - a.savedAt);
  });
}

export async function readBackup(slot, savedAt) {
  const slotKey = slot || DEFAULT_SLOT;
  const db = await openDB();
  const record = await txAsync(db, [BACKUP_STORE], "readonly", (tx) =>
    reqAsync(tx.objectStore(BACKUP_STORE).get([slotKey, savedAt])),
  );
  if (!record || !record.envelope) {
    return { ok: false, reason: "missing", slot: slotKey, savedAt };
  }
  const validation = validateEnvelope(record.envelope);
  if (!validation.ok) {
    return { ...validation, slot: slotKey, savedAt };
  }
  return {
    ok: true,
    payload: validation.payload,
    savedAt: validation.savedAt,
    slot: slotKey,
  };
}

export async function restoreFromBackup(slot, savedAt) {
  const slotKey = slot || DEFAULT_SLOT;
  const db = await openDB();
  return txAsync(db, [SAVE_STORE, BACKUP_STORE], "readwrite", async (tx) => {
    const backup = await reqAsync(
      tx.objectStore(BACKUP_STORE).get([slotKey, savedAt]),
    );
    if (!backup || !backup.envelope) {
      throw new Error(`backup not found for ${slotKey}@${savedAt}`);
    }
    const validation = validateEnvelope(backup.envelope);
    if (!validation.ok) {
      throw new Error(`backup corrupted: ${validation.reason}`);
    }
    await reqAsync(tx.objectStore(SAVE_STORE).put({ slot: slotKey, envelope: backup.envelope }));
    return validation.payload;
  });
}

// Drops both the primary and all backups for a slot.
export async function deleteSave(slot) {
  const slotKey = slot || DEFAULT_SLOT;
  const db = await openDB();
  return txAsync(db, [SAVE_STORE, BACKUP_STORE], "readwrite", async (tx) => {
    await reqAsync(tx.objectStore(SAVE_STORE).delete(slotKey));
    const idx = tx.objectStore(BACKUP_STORE).index("by-slot");
    const all = await reqAsync(idx.getAll(slotKey));
    for (const entry of all) {
      await reqAsync(tx.objectStore(BACKUP_STORE).delete([slotKey, entry.savedAt]));
    }
  });
}

// Export the current save (or a chosen backup) as a portable JSON blob.
export async function exportSaveBlob(slot, options = {}) {
  const slotKey = slot || DEFAULT_SLOT;
  const source = options.savedAt
    ? await readBackup(slotKey, options.savedAt)
    : await readSave(slotKey);
  if (!source.ok) {
    throw new Error(`no valid save to export for ${slotKey}: ${source.reason}`);
  }
  const file = {
    format: "westward-save",
    formatVersion: 1,
    exportedAt: Date.now(),
    slot: slotKey,
    envelope: makeEnvelope(source.payload, source.savedAt),
  };
  const json = JSON.stringify(file, null, 2);
  return new Blob([json], { type: "application/json" });
}

// For tests / non-Blob consumers.
export async function exportSaveJson(slot, options = {}) {
  const slotKey = slot || DEFAULT_SLOT;
  const source = options.savedAt
    ? await readBackup(slotKey, options.savedAt)
    : await readSave(slotKey);
  if (!source.ok) {
    throw new Error(`no valid save to export for ${slotKey}: ${source.reason}`);
  }
  return JSON.stringify(
    {
      format: "westward-save",
      formatVersion: 1,
      exportedAt: Date.now(),
      slot: slotKey,
      envelope: makeEnvelope(source.payload, source.savedAt),
    },
    null,
    2,
  );
}

export async function importSaveFromText(slot, text) {
  const slotKey = slot || DEFAULT_SLOT;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, reason: "json-invalid", error: err };
  }
  if (!parsed || parsed.format !== "westward-save") {
    return { ok: false, reason: "format-mismatch" };
  }
  const validation = validateEnvelope(parsed.envelope);
  if (!validation.ok) {
    return { ...validation, slot: slotKey };
  }
  await writeSave(slotKey, validation.payload);
  return { ok: true, payload: validation.payload, slot: slotKey };
}

// Drains any legacy save key out of localStorage and into IndexedDB.
// Idempotent: on second run there will be nothing to drain. Returns the
// payload that was migrated (or null if none) so the caller can also feed
// it through migrateSaveToV3 like the old read path did.
export async function migrateFromLocalStorage(slot) {
  const slotKey = slot || DEFAULT_SLOT;
  if (typeof globalThis === "undefined" || !globalThis.localStorage) return null;
  const store = globalThis.localStorage;
  for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
    let raw;
    try {
      raw = store.getItem(key);
    } catch {
      raw = null;
    }
    if (!raw) continue;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Bad legacy blob — skip; clearing happens below regardless.
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;
    try {
      await writeSave(slotKey, parsed);
    } catch (err) {
      // If IDB write fails, leave localStorage alone so the player still has data.
      return { ok: false, reason: "idb-write-failed", error: err };
    }
    // Successfully migrated — drain ALL legacy keys so future reads don't bounce back.
    for (const k of LEGACY_LOCAL_STORAGE_KEYS) {
      try {
        store.removeItem(k);
      } catch {
        // ignore
      }
    }
    return { ok: true, payload: parsed, fromKey: key, slot: slotKey };
  }
  return null;
}

// Helper for the corruption-recovery path: walks backups newest-first and
// returns the first valid one (or null). Caller decides whether to auto-restore.
export async function findMostRecentValidBackup(slot) {
  const slotKey = slot || DEFAULT_SLOT;
  const all = await listBackups(slotKey);
  for (const meta of all) {
    if (!meta.valid) continue;
    const result = await readBackup(slotKey, meta.savedAt);
    if (result.ok) return result;
  }
  return null;
}
