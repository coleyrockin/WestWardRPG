// World-echo lines for the moment of decision. Surfaced as a HUD notice +
// chat log entry from confirmQuestOutcomeChoice, so the player feels the
// outcome ripple immediately — vendors and NPCs read it back later through
// their own reaction tables. Closes the audit's "world barely reads quest
// outcomes back" gap on the moment-of-decision surface.

const ECHOES = {
  crystal: {
    truth: {
      title: "Word travels",
      line: "The survey published. Workers carry maps. Council aides scowl in the margins.",
      color: "#9be0ff",
    },
    comfort: {
      title: "Word travels",
      line: "The survey quieted. Streets stay legible. The frontier stays controllable.",
      color: "#ffd77b",
    },
  },
  wood: {
    solidarity: {
      title: "Word travels",
      line: "House plans went to the workers. Smiths copy the cuts. Roofs go up faster.",
      color: "#9be0ff",
    },
    status: {
      title: "Word travels",
      line: "The deed stayed private. Your homestead becomes a name on a map.",
      color: "#ffd77b",
    },
  },
  archive: {
    truth: {
      title: "Word travels",
      line: "The archive is loose. Vendors raise prices. Patrols stiffen at the corners.",
      color: "#ff9f7b",
    },
    comfort: {
      title: "Word travels",
      line: "The archive sealed. Streets quieter. Ledgers calmer. Old debts buried.",
      color: "#ffd77b",
    },
  },
  ashfall_intro: {
    salvage: {
      title: "Word travels",
      line: "Salvage rights shared. Ashfall crews move freer. Iron prices loosen.",
      color: "#9be0ff",
    },
    monopoly: {
      title: "Word travels",
      line: "Salvage route licensed. Premium scrap. Locked gates. Quieter mornings.",
      color: "#ffd77b",
    },
  },
  ashfall_boss: {
    mercy: {
      title: "Word travels",
      line: "The tyrant fell. The crew lived. Witnesses speak in the daylight now.",
      color: "#9be0ff",
    },
    purge: {
      title: "Word travels",
      line: "The operation purged. Ashfall is quieter — mostly because everyone is afraid.",
      color: "#ff9f7b",
    },
  },
  lantern_probe: {
    broadcast: {
      title: "Word travels",
      line: "The signal broadcast. Lantern citizens hear the proof before officials can bury it.",
      color: "#9be0ff",
    },
    decrypt: {
      title: "Word travels",
      line: "The signal stayed private. A smaller circle now holds the leverage.",
      color: "#ffd77b",
    },
  },
  lantern_revolt: {
    guild: {
      title: "Word travels",
      line: "Lantern guild backed. District pressure becomes organized bargaining.",
      color: "#9be0ff",
    },
    council: {
      title: "Word travels",
      line: "Council brokered terms. The revolt cools into reform paperwork.",
      color: "#ffd77b",
    },
  },
};

export function resolveQuestOutcomeEcho(questId, outcomeId) {
  if (typeof questId !== "string" || typeof outcomeId !== "string") return null;
  const table = ECHOES[questId];
  if (!table) return null;
  const entry = table[outcomeId];
  if (!entry) return null;
  return { title: entry.title, line: entry.line, color: entry.color };
}
