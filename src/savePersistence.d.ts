export const DEFAULT_SLOT: string;
export const KNOWN_SLOTS: readonly string[];
export const STORAGE_VERSION: number;
export const MAX_BACKUPS_PER_SLOT: number;
export const LEGACY_LOCAL_STORAGE_KEYS: readonly string[];

export interface SlotMeta {
  slot: string;
  empty: boolean;
  valid: boolean;
  payload: any | null;
  savedAt: number | null;
  reason?: string;
  error?: unknown;
}

export interface SavePayloadSummary {
  level: number;
  regionId: string;
  timePlayedSeconds: number;
  victory: boolean;
  endingId: string | null;
  difficulty: string;
}

export interface SaveSlotRecoveryDescription {
  state: "unknown" | "empty" | "corrupt" | "invalid" | "newer" | "valid";
  line: string;
  actionLine: string;
}

export interface SaveBackupChoice {
  index: number;
  slot: string;
  savedAt: number;
  payloadVersion: number | null;
  hash: string | null;
  label: string;
}

export interface SaveBackupChoiceDescription {
  state: "none" | "none-valid" | "available";
  line: string;
  validCount: number;
  totalCount: number;
  choices: SaveBackupChoice[];
}

export interface SaveEnvelope {
  storageVersion: number;
  payloadVersion: number | null;
  savedAt: number;
  hash: string;
  payload: any;
}

export interface BackupMeta {
  slot: string;
  savedAt: number;
  payloadVersion: number | null;
  hash: string | null;
  valid: boolean;
}

export type ReadResult =
  | { ok: true; payload: any; savedAt: number; slot: string }
  | { ok: false; reason: string; slot?: string; savedAt?: number; error?: unknown };

export type ImportResult =
  | { ok: true; payload: any; slot: string }
  | { ok: false; reason: string; slot?: string; error?: unknown };

export type MigrateResult =
  | { ok: true; payload: any; fromKey: string; slot: string }
  | { ok: false; reason: string; error?: unknown }
  | null;

export function hashJson(value: unknown): string;
export function makeEnvelope(payload: any, now?: number): SaveEnvelope;
export function validateEnvelope(envelope: unknown):
  | { ok: true; payload: any; savedAt: number }
  | { ok: false; reason: string };

export function writeSave(slot: string | undefined, payload: any): Promise<SaveEnvelope & { __quotaRecovered?: { removedBackups: number } }>;
export function isQuotaError(err: unknown): boolean;
export function readSave(slot?: string): Promise<ReadResult>;
export function listBackups(slot?: string): Promise<BackupMeta[]>;
export function readBackup(slot: string | undefined, savedAt: number): Promise<ReadResult>;
export function restoreFromBackup(slot: string | undefined, savedAt: number): Promise<any>;
export function deleteSave(slot?: string): Promise<void>;
export function exportSaveBlob(slot?: string, options?: { savedAt?: number }): Promise<Blob>;
export function exportSaveJson(slot?: string, options?: { savedAt?: number }): Promise<string>;
export function importSaveFromText(slot: string | undefined, text: string): Promise<ImportResult>;
export function migrateFromLocalStorage(slot?: string): Promise<MigrateResult>;
export function findMostRecentValidBackup(slot?: string): Promise<ReadResult | null>;
export function listSlots(): Promise<SlotMeta[]>;
export function summarizeSavePayload(payload: any): SavePayloadSummary | null;
export function describeSaveSlotRecovery(meta: Partial<SlotMeta> | null | undefined, options?: { maxSupportedVersion?: number }): SaveSlotRecoveryDescription;
export function describeSaveBackupChoices(backups?: BackupMeta[]): SaveBackupChoiceDescription;
export function __resetSavePersistenceForTests(): void;
