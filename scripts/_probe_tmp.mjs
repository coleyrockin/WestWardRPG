import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, args: ["--use-gl=angle","--use-angle=swiftshader"] });
const p = await (await b.newContext({ viewport:{width:1280,height:720} })).newPage();
await p.goto("http://127.0.0.1:5180/spikes/render3d.html",{waitUntil:"load"});
await p.waitForFunction(()=>window.__spikeReady===true,{timeout:30000}).catch(()=>{});
await p.waitForTimeout(1200);
await p.evaluate(()=>{for(const id of["objective","tag","prompt"]){const e=document.getElementById(id);if(e)e.style.display="none";}});
await p.screenshot({ path: "output/_tune_before.png" });
await b.close();
