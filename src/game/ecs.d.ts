// Type declarations for ecs.js — the engine's plain-data ECS.

export interface World {
  nextId: number;
  entities: number[];
  components: Record<string, Record<string, unknown>>;
}

export function createWorld(): World;
export function spawn(world: World, components?: Record<string, unknown>): number;
export function addComponent(world: World, id: number, name: string, value: unknown): void;
export function getComponent<T = any>(world: World, id: number, name: string): T | undefined;
export function removeEntity(world: World, id: number): void;
export function query(world: World, ...names: string[]): number[];
export function cloneWorld(world: World): World;
