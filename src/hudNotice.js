const NOTICE_TTL = 5.2;

export function createHudNotice(input = {}) {
  const title = typeof input.title === "string" && input.title.trim() ? input.title.trim() : "World notice";
  const line = typeof input.line === "string" && input.line.trim() ? input.line.trim() : "";
  return {
    kind: typeof input.kind === "string" ? input.kind : "notice",
    title,
    line,
    color: typeof input.color === "string" ? input.color : "#ffd77b",
    ttl: Number.isFinite(input.ttl) ? Math.max(0.5, input.ttl) : NOTICE_TTL,
  };
}

export function createCodexUnlockNotice(entry = {}, tab = "codex") {
  const title = typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : "New entry";
  const tabLabel = typeof tab === "string" && tab.trim() ? tab.trim() : "codex";
  return createHudNotice({
    kind: "codex",
    title: "Codex updated",
    line: `${title} added to ${tabLabel}.`,
    color: "#cdb8ff",
  });
}

export function createFactionRepNotice(input = {}) {
  const factionName = typeof input.factionName === "string" && input.factionName.trim() ? input.factionName.trim() : "Faction";
  const direction = input.direction === "falls" ? "falls" : "rises";
  const label = typeof input.label === "string" && input.label.trim() ? input.label.trim() : "changed";
  const priceLine = typeof input.priceLine === "string" && input.priceLine.trim() ? ` ${input.priceLine.trim()}` : "";
  return createHudNotice({
    kind: "faction",
    title: "Word travels",
    line: `${factionName} standing ${direction} to ${label}.${priceLine}`,
    color: direction === "falls" ? "#ff9f7b" : "#9be0ff",
  });
}
