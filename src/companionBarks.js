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

// Quest-outcome reactions per companion. Keyed by questId → outcomeId → line.
// Voices stay consistent: Cogwheel sardonic-empirical, Nora bartender-warm,
// Boone laconic-marshal. One bark per quest per run; the host clears the
// dedup map on new-game / load via resetBarkState.
export const BARK_QUEST_OUTCOMES = {
  smith: {
    crystal: {
      truth: "Cogwheel: You handed them the map. Let's see what they make of it.",
      comfort: "Cogwheel: A quiet ledger is still a ledger. Someone will read it.",
    },
    wood: {
      solidarity: "Cogwheel: A house plan turned into a working hypothesis. Good.",
      status: "Cogwheel: A private deed. Cleaner numbers, fewer eyes.",
    },
    archive: {
      truth: "Cogwheel: Releasing it forces the experiment. Brace for noise.",
      comfort: "Cogwheel: A sealed archive is a delayed correction. Pages keep counting.",
    },
    ashfall_intro: {
      salvage: "Cogwheel: Shared salvage is a slower payout, but a wider one.",
      monopoly: "Cogwheel: A licensed route. Boone will lose sleep over the paperwork.",
    },
    ashfall_boss: {
      mercy: "Cogwheel: You spared the crew. The system stays. Watch it carefully.",
      purge: "Cogwheel: A purge always reads cleaner than it is. Track the names.",
    },
    lantern_probe: {
      broadcast: "Cogwheel: Broadcast. The signal is now everyone's problem.",
      decrypt: "Cogwheel: Decrypted in private. A leverage you'll have to maintain.",
    },
    lantern_revolt: {
      guild: "Cogwheel: The guild has the floor. Now it has to keep it.",
      council: "Cogwheel: Reform paperwork. Half the noise, twice the years.",
    },
  },
  innkeeper: {
    crystal: {
      truth: "Nora: You said it out loud. The bar will be louder tonight.",
      comfort: "Nora: Nice and quiet. People drink slower when the truth is missing.",
    },
    wood: {
      solidarity: "Nora: A roof anyone can copy. That's a good kind of trouble.",
      status: "Nora: Your name on the deed. Don't sit on it.",
    },
    archive: {
      truth: "Nora: They'll be arguing about that one in my back booth for years.",
      comfort: "Nora: Sealed. The kind of quiet you have to keep refilling.",
    },
    ashfall_intro: {
      salvage: "Nora: Shared route. Crews will toast you, then ask for credit.",
      monopoly: "Nora: A licensed road. Strangers will ask Boone before they ask me.",
    },
    ashfall_boss: {
      mercy: "Nora: You let the crew live. Some of them might walk in here for a drink.",
      purge: "Nora: Quieter Ashfall. Quieter for the wrong reason.",
    },
    lantern_probe: {
      broadcast: "Nora: Everybody's listening now. Hope the song was worth it.",
      decrypt: "Nora: Held it close. That kind of secret turns into a tab.",
    },
    lantern_revolt: {
      guild: "Nora: The guild's drinking on credit tonight. They'll pay it back loud.",
      council: "Nora: Council terms. The street goes home, the paperwork stays late.",
    },
  },
  warden: {
    crystal: {
      truth: "Boone: Survey's out. I'll get the questions before sundown.",
      comfort: "Boone: Buried the survey. Easier nights, harder mornings.",
    },
    wood: {
      solidarity: "Boone: Open plans. Less I have to chase off curious folks.",
      status: "Boone: Private deed. Don't make me defend it twice.",
    },
    archive: {
      truth: "Boone: Released. Hope you're ready for the foot traffic.",
      comfort: "Boone: Sealed. I'll stand the watch. Don't waste it.",
    },
    ashfall_intro: {
      salvage: "Boone: Shared route. Less brawls, more paperwork.",
      monopoly: "Boone: Licensed. I'll be writing more permits than warrants.",
    },
    ashfall_boss: {
      mercy: "Boone: Crew lives. I'll keep an eye on them.",
      purge: "Boone: Cleaner sheet. Quieter conscience? Ask yourself later.",
    },
    lantern_probe: {
      broadcast: "Boone: Signal's loose. I'll triple the night patrols.",
      decrypt: "Boone: Held tight. Don't let it slip on my watch.",
    },
    lantern_revolt: {
      guild: "Boone: Guild's standing. Long road from here.",
      council: "Boone: Council's writing terms. Streets go quiet, file gets thick.",
    },
  },
};

export function ensureBarkState(runtime) {
  if (!runtime || typeof runtime !== "object") return;
  if (!runtime.barkState || typeof runtime.barkState !== "object") {
    runtime.barkState = { lastSpokenAt: null, eventCooldowns: {}, eventsFired: {}, questOutcomesSpoken: {} };
  }
  if (!runtime.barkState.eventCooldowns) runtime.barkState.eventCooldowns = {};
  if (!runtime.barkState.eventsFired) runtime.barkState.eventsFired = {};
  if (!runtime.barkState.questOutcomesSpoken) runtime.barkState.questOutcomesSpoken = {};
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
  runtime.barkState = { lastSpokenAt: null, eventCooldowns: {}, eventsFired: {}, questOutcomesSpoken: {} };
}

// Quest outcome bark — one per quest per run, ignores per-event cooldown but
// still respects the global cooldown so it doesn't tread on a fresh combat
// bark. The host is expected to call this immediately after applyQuestOutcome.
export function tryQuestOutcomeBark(runtime, questId, outcomeId, now = 0, opts = {}) {
  if (!runtime || !runtime.active) return null;
  if (!questId || !outcomeId) return null;
  ensureBarkState(runtime);
  const lib = BARK_QUEST_OUTCOMES[runtime.id];
  const line = lib?.[questId]?.[outcomeId];
  if (!line) return null;
  const state = runtime.barkState;
  if (state.questOutcomesSpoken[questId]) return null;
  const globalCd = opts.globalCooldown ?? DEFAULT_GLOBAL_COOLDOWN;
  if (state.lastSpokenAt != null && now - state.lastSpokenAt < globalCd) return null;
  state.questOutcomesSpoken[questId] = true;
  state.lastSpokenAt = now;
  return line;
}
