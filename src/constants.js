export const TAU = Math.PI * 2;
export const FOV = Math.PI / 2.75;
export const MAX_RAY_DIST = 26;
export const TEXTURE_SIZE = 96;
export const PLAYER_COLLISION_RADIUS = 0.18;
export const WALL_RENDER_NEAR_CLIP = 0.24;
export const WALL_TEXTURE_NEAR_CLIP = 0.34;
export const PLAYER_SPEED = 3.95;
export const PLAYER_ROT_SPEED = 2.75;
export const PLAYER_MAX_HP = 120;
export const SAVE_KEY = "westward-save-v3";
export const LEGACY_SAVE_KEYS = ["westward-save-v2", "westward-save-v1", "dustward-save-v1"];
export const LOCALE_KEY = "westward-locale-v1";
export const LEGACY_LOCALE_KEYS = ["dustward-locale-v1"];
export const AUTOSAVE_INTERVAL = 30;
export const QUEST_STATUSES = new Set(["locked", "active", "complete", "turned_in"]);
export const WESTERN_PIG_ROLES = [
  { role: "Marshal", hat: "#4f3a23", bandana: "#8f2c2c", temper: 0.42 },
  { role: "Outlaw", hat: "#2a2f3a", bandana: "#9e1919", temper: 0.88 },
  { role: "Deputy", hat: "#694b2d", bandana: "#3f6f9a", temper: 0.56 },
  { role: "Prospector", hat: "#70542e", bandana: "#987d3e", temper: 0.34 },
  { role: "Gambler", hat: "#3d334f", bandana: "#ab3f79", temper: 0.68 },
  { role: "Bandit", hat: "#353333", bandana: "#8a3b1c", temper: 0.92 },
  { role: "Rodeo", hat: "#6f3f24", bandana: "#2d6e63", temper: 0.74 },
  { role: "Sheriff", hat: "#5c4227", bandana: "#b89a3e", temper: 0.48 },
];
