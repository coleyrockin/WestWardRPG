import { describe, it, expect, vi } from "vitest";
import {
  REGION_AUDIO_PROFILE,
  createAudioBuses,
  startAmbientForRegion,
  setAmbientRegion,
  stopAmbient,
  setMasterMute,
} from "../src/audio.js";

// Minimal AudioContext mock — just enough surface for the bus graph.
function fakeCtx() {
  const now = 0;
  const make = (extra: any = {}) => ({
    gain: { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    frequency: { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
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
    // sfx, ambient, music each connected to master; master to destination
    expect(buses.sfx.connect).toHaveBeenCalledWith(buses.master);
    expect(buses.ambient.connect).toHaveBeenCalledWith(buses.master);
    expect(buses.music.connect).toHaveBeenCalledWith(buses.master);
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
