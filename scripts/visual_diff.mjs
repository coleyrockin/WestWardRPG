#!/usr/bin/env node
// Visual regression diff using pixelmatch.
// Compares every PNG in output/visual-regression/ against a baseline in
// scripts/baselines/. Exits 1 if any diff exceeds the threshold.
//
// Usage: node scripts/visual_diff.mjs [--update]
//   --update: write current captures as new baselines (no comparison)

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const UPDATE = process.argv.includes("--update");
const CAPTURES_DIR = join(import.meta.dirname, "..", "output", "visual-regression");
const BASELINES_DIR = join(import.meta.dirname, "baselines");
const THRESHOLD = 0.08; // max allowed diff ratio (8%)

if (!existsSync(BASELINES_DIR)) mkdirSync(BASELINES_DIR, { recursive: true });

if (!existsSync(CAPTURES_DIR)) {
  console.log("[visual-diff] No captures directory — skipping (run smoke suite first).");
  process.exit(0);
}

const captures = readdirSync(CAPTURES_DIR).filter((f) => f.endsWith(".png"));
if (captures.length === 0) {
  console.log("[visual-diff] No PNG captures found in output/visual-regression/ — skipping.");
  process.exit(0);
}

if (UPDATE) {
  for (const file of captures) {
    const src = join(CAPTURES_DIR, file);
    const dst = join(BASELINES_DIR, file);
    writeFileSync(dst, readFileSync(src));
    console.log(`[visual-diff] Baseline updated: ${file}`);
  }
  console.log(`[visual-diff] ${captures.length} baseline(s) updated.`);
  process.exit(0);
}

let failures = 0;
for (const file of captures) {
  const baselinePath = join(BASELINES_DIR, file);
  if (!existsSync(baselinePath)) {
    console.log(`[visual-diff] SKIP ${file} — no baseline. Run with --update to create one.`);
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
    const diffPath = join(CAPTURES_DIR, `diff_${basename(file)}`);
    writeFileSync(diffPath, PNG.sync.write(diff));
    console.error(`[visual-diff] FAIL ${file} — ${(ratio * 100).toFixed(1)}% pixels differ (threshold ${(THRESHOLD * 100).toFixed(0)}%). Diff: ${diffPath}`);
    failures++;
  } else {
    console.log(`[visual-diff] PASS ${file} — ${(ratio * 100).toFixed(2)}% pixel diff`);
  }
}

if (failures > 0) {
  console.error(`\n[visual-diff] ${failures} visual regression failure(s).`);
  process.exit(1);
}
console.log(`\n[visual-diff] All ${captures.length} captures passed.`);
