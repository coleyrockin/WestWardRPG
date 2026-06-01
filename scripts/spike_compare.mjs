// Engine-rewrite spike comparison capture (roadmap Milestone 1, step 6).
//
// Screenshots the OLD Canvas frontier opening and the NEW Three.js frontier
// opening from the running dev server, side by side, for the decision gate.
//
// Usage: node scripts/spike_compare.mjs   (dev server must be running)
// Env:   WESTWARD_URL (default http://127.0.0.1:5180)

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const BASE = process.env.WESTWARD_URL || "http://127.0.0.1:5180";
const OUT = path.resolve("output/spike-compare");
const VIEWPORT = { width: 1280, height: 720 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withTimeout(promise, label, ms = 20000) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function waitForPagePredicate(page, predicate, label, ms = 15000) {
  const started = Date.now();
  while (Date.now() - started < ms) {
    const ok = await page.evaluate(predicate).catch(() => false);
    if (ok) return true;
    await sleep(200);
  }
  throw new Error(`${label} timed out after ${ms}ms`);
}

async function assertServerAvailable() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${BASE}/index.html`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Dev server is not reachable at ${BASE}. Start it with ` +
      "`npm run dev -- --host 127.0.0.1 --port 5180` before running this script. " +
      `Cause: ${error.message}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

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

function assertImageHasVisiblePixels(outPath, label) {
  const png = PNG.sync.read(fs.readFileSync(outPath));
  let visible = 0;
  const total = png.width * png.height;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const a = png.data[i + 3];
    if (a > 0 && r + g + b > 24) visible++;
  }
  const ratio = visible / Math.max(1, total);
  if (ratio < 0.01) {
    throw new Error(`${label} screenshot is visually blank (${(ratio * 100).toFixed(3)}% visible pixels)`);
  }
}

function analyzeSpikeScreenshot(outPath) {
  const png = PNG.sync.read(fs.readFileSync(outPath));
  let roadLike = 0;
  let overbright = 0;
  const total = png.width * png.height;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const a = png.data[i + 3];
    if (a <= 0) continue;
    if (r > 245 && g > 238 && b > 220) overbright++;
    if (
      r >= 72 && r <= 225 &&
      g >= 48 && g <= 188 &&
      b >= 24 && b <= 150 &&
      r >= g * 0.9 &&
      g >= b * 0.85 &&
      r - b >= 22
    ) roadLike++;
  }
  return {
    roadLikeRatio: roadLike / Math.max(1, total),
    overbrightRatio: overbright / Math.max(1, total),
  };
}

// Capture the canvas element directly first. If Playwright cannot capture the
// element because the animated WebGL canvas never becomes "stable", take a
// viewport screenshot clipped to the canvas bounds. Only then fall back to
// canvas readback, which can stall on GPU-backed canvases.
async function screenshotCanvas(page, selector, outPath) {
  try {
    await page.locator(selector).screenshot({ path: outPath, timeout: 10000 });
    assertImageHasVisiblePixels(outPath, selector);
    return;
  } catch (screenshotError) {
    console.warn(`[warn] element screenshot failed for ${selector}; trying viewport clip: ${screenshotError.message}`);
  }

  try {
    const box = await page.locator(selector).boundingBox({ timeout: 5000 });
    if (box && box.width > 0 && box.height > 0) {
      await page.screenshot({
        path: outPath,
        clip: {
          x: Math.max(0, Math.floor(box.x)),
          y: Math.max(0, Math.floor(box.y)),
          width: Math.floor(box.width),
          height: Math.floor(box.height),
        },
        timeout: 10000,
      });
      assertImageHasVisiblePixels(outPath, selector);
      return;
    }
  } catch (clipError) {
    console.warn(`[warn] viewport clip failed for ${selector}; trying CDP screenshot: ${clipError.message}`);
  }

  try {
    const box = await page.locator(selector).boundingBox({ timeout: 5000 });
    if (box && box.width > 0 && box.height > 0) {
      const client = await page.context().newCDPSession(page);
      const shot = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        clip: {
          x: Math.max(0, Math.floor(box.x)),
          y: Math.max(0, Math.floor(box.y)),
          width: Math.floor(box.width),
          height: Math.floor(box.height),
          scale: 1,
        },
      });
      fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
      assertImageHasVisiblePixels(outPath, selector);
      return;
    }
  } catch (cdpError) {
    console.warn(`[warn] CDP screenshot failed for ${selector}; trying canvas readback: ${cdpError.message}`);
  }

  const dataUrl = await withTimeout(page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return null;
    // For WebGL canvases (#scene) the framebuffer may be cleared after the
    // present unless preserveDrawingBuffer is set. The spike opts in to
    // preserveDrawingBuffer; the Canvas2D game has no such caveat.
    try { return canvas.toDataURL("image/png"); }
    catch { return null; }
  }, selector), `read ${selector} canvas`, 10000);
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error(`screenshotCanvas: could not read canvas ${selector}`);
  }
  const buf = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  fs.writeFileSync(outPath, buf);
  assertImageHasVisiblePixels(outPath, selector);
}

async function captureOld(context) {
  const errors = [];
  const page = await context.newPage();
  collectConsole(page, errors);
  console.log("[capture] old canvas: loading index.html");
  await page.goto(`${BASE}/index.html`, { waitUntil: "load" });
  await page.waitForSelector("#game");
  // Wait for the smoke probe surface — proves the Canvas build booted.
  await waitForPagePredicate(page,
    () => typeof window.__westwardSmoke?.getGameplayState === "function",
    "old canvas smoke probe",
    15000,
  );
  // Start the game by clicking the title start button (Enter is not bound).
  // force: true skips actionability checks — the title menu animates, so the
  // button is never "stable" without it.
  await page.locator("#start-btn").click({ timeout: 10000, force: true });
  await page.evaluate(() => {
    try { document.querySelector("#start-btn")?.click(); } catch {}
  });
  await waitForPagePredicate(page,
    () => window.__westwardSmoke?.getGameplayState?.().mode === "playing",
    "old canvas playing mode",
    5000,
  ).catch(() => null);
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
  console.log("[capture] old canvas: wrote old.png");
  await page.close();
  return errors;
}

async function captureNew(context) {
  const errors = [];
  const page = await context.newPage();
  collectConsole(page, errors);
  console.log("[capture] new spike: loading spikes/render3d.html");
  await withTimeout(page.goto(`${BASE}/spikes/render3d.html`, { waitUntil: "load" }), "load spikes/render3d.html", 15000);
  await page.waitForSelector("#scene");
  await waitForPagePredicate(page, () => window.__spikeReady === true, "new render3d ready signal", 45000);
  await waitForPagePredicate(page, () => Boolean(
    window.__westward3dTest?.getHeroVisibility
      && window.__westward3dTest?.getPlayerVisibility
      && window.__westward3dTest?.getRouteMetrics
      && window.__westward3dTest?.getCompositionMetrics
      && window.__westward3dTest?.getLightingMetrics
      && window.__westward3dTest?.getBeatVisibility
      && window.__westward3dTest?.captureRouteFrame,
  ), "new render3d debug API", 15000);
  const snapshot = await page.evaluate(() => window.__westwardRenderSnapshot || null);
  const loopState = await page.evaluate(() => window.__westward3dLoop || null);
  if (!snapshot || snapshot.kind !== "westward-render-snapshot") {
    errors.push("render3d snapshot missing");
  }
  if (loopState?.phase !== "spawn" || loopState?.objectiveLabel !== "Follow the Road") {
    errors.push(`render3d opening objective changed: ${JSON.stringify({
      phase: loopState?.phase || snapshot?.objective?.phase || "none",
      label: loopState?.objectiveLabel || snapshot?.objective?.title || "none",
    })}`);
  }
  const heroVisibility = await page.evaluate(() => window.__westward3dTest.getHeroVisibility());
  console.log(`[probe] new hero visibility: ${JSON.stringify(heroVisibility)}`);
  const visibleKinds = Object.entries(heroVisibility).filter(([, view]) => view.inFrame).map(([kind]) => kind);
  if (!heroVisibility.jobBoard?.inFrame) {
    errors.push(`render3d first frame does not show Boone's board; visible=${visibleKinds.join(",") || "none"}`);
  }
  const playerVisibility = await page.evaluate(() => window.__westward3dTest.getPlayerVisibility());
  console.log(`[probe] new player visibility: ${JSON.stringify(playerVisibility)}`);
  if (!playerVisibility?.inFrame) {
    errors.push(`render3d first frame hides the player: ${JSON.stringify(playerVisibility)}`);
  }
  const compositionMetrics = await page.evaluate(() => window.__westward3dTest.getCompositionMetrics());
  console.log(`[probe] new composition metrics: ${JSON.stringify(compositionMetrics)}`);
  if (!compositionMetrics?.playerVisible || !compositionMetrics?.boardVisible) {
    errors.push(`render3d composition lost player/board readability: ${JSON.stringify(compositionMetrics)}`);
  }
  if (compositionMetrics?.maxForegroundBlocker?.screenArea > 0.24) {
    errors.push(`render3d has a giant foreground blocker: ${JSON.stringify(compositionMetrics.maxForegroundBlocker)}`);
  }
  const lightingMetrics = await page.evaluate(() => window.__westward3dTest.getLightingMetrics());
  console.log(`[probe] new lighting metrics: ${JSON.stringify(lightingMetrics)}`);
  if (lightingMetrics?.maxPointIntensity > 10.2 || lightingMetrics?.exposure > 1.05 || lightingMetrics?.bloom > 0.2) {
    errors.push(`render3d lighting is outside controlled dusk bounds: ${JSON.stringify(lightingMetrics)}`);
  }
  const openingBeatVisibility = await page.evaluate(() => window.__westward3dTest.getBeatVisibility());
  console.log(`[probe] new opening beat visibility: ${JSON.stringify(openingBeatVisibility)}`);
  if (openingBeatVisibility?.slimeTellVisible || openingBeatVisibility?.roadSlimeVisible) {
    errors.push(`render3d encounter staging is visible too early: ${JSON.stringify(openingBeatVisibility)}`);
  }
  const routeMetrics = await page.evaluate(() => window.__westward3dTest.getRouteMetrics());
  console.log(`[probe] new route metrics: ${JSON.stringify(routeMetrics)}`);
  if (
    !routeMetrics ||
    routeMetrics.totalDistance < 95 ||
    routeMetrics.estimatedPlaySeconds < 240 ||
    routeMetrics.estimatedPlaySeconds > 360 ||
    !routeMetrics.targetKinds?.includes("slimeTell")
  ) {
    errors.push(`render3d route metrics outside first-five-minute target: ${JSON.stringify(routeMetrics)}`);
  }
  const cameraPose = await page.evaluate(() => window.__westward3dTest.getCameraPose?.() || null);
  console.log(`[probe] new camera pose: ${JSON.stringify(cameraPose)}`);
  if (!cameraPose || cameraPose.y < 2.5 || cameraPose.y > 4.8 || cameraPose.fov < 45 || cameraPose.fov > 55) {
    errors.push(`render3d first camera pose outside third-person opening bounds: ${JSON.stringify(cameraPose)}`);
  }
  const fieldMapState = await page.evaluate(() => window.__westward3dTest.getFieldMapState?.() || null);
  console.log(`[probe] new field map state: ${JSON.stringify(fieldMapState?.activeKind || null)} ${JSON.stringify(fieldMapState?.targetLabel || null)}`);
  if (
    !fieldMapState ||
    fieldMapState.activeKind !== "jobBoard" ||
    !fieldMapState.path ||
    !fieldMapState.points?.some((point) => point.kind === "smokeCache") ||
    !Number.isFinite(fieldMapState.distanceToTarget) ||
    !Number.isFinite(fieldMapState.playerPoint?.x)
  ) {
    errors.push(`render3d field map missing first-road route state: ${JSON.stringify(fieldMapState)}`);
  }
  const hudFootprint = await page.evaluate(() => {
    const ids = ["objective", "prompt", "tag", "field-map"];
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    let area = 0;
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el || el.hidden) continue;
      const r = el.getBoundingClientRect();
      area += Math.max(0, r.width) * Math.max(0, r.height);
    }
    return area / Math.max(1, vw * vh);
  });
  console.log(`[probe] new HUD footprint: ${hudFootprint.toFixed(4)}`);
  if (hudFootprint > 0.13) {
    errors.push(`render3d HUD footprint too large: ${(hudFootprint * 100).toFixed(2)}%`);
  }
  await sleep(300);
  const newPath = path.join(OUT, "new.png");
  await screenshotCanvas(page, "#scene", newPath);
  const pixels = analyzeSpikeScreenshot(newPath);
  console.log(`[probe] new pixel gates: ${JSON.stringify(pixels)}`);
  if (pixels.roadLikeRatio < 0.04) {
    errors.push(`render3d road is not visually obvious enough: road-like ratio ${(pixels.roadLikeRatio * 100).toFixed(2)}%`);
  }
  if (pixels.overbrightRatio > 0.09) {
    errors.push(`render3d lamp/sky highlights are overexposed: overbright ratio ${(pixels.overbrightRatio * 100).toFixed(2)}%`);
  }
  const routeFrames = [];
  for (const phase of ["road_sign", "cache_clue", "slime_tell", "wagon_salvage", "return_to_boone", "survey_teaser"]) {
    const frame = await page.evaluate((targetPhase) => window.__westward3dTest.captureRouteFrame(targetPhase), phase);
    routeFrames.push(frame);
  }
  console.log(`[probe] new route frame captures: ${JSON.stringify(routeFrames)}`);
  const missingRouteFrame = routeFrames.find((frame) =>
    !frame?.composition?.playerVisible ||
    !frame?.targetKind ||
    !frame?.beatVisibility?.heroVisibility?.[frame.targetKind]?.inFrame,
  );
  if (missingRouteFrame) {
    errors.push(`render3d route frame lost target visibility: ${JSON.stringify(missingRouteFrame)}`);
  }
  const missingMapFrame = routeFrames.find((frame) => {
    if (!frame?.fieldMap || frame.fieldMap.phase !== frame.phase) return true;
    if (["return_to_boone", "survey_teaser"].includes(frame.phase)) {
      return frame.fieldMap.activeKind !== "returnJobBoard";
    }
    return frame.fieldMap.activeKind !== frame.targetKind;
  });
  if (missingMapFrame) {
    errors.push(`render3d field map lost phase alignment: ${JSON.stringify(missingMapFrame)}`);
  }
  const cacheFrame = routeFrames.find((frame) => frame.phase === "cache_clue");
  if (!cacheFrame?.fieldMap?.warningKinds?.includes("slimeTell")) {
    errors.push(`render3d field map did not warn about the marsh threat near cache: ${JSON.stringify(cacheFrame)}`);
  }
  const slimeTellFrame = routeFrames.find((frame) => frame.phase === "slime_tell");
  if (!slimeTellFrame?.beatVisibility?.slimeTellVisible || slimeTellFrame?.beatVisibility?.roadSlimeVisible) {
    errors.push(`render3d slime tell staging failed: ${JSON.stringify(slimeTellFrame)}`);
  }
  const returnFrame = routeFrames.find((frame) => frame.phase === "survey_teaser");
  if (!returnFrame?.beatVisibility?.boardNoticeVisible || !returnFrame?.beatVisibility?.mapScrapVisible) {
    errors.push(`render3d return reward visuals missing: ${JSON.stringify(returnFrame)}`);
  }
  if (!returnFrame?.fieldMap?.upgraded || !returnFrame?.fieldMap?.completedKinds?.includes("brokenWagon")) {
    errors.push(`render3d field map did not upgrade after survey return: ${JSON.stringify(returnFrame)}`);
  }
  const wagonFrame = routeFrames.find((frame) => frame.phase === "wagon_salvage");
  if (!wagonFrame?.encounter?.defeated || wagonFrame?.encounter?.hitCount !== 3 || wagonFrame?.encounter?.hp !== 0) {
    errors.push(`render3d slime encounter did not require a full three-hit defeat before wagon salvage: ${JSON.stringify(wagonFrame)}`);
  }
  console.log("[capture] new spike: wrote new.png");
  await page.close();
  return errors;
}

async function main() {
  await assertServerAvailable();
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await withTimeout(launch(), "launch browser", 20000);
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
