export const QUEST_DEFINITIONS = {
  crystal: {
    id: "crystal",
    title: "1) Valley Survey",
    type: "collect",
    item: "Crystal Shard",
    need: 4,
    reward: { xp: 60, gold: 25 },
    branchTag: "truthVsComfort",
    outcomes: {
      truth: {
        id: "truth",
        label: "Publish the survey",
        summary: "Workers get the map data, while council authority takes the hit.",
        effects: {
          truthVsComfort: 12,
          solidarityVsStatus: 5,
          factionRep: { workersGuild: 6, civicCouncil: -4 },
          npcAffinity: { elder: 3, merchant: -2 },
          flags: { surveyPublished: true },
        },
      },
      comfort: {
        id: "comfort",
        label: "Quiet the findings",
        summary: "The town stays calm, but the frontier stays easier to control.",
        effects: {
          controlVsFreedom: 6,
          truthVsComfort: -10,
          factionRep: { civicCouncil: 5, marketCartel: 3 },
          npcAffinity: { elder: 4, warden: 2 },
          flags: { surveySuppressed: true },
        },
      },
    },
  },
  slime: {
    id: "slime",
    title: "2) Marsh Cleansing",
    type: "defeat",
    enemyType: "slime",
    need: 3,
    reward: { xp: 75, gold: 35, potion: 1 },
    branchTag: "controlVsFreedom",
  },
  wood: {
    id: "wood",
    title: "3) Raise Your House",
    type: "build",
    need: 10,
    needWood: 6,
    needStone: 4,
    reward: { xp: 95, gold: 60 },
    branchTag: "solidarityVsStatus",
    outcomes: {
      solidarity: {
        id: "solidarity",
        label: "Share the plans",
        summary: "The house plans become a workers' template for safer shelter.",
        effects: {
          controlVsFreedom: -4,
          solidarityVsStatus: 12,
          factionRep: { workersGuild: 8, marketCartel: -4 },
          npcAffinity: { smith: 4, innkeeper: 2 },
          flags: { housePlansShared: true },
        },
      },
      status: {
        id: "status",
        label: "Keep the deed private",
        summary: "Your homestead becomes a status symbol instead of a public model.",
        effects: {
          solidarityVsStatus: -10,
          factionRep: { marketCartel: 5, workersGuild: -3 },
          npcAffinity: { merchant: 3, smith: -2 },
          flags: { privateHomesteadDeed: true },
        },
      },
    },
  },
  archive: {
    id: "archive",
    title: "4) The Redacted Archive",
    type: "story",
    need: 4,
    reward: { xp: 120, gold: 80 },
    branchTag: "truthVsComfort",
    outcomes: {
      truth: {
        id: "truth",
        label: "Release the archive",
        summary: "The archive goes public and forces every faction to answer for it.",
        effects: {
          controlVsFreedom: -6,
          truthVsComfort: 18,
          solidarityVsStatus: 6,
          factionRep: { workersGuild: 10, civicCouncil: -6, marketCartel: -8 },
          npcAffinity: { elder: 5, merchant: -6 },
          flags: { archivePublished: true },
        },
      },
      comfort: {
        id: "comfort",
        label: "Seal the archive",
        summary: "Leaders preserve order by keeping the worst pages buried.",
        effects: {
          controlVsFreedom: 10,
          truthVsComfort: -14,
          factionRep: { civicCouncil: 8, marketCartel: 5, workersGuild: -6 },
          npcAffinity: { warden: 5, elder: -3 },
          flags: { archiveSealed: true },
        },
      },
    },
  },
  ashfall_intro: {
    id: "ashfall_intro",
    title: "5) Ashfall Salvage Route",
    type: "collect",
    item: "Ashglass",
    need: 3,
    reward: { xp: 140, gold: 90 },
    branchTag: "solidarityVsStatus",
    outcomes: {
      salvage: {
        id: "salvage",
        label: "Share salvage rights",
        summary: "Ashfall crews get first claim on the route's safest scrap.",
        effects: {
          solidarityVsStatus: 11,
          factionRep: { workersGuild: 9, marketCartel: -5 },
          npcAffinity: { innkeeper: 3, merchant: -3 },
          flags: { ashfallSalvageShared: true },
        },
      },
      monopoly: {
        id: "monopoly",
        label: "License the route",
        summary: "The route becomes profitable, guarded, and harder for locals to use.",
        effects: {
          controlVsFreedom: 5,
          solidarityVsStatus: -9,
          factionRep: { marketCartel: 8, civicCouncil: 3, workersGuild: -5 },
          npcAffinity: { merchant: 4 },
          flags: { ashfallRouteLicensed: true },
        },
      },
    },
  },
  ashfall_boss: {
    id: "ashfall_boss",
    title: "6) Sump Tyrant Shutdown",
    type: "defeat",
    enemyType: "shield_brute",
    need: 1,
    reward: { xp: 220, gold: 150, potion: 1 },
    branchTag: "controlVsFreedom",
    outcomes: {
      mercy: {
        id: "mercy",
        label: "Spare the crew",
        summary: "The tyrant falls, but its workers are protected from retaliation.",
        effects: {
          controlVsFreedom: -12,
          truthVsComfort: 4,
          solidarityVsStatus: 8,
          factionRep: { workersGuild: 10, civicCouncil: -4 },
          npcAffinity: { warden: -3, innkeeper: 4 },
          flags: { tyrantCrewSpared: true },
        },
      },
      purge: {
        id: "purge",
        label: "Purge the operation",
        summary: "Ashfall becomes quieter overnight, mostly because everyone is scared.",
        effects: {
          controlVsFreedom: 13,
          truthVsComfort: -5,
          factionRep: { civicCouncil: 9, workersGuild: -7 },
          npcAffinity: { warden: 5 },
          flags: { tyrantOperationPurged: true },
        },
      },
    },
  },
  lantern_probe: {
    id: "lantern_probe",
    title: "7) Lantern Signal Intercept",
    type: "story",
    need: 3,
    reward: { xp: 160, gold: 105 },
    branchTag: "truthVsComfort",
    outcomes: {
      broadcast: {
        id: "broadcast",
        label: "Broadcast the signal",
        summary: "Lantern citizens hear the intercepted proof before officials can bury it.",
        effects: {
          controlVsFreedom: -5,
          truthVsComfort: 14,
          factionRep: { workersGuild: 7, civicCouncil: -5, marketCartel: -4 },
          npcAffinity: { elder: 2, merchant: -3 },
          flags: { lanternSignalBroadcast: true },
        },
      },
      decrypt: {
        id: "decrypt",
        label: "Decrypt in private",
        summary: "The signal becomes leverage held by a smaller circle.",
        effects: {
          controlVsFreedom: 6,
          truthVsComfort: -8,
          factionRep: { civicCouncil: 6, marketCartel: 3 },
          npcAffinity: { warden: 3, smith: 2 },
          flags: { lanternSignalPrivatized: true },
        },
      },
    },
  },
  lantern_revolt: {
    id: "lantern_revolt",
    title: "8) District Pressure Valve",
    type: "story",
    need: 4,
    reward: { xp: 260, gold: 180 },
    branchTag: "solidarityVsStatus",
    outcomes: {
      guild: {
        id: "guild",
        label: "Back the guild",
        summary: "District pressure turns into organized bargaining power.",
        effects: {
          controlVsFreedom: -6,
          solidarityVsStatus: 18,
          factionRep: { workersGuild: 14, civicCouncil: -6, marketCartel: -8 },
          npcAffinity: { smith: 4, innkeeper: 5 },
          flags: { lanternGuildBacked: true },
        },
      },
      council: {
        id: "council",
        label: "Broker council terms",
        summary: "The revolt cools into reform paperwork and quieter streets.",
        effects: {
          controlVsFreedom: 10,
          truthVsComfort: -4,
          solidarityVsStatus: -8,
          factionRep: { civicCouncil: 10, marketCartel: 4, workersGuild: -6 },
          npcAffinity: { elder: 3, warden: 4 },
          flags: { lanternCouncilTerms: true },
        },
      },
    },
  },
};

export function createInitialQuestState() {
  const out = {};
  for (const definition of Object.values(QUEST_DEFINITIONS)) {
    out[definition.id] = {
      title: definition.title,
      status: definition.id === "crystal" ? "active" : "locked",
      need: definition.need,
      progress: 0,
      needWood: definition.needWood || 0,
      needStone: definition.needStone || 0,
      reward: { ...definition.reward },
      branchTag: definition.branchTag,
    };
  }
  return out;
}

export function updateQuestProgressFromInventoryDataDriven(quests, inventory) {
  const updates = [];
  const crystal = quests.crystal;
  if (crystal && crystal.status === "active") {
    const next = Math.min(crystal.need, inventory["Crystal Shard"] || 0);
    if (next !== crystal.progress) crystal.progress = next;
    if (crystal.progress >= crystal.need) {
      crystal.status = "complete";
      updates.push("Quest complete objective: Valley Survey ready to turn in.");
    }
  }

  const house = quests.wood;
  if (house && (house.status === "active" || house.status === "complete")) {
    const woodPart = Math.min(house.needWood, inventory.Wood || 0);
    const stonePart = Math.min(house.needStone, inventory.Stone || 0);
    const hasAll = woodPart >= house.needWood && stonePart >= house.needStone;
    const wasComplete = house.status === "complete";
    house.progress = woodPart + stonePart;
    if (hasAll && house.status === "active") {
      house.status = "complete";
      updates.push("Quest complete objective: Raise Your House ready to turn in.");
    } else if (!hasAll && wasComplete) {
      house.status = "active";
      updates.push("House materials were used elsewhere. Gather more to finish construction.");
    }
  }

  return updates;
}
