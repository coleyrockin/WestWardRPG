import { chromium } from "playwright";

const BASE = process.env.WESTWARD_URL || "http://127.0.0.1:5180";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(`Connecting to server: ${BASE}`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"]
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  // Forward console messages to help debug
  page.on("console", (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    console.error(`[Browser Error] ${err.toString()}`);
  });

  try {
    console.log("Navigating to page...");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("Waiting for #scene...");
    await page.waitForSelector("#scene");
    
    console.log("Waiting for __spikeReady and __spike...");
    // Wait for the ready signal
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      ready = await page.evaluate(() => window.__spikeReady === true && typeof window.__spike !== "undefined").catch(() => false);
      if (ready) break;
      await sleep(100);
    }
    if (!ready) {
      throw new Error("Game failed to initialize or render within timeout");
    }
    
    console.log("Clicking start...");
    // Click start to clear overlays if any
    await page.evaluate(() => {
      document.getElementById("title-start")?.click();
      document.getElementById("scene")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await sleep(1000);

    const locations = [
      { name: "town", x: 9.5, y: 8.5 },
      { name: "open range", x: 60, y: 12 },
      { name: "marsh", x: 48, y: 16 }
    ];

    console.log("Starting performance measurements...");
    for (const loc of locations) {
      console.log(`Moving to ${loc.name} (${loc.x}, ${loc.y})...`);
      // Set player position
      await page.evaluate(({ x, y }) => {
        window.__spike.setPos(x, y);
      }, { x: loc.x, y: loc.y });
      
      // Let it settle for 30 frames
      for (let i = 0; i < 30; i++) {
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }
      
      // Measure 120 frames
      const perfData = await page.evaluate(async () => {
        const times = [];
        for (let i = 0; i < 120; i++) {
          const t0 = performance.now();
          await new Promise(requestAnimationFrame);
          const t1 = performance.now();
          times.push(t1 - t0);
        }
        
        const stats = window.__westward3dStats();
        return {
          times,
          stats
        };
      });

      const avg = perfData.times.reduce((a, b) => a + b, 0) / perfData.times.length;
      const min = Math.min(...perfData.times);
      const max = Math.max(...perfData.times);
      console.log(`\nLocation: ${loc.name} (${loc.x}, ${loc.y})`);
      console.log(`  Backend: ${perfData.stats.backend}`);
      console.log(`  Avg Frame Time: ${avg.toFixed(2)}ms (${(1000 / avg).toFixed(1)} FPS)`);
      console.log(`  Min/Max: ${min.toFixed(2)}ms / ${max.toFixed(2)}ms`);
      console.log(`  Draw Calls: ${perfData.stats.calls}`);
      console.log(`  Triangles: ${perfData.stats.triangles}`);
      console.log(`  Meshes: ${perfData.stats.meshes}`);
      console.log(`  Shadow Casters: ${perfData.stats.shadowCasters}`);
    }
  } catch (e) {
    console.error("Measurement failed:", e);
  } finally {
    await browser.close();
  }
}

main();
