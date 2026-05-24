// Engine-rewrite spike comparison capture (roadmap Milestone 1, step 6).
//
// Screenshots the OLD Canvas frontier opening and the NEW Three.js frontier
// opening from the running dev server, side by side, for the decision gate.
//
// Usage: node scripts/spike_compare.mjs   (dev server must be running)
// Env:   WESTWARD_URL (default http://127.0.0.1:5173)

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.WESTWARD_URL || "http://127.0.0.1:5173";
const OUT = path.resolve("output/spike-compare");
const VIEWPORT = { width: 1280, height: 720 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const common = { headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] };
  const plans = [
    { options: { ...common, channel: "chrome" }, tries: 3 },
    { options: common, tries: 2 },
  ];
  let lastError = null;
  for (const plan of plans) {
    for (let i = 1; i <= plan.tries; i++) {
      try { return await chromium.launch(plan.options); }
      catch (e) { lastError = e; await sleep(500); }
    }
  }
  throw lastError;
}

function collectConsole(page, bucket) {
  page.on("console", (m) => { if (m.type() === "error") bucket.push(m.text()); });
  page.on("pageerror", (e) => bucket.push(String(e)));
}

async function captureOld(context) {
  const errors = [];
  const page = await context.newPage();
  collectConsole(page, errors);
  await page.goto(`${BASE}/index.html`, { waitUntil: "load" });
  await page.waitForSelector("#game");
  // start the game and settle the frontier opening
  await page.keyboard.press("Enter");
  await sleep(400);
  await page.evaluate(() => {
    try { window.__westwardSmoke?.setRegion?.("frontier"); } catch {}
  });
  await sleep(600);
  await page.locator("#game").screenshot({ path: path.join(OUT, "old.png") });
  await page.close();
  return errors;
}

async function captureNew(context) {
  const errors = [];
  const page = await context.newPage();
  collectConsole(page, errors);
  await page.goto(`${BASE}/render3d.html`, { waitUntil: "load" });
  await page.waitForSelector("#scene");
  await page.waitForFunction(() => window.__spikeReady === true, { timeout: 15000 });
  const snapshot = await page.evaluate(() => window.__westwardRenderSnapshot || null);
  if (!snapshot || snapshot.kind !== "westward-render-snapshot" || snapshot.objective?.phase !== "accept_bounty") {
    errors.push(`render3d snapshot missing or wrong phase: ${snapshot?.objective?.phase || "none"}`);
  }
  await sleep(300);
  await page.locator("#scene").screenshot({ path: path.join(OUT, "new.png") });
  await page.close();
  return errors;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    const oldErrors = await captureOld(context);
    const newErrors = await captureNew(context);
    console.log(`[ok] old.png + new.png written to ${OUT}`);
    if (oldErrors.length) console.warn(`[warn] OLD console errors:\n  ${oldErrors.join("\n  ")}`);
    if (newErrors.length) {
      console.error(`[fail] NEW (spike) console errors:\n  ${newErrors.join("\n  ")}`);
      process.exitCode = 1;
    } else {
      console.log("[ok] spike rendered with no console errors");
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
