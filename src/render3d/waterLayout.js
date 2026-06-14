// The Meridian water system — geometry data for the connected bodies (reservoir →
// dam → river → ocean) that fold the existing marsh in as a backwater. ONE source
// of truth: spike.js builds the visual cel-water meshes from these records, and the
// collision proxies are derived from the SAME records, so the water you see is
// exactly the water that blocks. Pure numbers only (no THREE) — unit-testable.
//
// World convention: +x = east, +y = south (placement.y → 3D Z). Flat planes sit at
// y≈0.04. Topology + coordinate rationale: docs/water-plan.md.
//
// River pieces are AXIS-ALIGNED rectangles (a dammed empire river reads canal-like —
// fitting the theme). The upper channel runs the marsh's longitude (x≈47), staying
// well east of the town and ≥6u from every hero waypoint center; the ford and the
// marsh-overlap are walkable; the lower reach steps SE toward Sunken Wash and the sea.

// Each piece: center (x,y) + size (w,h) in world units, a `walkable` flag (the ford),
// and the look params handed to createWater (deep/shallow/bands/flow/waveAmp/waveScale/
// opacity). `y` height is applied by spike (≈0.04). flow is the downstream drift [fx,fy].
export const RIVER_PIECES = [
  // Upper channel — dam outflow down to the marsh's north edge. Deep, blocks.
  { id: "river_upper", x: 47, y: 0, w: 6, h: 26, walkable: false,
    look: { deep: "#27484f", shallow: "#46757a", bands: 3, flow: [0, 0.5], waveAmp: 0.05, waveScale: 1.1, opacity: 0.72 } },
  // The ford — the one walkable crossing, at the marsh's north edge by the slime beat.
  // Shallow + lighter; overlaps the marsh so they read continuous. Walkable (no collision).
  { id: "river_ford", x: 47, y: 15, w: 6, h: 4, walkable: true,
    look: { deep: "#5a8a86", shallow: "#7ba89e", bands: 2, flow: [0, 0.3], waveAmp: 0.03, waveScale: 1.2, opacity: 0.58 } },
  // Lower reach — steps SE out of the marsh toward Sunken Wash. The downstream stretch
  // carries the empire's runoff: a sickly industrial tint (the environmental-cost seed).
  { id: "river_low1", x: 55, y: 25, w: 8, h: 12, walkable: false,
    look: { deep: "#2c4a48", shallow: "#4a7268", bands: 3, flow: [0.4, 0.5], waveAmp: 0.05, waveScale: 1.0, opacity: 0.74 } },
  { id: "river_low2", x: 65, y: 39, w: 9, h: 20, walkable: false,
    look: { deep: "#37402c", shallow: "#5c6a3e", bands: 3, flow: [0.4, 0.6], waveAmp: 0.05, waveScale: 0.95, opacity: 0.76 } },
  { id: "river_low3", x: 74, y: 57, w: 11, h: 22, walkable: false,
    look: { deep: "#333c2a", shallow: "#586438", bands: 3, flow: [0.4, 0.6], waveAmp: 0.06, waveScale: 0.9, opacity: 0.78 } },
];

// The Cross Reservoir — the lake behind the dam. Calm, long-wavelength, deep. Far N,
// blocks (you can't walk into the lake). Clears the gravesite (15,-4) by 13u south.
export const RESERVOIR = { id: "reservoir", x: 47, y: -32, w: 46, h: 30,
  look: { deep: "#1c3640", shallow: "#2e525c", bands: 3, flow: [0, 0.05], waveAmp: 0.03, waveScale: 0.5, opacity: 0.84 } };

// The Ocean at the southern boundary — its SW edge is the Drift coast. Deepest, coolest,
// biggest slow swells. Far S (beyond Sunken Wash); a hard boundary, blocks.
export const OCEAN = { id: "ocean", x: 50, y: 88, w: 240, h: 28,
  look: { deep: "#16323f", shallow: "#234a55", bands: 3, flow: [0.1, 0.12], waveAmp: 0.09, waveScale: 0.45, opacity: 0.88 } };

// The Cross Dam — rusted-chrome hero landmark spanning the river mouth at the
// reservoir's south edge, facing the territory. The Water War flashpoint.
export const DAM = { id: "cross_dam", x: 47, y: -15, width: 16, depth: 2.4, height: 5.2 };

// Build collision AABBs (worldProxies shape) for everything that BLOCKS: deep river
// pieces (not the ford), the reservoir, the ocean, and the dam wall. spike concats
// these onto the placement-derived proxy list at assembly time.
function rectAabb(x, y, w, h, source) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: y - h / 2, maxZ: y + h / 2, source };
}

export function waterCollisionBoxes() {
  const boxes = [];
  for (const p of RIVER_PIECES) {
    if (p.walkable) continue; // the ford is crossable
    boxes.push(rectAabb(p.x, p.y, p.w, p.h, p.id));
  }
  boxes.push(rectAabb(RESERVOIR.x, RESERVOIR.y, RESERVOIR.w, RESERVOIR.h, RESERVOIR.id));
  boxes.push(rectAabb(OCEAN.x, OCEAN.y, OCEAN.w, OCEAN.h, OCEAN.id));
  // Dam wall — thin in y, spans the mouth; bridges the reservoir and the river.
  boxes.push(rectAabb(DAM.x, DAM.y, DAM.width, DAM.depth + 1.5, DAM.id));
  return boxes;
}

// All blocking water rectangles as {id,x,y,w,h} — used by the clearance test.
export function deepWaterRects() {
  const rects = RIVER_PIECES.filter((p) => !p.walkable).map((p) => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h }));
  rects.push({ id: RESERVOIR.id, x: RESERVOIR.x, y: RESERVOIR.y, w: RESERVOIR.w, h: RESERVOIR.h });
  rects.push({ id: OCEAN.id, x: OCEAN.x, y: OCEAN.y, w: OCEAN.w, h: OCEAN.h });
  return rects;
}

// Distance from a point to the EDGE of an axis-aligned rect (0 if inside). Lets the
// test assert deep water stays clear of protected waypoints.
export function distPointToRect(px, py, rect) {
  const dx = Math.max(rect.x - rect.w / 2 - px, 0, px - (rect.x + rect.w / 2));
  const dy = Math.max(rect.y - rect.h / 2 - py, 0, py - (rect.y + rect.h / 2));
  return Math.hypot(dx, dy);
}

// All water bodies that get a cel-water mesh (river pieces + reservoir + ocean), in
// draw order. spike maps each to createWater(look) + a position.
export function waterBodies() {
  return [...RIVER_PIECES, RESERVOIR, OCEAN];
}
