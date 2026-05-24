export const RENDER_SNAPSHOT_VERSION: number;

export function createRenderSnapshot(state?: any, options?: any): {
  schemaVersion: number;
  kind: string;
  mode: string;
  player: {
    x: number;
    y: number;
    angle: number;
    regionId: string;
    inHouse: boolean;
  };
  region: {
    id: string;
    label: string;
  };
  time: {
    elapsed: number;
    dayTime: number;
  };
  weather: any;
  objective: any;
  firstFiveMinuteLoop: any;
  firstRoadMemory: any;
  interactables: any[];
  npcs: any[];
  enemies: any[];
  pois: any[];
  routeMarkers: any[];
  lights: any[];
  combatCues: any[];
  worldObjects: any[];
};
