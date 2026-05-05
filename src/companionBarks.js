// Companion barks — pure data + selection helpers.
//
// Each active companion has a small library of short lines for game
// events (low HP, first kill, mini-boss, region entry, house unlock,
// perfect dodge/parry, level up). The host emits an event; this module
// returns a single line and stamps a per-event cooldown so barks stay
// rare and special.

const DEFAULT_GLOBAL_COOLDOWN = 8.0;
const DEFAULT_EVENT_COOLDOWN = {
  low_hp: 25,
  first_kill: Infinity, // once per run
  mini_boss: 60,
  region_entry: 30,
  house_unlock: Infinity,
  perfect_dodge: 18,
  perfect_parry: 18,
  level_up: 6,
  boss_phase: 60,
};

export const BARK_EVENTS = Object.keys(DEFAULT_EVENT_COOLDOWN);

export const BARK_LIBRARY = {
  smith: {
    low_hp: [
      "Cogwheel: Pull back. The numbers say pull back.",
      "Cogwheel: Your math is bleeding. Find a wall.",
    ],
    first_kill: [
      "Cogwheel: One down. Keep your stance honest.",
    ],
    mini_boss: [
      "Cogwheel: That one's in three of my notebooks. Don't hand it a fourth.",
    ],
    region_entry: [
      "Cogwheel: Different soil, different rules. Walk slow.",
    ],
    house_unlock: [
      "Cogwheel: A roof is a hypothesis. Test it tonight.",
    ],
    perfect_dodge: [
      "Cogwheel: Beautiful timing. Did you measure that?",
    ],
    perfect_parry: [
      "Cogwheel: Textbook redirect. I'll use that example.",
    ],
    level_up: [
      "Cogwheel: Skill increment logged. The frontier is paying attention.",
    ],
    boss_phase: [
      "Cogwheel: It changed the equation. Adjust your variables.",
    ],
  },
  innkeeper: {
    low_hp: [
      "Nora: Bleed at the bar, drifter, not on the road.",
      "Nora: Patch up. I'm not carrying you home.",
    ],
    first_kill: [
      "Nora: That counts. Keep counting.",
    ],
    mini_boss: [
      "Nora: I've poured drinks for sadder things than that. Drop it anyway.",
    ],
    region_entry: [
      "Nora: New air. Same rules: don't die where I have to mop.",
    ],
    house_unlock: [
      "Nora: A bed of your own. About time you stopped renting mine.",
    ],
    perfect_dodge: [
      "Nora: Cleaner footwork than my dance hall.",
    ],
    perfect_parry: [
      "Nora: That'll bruise their pride harder than their arm.",
    ],
    level_up: [
      "Nora: You wear that level better than the last one.",
    ],
    boss_phase: [
      "Nora: It's playing its second song. Make it the last.",
    ],
  },
  warden: {
    low_hp: [
      "Boone: Step off the sights, drifter. Now.",
      "Boone: You're red. I'd hate to fill out a report.",
    ],
    first_kill: [
      "Boone: One bounty closer to closing time.",
    ],
    mini_boss: [
      "Boone: I've had the sheet on that one for weeks. Make it official.",
    ],
    region_entry: [
      "Boone: Different jurisdiction, same drifter problem.",
    ],
    house_unlock: [
      "Boone: A door I won't kick down. Progress.",
    ],
    perfect_dodge: [
      "Boone: That's how a frontier deputy gets old.",
    ],
    perfect_parry: [
      "Boone: I'd write that up if it weren't so pretty.",
    ],
    level_up: [
      "Boone: You earn that, you sign for it.",
    ],
    boss_phase: [
      "Boone: It saved a trick. Don't let it save another.",
    ],
  },
};

export function ensureBarkState(runtime) {
  if (!runtime || typeof runtime !== "object") return;
  if (!runtime.barkState || typeof runtime.barkState !== "object") {
    runtime.barkState = { lastSpokenAt: null, eventCooldowns: {}, eventsFired: {} };
  }
  if (!runtime.barkState.eventCooldowns) runtime.barkState.eventCooldowns = {};
  if (!runtime.barkState.eventsFired) runtime.barkState.eventsFired = {};
}

function listForEvent(companionId, eventType) {
  const lib = BARK_LIBRARY[companionId];
  if (!lib) return null;
  const list = lib[eventType];
  if (!Array.isArray(list) || list.length === 0) return null;
  return list;
}

// Returns the bark line if eligible, otherwise null. Caller is expected to
// invoke `markBarkSpoken` immediately afterward when the line is used.
export function pickBark(runtime, eventType, now = 0, opts = {}) {
  if (!runtime || !runtime.active) return null;
  ensureBarkState(runtime);
  const list = listForEvent(runtime.id, eventType);
  if (!list) return null;
  const state = runtime.barkState;
  const globalCd = opts.globalCooldown ?? DEFAULT_GLOBAL_COOLDOWN;
  const lastSpoken = state.lastSpokenAt;
  if (lastSpoken != null && now - lastSpoken < globalCd) return null;
  const eventCd = opts.eventCooldown ?? DEFAULT_EVENT_COOLDOWN[eventType] ?? 12;
  const lastEventAt = state.eventCooldowns[eventType];
  if (lastEventAt != null && (eventCd === Infinity || now - lastEventAt < eventCd)) return null;
  // Deterministic but rotating choice: index by fired-count so subsequent
  // barks for the same event cycle through the list.
  const fired = state.eventsFired[eventType] || 0;
  const idx = fired % list.length;
  return list[idx];
}

export function markBarkSpoken(runtime, eventType, now = 0) {
  ensureBarkState(runtime);
  const state = runtime.barkState;
  state.lastSpokenAt = now;
  state.eventCooldowns[eventType] = now;
  state.eventsFired[eventType] = (state.eventsFired[eventType] || 0) + 1;
}

// Convenience: pick + mark in one call. Returns line or null.
export function trySpeakBark(runtime, eventType, now = 0, opts = {}) {
  const line = pickBark(runtime, eventType, now, opts);
  if (!line) return null;
  markBarkSpoken(runtime, eventType, now);
  return line;
}

export function resetBarkState(runtime) {
  if (!runtime) return;
  runtime.barkState = { lastSpokenAt: null, eventCooldowns: {}, eventsFired: {} };
}
