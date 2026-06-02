export const SLIME_TUNING: {
  chaseSpeed: number;
  engageRange: number;
  telegraphTime: number;
  lungeSpeed: number;
  lungeTime: number;
  recoverTime: number;
  contactRadius: number;
};
export interface SlimeState {
  pos: { x: number; z: number };
  mode: "idle" | "chase" | "telegraph" | "lunge" | "recover";
  timer: number;
  lungeDir: { x: number; z: number };
}
export function createSlimeState(pos: { x: number; z: number }): SlimeState;
export function stepSlime(
  state: SlimeState,
  playerPos: { x: number; z: number },
  dt: number,
  tuning?: typeof SLIME_TUNING,
): SlimeState & { contact: boolean; telegraphT: number };
