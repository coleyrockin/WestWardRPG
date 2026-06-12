#!/usr/bin/env node
// M0 backend-capabilities probe runner. Loads scripts/backend-caps.html against
// the dev server on BOTH backends and prints whether the historical WebGL2
// bans (InstancedMesh / shared materials / merged indexed geometry) still hold
// on the current three.js. WebGPU is attempted via Dawn-on-SwiftShader flags;
// if unavailable headless, verify the webgpu column in a real Chrome tab.
//
// Usage: WESTWARD_URL=http://127.0.0.1:5189 node scripts/backend_caps_probe.mjs

import { chromium } from "playwright";

const BASE = process.env.WESTWARD_URL || "http://127.0.0.1:5189";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runCase(force, args) {
  const browser = await chromium.launch({ headless: true, args });
  try {
    const page = await browser.newContext({ viewport: { width: 800, height: 300 } }).then((c) => c.newPage());
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
    await page.goto(`${BASE}/scripts/backend-caps.html?force=${force}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (let i = 0; i < 120; i++) {
      const done = await page.evaluate(() => window.__capsResult ?? null).catch(() => null);
      if (done) return { ...done, errors };
      await sleep(500);
    }
    return { backend: `${force} (timeout)`, cases: {}, errors };
  } finally {
    await browser.close();
  }
}

const webgl = await runCase("webgl", ["--use-gl=angle", "--use-angle=swiftshader"]);
const webgpu = await runCase("webgpu", [
  "--enable-unsafe-webgpu",
  "--enable-features=Vulkan",
  "--use-webgpu-adapter=swiftshader",
]);

for (const r of [webgl, webgpu]) {
  console.log(`\n=== backend: ${r.backend} (three r${r.three ?? "?"}) ===`);
  for (const [k, v] of Object.entries(r.cases)) {
    console.log(`  ${v.pass ? "PASS" : "FAIL"}  ${k.padEnd(16)} litPixels=${v.litPixels}`);
  }
  if (r.errors?.length) console.log(`  pageerrors: ${r.errors.join(" | ")}`);
}
const ctrl = webgl.cases?.control?.pass;
if (!ctrl) {
  console.log("\nNOTE: control failed on webgl — probe page itself broken; do not trust results.");
  process.exit(1);
}
