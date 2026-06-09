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
// Bound the cache so dynamic, position-keyed gradients can't grow it without
// limit across a long session. FIFO eviction (Map preserves insertion order);
// an evicted key is simply rebuilt on its next miss — no visual change.
const MAX_GRADIENT_CACHE = 256;

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
      if (store.size > MAX_GRADIENT_CACHE) store.delete(store.keys().next().value);
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
      contactAlpha: 0,
      trimAlpha: 0,
      decalAlpha: 0,
      highlightAlpha: 0,
      supportAlpha: 0,
      courseAlpha: 0,
      baseboardAlpha: 0,
    };
  }

  const sideShade = options.side === 1 ? 0.08 : 0.03;
  const exteriorBoost = options.inHouse ? 0.82 : 1;
  return {
    active: true,
    alpha: Math.min(options.inHouse ? 0.46 : 0.54, 0.18 + closeness * 0.42),
    edgeAlpha: Math.min(0.26, 0.05 + closeness * 0.2),
    sideShade,
    grainAlpha: Math.min(0.16, 0.04 + closeness * 0.12),
    contactAlpha: Math.min(0.34, (0.1 + closeness * 0.24) * exteriorBoost),
    trimAlpha: Math.min(0.3, (0.08 + closeness * 0.22) * exteriorBoost),
    decalAlpha: Math.min(0.22, (0.06 + closeness * 0.16) * exteriorBoost),
    highlightAlpha: Math.min(0.2, (0.05 + closeness * 0.12) * exteriorBoost),
    supportAlpha: Math.min(0.2, (0.06 + closeness * 0.16) * exteriorBoost),
    courseAlpha: Math.min(0.18, (0.05 + closeness * 0.14) * exteriorBoost),
    baseboardAlpha: Math.min(0.28, (0.09 + closeness * 0.22) * exteriorBoost),
  };
}

export function resolveRoadSurfaceVisualStyle(options = {}) {
  const width = Math.max(1, options.width || 1);
  const height = Math.max(1, options.height || 1);
  const horizon = Number.isFinite(options.horizon) ? options.horizon : height * 0.5;
  const groundDepth = Math.max(1, height - horizon);
  const normalizedDay = Math.max(0, Math.min(1, Number.isFinite(options.normalizedDay) ? options.normalizedDay : 0.6));
  const regionId = options.regionId || "frontier";
  const base = {
    groundDepth,
    chevronCount: Math.max(5, Math.min(11, Math.round(width / 100))),
    postCount: Math.max(7, Math.min(13, Math.round(width / 86))),
    centerGlowAlpha: 0.1 + normalizedDay * 0.08,
    edgeAlpha: 0.24 + normalizedDay * 0.12,
    chevronAlpha: 0.14 + normalizedDay * 0.1,
    railAlpha: 0.16 + normalizedDay * 0.1,
    accent: "#ffd77b",
  };

  if (regionId === "ashfall") {
    return {
      ...base,
      chevronCount: Math.max(6, base.chevronCount),
      centerGlowAlpha: 0.12 + normalizedDay * 0.1,
      edgeAlpha: 0.3 + normalizedDay * 0.08,
      chevronAlpha: 0.16 + normalizedDay * 0.1,
      railAlpha: 0.18 + normalizedDay * 0.08,
      accent: "#ff9f5f",
    };
  }

  if (regionId === "ironlantern") {
    return {
      ...base,
      chevronCount: Math.max(7, base.chevronCount),
      centerGlowAlpha: 0.15 + normalizedDay * 0.12,
      edgeAlpha: 0.34 + normalizedDay * 0.1,
      chevronAlpha: 0.22 + normalizedDay * 0.12,
      railAlpha: 0.2 + normalizedDay * 0.1,
      accent: "#9bd3ff",
    };
  }

  return base;
}

export function resolveObjectiveStripLayout(options = {}) {
  const margin = Math.max(0, options.margin || 0);
  const topX = Math.max(margin, options.topX || margin);
  const topY = Math.max(margin, options.topY || margin);
  const topW = Math.max(180, options.topW || 320);
  const topH = Math.max(24, options.topH || 72);
  const hasSecondaryLine = Boolean(options.hasSecondaryLine);
  const hasMetaLine = Boolean(options.hasMetaLine);
  const h = hasMetaLine && hasSecondaryLine ? 58 : hasSecondaryLine || hasMetaLine ? 44 : 28;
  const preferredY = topY + topH + 8;
  const canvasHeight = Math.max(1, options.canvasHeight || 1);
  const bottomHudY = Number.isFinite(options.bottomHudY) ? options.bottomHudY : canvasHeight - margin;
  const maxY = Math.max(preferredY, bottomHudY - margin - h);
  const y = Math.min(preferredY, maxY);

  return {
    x: topX,
    y,
    w: topW,
    h,
    primaryY: y + (hasSecondaryLine || hasMetaLine ? 17 : 18),
    metaY: hasMetaLine ? y + 34 : null,
    secondaryY: hasSecondaryLine ? y + (hasMetaLine ? 50 : 34) : null,
  };
}

export function resolveScrollableRowWindow(options = {}) {
  const itemCount = Math.max(0, Math.floor(options.itemCount || 0));
  const selectedIndex = Math.max(0, Math.floor(options.selectedIndex || 0));
  const rowHeight = Math.max(1, options.rowHeight || 1);
  const headerHeight = Math.max(0, options.headerHeight || 0);
  const maxRows = Math.max(1, Math.floor(options.maxRows || itemCount || 1));
  const minRows = Math.max(1, Math.floor(options.minRows || 1));
  const emptyRows = Math.max(0, Math.floor(options.emptyRows ?? 1));
  const availableRows = Math.max(minRows, Math.floor(((options.canvasHeight || 0) - (options.margin || 0) * 2 - headerHeight) / rowHeight));
  const visibleRows = Math.min(itemCount || emptyRows, maxRows, availableRows);
  const firstIndex = Math.max(0, Math.min(
    Math.max(0, itemCount - visibleRows),
    selectedIndex - Math.floor(visibleRows / 2),
  ));
  return {
    visibleRows,
    firstIndex,
    height: visibleRows * rowHeight + headerHeight,
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
