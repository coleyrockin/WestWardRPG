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

// Pull a single canvas frame via toDataURL inside the page, then write it
// from Node. Avoids Playwright's screenshot path which waits on the page
// being idle — Westward's RAF loop never goes idle.
async function screenshotCanvas(page, selector, outPath) {
  const dataUrl = await page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return null;
    // For WebGL canvases (#scene) the framebuffer may be cleared after the
    // present unless preserveDrawingBuffer is set. The spike opts in to
    // preserveDrawingBuffer; the Canvas2D game has no such caveat.
    try { return canvas.toDataURL("image/png"); }
    catch { return null; }
  }, selector);
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error(`screenshotCanvas: could not read canvas ${selector}`);
  }
  const buf = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  fs.writeFileSync(outPath, buf);
}

async function captureOld(context) {
  const errors = [];
  const page = await context.newPage();
  collectConsole(page, errors);
  await page.goto(`${BASE}/index.html`, { waitUntil: "load" });
  await page.waitForSelector("#game");
  // Wait for the smoke probe surface — proves the Canvas build booted.
  await page.waitForFunction(
    () => typeof window.__westwardSmoke?.getGameplayState === "function",
    { timeout: 15000 },
  );
  // Start the game by clicking the title start button (Enter is not bound).
  // force: true skips actionability checks — the title menu animates, so the
  // button is never "stable" without it.
  await page.locator("#start-btn").click({ timeout: 10000, force: true });
  await sleep(400);
  // Force the frontier opening pose deterministically.
  await page.evaluate(() => {
    try { window.__westwardSmoke?.setRegion?.("frontier"); } catch {}
  });
  await sleep(600);

  // Apples-to-apples gate: the OLD frame must be real in-world Dustward
  // gameplay, not title, save, settings, job-board, or any other modal.
  let probe = null;
  for (let i = 0; i < 20; i++) {
    probe = await page.evaluate(() => window.__westwardSmoke?.getGameplayState?.() || null);
    if (probe && probe.mode === "playing" && !probe.hasModalOpen) break;
    await sleep(150);
  }
  if (!probe) {
    errors.push("old capture: smoke probe unavailable");
  } else {
    if (probe.mode !== "playing") errors.push(`old capture: mode "${probe.mode}" (expected "playing")`);
    if (probe.hasModalOpen) errors.push("old capture: a modal is open (title/save/settings/job-board)");
    if (probe.regionId !== "frontier") errors.push(`old capture: region "${probe.regionId}" (expected "frontier")`);
    if (probe.inHouse) errors.push("old capture: player is inside the house, not in-world");
    if (probe.regionInterior) errors.push(`old capture: inside region interior "${probe.regionInterior}"`);
  }
  console.log(`[probe] old gameplay state: ${JSON.stringify(probe)}`);

  await screenshotCanvas(page, "#game", path.join(OUT, "old.png"));
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
  await screenshotCanvas(page, "#scene", path.join(OUT, "new.png"));
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
    if (oldErrors.length) {
      console.error(`[fail] OLD (canvas) capture issues:\n  ${oldErrors.join("\n  ")}`);
      process.exitCode = 1;
    } else {
      console.log("[ok] old canvas captured in real Dustward in-world gameplay");
    }
    if (newErrors.length) {
      console.error(`[fail] NEW (spike) issues:\n  ${newErrors.join("\n  ")}`);
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
