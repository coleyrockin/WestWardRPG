// IndexedDB-backed save persistence with backup rotation, integrity hashing,
// corruption detection, export/import, and one-time localStorage migration.
//
// The game payload schema (currently v3) is owned by each run's own save module
// (e.g. render3d/runSave.js). This module owns the *storage envelope*
// (storageVersion 1) which wraps a payload
// with: { storageVersion, payloadVersion, savedAt, hash, payload }.
//
// Rule: do not mutate the payload here. We only ferry it to/from storage.

const DB_NAME = "westward";
const DB_VERSION = 1;
const SAVE_STORE = "saves";
const BACKUP_STORE = "backups";
const SAVE_FORMAT_VERSION = 1;
const HASH_RE = /^[0-9a-f]{8}$/;

export const DEFAULT_SLOT = "slot-1";
export const KNOWN_SLOTS = ["slot-1", "slot-2", "slot-3"];
export const STORAGE_VERSION = 1;
export const MAX_BACKUPS_PER_SLOT = 3;

// Detect IndexedDB / Storage quota errors across browsers. Chrome/Edge raise
// DOMException name "QuotaExceededError"; older Firefox used
// "NS_ERROR_DOM_QUOTA_REACHED"; the legacy DOMException code is 22.
export function isQuotaError(err) {
  if (!err) return false;
  if (err.code === "quota-exceeded" || err.code === "quota-exceeded-after-recovery") return true;
  if (err.name === "QuotaExceededError") return true;
  if (err.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  if (err.code === 22) return true;
  if (typeof err.message === "string" && /quota/i.test(err.message)) return true;
  // Bubble up through wrapping
  if (err.cause && err.cause !== err) return isQuotaError(err.cause);
  return false;
}

export const LEGACY_LOCAL_STORAGE_KEYS = [
  "westward-save-v3",
  "westward-save-v2",
  "westward-save-v1",
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
  const payloadVersion = payload && typeof payload === "object" && Number.isFinite(payload.version)
    ? payload.version
    : null;
  return {
    storageVersion: STORAGE_VERSION,
    payloadVersion,
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
  if (!Number.isFinite(envelope.savedAt)) {
    return { ok: false, reason: "missing-savedAt" };
  }
  if (
    !envelope.payload ||
    typeof envelope.payload !== "object" ||
    Array.isArray(envelope.payload)
  ) {
    return { ok: false, reason: "missing-payload" };
  }
  if (typeof envelope.hash !== "string" || !HASH_RE.test(envelope.hash)) {
    return { ok: false, reason: "missing-hash" };
  }
  const payload = envelope.payload;
  const payloadVersion = envelope.payloadVersion;
  if (!Number.isFinite(envelope.payloadVersion)) {
    return { ok: false, reason: "missing-payload-version" };
  }
  if (!Number.isFinite(payload.version)) {
    return { ok: false, reason: "bad-payload-version" };
  }
  if (payloadVersion !== payload.version) {
    return { ok: false, reason: "payload-version-mismatch" };
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

async function writeSaveTransaction(db, slotKey, envelope, options = {}) {
  const { keepBackups = MAX_BACKUPS_PER_SLOT } = options;
  return txAsync(db, [SAVE_STORE, BACKUP_STORE], "readwrite", async (tx) => {
    const saves = tx.objectStore(SAVE_STORE);
    const backups = tx.objectStore(BACKUP_STORE);

    // 1. If a primary already exists for this slot, copy it to backups before overwriting.
    const current = await reqAsync(saves.get(slotKey));
    if (current && current.envelope) {
      // Ensure the backup key (slot, savedAt) is unique. If two saves landed in the
      // same millisecond, nudge the timestamp by 1 ms to avoid collision.
      let backupAt = current.envelope.savedAt;
      while (await reqAsync(backups.get([slotKey, backupAt]))) {
        backupAt += 1;
      }
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

    // 3. Prune backups for this slot to keepBackups (newest first).
    const allBackups = await reqAsync(backups.index("by-slot").getAll(slotKey));
    if (allBackups.length > keepBackups) {
      const sorted = allBackups
        .slice()
        .sort((a, b) => b.savedAt - a.savedAt);
      const toDelete = sorted.slice(keepBackups);
      for (const entry of toDelete) {
        await reqAsync(backups.delete([slotKey, entry.savedAt]));
      }
    }
    return envelope;
  });
}

// Aggressively prune backups across all slots when quota is hit, keeping only
// the newest backup per slot. Returns the number of backups removed.
async function pruneAllBackupsToMinimum(db) {
  return txAsync(db, [BACKUP_STORE], "readwrite", async (tx) => {
    const backups = tx.objectStore(BACKUP_STORE);
    const all = await reqAsync(backups.getAll());
    // Group by slot, keep newest per slot.
    const newestPerSlot = new Map();
    for (const entry of all) {
      const cur = newestPerSlot.get(entry.slot);
      if (!cur || entry.savedAt > cur.savedAt) newestPerSlot.set(entry.slot, entry);
    }
    let removed = 0;
    for (const entry of all) {
      const keep = newestPerSlot.get(entry.slot);
      if (!keep || entry.savedAt !== keep.savedAt) {
        await reqAsync(backups.delete([entry.slot, entry.savedAt]));
        removed += 1;
      }
    }
    return removed;
  });
}

export async function writeSave(slot, payload) {
  const slotKey = slot || DEFAULT_SLOT;
  const db = await openDB();
  const envelope = makeEnvelope(payload);
  try {
    return await writeSaveTransaction(db, slotKey, envelope);
  } catch (err) {
    if (!isQuotaError(err)) throw err;
    // Quota hit. Prune all but the newest backup per slot, then retry once.
    let removed = 0;
    try {
      removed = await pruneAllBackupsToMinimum(db);
    } catch (pruneErr) {
      const wrapped = new Error("Storage quota exceeded and backup pruning failed.");
      wrapped.code = "quota-exceeded";
      wrapped.cause = pruneErr;
      wrapped.recovered = false;
      throw wrapped;
    }
    try {
      const env = await writeSaveTransaction(db, slotKey, envelope, { keepBackups: 1 });
      // Tag the envelope so callers can surface that recovery happened.
      env.__quotaRecovered = { removedBackups: removed };
      return env;
    } catch (retryErr) {
      const wrapped = new Error(
        `Storage quota exceeded; pruned ${removed} backup(s) but the save still failed.`,
      );
      wrapped.code = "quota-exceeded-after-recovery";
      wrapped.cause = retryErr;
      wrapped.recovered = false;
      wrapped.removedBackups = removed;
      throw wrapped;
    }
  }
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
    formatVersion: SAVE_FORMAT_VERSION,
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
      formatVersion: SAVE_FORMAT_VERSION,
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
  if (!Number.isFinite(parsed.formatVersion) || parsed.formatVersion < 1) {
    return { ok: false, reason: "format-version-missing" };
  }
  if (parsed.formatVersion !== SAVE_FORMAT_VERSION) {
    return { ok: false, reason: "format-version-unsupported" };
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
      // Bad legacy blob — keep it in localStorage so the player still has data.
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;
    const envelopeValidation = validateEnvelope(makeEnvelope(parsed));
    if (!envelopeValidation.ok) {
      return { ok: false, reason: `legacy-${envelopeValidation.reason}` };
    }
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

// Returns one entry per slot in KNOWN_SLOTS (always 3) so the title-screen
// picker always renders the full grid. Each entry reports whether the slot
// is empty, whether the stored envelope passes hash validation, and (when
// valid) the payload + savedAt for summary rendering.
export async function listSlots() {
  const out = [];
  for (const slot of KNOWN_SLOTS) {
    let result;
    try {
      result = await readSave(slot);
    } catch (err) {
      out.push({ slot, empty: true, valid: false, payload: null, savedAt: null, error: err });
      continue;
    }
    if (!result.ok) {
      if (result.reason === "missing") {
        out.push({ slot, empty: true, valid: true, payload: null, savedAt: null });
      } else {
        out.push({ slot, empty: false, valid: false, payload: null, savedAt: null, reason: result.reason });
      }
      continue;
    }
    out.push({
      slot,
      empty: false,
      valid: true,
      payload: result.payload,
      savedAt: result.savedAt,
    });
  }
  return out;
}

// Compact summary used by the title-screen slot picker. Pulls just the
// fields the player needs to identify a save: character level, current
// region, elapsed in-session time, and victory/ending state. Stays defensive
// because we read from raw payloads that may pre-date later schema fields.
const SUMMARY_DEFAULTS = {
  level: 1,
  regionId: "frontier",
  timePlayedSeconds: 0,
  victory: false,
  endingId: null,
  difficulty: "standard",
};

const KNOWN_DIFFICULTIES = ["beginner", "standard", "hard"];

export function summarizeSavePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const level = Number.isFinite(payload?.player?.level)
    ? Math.max(1, Math.floor(payload.player.level))
    : SUMMARY_DEFAULTS.level;
  const regionId = typeof payload?.regions?.activeRegion === "string"
    ? payload.regions.activeRegion
    : SUMMARY_DEFAULTS.regionId;
  const timePlayedSeconds = Number.isFinite(payload?.time)
    ? Math.max(0, Math.floor(payload.time))
    : SUMMARY_DEFAULTS.timePlayedSeconds;
  const victory = Boolean(payload?.world?.runStats?.victory);
  const endingId = typeof payload?.world?.runStats?.endingId === "string"
    ? payload.world.runStats.endingId
    : null;
  const difficulty = KNOWN_DIFFICULTIES.includes(payload?.world?.difficulty)
    ? payload.world.difficulty
    : SUMMARY_DEFAULTS.difficulty;
  return { level, regionId, timePlayedSeconds, victory, endingId, difficulty };
}

export function describeSaveSlotRecovery(meta, options = {}) {
  const maxSupportedVersion = Number.isFinite(options.maxSupportedVersion)
    ? Math.max(1, Math.floor(options.maxSupportedVersion))
    : 3;
  if (!meta || typeof meta !== "object") {
    return {
      state: "unknown",
      line: "Save status unavailable. Refresh the title screen before loading.",
      actionLine: "Refresh saves.",
    };
  }
  if (meta.empty) {
    return {
      state: "empty",
      line: "Empty slot. Start a new run or import a save here.",
      actionLine: "New run or import.",
    };
  }
  if (!meta.valid) {
    const reason = typeof meta.reason === "string" ? meta.reason : "integrity check failed";
    return {
      state: "corrupt",
      line: `Corrupt primary save (${reason}). Restore a valid backup or import over this slot.`,
      actionLine: "Recover backup or import.",
    };
  }
  const version = meta.payload?.version;
  if (!Number.isFinite(version)) {
    return {
      state: "invalid",
      line: "Save payload is missing its schema version. Export it before replacing the slot.",
      actionLine: "Export or replace.",
    };
  }
  if (version > maxSupportedVersion) {
    return {
      state: "newer",
      line: `Newer save schema v${Math.floor(version)}. This build supports v${maxSupportedVersion}; preserve or export it.`,
      actionLine: "Export only.",
    };
  }
  return {
    state: "valid",
    line: "Valid save. Continue, export a backup, import over it, or delete it.",
    actionLine: "Continue or export.",
  };
}

export function describeSaveBackupChoices(backups = []) {
  const all = Array.isArray(backups) ? backups : [];
  const validBackups = all.filter((backup) => backup?.valid && Number.isFinite(backup.savedAt));
  if (all.length === 0) {
    return {
      state: "none",
      line: "No backups stored for this slot yet.",
      validCount: 0,
      totalCount: 0,
      choices: [],
    };
  }
  const choices = validBackups
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((backup, index) => ({
      index: index + 1,
      slot: backup.slot,
      savedAt: backup.savedAt,
      payloadVersion: Number.isFinite(backup.payloadVersion) ? backup.payloadVersion : null,
      hash: typeof backup.hash === "string" ? backup.hash : null,
      label: `Backup ${index + 1}: ${new Date(backup.savedAt).toLocaleString()}${Number.isFinite(backup.payloadVersion) ? ` (v${backup.payloadVersion})` : ""}`,
    }));
  if (choices.length === 0) {
    return {
      state: "none-valid",
      line: `${all.length} backup${all.length === 1 ? "" : "s"} stored, but none pass validation.`,
      validCount: 0,
      totalCount: all.length,
      choices,
    };
  }
  return {
    state: "available",
    line: `${choices.length} valid backup${choices.length === 1 ? "" : "s"} available; latest can be restored manually.`,
    validCount: choices.length,
    totalCount: all.length,
    choices,
  };
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
