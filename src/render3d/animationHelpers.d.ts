export type MutableMeshLike = {
  position?: { x?: number; y?: number; z?: number };
  scale?: { y?: number };
  material?: { emissiveIntensity?: number };
  userData?: Record<string, any>;
};

export function idleBob<T extends MutableMeshLike>(mesh: T, t: number, amplitude?: number): T;
export function walkBob<T extends MutableMeshLike>(mesh: T, t: number, speed?: number): T;
export function interactGlow<T extends MutableMeshLike>(mesh: T, t: number): T;
export function hitFlash<T extends MutableMeshLike>(mesh: T, intensity?: number): T;
export function stagger<T extends MutableMeshLike>(mesh: T, direction?: { x?: number; z?: number }, t?: number): T;
export function deathCollapse<T extends MutableMeshLike>(mesh: T, progress?: number): T;
export function rewardPop(scene?: any, position?: { x?: number; y?: number; z?: number }, text?: string): {
  kind: "rewardPop";
  text: string;
  position: { x: number; y: number; z: number };
};
