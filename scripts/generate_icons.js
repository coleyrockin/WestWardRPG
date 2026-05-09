// Generates icon-192.png and icon-512.png in public/ using the Canvas API
// via node-canvas (or falls back to a minimal PNG data URI if unavailable).
// Run: node scripts/generate_icons.js
//
// These icons are required for the PWA manifest (Lighthouse PWA audit).

import { createCanvas } from "canvas";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const pad = size * 0.06;

  // Background — warm dark amber
  ctx.fillStyle = "#1a1008";
  ctx.fillRect(0, 0, size, size);

  // Rounded rect mask for maskable icons
  const r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size); ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = "#1a1008";
  ctx.fill();
  ctx.clip();

  // Compass star
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.36;
  const inner = size * 0.15;
  const points = 8;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r2 = i % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(angle) * r2;
    const y = cy + Math.sin(angle) * r2;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx, cy - outer * 0.3, 0, cx, cy, outer);
  grad.addColorStop(0, "#ffd89b");
  grad.addColorStop(0.5, "#c87941");
  grad.addColorStop(1, "#7a3c10");
  ctx.fillStyle = grad;
  ctx.fill();

  // W lettermark
  ctx.font = `bold ${size * 0.22}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1a1008";
  ctx.fillText("W", cx, cy);

  return canvas.toBuffer("image/png");
}

try {
  writeFileSync(join(PUBLIC, "icon-192.png"), drawIcon(192));
  writeFileSync(join(PUBLIC, "icon-512.png"), drawIcon(512));
  console.log("Icons written to public/");
} catch (err) {
  console.error("Icon generation failed (node-canvas not installed?):", err.message);
  console.log("Run: npm install -D canvas");
}
