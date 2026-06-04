#!/usr/bin/env node
// Golden-image gate for the 3D signature look (docs/roadmap.md §2, §7).
//
// The Canvas visual gate (visual_diff.mjs) never covered the 3D engine. This
// captures the Frontier first-road frame from the NPR render path and pixel-
// matches it against a committed baseline so the cel + ink-edge + bloom + grade
// look can't silently regress (a broken post pipeline → flat/black frame trips
// it immediately).
//
// Loads render3d.html?visual=1, which freezes the frame (film grain off) for a
// deterministic capture. Screenshots the <canvas> only, so DOM chrome can't
// pollute the render diff.
//
// Usage:
//   WESTWARD_URL=http://127.0.0.1:5180 node scripts/render3d_visual_capture.mjs
//   ... --update    # write the current capture as the baseline
//
// Headless Chromium uses the same SwiftShader WebGL2 backend as CI, so the
// WebGPURenderer falls back to WebGL2 here exactly as it will in qa.yml.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const BASE = process.env.WESTWARD_URL || "http://127.0.0.1:5180";
const UPDATE = process.argv.includes("--update");
const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "output", "visual-render3d", "frontier-dusk.png");
const BASELINE = join(ROOT, "scripts", "baselines", "render3d", "frontier-dusk.png");
// Grain is disabled for the capture, so the frame is near-static. 10% headroom
// absorbs the idle slime pulse + minor SwiftShader float nondeterminism; a real
// regression (look/pipeline break) blows well past it.
const THRESHOLD = 0.1;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForPagePredicate(page, predicate, label, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const ok = await page.evaluate(predicate).catch(() => false);
    if (ok) return true;
    await sleep(200);
  }
  throw new Error(`${label} timed out after ${timeout}ms`);
}

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  try {
    const page = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }).then((c) => c.newPage());
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto(`${BASE}/spikes/render3d.html?visual=1`, { waitUntil: "load" });
    const ready = await waitForPagePredicate(page, () => window.__spikeReady === true, "render3d ready signal", 120000)
      .then(() => true)
      .catch(() => false);
    if (!ready) throw new Error("render3d never signalled __spikeReady");
    // settle a couple of frames so bloom/godrays/edge passes are fully resolved
    await page.waitForTimeout(800);
    if (errors.length) throw new Error(`console/page errors during capture: ${errors.slice(0, 3).join(" | ")}`);

    // Hide DOM chrome so the gate captures the pure render, then full-viewport
    // screenshot — page.screenshot skips the element-stability wait that an
    // always-animating canvas never satisfies under slow SwiftShader.
    await page.evaluate(() => {
      for (const id of ["objective", "tag", "prompt", "board-modal", "field-map"]) {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      }
    });
    mkdirSync(dirname(OUT), { recursive: true });
    await page.screenshot({ path: OUT });
    return OUT;
  } finally {
    await browser.close();
  }
}

const out = await capture();
console.log(`[render3d-visual] captured ${out}`);

if (UPDATE) {
  mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(BASELINE, readFileSync(out));
  console.log(`[render3d-visual] baseline updated: ${BASELINE}`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(`[render3d-visual] no baseline at ${BASELINE} — run with --update to create it.`);
  process.exit(1);
}

const cap = PNG.sync.read(readFileSync(out));
const base = PNG.sync.read(readFileSync(BASELINE));
if (cap.width !== base.width || cap.height !== base.height) {
  console.error(`[render3d-visual] FAIL — size mismatch ${cap.width}×${cap.height} vs ${base.width}×${base.height}`);
  process.exit(1);
}
const diff = new PNG({ width: cap.width, height: cap.height });
const numDiff = pixelmatch(cap.data, base.data, diff.data, cap.width, cap.height, { threshold: 0.15 });
const ratio = numDiff / (cap.width * cap.height);
if (ratio > THRESHOLD) {
  const diffPath = join(dirname(OUT), "diff_frontier-dusk.png");
  writeFileSync(diffPath, PNG.sync.write(diff));
  console.error(`[render3d-visual] FAIL — ${(ratio * 100).toFixed(1)}% pixels differ (threshold ${(THRESHOLD * 100).toFixed(0)}%). Diff: ${diffPath}`);
  process.exit(1);
}
console.log(`[render3d-visual] PASS — ${(ratio * 100).toFixed(2)}% pixel diff`);
