#!/bin/bash

# End-to-end functional smoke suite for core gameplay flows.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT="$PROJECT_ROOT/web_game_playwright_client.mjs"
PORT="${WESTWARD_PORT:-5173}"
URL_OVERRIDE="${WESTWARD_URL:-}"

if [ ! -f "$CLIENT" ]; then
  echo "[ERROR] Playwright client not found at: $CLIENT" >&2
  exit 1
fi

SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if ! lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$PROJECT_ROOT"
  # Vite dev serves public/atmosphere.js at /atmosphere.js, which the raw
  # python static server cannot do post-Vite-migration.
  npx --no-install vite --port "$PORT" --host 127.0.0.1 --strictPort \
    >/tmp/westward-smoke-server.log 2>&1 &
  SERVER_PID="$!"

  started=0
  for _ in $(seq 1 30); do
    if curl -g -sSf "http://localhost:${PORT}/index.html" >/dev/null 2>&1; then
      started=1
      break
    fi
    if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done

  if [ "$started" -ne 1 ]; then
    echo "[WARN] Auto-started server did not become reachable on localhost:${PORT}."
    echo "[WARN] Server log:"
    sed 's/^/[server] /' /tmp/westward-smoke-server.log >&2 || true
    echo "[WARN] Continuing URL detection against existing listeners."
    SERVER_PID=""
  fi
fi

is_expected_app_url() {
  local candidate="$1"
  local html
  if ! html="$(curl -g -sSf "$candidate" 2>/dev/null)"; then
    return 1
  fi
  grep -q 'id="game"' <<< "$html" || return 1
  grep -Eqi 'Dustward|WestWard' <<< "$html" || return 1
  return 0
}

detect_url() {
  local candidates=()
  if [ -n "$URL_OVERRIDE" ]; then
    candidates+=("$URL_OVERRIDE")
  fi
  candidates+=(
    "http://localhost:${PORT}/index.html"
    "http://127.0.0.1:${PORT}/index.html"
    "http://[::1]:${PORT}/index.html"
  )

  for candidate in "${candidates[@]}"; do
    if is_expected_app_url "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done

  echo "[ERROR] Could not locate a reachable WestWard game URL on port ${PORT}." >&2
  echo "[ERROR] Start the game server first (npm run start) or set WESTWARD_URL explicitly." >&2
  exit 1
}

BASE_URL="$(detect_url)"

if [ "${WESTWARD_GRADIENT_CACHE:-0}" = "1" ]; then
  if [[ "$BASE_URL" == *"?"* ]]; then
    BASE_URL="${BASE_URL}&gradientCache=1"
  else
    BASE_URL="${BASE_URL}?gradientCache=1"
  fi
  echo "[INFO] Gradient cache forced ON via query-param."
fi

RUN_TAG="$(date +%Y%m%d-%H%M%S)"
OUT_ROOT="$PROJECT_ROOT/output/qa-smoke-$RUN_TAG"
mkdir -p "$OUT_ROOT"

echo "[INFO] Running smoke suite against: $BASE_URL"
echo "[INFO] Output root: $OUT_ROOT"

COMPLETED_SCENARIOS=()

run_scenario() {
  local name="$1"
  local action_file="$2"
  local iterations="$3"
  local out_dir="$OUT_ROOT/$name"

  echo "[INFO] Scenario: $name"
  local attempt=1
  local max_attempts=3
  while true; do
    if node "$CLIENT" \
      --url "$BASE_URL" \
      --actions-file "$PROJECT_ROOT/$action_file" \
      --click-selector "#start-btn" \
      --iterations "$iterations" \
      --pause-ms 250 \
      --screenshot-dir "$out_dir"; then
      break
    fi
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "[ERROR] Scenario failed after ${max_attempts} attempts: $name" >&2
      exit 1
    fi
    echo "[WARN] Scenario launch failed (attempt ${attempt}/${max_attempts}) - retrying..."
    attempt=$((attempt + 1))
    sleep 1
  done

  if ! ls "$out_dir"/state-*.json >/dev/null 2>&1; then
    echo "[ERROR] No state JSON generated for scenario: $name" >&2
    exit 1
  fi

  if ! assert_state_dump_valid "$out_dir" "$name"; then
    exit 1
  fi

  if ls "$out_dir"/errors-*.json >/dev/null 2>&1; then
    echo "[ERROR] Runtime errors detected in scenario: $name" >&2
    exit 1
  fi

  echo "[SUCCESS] $name passed"
  COMPLETED_SCENARIOS+=("$name")
}

assert_state_dump_valid() {
  local out_dir="$1"
  local name="$2"
  node - "$out_dir" "$name" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const dir = process.argv[2];
const name = process.argv[3];
const files = fs.readdirSync(dir)
  .filter((file) => /^state-\d+\.json$/.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

if (!files.length) {
  throw new Error(`${name}: smoke did not write state JSON`);
}

for (const file of files) {
  const fullPath = path.join(dir, file);
  let parsed;
  let raw;
  try {
    raw = fs.readFileSync(fullPath, "utf8");
  } catch (err) {
    throw new Error(`${name}: unable to read ${file}: ${err.message}`);
  }

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${name}: malformed JSON in ${file}: ${err.message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${name}: state payload was not an object in ${file}`);
  }
  if (!parsed.save || typeof parsed.save !== "object" || typeof parsed.save.has_save !== "boolean") {
    throw new Error(`${name}: missing save.has_save in ${file}`);
  }
  if (!parsed.player || typeof parsed.player !== "object") {
    throw new Error(`${name}: missing player snapshot in ${file}`);
  }
}
NODE
}

assert_golden_path_state() {
  local out_dir="$OUT_ROOT/golden-path"
  node - "$out_dir" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const dir = process.argv[2];
const files = fs.readdirSync(dir)
  .filter((file) => /^state-\d+\.json$/.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

if (!files.length) {
  throw new Error("golden-path smoke did not write state JSON");
}

const state = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), "utf8"));
const goldenPath = state.gameplay_feel && state.gameplay_feel.golden_path;
const listings = state.job_board && Array.isArray(state.job_board.listings)
  ? state.job_board.listings
  : [];
const firstListing = listings[0] || {};

if (!goldenPath || goldenPath.jobId !== "frontier_slime_bounty") {
  throw new Error("golden-path smoke missing canonical starter job");
}
if (!state.gameplay_feel?.next_step) {
  throw new Error("golden-path smoke missing first-session next step");
}
const combatReadability = state.gameplay_feel?.combat_readability || state.combat_readability;
if (!combatReadability || typeof combatReadability.threatLine !== "string" || typeof combatReadability.responseLine !== "string") {
  throw new Error("golden-path smoke missing combat readability summary");
}
if (goldenPath.phase !== "available" || !goldenPath.routeLine || !goldenPath.threatLine) {
  throw new Error("golden-path smoke missing route/threat guidance");
}
if (!String(goldenPath.rewardUseLine || "").includes("Slime Core")) {
  throw new Error("golden-path smoke missing crafting-relevant reward copy");
}
if (firstListing.id !== "frontier_slime_bounty" || !firstListing.goldenPath || firstListing.goldenPath.starter !== true) {
  throw new Error("golden-path smoke starter listing is not first and marked as starter");
}
NODE
  echo "[SUCCESS] golden-path assertions passed"
}

assert_golden_path_full_state() {
  local out_dir="$OUT_ROOT/golden-path-full"
  node - "$out_dir" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const dir = process.argv[2];
const files = fs.readdirSync(dir)
  .filter((file) => /^state-\d+\.json$/.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
if (!files.length) {
  throw new Error("golden-path-full smoke did not write state JSON");
}

const state = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), "utf8"));
const goldenPath = state.gameplay_feel && state.gameplay_feel.golden_path;
if (!goldenPath || goldenPath.phase !== "completed" || goldenPath.completed !== true) {
  throw new Error(`golden-path-full expected completed phase, got ${goldenPath?.phase}`);
}
if (!String(goldenPath.houseProofLine || "").includes("Marsh Bounty Notice")) {
  throw new Error("golden-path-full missing Marsh Bounty Notice house proof line");
}

const completedJobIds = state.job_board?.state?.completedJobIds || [];
if (!completedJobIds.includes("frontier_slime_bounty")) {
  throw new Error("golden-path-full did not record completed bounty");
}
const starterProgress = state.job_board?.state?.progressByJobId?.frontier_slime_bounty;
if (!starterProgress || starterProgress.rewardClaimed !== true) {
  throw new Error("golden-path-full did not mark starter reward claimed");
}

const trophies = state.house?.progress_display?.trophies || [];
const notice = trophies.find((t) => t.id === "marsh_bounty_notice");
if (!notice || notice.status !== "completed") {
  throw new Error("golden-path-full missing marsh_bounty_notice trophy on house display");
}

const inventory = state.inventory || {};
if ((inventory["Slime Core"] || 0) < 1 || (inventory.Stone || 0) < 1) {
  throw new Error("golden-path-full reward did not surface Slime Core + Stone in inventory");
}

const memory = state.narrative?.npcMemory;
if (memory?.byNpc?.warden?.recentJobId !== "frontier_slime_bounty") {
  throw new Error("golden-path-full did not record Boone memory for completed starter job");
}
if (!state.gameplay_feel?.next_step) {
  throw new Error("golden-path-full missing gameplay_feel.next_step after completion");
}
NODE
  echo "[SUCCESS] golden-path-full assertions passed"
}

assert_golden_path_memory_state() {
  local out_dir="$OUT_ROOT/golden-path-memory"
  node - "$out_dir" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const dir = process.argv[2];
const files = fs.readdirSync(dir)
  .filter((file) => /^state-\d+\.json$/.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
if (!files.length) {
  throw new Error("golden-path-memory smoke did not write state JSON");
}

const state = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), "utf8"));
if (!state.discovered_pois?.includes("frontier_broken_wagon")) {
  throw new Error("golden-path-memory did not discover Broken Wagon");
}
if ((state.inventory?.["Map Scrap"] || 0) < 1) {
  throw new Error("golden-path-memory did not grant Map Scrap");
}
if (!state.job_board?.state?.completedJobIds?.includes("frontier_slime_bounty")) {
  throw new Error("golden-path-memory did not complete starter bounty");
}
const survey = (state.job_board_choices || []).find((job) => job.id === "frontier_map_survey");
if (!survey || !String(survey.availabilityLine || "").includes("Requires Map Scrap")) {
  throw new Error("golden-path-memory did not surface Old Road Survey follow-up");
}
const boone = state.narrative?.npcMemory?.byNpc?.warden;
if (boone?.recentPoiId !== "frontier_broken_wagon" || boone?.recentJobId !== "frontier_slime_bounty") {
  throw new Error("golden-path-memory did not preserve Boone wagon/job memory");
}
const memory = state.gameplay_feel?.first_road_memory;
if (!memory || !["survey_available", "survey_completed"].includes(memory.phase)) {
  throw new Error(`golden-path-memory expected survey-ready first road memory, got ${memory?.phase}`);
}
if (!String(memory.booneLine || "").match(/map scrap|wagon/i)) {
  throw new Error("golden-path-memory missing Boone road-memory reaction");
}
if (!String(state.run_summary?.firstRoadMemoryLine || "").includes("Old Road Survey")) {
  throw new Error("golden-path-memory missing run summary first-road line");
}
NODE
  echo "[SUCCESS] golden-path-memory assertions passed"
}

assert_old_road_survey_state() {
  local out_dir="$OUT_ROOT/old-road-survey"
  node - "$out_dir" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const dir = process.argv[2];
const files = fs.readdirSync(dir)
  .filter((file) => /^state-\d+\.json$/.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
if (!files.length) {
  throw new Error("old-road-survey smoke did not write state JSON");
}

const state = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), "utf8"));
const completed = state.job_board?.state?.completedJobIds || [];
if (!completed.includes("frontier_slime_bounty") || !completed.includes("frontier_map_survey")) {
  throw new Error("old-road-survey did not complete both starter bounty and Old Road Survey");
}
const surveyProgress = state.job_board?.state?.progressByJobId?.frontier_map_survey;
if (!surveyProgress || surveyProgress.rewardClaimed !== true) {
  throw new Error("old-road-survey did not claim the Old Road Survey reward");
}
if ((state.inventory?.Ashglass || 0) < 1) {
  throw new Error("old-road-survey did not grant Ashglass survey reward");
}
const memory = state.gameplay_feel?.first_road_memory;
if (!memory || memory.phase !== "survey_completed") {
  throw new Error(`old-road-survey expected survey_completed first-road memory, got ${memory?.phase}`);
}
if (!String(memory.houseLine || "").includes("Old Road Survey")) {
  throw new Error("old-road-survey missing house proof copy for completed survey");
}
const trophies = state.house?.progress_display?.trophies || [];
const routeMap = trophies.find((entry) => entry.id === "road_map");
if (!routeMap || routeMap.status !== "completed") {
  throw new Error("old-road-survey missing completed road_map trophy");
}
const boone = state.narrative?.npcMemory?.byNpc?.warden;
if (boone?.recentJobId !== "frontier_map_survey") {
  throw new Error("old-road-survey did not record Boone memory for Old Road Survey");
}
if (!String(state.run_summary?.firstRoadMemoryLine || "").includes("completed Old Road Survey")) {
  throw new Error("old-road-survey missing completed survey run summary line");
}
NODE
  echo "[SUCCESS] old-road-survey assertions passed"
}

EXPECTED_SCENARIOS=(
  golden-path
  golden-path-full
  golden-path-memory
  old-road-survey
  smoke
  quest
  combat
  boss-fight
  weather-heavy
  upgrade-equip
  settings-modal
  mini-boss
  codex
)

run_scenario "golden-path" "test-actions/golden_path_start.json" 1
assert_golden_path_state
run_scenario "golden-path-full" "test-actions/golden_path_full.json" 1
assert_golden_path_full_state
run_scenario "golden-path-memory" "test-actions/golden_path_memory.json" 1
assert_golden_path_memory_state
run_scenario "old-road-survey" "test-actions/old_road_survey.json" 1
assert_old_road_survey_state
run_scenario "smoke" "test-actions/realism_smoke.json" 3
run_scenario "quest" "test-actions/quest_flow.json" 2
run_scenario "combat" "test-actions/combat_block_flow.json" 2
run_scenario "boss-fight" "test-actions/boss_fight_flow.json" 2
run_scenario "weather-heavy" "test-actions/weather_heavy_scene.json" 2
run_scenario "upgrade-equip" "test-actions/upgrade_purchase_equip_flow.json" 2
run_scenario "settings-modal" "test-actions/settings_modal_flow.json" 1
run_scenario "mini-boss" "test-actions/mini_boss_flow.json" 1
run_scenario "codex" "test-actions/codex_flow.json" 1

if [ "${#COMPLETED_SCENARIOS[@]}" -ne "${#EXPECTED_SCENARIOS[@]}" ]; then
  echo "[ERROR] Smoke suite completed ${#COMPLETED_SCENARIOS[@]} of ${#EXPECTED_SCENARIOS[@]} expected scenarios." >&2
  echo "[ERROR] Completed: ${COMPLETED_SCENARIOS[*]}" >&2
  exit 1
fi

for scenario in "${EXPECTED_SCENARIOS[@]}"; do
  if [ ! -d "$OUT_ROOT/$scenario" ]; then
    echo "[ERROR] Expected smoke artifact folder missing: $scenario" >&2
    exit 1
  fi
done

echo "[SUCCESS] Functional smoke suite completed."
echo "[SUCCESS] Artifacts: $OUT_ROOT"
