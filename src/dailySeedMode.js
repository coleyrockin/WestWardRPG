// Daily seed mode and challenge run flags.
//
// Daily seed: seed = YYYY-MM-DD hash, drives spawn order + region event severity.
// Score: kills × 5 + gold + dayDepth × 100. Local leaderboard (last 30 days).
//
// Challenge runs: ironman (no reload on death), no-shop, no-skill, no-companion.
// Each applies a score multiplier; combined runs stack multiplicatively.

const LEADERBOARD_KEY = "westward-daily-leaderboard";
const MAX_LEADERBOARD_ENTRIES = 30;

// ─── Seeding ─────────────────────────────────────────────────────────────────

export function todaysSeedString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function murmur32(str) {
  let h = 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0);
}

// Returns a 0..1 float from the daily seed + a sub-seed string.
export function dailyRand(dateStr, subSeed) {
  return (murmur32(`${dateStr}:${subSeed}`) % 10000) / 10000;
}

// ─── Challenge run flags ──────────────────────────────────────────────────────

export const CHALLENGE_FLAGS = {
  ironman:     { id: "ironman",     label: "Ironman",     description: "No reload on death. Death ends the run.", scoreMult: 2.0 },
  noShop:      { id: "noShop",      label: "No Shop",     description: "Shop is disabled. Earn only what you find.", scoreMult: 1.4 },
  noSkill:     { id: "noSkill",     label: "No Skills",   description: "Skill tree is locked. Raw stats only.", scoreMult: 1.3 },
  noCompanion: { id: "noCompanion", label: "No Companion",description: "No companion can join.", scoreMult: 1.2 },
};

export function resolveScoreMultiplier(challengeFlags = {}) {
  return Object.entries(CHALLENGE_FLAGS).reduce((mult, [key, def]) => {
    return challengeFlags[key] ? mult * def.scoreMult : mult;
  }, 1.0);
}

// ─── Score ────────────────────────────────────────────────────────────────────

export function computeDailyScore(runStats = {}, challengeFlags = {}) {
  const base = (runStats.kills || 0) * 5 + (runStats.gold || 0) + (runStats.chapterReached || 1) * 100;
  const mult = resolveScoreMultiplier(challengeFlags);
  return Math.round(base * mult);
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function readLeaderboard() {
  try {
    const raw = globalThis.localStorage?.getItem(LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeLeaderboard(entries) {
  try {
    globalThis.localStorage?.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {}
}

export function submitDailyScore(dateStr, score, challengeFlags = {}) {
  const entries = readLeaderboard();
  entries.push({ date: dateStr, score, challengeFlags, submittedAt: Date.now() });
  entries.sort((a, b) => b.score - a.score);
  writeLeaderboard(entries.slice(0, MAX_LEADERBOARD_ENTRIES));
}

export function getLeaderboard() {
  return readLeaderboard();
}

export function getTodaysPersonalBest(dateStr) {
  return readLeaderboard()
    .filter((e) => e.date === dateStr)
    .reduce((best, e) => Math.max(best, e.score), 0);
}

export function clearLeaderboard() {
  writeLeaderboard([]);
}
