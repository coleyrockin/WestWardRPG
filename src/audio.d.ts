export const REGION_AUDIO_PROFILE: Record<string, {
  cutoffHz: number;
  filterQ: number;
  lfoHz: number;
  gain: number;
  color: string;
}>;

export interface AudioBuses {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  ambient: GainNode;
  music: GainNode;
  current: any;
}

export function createAudioBuses(ctx: AudioContext | null): AudioBuses | null;
export function startAmbientForRegion(buses: AudioBuses | null, regionId: string, fadeSec?: number): any;
export function setAmbientRegion(buses: AudioBuses | null, regionId: string, fadeSec?: number): any;
export function stopAmbient(buses: AudioBuses | null, fadeSec?: number): void;
export function setMasterMute(buses: AudioBuses | null, muted: boolean): void;
