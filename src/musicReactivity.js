// Per-(quest × outcome) music profile modulators. Closes the audit's quest-
// outcome reactivity story on the music surface — vendor lines, NPC chat,
// HUD echo, and job board copy already react; now the score does too.
//
// Each modulator is a small additive delta against a region profile (tempo,
// pad gain, melody gain, tension max gain). Late-chain outcomes apply last
// so a finished campaign drifts toward its most recent decision's mood.

const QUEST_PRIORITY = [
  "crystal",
  "wood",
  "archive",
  "ashfall_intro",
  "ashfall_boss",
  "lantern_probe",
  "lantern_revolt",
];

// Deltas are kept small so the loop doesn't change identity — the player
// should *feel* a shift, not hear an entirely different score. Values are
// hand-tuned against the base profiles in audio.js MUSIC_REGION_PROFILE.
const OUTCOME_DELTAS = {
  crystal: {
    truth:   { tempoBPM: +2, melodyGain: +0.005, tensionMaxGain: +0.005 },
    comfort: { tempoBPM: -2, padGain: -0.005 },
  },
  wood: {
    solidarity: { melodyGain: +0.005, padGain: +0.005 },
    status:     { melodyGain: -0.005 },
  },
  archive: {
    truth:   { tempoBPM: +6, tensionMaxGain: +0.015, melodyGain: +0.005 },
    comfort: { tempoBPM: -4, padGain: -0.01, tensionMaxGain: -0.005 },
  },
  ashfall_intro: {
    salvage:  { tempoBPM: +3, melodyGain: +0.005 },
    monopoly: { tempoBPM: -2, tensionMaxGain: +0.005 },
  },
  ashfall_boss: {
    mercy: { melodyGain: +0.01, padGain: +0.005 },
    purge: { padGain: -0.01, tensionMaxGain: +0.02, melodyGain: -0.005 },
  },
  lantern_probe: {
    broadcast: { tempoBPM: +3, melodyGain: +0.005 },
    decrypt:   { tempoBPM: -2, padGain: -0.005 },
  },
  lantern_revolt: {
    guild:   { melodyGain: +0.01, tempoBPM: +4, padGain: +0.005 },
    council: { tensionMaxGain: -0.015, tempoBPM: -3, melodyGain: -0.005 },
  },
};

function clone(profile) {
  return { ...profile };
}

function applyDelta(profile, delta) {
  if (!delta) return;
  if (typeof delta.tempoBPM === "number") {
    profile.tempoBPM = Math.max(20, profile.tempoBPM + delta.tempoBPM);
  }
  if (typeof delta.padGain === "number") {
    profile.padGain = Math.max(0, profile.padGain + delta.padGain);
  }
  if (typeof delta.melodyGain === "number") {
    profile.melodyGain = Math.max(0, profile.melodyGain + delta.melodyGain);
  }
  if (typeof delta.tensionMaxGain === "number") {
    profile.tensionMaxGain = Math.max(0, profile.tensionMaxGain + delta.tensionMaxGain);
  }
}

export function applyOutcomeModulation(baseProfile, narrative) {
  const out = clone(baseProfile);
  if (!narrative || typeof narrative !== "object") return out;
  const outcomes = narrative.questOutcomes;
  if (!outcomes || typeof outcomes !== "object") return out;
  for (const questId of QUEST_PRIORITY) {
    const outcomeId = outcomes[questId];
    if (!outcomeId) continue;
    const delta = OUTCOME_DELTAS[questId]?.[outcomeId];
    if (!delta) continue;
    applyDelta(out, delta);
  }
  return out;
}
