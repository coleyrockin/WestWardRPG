export const REGION_AUDIO_PROFILE: Record<string, {
  cutoffHz: number;
  filterQ: number;
  lfoHz: number;
  gain: number;
  color: string;
}>;

export interface MusicProfile {
  rootHz: number;
  scale: number[];
  tempoBPM: number;
  padType: OscillatorType;
  padGain: number;
  padDetuneCents: number;
  melodyType: OscillatorType;
  melodyGain: number;
  melodyPattern: number[];
  tensionRootHz: number;
  tensionType: OscillatorType;
  tensionMaxGain: number;
}

export const MUSIC_REGION_PROFILE: Record<string, MusicProfile>;

export interface AudioBuses {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  ambient: GainNode;
  music: GainNode;
  current: any;
  currentMusic?: any;
}

export interface MelodyPreviewNote {
  beat: number;
  scaleIndex: number;
  semitone: number;
  hz: number;
}

export function createAudioBuses(ctx: AudioContext | null): AudioBuses | null;
export function startAmbientForRegion(buses: AudioBuses | null, regionId: string, fadeSec?: number): any;
export function setAmbientRegion(buses: AudioBuses | null, regionId: string, fadeSec?: number): any;
export function stopAmbient(buses: AudioBuses | null, fadeSec?: number): void;
export function setMasterMute(buses: AudioBuses | null, muted: boolean): void;
export function startMusicForRegion(buses: AudioBuses | null, regionId: string, fadeSec?: number): any;
export function setMusicRegion(buses: AudioBuses | null, regionId: string, fadeSec?: number): any;
export function setCombatTension(buses: AudioBuses | null, tension01: number, fadeSec?: number): void;
export function stopMusic(buses: AudioBuses | null, fadeSec?: number): void;
export function previewMelody(profile: MusicProfile, beatsAhead?: number): (MelodyPreviewNote | null)[];
