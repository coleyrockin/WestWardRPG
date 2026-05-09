export interface SaveStateManager {
  tick(dt: number, mode: string, opts?: { onAutoSave?: () => void }): void;
  markDirty(): void;
  onSaveSuccess(savedAt?: number): void;
  secondsSinceLastSave(): number;
  readonly isDirty: boolean;
  readonly lastSavedAt: number | null;
}
export function createSaveStateManager(options?: { interval?: number }): SaveStateManager;
export function makeSaveResult(ok: boolean, reason?: string | null, slot?: string | null): { ok: boolean; reason: string | null; slot: string | null };
