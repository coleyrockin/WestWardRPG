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
    title: "Elder Nira's Remedies",
    baseLine: "Trades potion, tonic, and field remedy work tied to local resources.",
  },
  warden: {
    id: "warden",
    role: "job_broker",
    title: "Marshal Boone's Board",
    baseLine: "Pays posted work and points players toward lawful income before larger risks.",
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

export function getVendorServiceProfile(vendorId, {
  regionId = "frontier",
  identity = {},
  house = {},
} = {}) {
  const profile = VENDOR_SERVICES[vendorId] || VENDOR_SERVICES.merchant;
  const regionHint = getRegionVisualIdentity(regionId).label;
  const craft = attributeValue(identity, "Craft");
  const speech = attributeValue(identity, "Speech");
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
  };
}

export function buildEconomySnapshot({
  regionId = "frontier",
  identity = {},
  house = {},
  activeJob = null,
} = {}) {
  const regionHint = getRegionVisualIdentity(regionId).label;
  const craft = attributeValue(identity, "Craft");
  const speech = attributeValue(identity, "Speech");
  const level = workstationLevel(house);
  const vendorServices = ["merchant", "smith", "apothecary", "warden"]
    .map((id) => getVendorServiceProfile(id, { regionId, identity, house }));

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
