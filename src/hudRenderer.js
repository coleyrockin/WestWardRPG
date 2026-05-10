// HUD rendering primitives extracted from main.js.
//
// createHudRenderer({ ctx, helpers, hexToRgba }) returns ctx-bound functions
// that draw HUD panels. Callers pass data in as plain params — no closures
// over game state. This keeps the HUD draw layer easy to test and easy to
// move when the rest of the renderer extraction lands.

const TAU = Math.PI * 2;

function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function createHudRenderer({ ctx, helpers, hexToRgba }) {
  if (!ctx) throw new Error("createHudRenderer requires ctx");
  if (!helpers) throw new Error("createHudRenderer requires render helpers");
  if (typeof hexToRgba !== "function") throw new Error("createHudRenderer requires hexToRgba");

  const { fillRoundedRect, strokeRoundedRect, drawSoftPanel, drawClippedText, fitText } = helpers;

  function drawHudBar(x, y, w, h, ratio, bg, fg, label) {
    fillRoundedRect(x, y, w, h, Math.min(6, h / 2), bg);
    const safeRatio = clamp01(ratio);
    if (safeRatio > 0) {
      const fillW = Math.max(h * 0.35, w * safeRatio);
      fillRoundedRect(x, y, fillW, h, Math.min(6, h / 2), fg);
    }
    const shine = ctx.createLinearGradient(x, y, x, y + h);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.28)");
    shine.addColorStop(0.45, "rgba(255, 255, 255, 0.05)");
    shine.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    fillRoundedRect(x, y, w, h, Math.min(6, h / 2), shine);
    strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, Math.min(6, h / 2), "rgba(255, 245, 216, 0.18)", 1);
    ctx.fillStyle = "#fff4d8";
    ctx.font = "bold 11px Georgia";
    ctx.fillText(fitText(label, w - 12), x + 6, y + h - 4);
  }

  function drawHudNoticePanel(notice, x, y, w) {
    if (!notice) return 0;
    const color = notice.color || "#ffd77b";
    const alpha = clamp01(notice.ttl / 0.45);
    const h = 28;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawSoftPanel(x, y, w, h, {
      top: "rgba(35, 28, 42, 0.86)",
      bottom: "rgba(10, 14, 18, 0.78)",
      border: hexToRgba(color, 0.5),
      shadowBlur: 9,
      shadowOffsetY: 3,
    });
    ctx.fillStyle = color;
    ctx.fillRect(x + 8, y + 7, 3, h - 14);
    ctx.beginPath();
    ctx.arc(x + 19, y + 14, 4.5, 0, TAU);
    ctx.fill();
    ctx.font = "bold 10px Georgia";
    drawClippedText(notice.title || "Notice", x + 31, y + 11, w - 42, "#fff1d0");
    ctx.font = "10px Georgia";
    drawClippedText(notice.line || "", x + 31, y + 23, w - 42, "#f1e5c8");
    ctx.restore();
    return h + 6;
  }

  function drawDiscoveryBannerPanel(banner, layout) {
    if (!banner) return;
    const lines = Array.isArray(banner.lines) ? banner.lines.slice(0, 3) : [];
    const { x, y, w, h } = layout;
    const color = banner.color || "#d8bc6a";
    const alpha = clamp01(banner.ttl / 0.45);

    ctx.save();
    ctx.globalAlpha = alpha;
    drawSoftPanel(x, y, w, h, {
      top: "rgba(30, 26, 18, 0.86)",
      bottom: "rgba(10, 14, 16, 0.82)",
      border: "rgba(255, 226, 150, 0.5)",
      shadowBlur: 18,
      shadowOffsetY: 8,
    });
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillRect(x + 10, y + 12, 4, h - 24);
    ctx.beginPath();
    ctx.arc(x + 24, y + 25, 6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha;

    ctx.font = "bold 14px Georgia";
    drawClippedText(banner.title || "Discovery found", x + 38, y + 23, w - 52, "#fff1d0");
    ctx.font = "10px Georgia";
    drawClippedText(banner.subtitle || "Roadside discovery", x + 38, y + 38, w - 52, "#d8c7a2");

    let lineY = y + 56;
    const finalLines = lines.length ? lines : [banner.rewardLine || "New clue recorded"];
    for (const line of finalLines) {
      ctx.font = lineY === y + 56 ? "bold 11px Georgia" : "10px Georgia";
      drawClippedText(line, x + 18, lineY, w - 34, lineY === y + 56 ? "#ffd77b" : "#f1e5c8");
      lineY += 14;
    }
    ctx.restore();
  }

  function drawInteractionPromptPanel(prompt, layout) {
    if (!prompt) return;
    const { x, y, w, h } = layout;
    const urgent = prompt.urgency === "high" || prompt.urgency === "urgent";
    const color = prompt.color || "#ffd77b";

    drawSoftPanel(x, y, w, h, {
      top: urgent ? "rgba(54, 38, 18, 0.86)" : "rgba(16, 24, 24, 0.82)",
      bottom: urgent ? "rgba(24, 15, 8, 0.82)" : "rgba(8, 13, 15, 0.76)",
      border: hexToRgba(color, urgent ? 0.62 : 0.46),
      shadowBlur: 10,
      shadowOffsetY: 4,
    });
    ctx.fillStyle = color;
    ctx.fillRect(x + 10, y + 8, 3, h - 16);
    ctx.font = "bold 12px Georgia";
    drawClippedText(prompt.title || "E: Use", x + 22, y + 18, w - 34, color);
    ctx.font = "10px Georgia";
    drawClippedText(prompt.line || prompt.label || "", x + 22, y + 33, w - 34, "#f1e5c8");
  }

  return {
    drawHudBar,
    drawHudNoticePanel,
    drawDiscoveryBannerPanel,
    drawInteractionPromptPanel,
  };
}

// Pure layout helpers (no ctx required) — exported so tests can verify
// placement without spinning up a canvas.

export function resolveDiscoveryBannerLayout(options = {}) {
  const canvasWidth = Math.max(1, options.canvasWidth || 1);
  const margin = Math.max(0, options.margin || 0);
  const bottomHudY = Number.isFinite(options.bottomHudY) ? options.bottomHudY : canvasWidth;
  const lineCount = Math.max(1, Math.min(3, Math.floor(options.lineCount || 1)));
  const compact = canvasWidth < 560;
  const w = Math.min(compact ? canvasWidth - margin * 2 : 520, canvasWidth - margin * 2);
  const h = 54 + lineCount * 14;
  const x = Math.round((canvasWidth - w) / 2);
  const y = Math.max(margin + 98, Math.round(bottomHudY - h - 10));
  return { x, y, w, h };
}

export function resolveInteractionPromptLayout(options = {}) {
  const canvasWidth = Math.max(1, options.canvasWidth || 1);
  const margin = Math.max(0, options.margin || 0);
  const bottomHudY = Number.isFinite(options.bottomHudY) ? options.bottomHudY : canvasWidth;
  const compact = canvasWidth < 560;
  const w = Math.min(compact ? canvasWidth - margin * 2 : 360, canvasWidth - margin * 2);
  const h = compact ? 40 : 44;
  const x = Math.round((canvasWidth - w) / 2);
  const y = Math.max(margin + 92, Math.round(bottomHudY - h - 8));
  return { x, y, w, h };
}
