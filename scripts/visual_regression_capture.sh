#!/bin/bash

# Capture baseline screenshots for each graphics profile and region biome.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT="$PROJECT_ROOT/web_game_playwright_client.mjs"
PORT="${WESTWARD_PORT:-5173}"
BASE_URL="${WESTWARD_URL:-http://localhost:${PORT}/index.html}"
RUN_TAG="$(date +%Y%m%d-%H%M%S)"
OUT_ROOT="$PROJECT_ROOT/output/visual-regression-$RUN_TAG"
mkdir -p "$OUT_ROOT"

if [ ! -f "$CLIENT" ]; then
  echo "[ERROR] Playwright client not found at: $CLIENT" >&2
  exit 1
fi

capture_profile() {
  local profile="$1"
  local region="$2"
  local out_dir="$OUT_ROOT/${region}-${profile}"
  mkdir -p "$out_dir"
  node "$CLIENT" \
    --url "$BASE_URL" \
    --actions-json "{\"steps\":[{\"buttons\":[\"enter\"],\"frames\":2},{\"buttons\":[\"$profile\"],\"frames\":2},{\"buttons\":[\"$region\"],\"frames\":2}]}" \
    --click-selector "#start-btn" \
    --iterations 2 \
    --pause-ms 250 \
    --screenshot-dir "$out_dir" || true
}

for region in frontier ashfall ironlantern; do
  for profile in low balanced high; do
    capture_profile "$profile" "$region"
  done
done

echo "[SUCCESS] Visual regression captures written to: $OUT_ROOT"
