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
  master.gain.value = 1;
  sfx.gain.value = 1;
  ambient.gain.value = 0; // crossfade target
  music.gain.value = 0;
  sfx.connect(master);
  ambient.connect(master);
  music.connect(master);
  master.connect(ctx.destination);
  return { ctx, master, sfx, ambient, music, current: null };
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
