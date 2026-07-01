// Foreground Chrome numbers are authoritative; this headless probe is CI sanity only.
//
// Samples three world poses via Playwright + SwiftShader (CI-compatible partial baseline).
// Owner: re-run the foreground protocol in a real Chrome tab and fill docs/roadmap.md M0 §1.

import { chromium } from "playwright";

const BASE = process.env.WESTWARD_URL || "http://127.0.0.1:5191";
const FRAME_COUNT = 120;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluateWithTimeout(page, fn, arg, timeoutMs = 30000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`evaluate timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([page.evaluate(fn, arg), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

const POSES = [
  { pose: "town", x: 9.5, z: 8.5 },
  { pose: "open_range", x: 60, z: 12 },
  { pose: "marsh", x: 48, z: 16 },
];

async function waitForGameReady(page) {
  const started = Date.now();
  while (Date.now() - started < 120000) {
    const ready = await evaluateWithTimeout(
      page,
      () =>
        window.__spikeReady === true &&
        typeof window.__spike !== "undefined" &&
        typeof window.__westward3dStats === "function",
      undefined,
      5000,
    ).catch(() => false);
    if (ready) return;
    await sleep(200);
  }
  throw new Error("Game failed to initialize (__spike / __westward3dStats) within timeout");
}

async function samplePose(page, { pose, x, z }) {
  await evaluateWithTimeout(
    page,
    ({ px, pz }) => {
      window.__spike.setPos(px, pz);
    },
    { px: x, pz: z },
  );

  await evaluateWithTimeout(
    page,
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
    undefined,
    10000,
  );

  const stats = await evaluateWithTimeout(page, () => window.__westward3dStats());

  const ms120 = await evaluateWithTimeout(
    page,
    async (frameCount) => {
      const t0 = performance.now();
      for (let i = 0; i < frameCount; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return performance.now() - t0;
    },
    FRAME_COUNT,
    60000,
  );

  return {
    pose,
    coords: { x, z },
    backend: stats.backend,
    reducedFidelity: stats.reducedFidelity ?? null,
    frame: stats.frame ?? null,
    ms120: Math.round(ms120 * 10) / 10,
    fps: Math.round((FRAME_COUNT * 1000) / ms120),
    drawCalls: stats.drawCalls ?? stats.calls,
    calls: stats.calls,
    triangles: stats.triangles,
    geometries: stats.geometries ?? null,
    textures: stats.textures ?? null,
    meshCount: stats.meshCount ?? stats.meshes,
    meshes: stats.meshes,
    materialCount: stats.materialCount ?? stats.materials,
    instancedMeshCount: stats.instancedMeshCount ?? stats.instancedMeshes ?? null,
    shadowCasterCount: stats.shadowCasterCount ?? stats.shadowCasters,
    shadowCasters: stats.shadowCasters,
    visibleObjectCount: stats.visibleObjectCount ?? null,
    sceneObjectCount: stats.sceneObjectCount ?? null,
    programs: stats.programs ?? null,
  };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/`, { waitUntil: "commit", timeout: 60000 });
    await page.waitForSelector("#scene");
    await waitForGameReady(page);

    await page.evaluate(() => {
      document.getElementById("title-start")?.click();
      document.getElementById("scene")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await sleep(500);

    const results = [];
    for (const loc of POSES) {
      results.push(await samplePose(page, loc));
    }

    const report = {
      url: BASE,
      probe: "headless-swiftshader",
      frames: FRAME_COUNT,
      note: "Foreground Chrome numbers are authoritative; this headless probe is CI sanity only.",
      poses: results,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message, url: BASE }));
  process.exit(1);
});
