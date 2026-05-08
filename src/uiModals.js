// Centralized modal selection state. Replaces five module-globals
// (dialogueSelection, questOutcomeSelection, jobBoardSelection, codexTab,
// settingsSelection) with a single object that lives on `state.ui.modals`,
// so save/load round-trips it and reopens cannot land on a stale index.

const MODAL_FIELDS = ["dialogue", "questOutcome", "jobBoard", "codexTab", "settings"];

export function createInitialUiModalState() {
  return {
    dialogue: 0,
    questOutcome: 0,
    jobBoard: 0,
    codexTab: 0,
    settings: 0,
  };
}

function normalizeIndex(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.floor(value);
}

export function normalizeUiModalState(input) {
  const defaults = createInitialUiModalState();
  if (!input || typeof input !== "object" || Array.isArray(input)) return defaults;
  const out = { ...defaults };
  for (const field of MODAL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      out[field] = normalizeIndex(input[field]);
    }
  }
  return out;
}
