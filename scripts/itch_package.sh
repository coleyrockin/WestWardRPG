#!/bin/bash

# Build an offline-playable ZIP suitable for itch.io or direct distribution.
# The bundle uses relative asset paths (vite --base=./) so it can be unzipped
# anywhere and launched by double-clicking index.html — no server required.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

VERSION="$(node -p "require('./package.json').version")"
OUT_DIR="dist-itch"
ZIP_DIR="releases"
ZIP_NAME="westward-rpg-offline-v${VERSION}.zip"
ZIP_PATH="${ZIP_DIR}/${ZIP_NAME}"

echo "[INFO] Building offline bundle to ${OUT_DIR}/ ..."
rm -rf "$OUT_DIR"
npx vite build --base=./ --outDir "$OUT_DIR"

echo "[INFO] Writing OFFLINE-README.txt ..."
cat > "${OUT_DIR}/OFFLINE-README.txt" <<EOF
WestWardRPG — Offline Edition (v${VERSION})
============================================

Story-first frontier RPG built on a custom Canvas raycasting stack.
This bundle runs entirely in your browser, with no server, no install,
and no account.

How to play
-----------
1. Unzip this archive anywhere on your computer.
2. Double-click index.html. It will open in your default browser.
3. Click "Enter The Wilds" to start a new run.

Saves
-----
Saves are stored in your browser's local storage (per file path, per
browser). Different copies of this folder do not share saves.

Notes
-----
- Online: This bundle pulls Google Fonts (Fraunces, IBM Plex Sans,
  JetBrains Mono) when an internet connection is present. With no
  internet, the game falls back to system fonts and remains fully
  playable.
- Best results: Chrome, Firefox, Edge, or Safari from the last 12 months.
- Hardware: any laptop or desktop from the last 5 years; no GPU required.

Source code: https://github.com/coleyrockin/WestWardRPG
Live web build: https://westward-rpg.vercel.app
License: MIT
EOF

echo "[INFO] Packaging ${ZIP_PATH} ..."
mkdir -p "$ZIP_DIR"
rm -f "$ZIP_PATH"
( cd "$OUT_DIR" && zip -r -q "../${ZIP_PATH}" . )

SIZE=$(du -h "$ZIP_PATH" | awk '{print $1}')
echo "[SUCCESS] Wrote $ZIP_PATH ($SIZE)"
echo "[SUCCESS] To test locally: unzip -d /tmp/westward-test \"$ZIP_PATH\" && open /tmp/westward-test/index.html"
