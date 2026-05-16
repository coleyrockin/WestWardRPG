// Audio bus + per-region procedural ambient drone.
//
// Goals:
//   - Add a 3-bus graph (master → sfx, ambient, music) on top of the existing
//     ctx.destination one-shots without breaking sfx routing.
//   - Spin up a filtered-noise drone with a slow LFO modulation per region,
//     biome-tuned filter cutoff. Crossfades on region change.
//   - Pure module — no DOM, no globals. main.js owns the lifecycle.

export const REGION_AUDIO_PROFILE = {
  frontier:    { cutoffHz: 480, filterQ: 0.7, lfoHz: 0.13, gain: 0.045, color: "warm" },
  ashfall:     { cutoffHz: 760, filterQ: 1.1, lfoHz: 0.21, gain: 0.05,  color: "mid" },
  ironlantern: { cutoffHz: 1100, filterQ: 1.6, lfoHz: 0.28, gain: 0.04, color: "metallic" },
};

export function createAudioBuses(ctx) {
  if (!ctx) return null;
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  const ambient = ctx.createGain();
  const music = ctx.createGain();
  const musicFilter = ctx.createBiquadFilter();
  master.gain.value = 1;
  sfx.gain.value = 1;
  ambient.gain.value = 0; // crossfade target
  music.gain.value = 0;
  musicFilter.type = "lowpass";
  musicFilter.frequency.value = 2400;
  musicFilter.Q.value = 0.2;
  sfx.connect(master);
  ambient.connect(master);
  music.connect(musicFilter);
  musicFilter.connect(master);
  master.connect(ctx.destination);
  return { ctx, master, sfx, ambient, music, musicFilter, current: null };
}

function buildNoiseBuffer(ctx, durationSec = 2) {
  const bufSize = Math.floor(ctx.sampleRate * durationSec);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function buildDroneNode(ctx, profile) {
  const src = ctx.createBufferSource();
  src.buffer = buildNoiseBuffer(ctx, 4);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = profile.cutoffHz;
  filter.Q.value = profile.filterQ;
  // LFO modulating the filter cutoff for slow wave-y motion.
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = profile.lfoHz;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = profile.cutoffHz * 0.18; // ±18% of cutoff
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  // Gain envelope for fade-in/out.
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(filter);
  filter.connect(gain);
  src.start();
  lfo.start();
  return { src, filter, lfo, lfoGain, gain, profile };
}

export function startAmbientForRegion(buses, regionId, fadeSec = 1.5) {
  if (!buses) return null;
  const profile = REGION_AUDIO_PROFILE[regionId] || REGION_AUDIO_PROFILE.frontier;
  const node = buildDroneNode(buses.ctx, profile);
  node.gain.connect(buses.ambient);
  // Ramp ambient bus to target gain.
  const now = buses.ctx.currentTime;
  buses.ambient.gain.cancelScheduledValues(now);
  buses.ambient.gain.setValueAtTime(buses.ambient.gain.value, now);
  buses.ambient.gain.linearRampToValueAtTime(profile.gain, now + fadeSec);
  // Per-drone gain steps in to 1 in tandem.
  node.gain.gain.cancelScheduledValues(now);
  node.gain.gain.setValueAtTime(0, now);
  node.gain.gain.linearRampToValueAtTime(1, now + fadeSec);
  buses.current = node;
  return node;
}

export function setAmbientRegion(buses, regionId, fadeSec = 1.5) {
  if (!buses) return null;
  const previous = buses.current;
  const next = startAmbientForRegion(buses, regionId, fadeSec);
  if (previous) {
    const now = buses.ctx.currentTime;
    previous.gain.gain.cancelScheduledValues(now);
    previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
    previous.gain.gain.linearRampToValueAtTime(0, now + fadeSec);
    try {
      previous.src.stop(now + fadeSec + 0.1);
      previous.lfo.stop(now + fadeSec + 0.1);
    } catch { /* already stopped */ }
  }
  return next;
}

export function stopAmbient(buses, fadeSec = 0.6) {
  if (!buses) return;
  const now = buses.ctx.currentTime;
  buses.ambient.gain.cancelScheduledValues(now);
  buses.ambient.gain.setValueAtTime(buses.ambient.gain.value, now);
  buses.ambient.gain.linearRampToValueAtTime(0, now + fadeSec);
  if (buses.current) {
    try {
      buses.current.src.stop(now + fadeSec + 0.05);
      buses.current.lfo.stop(now + fadeSec + 0.05);
    } catch { /* already stopped */ }
    buses.current = null;
  }
}

export function setMasterMute(buses, muted) {
  if (!buses) return;
  buses.master.gain.value = muted ? 0 : 1;
}

// ─────────────────────────────────────────────────────────────────────
// Procedural region music: pad + melody + combat-tension stem.
// All voices are synthesized — zero audio assets, full offline-first.
// ─────────────────────────────────────────────────────────────────────

// Scale = semitone offsets from the root. Sparse motifs keep the western
// frontier feel without being busy. -1 in melodyPattern means "rest".
export const MUSIC_REGION_PROFILE = {
  frontier: {
    rootHz: 110,                         // A2
    scale: [0, 3, 5, 7, 10],             // minor pentatonic
    tempoBPM: 72,
    padType: "sine",
    padGain: 0.06,
    padDetuneCents: -3,
    melodyType: "triangle",
    melodyGain: 0.028,
    melodyPattern: [0, -1, 2, -1, 4, -1, 2, 0, -1, -1, 1, -1, 3, -1, -1, -1],
    tensionRootHz: 220,
    tensionType: "triangle",
    tensionMaxGain: 0.028,
  },
  ashfall: {
    rootHz: 92,                          // F#2 — duskier
    scale: [0, 2, 5, 7, 9],
    tempoBPM: 64,
    padType: "triangle",
    padGain: 0.034,
    padDetuneCents: 4,
    melodyType: "triangle",
    melodyGain: 0.026,
    melodyPattern: [0, -1, -1, 3, -1, 2, -1, 0, -1, -1, 4, -1, -1, 2, -1, -1],
    tensionRootHz: 184,
    tensionType: "triangle",
    tensionMaxGain: 0.032,
  },
  ironlantern: {
    rootHz: 130.81,                      // C3 — colder
    scale: [0, 3, 5, 6, 10],             // hint of blues 6th
    tempoBPM: 88,
    padType: "triangle",
    padGain: 0.03,
    padDetuneCents: 6,
    melodyType: "sine",
    melodyGain: 0.024,
    melodyPattern: [0, -1, 4, -1, 2, -1, -1, 3, -1, -1, 1, -1, 4, -1, 2, -1],
    tensionRootHz: 261.63,
    tensionType: "sine",
    tensionMaxGain: 0.034,
  },
};

function midiToHz(rootHz, semitone) {
  return rootHz * Math.pow(2, semitone / 12);
}

function buildMusicNode(ctx, profile) {
  // Pad: dual detuned oscillators through a soft lowpass.
  const padOscA = ctx.createOscillator();
  const padOscB = ctx.createOscillator();
  padOscA.type = profile.padType;
  padOscB.type = profile.padType;
  padOscA.frequency.value = profile.rootHz;
  padOscB.frequency.value = profile.rootHz;
  padOscA.detune.value = profile.padDetuneCents;
  padOscB.detune.value = -profile.padDetuneCents;
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = profile.rootHz * 4.5;
  padFilter.Q.value = 0.4;
  const padGain = ctx.createGain();
  padGain.gain.value = 0; // ramped up by startMusicForRegion
  padOscA.connect(padFilter);
  padOscB.connect(padFilter);
  padFilter.connect(padGain);

  // Melody: oscillator with per-note envelopes scheduled by the caller.
  const melodyOsc = ctx.createOscillator();
  melodyOsc.type = profile.melodyType;
  melodyOsc.frequency.value = profile.rootHz;
  const melodyEnv = ctx.createGain();
  melodyEnv.gain.value = 0;
  const melodyOutGain = ctx.createGain();
  melodyOutGain.gain.value = 0; // ramped up by startMusicForRegion
  melodyOsc.connect(melodyEnv);
  melodyEnv.connect(melodyOutGain);

  // Tension: dissonant fifth above root, very low gain unless combat active.
  const tensionOsc = ctx.createOscillator();
  tensionOsc.type = profile.tensionType;
  tensionOsc.frequency.value = profile.tensionRootHz;
  const tensionFilter = ctx.createBiquadFilter();
  tensionFilter.type = "highpass";
  tensionFilter.frequency.value = 180;
  const tensionGain = ctx.createGain();
  tensionGain.gain.value = 0;
  tensionOsc.connect(tensionFilter);
  tensionFilter.connect(tensionGain);

  padOscA.start();
  padOscB.start();
  melodyOsc.start();
  tensionOsc.start();

  return {
    profile,
    padOscA,
    padOscB,
    padFilter,
    padGain,
    melodyOsc,
    melodyEnv,
    melodyOutGain,
    tensionOsc,
    tensionFilter,
    tensionGain,
    melodyBeatIndex: 0,
    nextBeatTime: 0,
    schedulerHandle: null,
    active: true,
  };
}

// Schedule melody notes ahead. Re-armed by setTimeout; stops when node.active is false.
function scheduleMelodyAhead(ctx, node) {
  if (!node || !node.active) return;
  const profile = node.profile;
  const beatSec = 60 / profile.tempoBPM;
  const lookaheadSec = 0.6;
  const horizon = ctx.currentTime + lookaheadSec;
  while (node.nextBeatTime < horizon) {
    const idx = profile.melodyPattern[node.melodyBeatIndex % profile.melodyPattern.length];
    if (idx >= 0) {
      const noteHz = midiToHz(profile.rootHz, profile.scale[idx % profile.scale.length] + 12);
      const noteAt = node.nextBeatTime;
      node.melodyOsc.frequency.setValueAtTime(noteHz, noteAt);
      const peak = profile.melodyGain;
      node.melodyEnv.gain.cancelScheduledValues(noteAt);
      node.melodyEnv.gain.setValueAtTime(0, noteAt);
      node.melodyEnv.gain.linearRampToValueAtTime(peak, noteAt + 0.02);
      node.melodyEnv.gain.exponentialRampToValueAtTime(0.0001, noteAt + beatSec * 0.85);
    }
    node.nextBeatTime += beatSec;
    node.melodyBeatIndex++;
  }
  // Re-arm unless we've been stopped.
  if (typeof setTimeout !== "undefined" && node.active) {
    node.schedulerHandle = setTimeout(() => scheduleMelodyAhead(ctx, node), 250);
  }
}

export function startMusicForRegion(buses, regionId, fadeSec = 2.0, options = {}) {
  if (!buses || !buses.music) return null;
  const profile = (options && options.profile)
    ? options.profile
    : (MUSIC_REGION_PROFILE[regionId] || MUSIC_REGION_PROFILE.frontier);
  const node = buildMusicNode(buses.ctx, profile);
  node.padGain.connect(buses.music);
  node.melodyOutGain.connect(buses.music);
  node.tensionGain.connect(buses.music);
  const now = buses.ctx.currentTime;
  // Bus-level fade.
  buses.music.gain.cancelScheduledValues(now);
  buses.music.gain.setValueAtTime(buses.music.gain.value, now);
  buses.music.gain.linearRampToValueAtTime(1, now + fadeSec);
  // Per-voice ramp-in.
  node.padGain.gain.setValueAtTime(0, now);
  node.padGain.gain.linearRampToValueAtTime(profile.padGain, now + fadeSec);
  node.melodyOutGain.gain.setValueAtTime(0, now);
  node.melodyOutGain.gain.linearRampToValueAtTime(1, now + fadeSec);
  // Tension stays at 0 until setCombatTension is called.
  // Begin melody scheduling on the next beat boundary.
  node.nextBeatTime = now + 0.1;
  node.melodyBeatIndex = 0;
  scheduleMelodyAhead(buses.ctx, node);
  buses.currentMusic = node;
  return node;
}

export function setMusicRegion(buses, regionId, fadeSec = 2.0, options = {}) {
  if (!buses || !buses.music) return null;
  const previous = buses.currentMusic;
  const next = startMusicForRegion(buses, regionId, fadeSec, options);
  if (previous) {
    const now = buses.ctx.currentTime;
    previous.active = false;
    if (previous.schedulerHandle && typeof clearTimeout !== "undefined") {
      clearTimeout(previous.schedulerHandle);
    }
    previous.padGain.gain.cancelScheduledValues(now);
    previous.padGain.gain.setValueAtTime(previous.padGain.gain.value, now);
    previous.padGain.gain.linearRampToValueAtTime(0, now + fadeSec);
    previous.melodyOutGain.gain.cancelScheduledValues(now);
    previous.melodyOutGain.gain.setValueAtTime(previous.melodyOutGain.gain.value, now);
    previous.melodyOutGain.gain.linearRampToValueAtTime(0, now + fadeSec);
    previous.tensionGain.gain.cancelScheduledValues(now);
    previous.tensionGain.gain.setValueAtTime(previous.tensionGain.gain.value, now);
    previous.tensionGain.gain.linearRampToValueAtTime(0, now + fadeSec);
    try {
      previous.padOscA.stop(now + fadeSec + 0.1);
      previous.padOscB.stop(now + fadeSec + 0.1);
      previous.melodyOsc.stop(now + fadeSec + 0.1);
      previous.tensionOsc.stop(now + fadeSec + 0.1);
    } catch {
      // already stopped
    }
  }
  return next;
}

export function setCombatTension(buses, tension01, fadeSec = 1.0) {
  if (!buses || !buses.currentMusic) return;
  const node = buses.currentMusic;
  const t = Math.max(0, Math.min(1, Number.isFinite(tension01) ? tension01 : 0));
  const target = node.profile.tensionMaxGain * t;
  const now = buses.ctx.currentTime;
  node.tensionGain.gain.cancelScheduledValues(now);
  node.tensionGain.gain.setValueAtTime(node.tensionGain.gain.value, now);
  node.tensionGain.gain.linearRampToValueAtTime(target, now + fadeSec);
}

export function stopMusic(buses, fadeSec = 1.5) {
  if (!buses || !buses.music) return;
  const now = buses.ctx.currentTime;
  buses.music.gain.cancelScheduledValues(now);
  buses.music.gain.setValueAtTime(buses.music.gain.value, now);
  buses.music.gain.linearRampToValueAtTime(0, now + fadeSec);
  if (buses.currentMusic) {
    const node = buses.currentMusic;
    node.active = false;
    if (node.schedulerHandle && typeof clearTimeout !== "undefined") {
      clearTimeout(node.schedulerHandle);
    }
    try {
      node.padOscA.stop(now + fadeSec + 0.1);
      node.padOscB.stop(now + fadeSec + 0.1);
      node.melodyOsc.stop(now + fadeSec + 0.1);
      node.tensionOsc.stop(now + fadeSec + 0.1);
    } catch {
      // already stopped
    }
    buses.currentMusic = null;
  }
}

// Pure helper — returns the next N beats of melody (for tests).
export function previewMelody(profile, beatsAhead = 16) {
  const out = [];
  for (let i = 0; i < beatsAhead; i++) {
    const idx = profile.melodyPattern[i % profile.melodyPattern.length];
    if (idx < 0) {
      out.push(null);
    } else {
      out.push({
        beat: i,
        scaleIndex: idx,
        semitone: profile.scale[idx % profile.scale.length],
        hz: profile.rootHz * Math.pow(2, (profile.scale[idx % profile.scale.length] + 12) / 12),
      });
    }
  }
  return out;
}
