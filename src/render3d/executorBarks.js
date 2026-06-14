// The Executor — Abram Cross's ghost, riding shotgun in Ezra's skull — does not
// fall silent after the funeral. He interjects on world events: crossing into a
// town, finishing a job, finding one of his old caches. This is the core
// narrative engine made literal (treatment §46-48): "you didn't just inherit the
// money, you inherited the man," and he "approves when you act like him, needles
// you when you don't."
//
// Pure data + selector — spike.js fires the chosen line through the cyan
// `npcSpeech` prompt channel (a line starting "Executor:" auto-styles cyan).
// Lines branch by an APPROVAL band (treatment §119-120 — "feeding it decisions":
// acting like Abram strengthens the ghost, mercy/divestment starves it):
//   approval >= +25  → "high"    proud, intrusive, possessive
//   approval <= -25  → "low"     disdainful, distant, losing his grip
//   otherwise        → "neutral" the default editorial voice
//
// No owner-gated story is authored here — only the ghost's TONE on places and
// events the engine already reaches. Canon anchors: §21-27 (the Severance, water
// as currency, Calico the free town), §50-53 (the Three Problems), §30 (Crossline
// Ranch / the family seat the player spawns beside).

export const EXECUTOR_BANDS = Object.freeze(["low", "neutral", "high"]);

export const EXECUTOR_BARKS = Object.freeze({
  // Crossing west into Calico Flats — the free town with no corp charter.
  enter_calico: {
    high: 'Executor: "Calico Flats. They call it free because I let them pretend. Walk in like you own the pretense — you do."',
    neutral: 'Executor: "Calico Flats. No charter, elected sheriff, neutral saloons. Free town. Your father owned the men who keep it that way."',
    low: 'Executor: "Calico. You breathe easier here, where nobody kneels. Sentiment, boy. The Tally Men will price it for you."',
  },
  // Crossing back east toward Westward / the family ground.
  enter_westward: {
    high: 'Executor: "Home ground. Every board of it answers to the Cross name. Keep it that way."',
    neutral: 'Executor: "Westward. The road, the board, the watchtower — all of it leans on our water. Remember who they really owe."',
    low: 'Executor: "Back among the people you\'d rather forgive than collect from. We will discuss that habit."',
  },
  // First time the marsh-road bounty is cleared — blood for the territory.
  bounty_cleared: {
    high: 'Executor: "Good. The road\'s yours again. That\'s how a Cross holds ground — you don\'t ask, you clear it."',
    neutral: 'Executor: "Road\'s clear. A small thing. The territory is a thousand small things held by the throat."',
    low: 'Executor: "You did the work and felt bad about it. Mercy is a luxury a debtor cannot afford."',
  },
});

// Choose the Executor's line for a trigger at the player's current approval.
// Returns null for an unknown trigger (caller simply fires nothing).
export function bandForApproval(approval = 0) {
  const a = Number.isFinite(approval) ? approval : 0;
  if (a >= 25) return "high";
  if (a <= -25) return "low";
  return "neutral";
}

export function pickExecutorBark(trigger, { approval = 0 } = {}) {
  const set = EXECUTOR_BARKS[trigger];
  if (!set) return null;
  const band = bandForApproval(approval);
  return set[band] || set.neutral || null;
}
