// Browser smoke for the Three.js first-road loop.
//
// Usage: node scripts/render3d_loop_smoke.mjs
// Env:   WESTWARD_URL (default http://127.0.0.1:5173)

import { chromium } from "playwright";

const BASE = process.env.WESTWARD_URL || "http://127.0.0.1:5173";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launch() {
  return chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
}

function collectConsole(page, bucket) {
  page.on("console", (m) => { if (m.type() === "error") bucket.push(m.text()); });
  page.on("pageerror", (e) => bucket.push(String(e)));
}

async function getState(page) {
  return page.evaluate(() => window.__westward3dTest?.getLoopState?.() || null);
}

async function expectPhase(page, phase) {
  const state = await getState(page);
  if (!state) throw new Error(`missing __westward3dTest state while expecting ${phase}`);
  if (state.phase !== phase) throw new Error(`expected phase ${phase}, got ${state.phase}`);
  return state;
}

async function waitForPhase(page, phase, timeout = 2500) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await getState(page);
    if (state?.phase === phase) return state;
    await sleep(50);
  }
  return expectPhase(page, phase);
}

async function interact(page, kind) {
  return page.evaluate((targetKind) => window.__westward3dTest.interact(targetKind), kind);
}

async function main() {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  collectConsole(page, errors);

  try {
    await page.goto(`${BASE}/render3d.html`, { waitUntil: "load" });
    await page.waitForSelector("#scene");
    await page.waitForFunction(() => window.__spikeReady === true, { timeout: 15000 });
    await page.waitForFunction(() => Boolean(window.__westward3dTest), { timeout: 5000 });

    const before = await page.evaluate(() => window.__westward3dTest.getPlayerPosition());
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", key: "w", bubbles: true })));
    await page.waitForTimeout(500);
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW", key: "w", bubbles: true })));
    const after = await page.evaluate(() => window.__westward3dTest.getPlayerPosition());
    const moved = Math.hypot(after.x - before.x, after.z - before.z);
    if (moved < 0.1) {
      console.warn(`[warn] key-input movement probe did not move in headless browser: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
    }

    await expectPhase(page, "spawn");
    await interact(page, "jobBoard");
    await expectPhase(page, "accept_bounty");
    const modalOpen = await page.evaluate(() => !document.getElementById("board-modal")?.hidden);
    if (!modalOpen) throw new Error("job board modal did not open");

    await page.evaluate(() => window.__westward3dTest.acceptBoard());
    await expectPhase(page, "road_walk");
    await interact(page, "smokeCache");
    await expectPhase(page, "cache_open");
    await waitForPhase(page, "slime_fight");
    await interact(page, "roadSlime");
    await expectPhase(page, "wagon_inspect");
    await interact(page, "brokenWagon");
    await expectPhase(page, "scrap_earned");
    const reward = await getState(page);
    if (reward.inventoryPreview["Map Scrap"] !== 1) throw new Error("Map Scrap reward missing");
    await waitForPhase(page, "return_to_boone");
    await interact(page, "jobBoard");
    await expectPhase(page, "survey_offered");

    if (errors.length) throw new Error(`console errors:\n${errors.join("\n")}`);
    console.log("[ok] render3d first-road loop smoke passed");
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
