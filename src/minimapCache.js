// Minimap static-layer pre-render. Bakes the full world map tile grid to an
// OffscreenCanvas once per region change, then composites it into drawMiniMap
// instead of re-filling every tile every frame. Cuts ~40 fillRect calls/frame.

export function createMinimapCache() {
  return {
    canvas: null,
    ctx: null,
    regionId: null,
    tileRadius: 0,
    dirty: true,
  };
}

// Call when the active region changes to invalidate the baked layer.
export function invalidateMinimapCache(cache) {
  if (cache) cache.dirty = true;
}

// Bake the static tile layer to an OffscreenCanvas.
// Returns true if the cache was rebuilt.
export function bakeMinimapLayer(cache, { map, tileRadius, cells, cell, palette }) {
  if (!cache || !cache.dirty) return false;
  if (typeof OffscreenCanvas === "undefined") return false;

  const size = Math.ceil(cells * cell);
  if (!cache.canvas || cache.canvas.width !== size) {
    cache.canvas = new OffscreenCanvas(size, size);
    cache.ctx = cache.canvas.getContext("2d");
  }
  const offCtx = cache.ctx;
  offCtx.clearRect(0, 0, size, size);

  for (let my = 0; my < cells; my++) {
    for (let mx = 0; mx < cells; mx++) {
      const tile = map[my]?.[mx] ?? 1;
      let color = palette[0];
      if (tile === 1) color = palette[1];
      else if (tile === 2) color = palette[2];
      else if (tile === 3) color = palette[3];
      else if (tile === 4) color = palette[4];
      else if (tile === 5) color = palette[5];
      offCtx.fillStyle = color;
      offCtx.fillRect(mx * cell, my * cell, cell + 0.5, cell + 0.5);
    }
  }

  cache.dirty = false;
  return true;
}

// Returns the baked canvas (or null if not ready/unsupported).
export function getMinimapLayerCanvas(cache) {
  if (!cache || cache.dirty || !cache.canvas) return null;
  return cache.canvas;
}
