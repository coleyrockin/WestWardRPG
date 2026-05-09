// Dev telemetry overlay. Toggled by KeyP in dev mode (window.devOverlay = true).
// Draws a compact readout on the canvas: FPS, particle count, spatial grid
// bucket count, ambient drone state, and status effects on the nearest enemy.
//
// Pure helper — no state mutations. Consumers call drawDevOverlay(ctx, metrics)
// at the end of the render pass.

export function createDevMetrics() {
  return {
    fps: 0,
    frameTime: 0,
    particleCount: 0,
    gridBuckets: 0,
    activeEnemies: 0,
    statusEffects: "",
    ambientDrone: "",
    postFxEnabled: false,
    ngPlusLevel: 0,
    fogDiscovery: 0,
  };
}

let frameCount = 0;
let fpsTimer = 0;
let lastFps = 0;

export function tickDevMetrics(metrics, dt) {
  frameCount++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    lastFps = Math.round(frameCount / fpsTimer);
    frameCount = 0;
    fpsTimer = 0;
  }
  metrics.fps = lastFps;
  metrics.frameTime = Math.round(dt * 1000);
}

export function drawDevOverlay(ctx, metrics) {
  if (!metrics) return;
  const lines = [
    `FPS: ${metrics.fps}  dt: ${metrics.frameTime}ms`,
    `Particles: ${metrics.particleCount}  Grid: ${metrics.gridBuckets}  Enemies: ${metrics.activeEnemies}`,
    `PostFX: ${metrics.postFxEnabled ? "ON" : "OFF"}  NG+: ${metrics.ngPlusLevel}  Fog: ${(metrics.fogDiscovery * 100).toFixed(0)}%`,
    metrics.statusEffects ? `Status: ${metrics.statusEffects}` : null,
    metrics.ambientDrone ? `Drone: ${metrics.ambientDrone}` : null,
  ].filter(Boolean);

  const x = 8;
  const lineH = 14;
  const padX = 6;
  const padY = 4;
  const w = 320;
  const h = lines.length * lineH + padY * 2;
  const y = ctx.canvas.height - h - 8;

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = "#0a1014";
  ctx.fillRect(x - padX, y - padY, w, h + padY * 2);
  ctx.globalAlpha = 1;
  ctx.font = "11px monospace";
  ctx.textBaseline = "top";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = i === 0 ? "#8fd0ff" : "#c8d8e0";
    ctx.fillText(lines[i], x, y + i * lineH);
  }
  ctx.restore();
}
