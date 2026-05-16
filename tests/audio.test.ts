import { describe, it, expect, vi } from "vitest";
import {
  REGION_AUDIO_PROFILE,
  MUSIC_REGION_PROFILE,
  createAudioBuses,
  startAmbientForRegion,
  setAmbientRegion,
  stopAmbient,
  setMasterMute,
  startMusicForRegion,
  setMusicRegion,
  setCombatTension,
  stopMusic,
  previewMelody,
} from "../src/audio.js";

// Minimal AudioContext mock — just enough surface for the bus graph.
function fakeCtx() {
  const now = 0;
  const audioParam = () => ({
    value: 0,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const make = (extra: any = {}) => ({
    gain: audioParam(),
    frequency: audioParam(),
    detune: audioParam(),
    Q: { value: 0 },
    type: "",
    loop: false,
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    ...extra,
  });
  return {
    currentTime: now,
    sampleRate: 44100,
    destination: make(),
    createGain: vi.fn(() => make()),
    createOscillator: vi.fn(() => make()),
    createBufferSource: vi.fn(() => make()),
    createBuffer: vi.fn((ch, len, rate) => ({ getChannelData: () => new Float32Array(len) })),
    createBiquadFilter: vi.fn(() => make()),
  };
}

describe("audio module", () => {
  it("exposes profiles for all three regions", () => {
    expect(REGION_AUDIO_PROFILE.frontier).toBeTruthy();
    expect(REGION_AUDIO_PROFILE.ashfall).toBeTruthy();
    expect(REGION_AUDIO_PROFILE.ironlantern).toBeTruthy();
    // cutoff ascends frontier < ashfall < ironlantern (warmer → metallic)
    expect(REGION_AUDIO_PROFILE.frontier.cutoffHz)
      .toBeLessThan(REGION_AUDIO_PROFILE.ashfall.cutoffHz);
    expect(REGION_AUDIO_PROFILE.ashfall.cutoffHz)
      .toBeLessThan(REGION_AUDIO_PROFILE.ironlantern.cutoffHz);
  });

  it("createAudioBuses returns null without ctx", () => {
    expect(createAudioBuses(null as any)).toBeNull();
  });

  it("createAudioBuses wires master/sfx/ambient/music", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    expect(buses).toBeTruthy();
    expect(buses.master).toBeTruthy();
    expect(buses.sfx).toBeTruthy();
    expect(buses.ambient).toBeTruthy();
    expect(buses.music).toBeTruthy();
    // Music routes through a soft low-pass before master so procedural synths
    // do not buzz on laptop speakers.
    expect(buses.sfx.connect).toHaveBeenCalledWith(buses.master);
    expect(buses.ambient.connect).toHaveBeenCalledWith(buses.master);
    expect(buses.musicFilter).toBeTruthy();
    expect(buses.musicFilter.type).toBe("lowpass");
    expect(buses.music.connect).toHaveBeenCalledWith(buses.musicFilter);
    expect(buses.musicFilter.connect).toHaveBeenCalledWith(buses.master);
    expect(buses.master.connect).toHaveBeenCalledWith(ctx.destination);
  });

  it("startAmbientForRegion sets buses.current to the new drone", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    const node = startAmbientForRegion(buses, "ashfall");
    expect(node).toBeTruthy();
    expect(buses.current).toBe(node);
    expect(node!.profile).toBe(REGION_AUDIO_PROFILE.ashfall);
  });

  it("setAmbientRegion crossfades to the new region", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    const a = startAmbientForRegion(buses, "frontier");
    const b = setAmbientRegion(buses, "ironlantern");
    expect(buses.current).toBe(b);
    // previous node had its src.stop called for fade-out
    expect(a!.src.stop).toHaveBeenCalled();
  });

  it("stopAmbient zeroes the ambient bus and clears current", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    startAmbientForRegion(buses, "frontier");
    expect(buses.current).toBeTruthy();
    stopAmbient(buses);
    expect(buses.current).toBeNull();
    expect(buses.ambient.gain.linearRampToValueAtTime).toHaveBeenCalled();
  });

  it("setMasterMute toggles master gain to 0/1", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    setMasterMute(buses, true);
    expect(buses.master.gain.value).toBe(0);
    setMasterMute(buses, false);
    expect(buses.master.gain.value).toBe(1);
  });

  it("falls back to frontier profile for unknown regions", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    const node = startAmbientForRegion(buses, "spooky_zone" as any);
    expect(node!.profile).toBe(REGION_AUDIO_PROFILE.frontier);
  });
});

describe("procedural music", () => {
  it("exposes a music profile per region", () => {
    expect(MUSIC_REGION_PROFILE.frontier).toBeTruthy();
    expect(MUSIC_REGION_PROFILE.ashfall).toBeTruthy();
    expect(MUSIC_REGION_PROFILE.ironlantern).toBeTruthy();
  });

  it("each region's scale and melodyPattern are coherent (every non-rest index is in the scale)", () => {
    for (const [, profile] of Object.entries(MUSIC_REGION_PROFILE)) {
      for (const idx of profile.melodyPattern) {
        if (idx < 0) continue; // rest
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(profile.scale.length);
      }
    }
  });

  it("region tempos are in a sane RPG range (40–160 BPM)", () => {
    for (const [, profile] of Object.entries(MUSIC_REGION_PROFILE)) {
      expect(profile.tempoBPM).toBeGreaterThanOrEqual(40);
      expect(profile.tempoBPM).toBeLessThanOrEqual(160);
    }
  });

  it("uses soft music waveforms instead of buzzy square/saw pads", () => {
    for (const [, profile] of Object.entries(MUSIC_REGION_PROFILE)) {
      expect(["sine", "triangle"]).toContain(profile.padType);
      expect(["sine", "triangle"]).toContain(profile.melodyType);
      expect(["sine", "triangle"]).toContain(profile.tensionType);
      expect(profile.tensionMaxGain).toBeLessThanOrEqual(0.04);
    }
  });

  it("previewMelody returns the expected number of beats with proper note shape", () => {
    const beats = previewMelody(MUSIC_REGION_PROFILE.frontier, 16);
    expect(beats.length).toBe(16);
    const firstNote = beats[0]!;
    expect(firstNote.beat).toBe(0);
    // root + 12 semitones = octave above root
    expect(firstNote.hz).toBeCloseTo(MUSIC_REGION_PROFILE.frontier.rootHz * 2, 2);
  });

  it("previewMelody loops the pattern cleanly past its length", () => {
    const beats = previewMelody(MUSIC_REGION_PROFILE.frontier, 64);
    expect(beats.length).toBe(64);
    // Beat 16 should match beat 0 (pattern length is 16).
    if (beats[0] && beats[16]) {
      expect(beats[0].scaleIndex).toBe(beats[16].scaleIndex);
      expect(beats[0].hz).toBe(beats[16].hz);
    }
  });

  it("startMusicForRegion sets buses.currentMusic and connects the three voices to the music bus", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    const node = startMusicForRegion(buses, "frontier");
    expect(node).toBeTruthy();
    expect(buses.currentMusic).toBe(node);
    expect(node!.profile).toBe(MUSIC_REGION_PROFILE.frontier);
    // Pad, melody, tension each connect somewhere terminating in buses.music.
    expect(node!.padGain.connect).toHaveBeenCalledWith(buses.music);
    expect(node!.melodyOutGain.connect).toHaveBeenCalledWith(buses.music);
    expect(node!.tensionGain.connect).toHaveBeenCalledWith(buses.music);
  });

  it("setMusicRegion crossfades to the new music profile", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    const a = startMusicForRegion(buses, "frontier");
    const b = setMusicRegion(buses, "ashfall");
    expect(buses.currentMusic).toBe(b);
    expect(a!.active).toBe(false);
    expect(a!.padOscA.stop).toHaveBeenCalled();
  });

  it("setCombatTension ramps the tension stem toward the profile max", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    startMusicForRegion(buses, "frontier");
    setCombatTension(buses, 1);
    const ramp = (buses.currentMusic as any).tensionGain.gain.linearRampToValueAtTime as ReturnType<typeof vi.fn>;
    expect(ramp).toHaveBeenCalled();
    const lastCallArgs = ramp.mock.calls[ramp.mock.calls.length - 1];
    expect(lastCallArgs[0]).toBeCloseTo(MUSIC_REGION_PROFILE.frontier.tensionMaxGain, 5);
  });

  it("setCombatTension clamps the input to [0, 1]", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    startMusicForRegion(buses, "frontier");
    setCombatTension(buses, 9);
    const ramp = (buses.currentMusic as any).tensionGain.gain.linearRampToValueAtTime as ReturnType<typeof vi.fn>;
    const [target] = ramp.mock.calls[ramp.mock.calls.length - 1];
    expect(target).toBeCloseTo(MUSIC_REGION_PROFILE.frontier.tensionMaxGain, 5);
    setCombatTension(buses, -3);
    const [target2] = ramp.mock.calls[ramp.mock.calls.length - 1];
    expect(target2).toBe(0);
  });

  it("stopMusic clears currentMusic and zeros the music bus", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    startMusicForRegion(buses, "frontier");
    expect(buses.currentMusic).toBeTruthy();
    stopMusic(buses);
    expect(buses.currentMusic).toBeNull();
    expect(buses.music.gain.linearRampToValueAtTime).toHaveBeenCalled();
  });

  it("falls back to frontier music profile for unknown regions", () => {
    const ctx = fakeCtx();
    const buses = createAudioBuses(ctx as any)!;
    const node = startMusicForRegion(buses, "ghost_canyon" as any);
    expect(node!.profile).toBe(MUSIC_REGION_PROFILE.frontier);
  });
});
