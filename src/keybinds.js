// Keybind remap system. Stores custom key mappings in state.input.keybinds,
// persisted through save/load. Falls back to DEFAULT_KEYBINDS when a binding
// is not customized. Actions map to event.code strings (e.g., "KeyE", "Space").

export const DEFAULT_KEYBINDS = {
  interact:       "KeyE",
  attack:         "Space",
  block:          "KeyC",
  dodge:          "KeyX",
  chargedAttack:  "KeyB",
  usePotion:      "KeyQ",
  useUtility:     "KeyU",
  toggleMap:      "KeyM",
  toggleSound:    "KeyN",
  fullscreen:     "KeyF",
  quickSave:      "KeyK",
  quickLoad:      "KeyL",
  cycleStance:    "KeyZ",
  openSettings:   "KeyO",
  openCodex:      "KeyZ",
  openSheet:      "KeyI",
  openJobBoard:   "KeyJ",
  travelRegion:   "KeyG",
  devOverlay:     "KeyP",
};

export const KEYBIND_LABELS = {
  interact:      "Interact / Shop",
  attack:        "Attack",
  block:         "Block",
  dodge:         "Dodge Step",
  chargedAttack: "Charged Attack",
  usePotion:     "Use Potion",
  useUtility:    "Use Quick Utility",
  toggleMap:     "Toggle Map",
  toggleSound:   "Toggle Sound",
  fullscreen:    "Fullscreen",
  quickSave:     "Quick Save",
  quickLoad:     "Quick Load",
  cycleStance:   "Cycle Combat Stance",
  openSettings:  "Settings",
  openCodex:     "Codex",
  openSheet:     "Character Sheet",
  openJobBoard:  "Job Board",
  travelRegion:  "Travel Region",
  devOverlay:    "Dev Overlay",
};

export function createInitialKeybinds() {
  return { ...DEFAULT_KEYBINDS };
}

export function normalizeKeybinds(source) {
  const defaults = createInitialKeybinds();
  if (!source || typeof source !== "object") return defaults;
  const out = { ...defaults };
  for (const action of Object.keys(defaults)) {
    if (typeof source[action] === "string" && source[action].length > 0) {
      out[action] = source[action];
    }
  }
  return out;
}

// Returns the event.code for an action, with fallback to default.
export function resolveKey(keybinds, action) {
  return keybinds?.[action] || DEFAULT_KEYBINDS[action] || null;
}

// Returns all actions bound to a given event.code.
export function actionsForCode(keybinds, code) {
  const effective = keybinds ? { ...DEFAULT_KEYBINDS, ...keybinds } : DEFAULT_KEYBINDS;
  return Object.entries(effective)
    .filter(([, v]) => v === code)
    .map(([k]) => k);
}

// Rebinds an action to a new key. Returns false if the code is already used
// by another action (to prevent conflicts).
export function rebindAction(keybinds, action, newCode, { allowConflict = false } = {}) {
  if (!keybinds || !action || !newCode) return false;
  if (!allowConflict) {
    const conflicts = actionsForCode(keybinds, newCode).filter((a) => a !== action);
    if (conflicts.length > 0) return false;
  }
  keybinds[action] = newCode;
  return true;
}
