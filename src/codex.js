// Codex — pure data + state helpers for the lore browser.
//
// Five tabs (regions / enemies / items / factions / ideology) hold
// hand-written entries. Entries unlock on first encounter — the host
// pushes unlock events from the relevant gameplay paths.

export const CODEX_TABS = ["regions", "enemies", "items", "factions", "ideology"];

export const CODEX_ENTRIES = {
  regions: [
    { id: "frontier", title: "The Frontier", body: "A weather-bitten plains stretch where the old order breaks. Patrols still nominally answer to the Council, but the ledger of obligation is overdue everywhere you look." },
    { id: "ashfall", title: "Ashfall Basin", body: "Heat haze, foundry smoke, and the residue of burned manifestos. Crews are tired and unionizing in fragments. Prices on practical goods drift up." },
    { id: "ironlantern", title: "Iron Lantern District", body: "Surveillance towers, brass piping, the Overseer's ledger. The Cartel writes the rules; the chants underneath rewrite them after dark." },
  ],
  enemies: [
    { id: "slime", title: "Slime", body: "Jellied opportunists. Slow, but they spawn near anything organic." },
    { id: "charger", title: "Charger", body: "Telegraphs a dash. Interrupt mid-windup to break their commitment." },
    { id: "spitter", title: "Spitter", body: "Ranged kiters. Punish from outside their kite distance." },
    { id: "brute", title: "Brute", body: "Heavy slow swings, long windup. Big interrupt window if you're ready." },
    { id: "suppressor", title: "Suppressor", body: "Lobs at last-known position. Keep moving and re-engage at a flank." },
    { id: "skirmisher", title: "Skirmisher", body: "Strafes and disengages. Force the corner; they don't dodge well in tight space." },
    { id: "shield_brute", title: "Shield Brute", body: "Frontal block until flanked. Bleed them around the side or parry the wind-up swing." },
  ],
  items: [
    { id: "potion", title: "Potion", body: "Restores a chunk of HP. Don't hoard — drink during the slow stagger windows you earn." },
    { id: "ashglass", title: "Ashglass", body: "Refines the Common saber to Refined-tier. Often dropped by Ashfall mini-bosses." },
    { id: "cipher_lens", title: "Cipher Lens", body: "Pushes a Refined weapon to Relic-tier. Iron Lantern overseers carry shards of these." },
    { id: "smoke", title: "Smoke Canister", body: "Drops nearby enemy targeting for 3s. Use it to reset an overcommitted fight." },
    { id: "flare", title: "Flare", body: "Briefly slows nearby foes and reveals the mini-map. Burn-status synergy on hit." },
    { id: "tonic", title: "Tonic", body: "Slow heal-over-time. Pair with heavy strikes for frost stacking." },
  ],
  factions: [
    { id: "civic_council", title: "Civic Council", body: "Order, ledgers, patrols. Allied: friendly patrols intervene. Hostile: their patrols turn on you." },
    { id: "workers_guild", title: "Workers' Guild", body: "Smiths, machinists, signal operators. Smith tier-up gates start here. Push their solidarity reading and the smith opens up Refined → Relic." },
    { id: "market_cartel", title: "Market Cartel", body: "Prices, contracts, debt. Allied cuts shop prices ~15%. Hostile bumps them ~30%." },
  ],
  ideology: [
    { id: "freedom_strider", title: "Freedom Strider", body: "Cheap dodge cost; weight tilts toward improvisation." },
    { id: "order_keeper", title: "Order Keeper", body: "Faster recovery on charged attacks; weight tilts toward discipline." },
    { id: "truthseeker", title: "Truthseeker", body: "Bonus XP per slime kill while the Ledger is published." },
    { id: "commons_guard", title: "Commons Guard", body: "Multi-target sweep limit increases when the toolCommonsCreated flag is set." },
  ],
};

export function ensureCodexState(state) {
  if (!state) return;
  if (!state.codex) state.codex = { unlocked: {} };
  if (!state.codex.unlocked) state.codex.unlocked = {};
  for (const tab of CODEX_TABS) {
    if (!Array.isArray(state.codex.unlocked[tab])) {
      state.codex.unlocked[tab] = [];
    }
  }
}

export function unlockCodexEntry(state, tab, id) {
  if (!CODEX_ENTRIES[tab]) return false;
  if (!CODEX_ENTRIES[tab].some((e) => e.id === id)) return false;
  ensureCodexState(state);
  if (state.codex.unlocked[tab].includes(id)) return false;
  state.codex.unlocked[tab].push(id);
  return true;
}

export function isCodexEntryUnlocked(state, tab, id) {
  if (!state?.codex?.unlocked?.[tab]) return false;
  return state.codex.unlocked[tab].includes(id);
}

export function listEntriesForTab(state, tab) {
  const entries = CODEX_ENTRIES[tab] || [];
  return entries.map((entry) => ({
    ...entry,
    unlocked: isCodexEntryUnlocked(state, tab, entry.id),
  }));
}

export function getEntry(tab, id) {
  return (CODEX_ENTRIES[tab] || []).find((e) => e.id === id) || null;
}

export function totalCodexProgress(state) {
  const total = CODEX_TABS.reduce((sum, t) => sum + (CODEX_ENTRIES[t]?.length || 0), 0);
  let unlocked = 0;
  if (state?.codex?.unlocked) {
    for (const t of CODEX_TABS) unlocked += (state.codex.unlocked[t] || []).length;
  }
  return { unlocked, total };
}
