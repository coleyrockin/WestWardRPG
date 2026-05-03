export const ATTRIBUTE_IDS = ["might", "grit", "cunning", "craft", "speech", "lore"];

export const ATTRIBUTE_LABELS = {
  might: "Might",
  grit: "Grit",
  cunning: "Cunning",
  craft: "Craft",
  speech: "Speech",
  lore: "Lore",
};

export const ORIGINS = {
  exiled_marshal: {
    id: "exiled_marshal",
    label: "Exiled Marshal",
    summary: "A disgraced frontier lawkeeper with a steady guard and hard-earned authority.",
    attributes: { might: 4, grit: 5, cunning: 2, craft: 2, speech: 3, lore: 2 },
    factionLean: "civicCouncil",
  },
  ash_salvager: {
    id: "ash_salvager",
    label: "Ash Salvager",
    summary: "A heat-scarred scavenger who can read scrap, smoke, and bad odds.",
    attributes: { might: 3, grit: 4, cunning: 3, craft: 5, speech: 2, lore: 2 },
    factionLean: "workersGuild",
  },
  guild_errandhand: {
    id: "guild_errandhand",
    label: "Guild Errandhand",
    summary: "A trusted courier who knows who owes favors and which doors stay open.",
    attributes: { might: 2, grit: 2, cunning: 3, craft: 4, speech: 5, lore: 4 },
    factionLean: "marketCartel",
  },
  lantern_defector: {
    id: "lantern_defector",
    label: "Lantern Defector",
    summary: "A former district watcher carrying secrets, coded routes, and a guilty conscience.",
    attributes: { might: 2, grit: 3, cunning: 4, craft: 2, speech: 3, lore: 5 },
    factionLean: "civicCouncil",
  },
};

const ROLE_BY_ATTRIBUTE = {
  might: "Vanguard",
  grit: "Survivor",
  cunning: "Fixer",
  craft: "Artisan",
  speech: "Envoy",
  lore: "Archivist",
};

function clampAttribute(value) {
  if (!Number.isFinite(value)) return 2;
  return Math.max(1, Math.min(10, Math.floor(value)));
}

function cloneAttributes(attributes) {
  const next = {};
  for (const id of ATTRIBUTE_IDS) {
    next[id] = clampAttribute(attributes?.[id]);
  }
  return next;
}

export function createInitialCharacterIdentity(originId = "exiled_marshal") {
  const origin = ORIGINS[originId] || ORIGINS.exiled_marshal;
  return {
    originId: origin.id,
    attributes: cloneAttributes(origin.attributes),
    unspentAttributePoints: 0,
  };
}

export function normalizeCharacterIdentity(source = {}) {
  const origin = ORIGINS[source?.originId] || ORIGINS.exiled_marshal;
  const base = createInitialCharacterIdentity(origin.id);
  const attributes = {
    ...base.attributes,
    ...(source?.attributes && typeof source.attributes === "object" ? cloneAttributes(source.attributes) : {}),
  };
  return {
    originId: origin.id,
    attributes,
    unspentAttributePoints: Math.max(0, Math.floor(Number.isFinite(source?.unspentAttributePoints) ? source.unspentAttributePoints : 0)),
  };
}

export function applyOrigin(identity, originId) {
  const origin = ORIGINS[originId] || ORIGINS.exiled_marshal;
  return {
    ...normalizeCharacterIdentity(identity),
    originId: origin.id,
    attributes: cloneAttributes(origin.attributes),
  };
}

export function spendAttributePoint(identity, attributeId) {
  if (!ATTRIBUTE_IDS.includes(attributeId)) return identity;
  const next = normalizeCharacterIdentity(identity);
  if (next.unspentAttributePoints <= 0 || next.attributes[attributeId] >= 10) return identity;
  next.attributes[attributeId] += 1;
  next.unspentAttributePoints -= 1;
  return next;
}

export function deriveAttributeEffects(identity) {
  const safe = normalizeCharacterIdentity(identity);
  const attrs = safe.attributes;
  return {
    maxHpBonus: attrs.grit * 3,
    staminaReserveBonus: attrs.might + attrs.grit,
    barterBonusPct: Math.max(0, (attrs.speech - 2) * 3),
    craftingYieldPct: Math.max(0, (attrs.craft - 2) * 2),
    loreDiscoveryPct: Math.max(0, (attrs.lore - 2) * 2),
    dodgeFocusPct: Math.max(0, (attrs.cunning - 2) * 2),
  };
}

export function resolveIdentityShopPriceMultiplier(identity) {
  const effects = deriveAttributeEffects(identity);
  return Math.max(0.82, Number((1 - (effects.barterBonusPct || 0) / 100).toFixed(2)));
}

export function buildCharacterIdentitySummary(identity) {
  const safe = normalizeCharacterIdentity(identity);
  const origin = ORIGINS[safe.originId] || ORIGINS.exiled_marshal;
  let topAttribute = ATTRIBUTE_IDS[0];
  for (const id of ATTRIBUTE_IDS) {
    if (safe.attributes[id] > safe.attributes[topAttribute]) topAttribute = id;
  }
  const attributeLine = ATTRIBUTE_IDS
    .map((id) => `${ATTRIBUTE_LABELS[id]} ${safe.attributes[id]}`)
    .join(" / ");
  return {
    originId: origin.id,
    originLabel: origin.label,
    originSummary: origin.summary,
    factionLean: origin.factionLean,
    roleLabel: ROLE_BY_ATTRIBUTE[topAttribute] || "Drifter",
    topAttribute,
    attributeLine,
    effects: deriveAttributeEffects(safe),
  };
}
