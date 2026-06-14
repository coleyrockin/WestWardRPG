// Type declarations for waterLayout.js — the Meridian water system geometry.
// Pure numbers (no THREE); spike.js builds meshes + collision from these records.

export interface WaterLook {
  deep: string;
  shallow: string;
  bands: number;
  flow: [number, number];
  waveAmp: number;
  waveScale: number;
  opacity: number;
}

export interface RiverPiece {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  walkable: boolean;
  look: WaterLook;
}

export interface WaterBody {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  look: WaterLook;
}

export interface DamDesc {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
}

export interface WaterAabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  source: string;
}

export interface WaterRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const RIVER_PIECES: RiverPiece[];
export const RESERVOIR: WaterBody;
export const OCEAN: WaterBody;
export const DAM: DamDesc;

export function waterCollisionBoxes(): WaterAabb[];
export function deepWaterRects(): WaterRect[];
export function distPointToRect(px: number, py: number, rect: WaterRect): number;
export function waterBodies(): WaterBody[];
