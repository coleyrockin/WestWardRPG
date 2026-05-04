// Pure render helpers + ctx-bound factory.
//
// Pure functions are exported directly. Helpers that need a 2D context
// are returned from createRenderHelpers(ctx) so each call uses the
// closured ctx without per-frame parameter overhead.

export function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== "string" || !hex.startsWith("#")) return hex;
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function gradientBucket(value, bucketCount = 12) {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  const clamped = v < 0 ? 0 : v > 1 ? 1 : v;
  return Math.round(clamped * bucketCount) / bucketCount;
}

// Caches CanvasGradient instances. The cache is opaque to the caller —
// they pass a builder fn and a key; caching is opt-in per call.
export function createGradientCache() {
  const store = new Map();
  return {
    get size() { return store.size; },
    has(key) { return store.has(key); },
    clear() { store.clear(); },
    fetch(key, buildFn, enabled) {
      if (!enabled) return buildFn();
      const cached = store.get(key);
      if (cached) return cached;
      const created = buildFn();
      store.set(key, created);
      return created;
    },
  };
}

export function resolveWallProjection(options = {}) {
  const height = Math.max(1, options.height || 1);
  const horizon = Number.isFinite(options.horizon) ? options.horizon : height * 0.5;
  const correctedDist = Math.max(0.0001, options.correctedDist || 0.0001);
  const nearClip = Math.max(0.0001, options.nearClip || 0.24);
  const projectedDist = Math.max(correctedDist, nearClip);
  const wallScale = options.inHouse ? 1.07 : 0.94;
  const wallHeightCap = height * (options.inHouse ? 1.9 : 1.75);
  const wallHeight = Math.min(wallHeightCap, (height * wallScale) / projectedDist);
  const y = Math.floor(horizon - wallHeight * 0.64);

  return {
    projectedDist,
    wallHeight,
    y,
    bottom: y + wallHeight,
  };
}

export function resolveNearWallVisualTreatment(options = {}) {
  const correctedDist = Math.max(0.0001, options.correctedDist || 0.0001);
  const nearClip = Math.max(0.0001, options.nearClip || 0.24);
  const start = nearClip * (options.inHouse ? 2.6 : 3.15);
  const closeness = Math.max(0, Math.min(1, (start - correctedDist) / Math.max(0.0001, start - nearClip * 0.55)));
  if (closeness <= 0) {
    return {
      active: false,
      alpha: 0,
      edgeAlpha: 0,
      sideShade: 0,
    };
  }

  const sideShade = options.side === 1 ? 0.08 : 0.03;
  return {
    active: true,
    alpha: Math.min(options.inHouse ? 0.46 : 0.54, 0.18 + closeness * 0.42),
    edgeAlpha: Math.min(0.26, 0.05 + closeness * 0.2),
    sideShade,
    grainAlpha: Math.min(0.16, 0.04 + closeness * 0.12),
  };
}

// Returns ctx-bound drawing helpers. Each helper closes over ctx so it
// matches the inline-version semantics callers in main.js expect.
export function createRenderHelpers(ctx) {
  function roundedRectPath(x, y, w, h, radius = 6) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fillRoundedRect(x, y, w, h, radius, fillStyle) {
    roundedRectPath(x, y, w, h, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  function strokeRoundedRect(x, y, w, h, radius, strokeStyle, lineWidth = 1) {
    roundedRectPath(x, y, w, h, radius);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function drawSoftPanel(x, y, w, h, options = {}) {
    const radius = options.radius ?? 8;
    const top = options.top ?? "rgba(21, 31, 35, 0.86)";
    const bottom = options.bottom ?? "rgba(8, 14, 18, 0.78)";
    const border = options.border ?? "rgba(255, 221, 153, 0.28)";

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
    ctx.shadowBlur = options.shadowBlur ?? 18;
    ctx.shadowOffsetY = options.shadowOffsetY ?? 8;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    fillRoundedRect(x, y, w, h, radius, grad);
    ctx.shadowColor = "transparent";
    strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, radius, border, 1);
    ctx.restore();
  }

  function fitText(text, maxWidth) {
    const source = String(text ?? "");
    if (ctx.measureText(source).width <= maxWidth) return source;
    let low = 0;
    let high = source.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (ctx.measureText(`${source.slice(0, mid)}...`).width <= maxWidth) low = mid;
      else high = mid - 1;
    }
    return `${source.slice(0, Math.max(0, low))}...`;
  }

  function drawClippedText(text, x, y, maxWidth, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fillText(fitText(text, maxWidth), x, y);
  }

  function drawPillLabel(text, x, y, fillStyle = "rgba(15, 22, 24, 0.74)", textStyle = "#f7e7c7") {
    const padX = 7;
    const w = ctx.measureText(text).width + padX * 2;
    const h = 18;
    fillRoundedRect(x - w / 2, y - h, w, h, 7, fillStyle);
    strokeRoundedRect(x - w / 2 + 0.5, y - h + 0.5, w - 1, h - 1, 7, "rgba(255, 223, 164, 0.28)", 1);
    ctx.fillStyle = textStyle;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y - h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  return {
    roundedRectPath,
    fillRoundedRect,
    strokeRoundedRect,
    drawSoftPanel,
    fitText,
    drawClippedText,
    drawPillLabel,
  };
}
