// Replay recorder. Records player input events + RNG seed per run for
// bug repro and shareable death replays. Stored locally; exportable as JSON.
// Replay playback is read-only — does not affect game state directly.

const MAX_REPLAY_EVENTS = 36000; // ~10 minutes at 60fps of input events
const REPLAY_KEY = "westward-last-replay";

export function createReplaySession(seed = Date.now()) {
  return {
    version: 1,
    seed,
    startedAt: Date.now(),
    events: [], // { t, type, code, dx }
  };
}

export function recordInputEvent(session, type, code, dx = 0) {
  if (!session || session.events.length >= MAX_REPLAY_EVENTS) return;
  session.events.push({ t: Date.now() - session.startedAt, type, code, dx });
}

export function finalizeReplay(session, runStats = {}) {
  if (!session) return null;
  return {
    ...session,
    endedAt: Date.now(),
    durationMs: Date.now() - session.startedAt,
    kills: runStats.kills || 0,
    level: runStats.level || 1,
    victory: Boolean(runStats.victory),
  };
}

export function saveReplayLocally(replay) {
  if (!replay) return;
  try {
    globalThis.localStorage?.setItem(REPLAY_KEY, JSON.stringify(replay));
  } catch {}
}

export function loadLastReplay() {
  try {
    const raw = globalThis.localStorage?.getItem(REPLAY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function exportReplayBlob(replay) {
  if (!replay) return null;
  const json = JSON.stringify(replay, null, 2);
  return new Blob([json], { type: "application/json" });
}

export function getReplaySummary(replay) {
  if (!replay) return null;
  const durationSec = Math.round((replay.durationMs || 0) / 1000);
  const m = Math.floor(durationSec / 60);
  const s = String(durationSec % 60).padStart(2, "0");
  return {
    seed: replay.seed,
    duration: `${m}:${s}`,
    eventCount: replay.events?.length || 0,
    kills: replay.kills || 0,
    level: replay.level || 1,
    victory: Boolean(replay.victory),
  };
}
