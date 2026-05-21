#!/usr/bin/env node
// Visual regression diff using pixelmatch.
// Compares every PNG in output/visual-regression/ against a baseline in
// scripts/baselines/. Exits 1 if any diff exceeds the threshold.
//
// Usage:
//   node scripts/visual_diff.mjs
//   node scripts/visual_diff.mjs --update
//   node scripts/visual_diff.mjs --allow-missing-baselines
//
// --update: write current captures as new baselines (no comparison)
// --allow-missing-baselines: report skipped baselines as non-failing

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { basename, dirname, join, relative } from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const UPDATE = process.argv.includes("--update");
const ALLOW_MISSING_BASELINES = process.argv.includes("--allow-missing-baselines");
const CAPTURES_DIR = join(import.meta.dirname, "..", "output", "visual-regression");
const BASELINES_DIR = join(import.meta.dirname, "baselines");
// Max allowed diff ratio. 10% is the headroom we need for animated elements
// like the watchtower beacon sweep/flicker, NPC walk cycles, enemy windup
// pulses, weather dust/rain particles, and torch glow — none of which freeze
// for screenshots. Real visual regressions (layout, color, missing geometry)
// produce diffs well above this band.
const THRESHOLD = 0.10;

if (!existsSync(BASELINES_DIR)) mkdirSync(BASELINES_DIR, { recursive: true });

if (!existsSync(CAPTURES_DIR)) {
  const message = "[visual-diff] No captures directory — run npm run test:visual:capture first.";
  if (ALLOW_MISSING_BASELINES) {
    console.log(message);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

function collectPngs(root, dir = root) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectPngs(root, fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".png") && !entry.name.startsWith("diff_")) {
      files.push(relative(root, fullPath));
    }
  }
  return files.sort();
}

const captures = collectPngs(CAPTURES_DIR);
if (captures.length === 0) {
  const message = "[visual-diff] No PNG captures found in output/visual-regression/ — run npm run test:visual:capture first.";
  if (ALLOW_MISSING_BASELINES) {
    console.log(message);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

if (UPDATE) {
  for (const file of captures) {
    const src = join(CAPTURES_DIR, file);
    const dst = join(BASELINES_DIR, file);
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, readFileSync(src));
    console.log(`[visual-diff] Baseline updated: ${file}`);
  }
  console.log(`[visual-diff] ${captures.length} baseline(s) updated.`);
  process.exit(0);
}

let failures = 0;
let compared = 0;
let skipped = 0;
for (const file of captures) {
  const baselinePath = join(BASELINES_DIR, file);
  if (!existsSync(baselinePath)) {
    console.log(`[visual-diff] SKIP ${file} — no baseline. Run with --update to create one.`);
    skipped++;
    continue;
  }
  const capturePng  = PNG.sync.read(readFileSync(join(CAPTURES_DIR, file)));
  const baselinePng = PNG.sync.read(readFileSync(baselinePath));
  const { width, height } = capturePng;

  if (baselinePng.width !== width || baselinePng.height !== height) {
    console.error(`[visual-diff] FAIL ${file} — size mismatch (${width}×${height} vs ${baselinePng.width}×${baselinePng.height})`);
    failures++;
    continue;
  }

  const diff = new PNG({ width, height });
  const numDiff = pixelmatch(capturePng.data, baselinePng.data, diff.data, width, height, { threshold: 0.15 });
  const ratio = numDiff / (width * height);

  if (ratio > THRESHOLD) {
    const diffPath = join(CAPTURES_DIR, dirname(file), `diff_${basename(file)}`);
    writeFileSync(diffPath, PNG.sync.write(diff));
    console.error(`[visual-diff] FAIL ${file} — ${(ratio * 100).toFixed(1)}% pixels differ (threshold ${(THRESHOLD * 100).toFixed(0)}%). Diff: ${diffPath}`);
    failures++;
  } else {
    compared++;
    console.log(`[visual-diff] PASS ${file} — ${(ratio * 100).toFixed(2)}% pixel diff`);
  }
}

if (failures > 0) {
  console.error(`\n[visual-diff] ${failures} visual regression failure(s).`);
  process.exit(1);
}
if (compared === 0) {
  const message = `\n[visual-diff] No baseline comparisons completed (${skipped} capture(s) skipped). Review captures, then run npm run test:visual:update.`;
  if (ALLOW_MISSING_BASELINES) {
    console.log(message);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}
if (skipped > 0) {
  console.log(`[visual-diff] ${skipped} capture(s) skipped without baselines.`);
}
console.log(`\n[visual-diff] All ${compared} compared capture(s) passed.`);
