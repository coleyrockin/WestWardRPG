// Local run history — stores the last N completed run summaries in
// localStorage (separate from saves; each record is tiny). Cleared by
// the player only, not on new-game.

const HISTORY_KEY = "westward-run-history";
const MAX_RUNS = 10;

function readHistory() {
  try {
    const raw = globalThis.localStorage?.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(entries) {
  try {
    globalThis.localStorage?.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded or unavailable — silently drop.
  }
}

export function appendRunRecord(summary, metrics = {}) {
  if (!summary) return;
  const history = readHistory();
  const record = {
    savedAt: Date.now(),
    victory: Boolean(summary.victory),
    endingId: summary.endingId || null,
    durationSeconds: summary.durationSeconds || 0,
    durationLabel: summary.durationLabel || "0:00",
    kills: summary.kills || 0,
    level: summary.level || 1,
    deaths: summary.deaths || 0,
    questOutcomesCount: summary.questOutcomesCount || 0,
    latestDecisions: Array.isArray(summary.latestDecisions) ? summary.latestDecisions : [],
    companion: summary.companion || null,
    // Playtest metrics
    timeToFirstKill: Number.isFinite(metrics.timeToFirstKill) ? Math.floor(metrics.timeToFirstKill) : null,
    timeToFirstJobAccepted: Number.isFinite(metrics.timeToFirstJobAccepted) ? Math.floor(metrics.timeToFirstJobAccepted) : null,
    deathCause: typeof metrics.deathCause === "string" ? metrics.deathCause : null,
    chapterReached: Number.isFinite(metrics.chapterReached) ? metrics.chapterReached : 1,
    settingChanges: Number.isFinite(metrics.settingChanges) ? metrics.settingChanges : 0,
  };
  history.unshift(record);
  writeHistory(history.slice(0, MAX_RUNS));
}

export function getRunHistory() {
  return readHistory();
}

export function clearRunHistory() {
  writeHistory([]);
}

export function formatRunRecord(record) {
  if (!record) return null;
  const outcome = record.victory ? `Won — ${record.endingId || "ending"}` : `Died — ${record.deathCause || "unknown"}`;
  return `Lvl ${record.level} · ${record.durationLabel} · ${outcome} · ${record.kills} kills`;
}
