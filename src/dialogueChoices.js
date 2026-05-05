// Lite dialogue choices — pure data + state helpers.
//
// Each major NPC offers 2-3 stateless choices per chapter. Selecting a
// choice applies a small axis/rep/affinity delta and records a flag so
// the same prompt does not appear again.
//
// Unlike `applyMajorDecision` (one-time, axis-defining commitments),
// these are flavor choices that nudge the world without forcing a
// branch. They give the player agency between major story beats and
// drive `npcMemory` reactions.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const DIALOGUE_CHOICES = {
  elder: {
    1: [
      {
        id: "elder_ch1_offer_help",
        prompt: "Need anything cleared off the road, Elder?",
        response: "Elder Nira: A drifter's eye out there beats a council vote in here. I won't forget.",
        effects: { npcAffinity: { elder: 4 }, axes: { solidarityVsStatus: 1 } },
      },
      {
        id: "elder_ch1_question_council",
        prompt: "Who actually answers when the Council talks?",
        response: "Elder Nira: Whoever's hungry. Sometimes that's the truth, sometimes that's the patrol.",
        effects: { axes: { truthVsComfort: 1, controlVsFreedom: -1 } },
      },
      {
        id: "elder_ch1_play_loyal",
        prompt: "I'm here to help the Council hold the line.",
        response: "Elder Nira: Good. The line is older than most of us, and it pays.",
        effects: { factionRep: { civicCouncil: 3 }, axes: { controlVsFreedom: 1 } },
      },
    ],
    2: [
      {
        id: "elder_ch2_press_truth",
        prompt: "Why is the archive sealed, Elder? Real answer.",
        response: "Elder Nira: Because some questions outlive the people who could answer them. Push anyway.",
        effects: { axes: { truthVsComfort: 2 }, npcAffinity: { elder: 3 } },
      },
      {
        id: "elder_ch2_offer_protection",
        prompt: "I'll keep your name out of any louder lists.",
        response: "Elder Nira: Quietly is how I prefer to survive. I'll remember the favor.",
        effects: { npcAffinity: { elder: 6 }, factionRep: { civicCouncil: 2 } },
      },
    ],
    3: [
      {
        id: "elder_ch3_endorse_change",
        prompt: "The valley's changing whether the Council signs it or not.",
        response: "Elder Nira: Then sign it for them. I'll back the script you write.",
        effects: { axes: { controlVsFreedom: -2, solidarityVsStatus: 2 }, factionRep: { workersGuild: 4 } },
      },
    ],
  },

  warden: {
    1: [
      {
        id: "warden_ch1_back_patrols",
        prompt: "I can run extra patrol routes for you, Warden.",
        response: "Warden Boone: Bring me badges, not promises. I'll mark you down anyway.",
        effects: { factionRep: { civicCouncil: 4 }, npcAffinity: { warden: 3 } },
      },
      {
        id: "warden_ch1_question_law",
        prompt: "Whose law are we enforcing out here, Boone?",
        response: "Warden Boone: Mine, when it's lonely. Council's, when there's a witness.",
        effects: { axes: { truthVsComfort: 1, controlVsFreedom: -1 } },
      },
      {
        id: "warden_ch1_share_drink",
        prompt: "I owe you a drink for the warning shots.",
        response: "Warden Boone: I owe you a clean bounty. Even trade.",
        effects: { npcAffinity: { warden: 5 } },
      },
    ],
    2: [
      {
        id: "warden_ch2_press_outlaws",
        prompt: "Some of those 'outlaws' on your sheet were neighbors last year.",
        response: "Warden Boone: I know. The sheet doesn't.",
        effects: { axes: { truthVsComfort: 2, solidarityVsStatus: 1 }, npcAffinity: { warden: 2 } },
      },
      {
        id: "warden_ch2_volunteer_dirty",
        prompt: "Hand me the bounty nobody else will sign.",
        response: "Warden Boone: I'll forget your name on the receipt.",
        effects: { factionRep: { civicCouncil: 2, workersGuild: -2 }, axes: { controlVsFreedom: 2 } },
      },
    ],
    3: [
      {
        id: "warden_ch3_demand_reform",
        prompt: "Boone, when this is over, you write a different rulebook.",
        response: "Warden Boone: Then you read the first draft. I won't trust myself with it alone.",
        effects: { axes: { controlVsFreedom: -2, solidarityVsStatus: 2 }, npcAffinity: { warden: 4 } },
      },
    ],
  },

  smith: {
    1: [
      {
        id: "smith_ch1_offer_apprentice",
        prompt: "I can shadow you between jobs if you teach me a swing.",
        response: "Smith Hale: Bring scrap, not stories. I'll show you the heat that matters.",
        effects: { npcAffinity: { smith: 4 }, factionRep: { workersGuild: 2 } },
      },
      {
        id: "smith_ch1_press_pricing",
        prompt: "Your prices are higher than they used to be. Why?",
        response: "Smith Hale: Cartel buys our coal twice. We sell the second one at the markup they wrote.",
        effects: { axes: { truthVsComfort: 1, solidarityVsStatus: 2 }, factionRep: { marketCartel: -2 } },
      },
      {
        id: "smith_ch1_smooth_talk",
        prompt: "I'll pay whatever keeps your forge open.",
        response: "Smith Hale: Generous mouth. I'll remember it next time the Cartel asks who's loyal.",
        effects: { factionRep: { marketCartel: 2 }, npcAffinity: { smith: 1 } },
      },
    ],
    2: [
      {
        id: "smith_ch2_back_strike",
        prompt: "If your crew walks, I'll cover the workbench.",
        response: "Smith Hale: I'll write your name on the door. Some doors are worth the names on them.",
        effects: { factionRep: { workersGuild: 6, marketCartel: -3 }, axes: { solidarityVsStatus: 2 } },
      },
      {
        id: "smith_ch2_keep_quiet",
        prompt: "Stay quiet about the strike. It's not your fight yet.",
        response: "Smith Hale: I'll wait. But you'll know when the wait ended.",
        effects: { axes: { controlVsFreedom: 1, solidarityVsStatus: -1 } },
      },
    ],
    3: [
      {
        id: "smith_ch3_forge_relic",
        prompt: "Forge me a relic-tier blade. We'll need it.",
        response: "Smith Hale: Bring the lens. I'll bring the heat.",
        effects: { npcAffinity: { smith: 5 }, factionRep: { workersGuild: 3 } },
      },
    ],
  },

  merchant: {
    1: [
      {
        id: "merchant_ch1_haggle",
        prompt: "Your prices have a story. Tell it short.",
        response: "Trader Nyx: Cartel cut. I keep the difference quiet, and you keep the discount quieter.",
        effects: { factionRep: { marketCartel: -2 }, axes: { truthVsComfort: 1 } },
      },
      {
        id: "merchant_ch1_loyal_buyer",
        prompt: "I'll buy here whether the prices fall or not.",
        response: "Trader Nyx: Loyalty is the only inventory I never restock. Welcome to the ledger.",
        effects: { factionRep: { marketCartel: 3 }, npcAffinity: { merchant: 4 } },
      },
    ],
    2: [
      {
        id: "merchant_ch2_request_offbook",
        prompt: "Anything you don't put on the receipt this week?",
        response: "Trader Nyx: A few things. I'll set a tin aside. You'll know it by the dust.",
        effects: { npcAffinity: { merchant: 3 }, axes: { controlVsFreedom: 1 } },
      },
    ],
  },

  innkeeper: {
    1: [
      {
        id: "innkeeper_ch1_listen",
        prompt: "What's the whisper in the room tonight?",
        response: "Innkeeper Maeb: Three travelers, two patrols, and one rumor that's older than the paint.",
        effects: { axes: { truthVsComfort: 1 }, npcAffinity: { innkeeper: 2 } },
      },
      {
        id: "innkeeper_ch1_pay_forward",
        prompt: "Put one round on me for the next drifter through.",
        response: "Innkeeper Maeb: That's how a frontier stays soft enough to live in. Thanks.",
        effects: { axes: { solidarityVsStatus: 1 }, npcAffinity: { innkeeper: 4 } },
      },
    ],
  },
};

const NORMALIZED_NPC_IDS = Object.keys(DIALOGUE_CHOICES);

export const DIALOGUE_NPC_IDS = NORMALIZED_NPC_IDS;

export function ensureDialogueChoiceState(narrative) {
  if (!narrative || typeof narrative !== "object") return;
  if (!narrative.dialogueChoicesTaken || typeof narrative.dialogueChoicesTaken !== "object") {
    narrative.dialogueChoicesTaken = {};
  }
}

function isChoiceTaken(narrative, choiceId) {
  if (!narrative?.dialogueChoicesTaken) return false;
  return Boolean(narrative.dialogueChoicesTaken[choiceId]);
}

function chapterIndexFromNarrative(narrative) {
  const idx = Number.isFinite(narrative?.chapterIndex) ? narrative.chapterIndex : 0;
  return clamp(idx, 0, 2);
}

function chapterKeysAtOrBelow(chapterIndex) {
  // chapterIndex 0 → [1]; 1 → [1,2]; 2 → [1,2,3]
  return [1, 2, 3].filter((c) => c <= chapterIndex + 1);
}

export function getAvailableDialogueChoices(narrative, npcId) {
  const lib = DIALOGUE_CHOICES[npcId];
  if (!lib) return [];
  const chapterIndex = chapterIndexFromNarrative(narrative);
  // Walk chapters newest-first so high-chapter entries are surfaced before
  // backlogged ch1 prompts. Cap to 3 visible.
  const keys = chapterKeysAtOrBelow(chapterIndex).slice().reverse();
  const out = [];
  for (const k of keys) {
    const list = lib[k] || [];
    for (const choice of list) {
      if (!isChoiceTaken(narrative, choice.id)) out.push({ ...choice, chapter: k });
      if (out.length >= 3) return out;
    }
  }
  return out;
}

export function applyDialogueChoice(narrative, npcId, choiceId) {
  const lib = DIALOGUE_CHOICES[npcId];
  if (!lib) return null;
  let found = null;
  for (const list of Object.values(lib)) {
    for (const c of list) {
      if (c.id === choiceId) { found = c; break; }
    }
    if (found) break;
  }
  if (!found) return null;
  if (isChoiceTaken(narrative, choiceId)) return null;
  ensureDialogueChoiceState(narrative);

  const eff = found.effects || {};
  if (eff.axes && narrative.thematicAxes) {
    for (const [axis, delta] of Object.entries(eff.axes)) {
      if (Number.isFinite(narrative.thematicAxes[axis])) {
        narrative.thematicAxes[axis] = clamp(narrative.thematicAxes[axis] + delta, -100, 100);
      }
    }
  }
  if (eff.factionRep && narrative.factionRep) {
    for (const [f, delta] of Object.entries(eff.factionRep)) {
      narrative.factionRep[f] = clamp((narrative.factionRep[f] || 0) + delta, -100, 100);
    }
  }
  if (eff.npcAffinity && narrative.npcAffinity) {
    for (const [n, delta] of Object.entries(eff.npcAffinity)) {
      narrative.npcAffinity[n] = clamp((narrative.npcAffinity[n] || 0) + delta, -100, 100);
    }
  }
  if (eff.flags && narrative.globalFlags) {
    for (const [flag, value] of Object.entries(eff.flags)) {
      narrative.globalFlags[flag] = value;
    }
  }

  narrative.dialogueChoicesTaken[choiceId] = true;
  if (!Array.isArray(narrative.decisions)) narrative.decisions = [];
  narrative.decisions.push({
    id: `dialogue_${choiceId}`,
    npcId,
    prompt: found.prompt,
    log: found.response,
  });

  return found;
}

export function dialogueChoiceCount(narrative) {
  if (!narrative?.dialogueChoicesTaken) return 0;
  return Object.keys(narrative.dialogueChoicesTaken).length;
}
