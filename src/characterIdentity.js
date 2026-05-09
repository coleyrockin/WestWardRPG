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

// Ten-flavor identity archetypes. Each maps to a recognizable build that
// NPCs and the job board can react to. Threshold-based: at least one
// attribute must exceed 6 and a secondary condition must hold.
export const IDENTITY_ARCHETYPES = [
  { id: "outlaw_gunslinger",     label: "Outlaw Gunslinger",    condition: (a, _, f) => a.might >= 6 && a.cunning >= 4 && f?.marketCartel < -10 },
  { id: "heavy_bounty_hunter",   label: "Heavy Bounty Hunter",  condition: (a) => a.might >= 6 && a.grit >= 6 },
  { id: "survivalist_scout",     label: "Survivalist Scout",    condition: (a) => a.grit >= 7 && a.cunning >= 4 },
  { id: "silver_tongue_trader",  label: "Silver-Tongued Trader",condition: (a) => a.speech >= 7 && a.craft >= 4 },
  { id: "relic_hunter",          label: "Relic Hunter",         condition: (a, c) => a.lore >= 6 && (c || []).length > 0 },
  { id: "alchemist_drifter",     label: "Alchemist Drifter",    condition: (a) => a.craft >= 7 && a.lore >= 4 },
  { id: "faction_loyalist",      label: "Faction Loyalist",     condition: (a, _, f) => f && Math.max(Math.abs(f.civicCouncil||0), Math.abs(f.workersGuild||0), Math.abs(f.marketCartel||0)) >= 40 },
  { id: "cursed_wanderer",       label: "Cursed Wanderer",      condition: (a, c) => (c || []).length >= 2 },
  { id: "local_hero",            label: "Local Hero",           condition: (a, _, f) => f && (f.civicCouncil||0) >= 30 && a.speech >= 4 },
  { id: "greedy_opportunist",    label: "Greedy Opportunist",   condition: (a) => a.cunning >= 6 && a.speech >= 5 },
];

// NPC reaction lines keyed by archetype id.
export const ARCHETYPE_NPC_REACTIONS = {
  outlaw_gunslinger:    "Mayor Clem: You carry trouble like it's a habit. Keep it pointed away from town.",
  heavy_bounty_hunter:  "Marshal Boone: Heavy plate, steady aim. You're built for the long contracts.",
  survivalist_scout:    "Nora Knuckles: You move like someone who's slept rough more nights than beds. I respect that.",
  silver_tongue_trader: "Reverend Quill: Ah — someone who understands that words set prices before swords do.",
  relic_hunter:         "Professor Cogwheel: Cursed relics are your business? Bold. Let me take a look at what you're carrying.",
  alchemist_drifter:    "Professor Cogwheel: Craft that high with a lore head behind it — you're actually building something.",
  faction_loyalist:     "Mayor Clem: The valley's taken note of where your loyalty sits. So have we.",
  cursed_wanderer:      "Mayor Clem: Two curses and still standing? Either you're very lucky or very stubborn.",
  local_hero:           "Nora Knuckles: Word's gone around. People here remember what you did. Buy yourself a drink.",
  greedy_opportunist:   "Reverend Quill: Sharp eyes, sharper tongue. You'd have made a decent ledger-keeper. Emphasis on 'would have.'",
};

// Job board listings unlocked by archetype recognition.
export const ARCHETYPE_JOB_HOOKS = {
  outlaw_gunslinger:   { id: "archetype_outlaw_job",   title: "High-Risk Frontier Escort",   hint: "Someone your reputation says won't flinch. Decent pay, dangerous road." },
  heavy_bounty_hunter: { id: "archetype_bounty_job",   title: "Named-Target Bounty Contract", hint: "A named target with a history. Heavy contract for heavy work." },
  survivalist_scout:   { id: "archetype_scout_job",    title: "Unmarked Trail Survey",        hint: "No road signs where you're going. Your kind of job." },
  silver_tongue_trader:{ id: "archetype_trader_job",   title: "Negotiation Specialist Needed",hint: "A deal that needs someone who can read a room. Good fee, no violence required." },
  relic_hunter:        { id: "archetype_relic_job",    title: "Ruin Retrieval — High Risk",   hint: "Something was left in a ruin that shouldn't stay there. You know the type." },
  alchemist_drifter:   { id: "archetype_alchm_job",    title: "Formula Recovery Contract",    hint: "Lost craft documentation. Hard to find, harder to understand. You probably can." },
};

// Resolves the current player archetype from identity + cursed items + faction rep.
export function resolvePlayerArchetype(identity, curses = [], factionRep = {}) {
  const safe = normalizeCharacterIdentity(identity);
  const a = safe.attributes;
  for (const arch of IDENTITY_ARCHETYPES) {
    if (arch.condition(a, curses, factionRep)) return arch;
  }
  return null;
}

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
