import { getRegionVisualIdentity } from "./regionVisualIdentity.js";

const VENDOR_SERVICES = {
  merchant: {
    id: "merchant",
    role: "merchant",
    title: "Frontier Provisioner",
    baseLine: "Sells regional staples, basic supplies, and travel stock that should refresh by region.",
  },
  smith: {
    id: "smith",
    role: "smith",
    title: "Smith Varo's Forge",
    baseLine: "Handles repairs, refines, armor fitting, and forge projects.",
  },
  apothecary: {
    id: "apothecary",
    role: "apothecary",
    title: "Mayor Clem's Remedies",
    baseLine: "Trades potion, tonic, and field remedy work tied to local resources.",
  },
  warden: {
    id: "warden",
    role: "job_broker",
    title: "Marshal Boone's Board",
    baseLine: "Pays posted work and points players toward lawful income before larger risks.",
  },
};

// Player-visible reaction lines per vendor × quest outcome. Closes the audit's
// "quest outcomes are barely read back" gap on the vendor surface. Lookup
// priority follows QUEST_PRIORITY (later-chain outcomes dominate earlier
// ones), so a finished campaign reads through its most recent decision first.
const QUEST_PRIORITY = [
  "lantern_revolt",
  "lantern_probe",
  "ashfall_boss",
  "ashfall_intro",
  "archive",
  "wood",
  "crystal",
];

const VENDOR_OUTCOME_REACTIONS = {
  merchant: {
    archive: {
      truth: "Reverend Quill: Archive's loose, and every shipment runs my prices ragged.",
      comfort: "Reverend Quill: They sealed the archive. Clean ledgers. Old prices.",
    },
    wood: {
      solidarity: "Reverend Quill: Half the town's copying your house plans now. Lumber moves daily.",
      status: "Reverend Quill: A private deed walks in — that's a customer with weight.",
    },
    ashfall_intro: {
      salvage: "Reverend Quill: Open Ashfall salvage means cheaper iron and louder mornings.",
      monopoly: "Reverend Quill: Licensed Ashfall route — premium scrap, premium markup.",
    },
    lantern_revolt: {
      guild: "Reverend Quill: Lantern guild backed. Demand for hard goods is up — and so is bargaining.",
      council: "Reverend Quill: Council brokered terms. Slow trade, steady trade.",
    },
  },
  smith: {
    wood: {
      solidarity: "Smith Varo: Saw your plans go around. Clean cuts. Workers' Guild sends regards.",
      status: "Smith Varo: Heard you kept the deed private. Your call. Guild dues remember.",
    },
    archive: {
      truth: "Smith Varo: Public archive means workers walk in arguing. Repairs all day.",
      comfort: "Smith Varo: Sealed archive — the forge stays a forge, not a courtroom.",
    },
    ashfall_intro: {
      salvage: "Smith Varo: Open Ashfall salvage. Cheaper scrap. Forge runs hotter.",
      monopoly: "Smith Varo: Licensed Ashfall route. Premium scrap, premium markup.",
    },
    lantern_revolt: {
      guild: "Smith Varo: Lantern guild backed. Half the apprentices are signing on.",
      council: "Smith Varo: Council terms cooled the streets. Fewer broken tools, fewer broken hands.",
    },
  },
  apothecary: {
    ashfall_boss: {
      mercy: "Mayor Clem: The tyrant's crew lived. Tonic orders steady — they need to keep working.",
      purge: "Mayor Clem: Ashfall purge left fewer mouths to medicate. Strange relief.",
    },
    archive: {
      truth: "Mayor Clem: Public archive opened a lot of old wounds. Demand for tonics is up.",
      comfort: "Mayor Clem: Sealed archive. Fewer nightmares. Fewer paying customers.",
    },
    lantern_revolt: {
      guild: "Mayor Clem: Lantern guild backed. People bargain harder, sleep less. Tonics moving.",
      council: "Mayor Clem: Council brokered terms. Quieter nights. Inventory holds.",
    },
  },
  warden: {
    archive: {
      truth: "Marshal Boone: That archive going public made my job louder.",
      comfort: "Marshal Boone: Sealed archive. Town's calmer. I'll take it.",
    },
    ashfall_boss: {
      mercy: "Marshal Boone: You spared the crew. Now I have witnesses, not corpses.",
      purge: "Marshal Boone: Purge cleaned Ashfall. Less paperwork on my end.",
    },
    lantern_revolt: {
      guild: "Marshal Boone: Lantern guild backed. Patrols thinner where they organize.",
      council: "Marshal Boone: Council terms hold. Streets quieter than they've been all season.",
    },
  },
};

function attributeValue(identity, key) {
  const value = identity?.attributes?.[key];
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

function workstationLevel(house) {
  const value = house?.workstation?.level;
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
}

function resolveOutcomeReactionLine(vendorId, narrative) {
  const table = VENDOR_OUTCOME_REACTIONS[vendorId];
  if (!table) return null;
  const outcomes = (narrative && typeof narrative === "object" && narrative.questOutcomes && typeof narrative.questOutcomes === "object")
    ? narrative.questOutcomes
    : null;
  if (!outcomes) return null;
  for (const questId of QUEST_PRIORITY) {
    if (!table[questId]) continue;
    const outcomeId = outcomes[questId];
    if (!outcomeId) continue;
    const line = table[questId][outcomeId];
    if (typeof line === "string" && line.length > 0) return line;
  }
  return null;
}

export function getVendorServiceProfile(vendorId, {
  regionId = "frontier",
  identity = {},
  house = {},
  narrative = null,
} = {}) {
  const profile = VENDOR_SERVICES[vendorId] || VENDOR_SERVICES.merchant;
  const regionHint = getRegionVisualIdentity(regionId).label;
  const craft = attributeValue(identity, "craft");
  const speech = attributeValue(identity, "speech");
  const level = workstationLevel(house);
  const craftLine = profile.id === "smith"
    ? ` Craft ${craft} and Workbench ${level} should make repair/refine prep easier to read.`
    : "";
  const speechLine = profile.id === "merchant"
    ? ` Speech ${speech} should become the clean hook for barter notes.`
    : "";
  const priceNote = profile.id === "smith" && level >= 2
    ? `Workbench II support: cheaper repair/refine prep is visible here.`
    : `${regionHint} prices should reflect scarcity, jobs, and reputation.`;

  return {
    ...profile,
    regionHint,
    serviceLine: `${profile.baseLine} ${regionHint} service note.${craftLine}${speechLine}`.trim(),
    priceNote,
    outcomeReactionLine: resolveOutcomeReactionLine(profile.id, narrative),
  };
}

export function buildEconomySnapshot({
  regionId = "frontier",
  identity = {},
  house = {},
  activeJob = null,
  narrative = null,
} = {}) {
  const regionHint = getRegionVisualIdentity(regionId).label;
  const craft = attributeValue(identity, "craft");
  const speech = attributeValue(identity, "speech");
  const level = workstationLevel(house);
  const vendorServices = ["merchant", "smith", "apothecary", "warden"]
    .map((id) => getVendorServiceProfile(id, { regionId, identity, house, narrative }));

  return {
    regionId,
    regionHint,
    regionPriceNote: `${regionHint}: prices should react to Speech ${speech}, Craft ${craft}, scarcity, and job outcomes.`,
    activeGoldSinkLine: `Current sinks: repair/refine prep, workbench level ${level} projects, posted job permits, and house upkeep hooks.`,
    jobIncomeLine: activeJob
      ? `${activeJob.title}: ${activeJob.rewardLine}`
      : "No active posted income route.",
    vendorServices,
  };
}
