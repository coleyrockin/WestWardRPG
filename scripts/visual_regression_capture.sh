#!/bin/bash

# Capture baseline screenshots for each graphics profile and region biome.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT="$PROJECT_ROOT/tools/playwright-client.mjs"
PORT="${WESTWARD_PORT:-5180}"
URL_OVERRIDE="${WESTWARD_URL:-}"
BASE_URL="${URL_OVERRIDE:-http://localhost:${PORT}/index.html}"
OUTPUT_ROOT="$PROJECT_ROOT/output"
OUT_ROOT="${WESTWARD_VISUAL_OUT:-$OUTPUT_ROOT/visual-regression}"
OUTPUT_ROOT="$(node -e 'console.log(require("node:path").resolve(process.argv[1]))' "$OUTPUT_ROOT")"
OUT_ROOT="$(node -e 'console.log(require("node:path").resolve(process.argv[1]))' "$OUT_ROOT")"

case "$OUT_ROOT" in
  "$OUTPUT_ROOT"/*) ;;
  *)
    echo "[ERROR] Refusing to delete visual output outside project output/: $OUT_ROOT" >&2
    exit 1
    ;;
esac

if [ "$OUT_ROOT" = "$OUTPUT_ROOT" ] || [ "$OUT_ROOT" = "/" ] || [ "$OUT_ROOT" = "$PROJECT_ROOT" ] || [ "$OUT_ROOT" = "$HOME" ]; then
  echo "[ERROR] Refusing unsafe visual output path: $OUT_ROOT" >&2
  exit 1
fi

rm -rf "$OUT_ROOT"
mkdir -p "$OUT_ROOT"

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

if [ -z "$URL_OVERRIDE" ] && ! curl -g -sSf "$BASE_URL" >/dev/null 2>&1; then
  cd "$PROJECT_ROOT"
  npx --no-install vite --port "$PORT" --host 127.0.0.1 --strictPort \
    >/tmp/westward-visual-server.log 2>&1 &
  SERVER_PID="$!"

  started=0
  for _ in $(seq 1 30); do
    if curl -g -sSf "$BASE_URL" >/dev/null 2>&1; then
      started=1
      break
    fi
    if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done

  if [ "$started" -ne 1 ]; then
    echo "[ERROR] Visual capture server did not become reachable at $BASE_URL." >&2
    sed 's/^/[server] /' /tmp/westward-visual-server.log >&2 || true
    exit 1
  fi
fi

actions_for() {
  local profile="$1"
  local region="$2"
  local preset_steps=""
  local region_steps=""

  case "$profile" in
    low)
      preset_steps='{"buttons":["bracketleft"],"frames":2}'
      ;;
    balanced)
      preset_steps='{"buttons":[],"frames":2}'
      ;;
    high)
      preset_steps='{"buttons":["bracketright"],"frames":2}'
      ;;
  esac

  case "$region" in
    frontier)
      region_steps='{"smoke":"setRegion","smoke_args":["frontier"],"frames":2}'
      ;;
    ashfall)
      region_steps='{"smoke":"setRegion","smoke_args":["ashfall"],"frames":2}'
      ;;
    ironlantern)
      region_steps='{"smoke":"setRegion","smoke_args":["ironlantern"],"frames":2}'
      ;;
  esac

  printf '{"steps":[{"buttons":["enter"],"frames":2},%s,%s,{"buttons":["w"],"frames":8}]}' "$preset_steps" "$region_steps"
}

capture_profile() {
  local profile="$1"
  local region="$2"
  local out_dir="$OUT_ROOT/${region}-${profile}"
  mkdir -p "$out_dir"
  node "$CLIENT" \
    --url "$BASE_URL" \
    --actions-json "$(actions_for "$profile" "$region")" \
    --click-selector "#start-btn" \
    --iterations 2 \
    --pause-ms 250 \
    --screenshot-dir "$out_dir"
}

for region in frontier ashfall ironlantern; do
  for profile in low balanced high; do
    capture_profile "$profile" "$region"
  done
done

echo "[SUCCESS] Visual regression captures written to: $OUT_ROOT"
