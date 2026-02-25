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
  python3 -m http.server "$PORT" >/tmp/westward-smoke-server.log 2>&1 &
  SERVER_PID="$!"

  started=0
  for _ in $(seq 1 10); do
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
  echo "$html" | grep -q 'id="game"' || return 1
  echo "$html" | grep -Eqi 'Dustward|WestWard' || return 1
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
RUN_TAG="$(date +%Y%m%d-%H%M%S)"
OUT_ROOT="$PROJECT_ROOT/output/qa-smoke-$RUN_TAG"
mkdir -p "$OUT_ROOT"

echo "[INFO] Running smoke suite against: $BASE_URL"
echo "[INFO] Output root: $OUT_ROOT"

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

  if ls "$out_dir"/errors-*.json >/dev/null 2>&1; then
    echo "[ERROR] Runtime errors detected in scenario: $name" >&2
    exit 1
  fi

  echo "[SUCCESS] $name passed"
}

run_scenario "smoke" "test-actions/realism_smoke.json" 3
run_scenario "quest" "test-actions/quest_flow.json" 2
run_scenario "combat" "test-actions/combat_block_flow.json" 2

echo "[SUCCESS] Functional smoke suite completed."
echo "[SUCCESS] Artifacts: $OUT_ROOT"
