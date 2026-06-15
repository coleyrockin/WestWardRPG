// Thin procedural audio layer for the 3D first-road slice (roadmap §T2b).
// Web Audio API only — every sound is synthesized, no assets fetched. The Canvas
// audio.js is the recipe reference (noise buffers, bandpass drones, LFO motion),
// not a port: this module owns the 3D build's event vocabulary.
//
// Split the same way as the rest of render3d: pure, testable maps/steppers up
// top (event→sfx routing, footstep cadence), one imperative `createAudioView`
// shell at the bottom that talks to AudioContext. The shell is inert until
// `unlock()` runs inside a user gesture (browser autoplay policy) and is never
// constructed under ?visual capture.

import { gustAt as windGustAt } from "../game/world/windGusts.js";

// ---------------------------------------------------------------------------
// Pure: event routing + cadence
// ---------------------------------------------------------------------------

// Every one-shot the layer can play. Phase beats route through EVENT_SFX;
// combat/movement cues are played directly by name from spike.js hooks.
export const SFX_NAMES = Object.freeze([
  "uiTick", // soft interface tick — reaching a target, reading a sign
  "chalkScratch", // Boone chalking the board after a job choice
  "chime", // map-scrap / discovery bell
  "resolveChime", // two-note resolution — job turned in
  "creak", // wood pry — cache lid, wagon strongbox
  "menace", // wet low growl — the slime breaking cover
  "splat", // slime hit
  "bigSplat", // slime death
  "playerHurt", // slime connects with the drifter
  "whoosh", // dodge roll
  "footstep", // boot on dirt (walk/run share the recipe; run plays hotter)
  "sting", // lonely harmonica swell on the spawn reveal
]);

// Loop-phase event → one-shot. Keys match the transitionLoopPhase event types
// exactly (phaseState.js); anything unrouted is silent by design.
export const EVENT_SFX = Object.freeze({
  board_reached: "uiTick",
  choose_board: "chalkScratch",
  accept_bounty: "chalkScratch",
  read_sign: "uiTick",
  hear_bark: "uiTick",
  open_cache: "creak",
  spot_slime_tell: "uiTick",
  slime_appeared: "menace",
  defeat_slime: "bigSplat",
  inspect_wagon: "creak",
  report_to_boone: "resolveChime",
});

// Resolve a transitionLoopPhase event (string or {type}) to a sfx name, or null.
export function sfxForLoopEvent(event) {
  const type = typeof event === "string" ? event : event?.type;
  return (type && EVENT_SFX[type]) || null;
}

export const FOOTSTEP = Object.freeze({
  walkInterval: 0.46, // seconds between boots at walk speed (4 u/s)
  runInterval: 0.28, // sprint cadence (8 u/s) — slightly under 2× so it reads hurried
});

// Pure footstep cadence stepper. clock is seconds-until-next-step; returns the
// advanced clock plus whether a step fires this frame. Standing still resets
// the clock to a half interval so the first boot lands fast when motion resumes.
export function stepFootstepClock(clock, dt, moving, running) {
  const interval = running ? FOOTSTEP.runInterval : FOOTSTEP.walkInterval;
  if (!moving) return { clock: interval * 0.5, fire: false };
  const next = clock - dt;
  if (next > 0) return { clock: next, fire: false };
  return { clock: interval, fire: true };
}

// Wind bed level by palette key — night wind bites harder than golden hour.
export const WIND_LEVELS = Object.freeze({
  goldenHour: 0.5,
  dusk: 0.75,
  night: 1.0,
});

export function windLevelForPalette(key) {
  return WIND_LEVELS[key] ?? WIND_LEVELS.dusk;
}

// ---------------------------------------------------------------------------
// R1.4 — Wind cutoff mapping (pure, testable)
// ---------------------------------------------------------------------------

// Map weather windSpeed (clear=1, dust=1.8, storm=2.6) to whistle bandpass
// cutoff frequency (Hz). Linear interpolation through the three anchor points.
// At windSpeed 1 → 800 Hz, 1.8 → 1400 Hz, 2.6 → 2200 Hz.
export function windCutoffFor(windSpeed) {
  const s = typeof windSpeed === "number" && Number.isFinite(windSpeed) ? windSpeed : 1;
  if (s <= 1) return 800;
  if (s <= 1.8) {
    // 800..1400 over 1..1.8
    return 800 + ((s - 1) / 0.8) * 600;
  }
  // 1400..2200 over 1.8..2.6
  return 1400 + ((s - 1.8) / 0.8) * 800;
}

// ---------------------------------------------------------------------------
// R1.4 — Seeded gust schedule (shared with the R1.2 tumbleweeds)
// ---------------------------------------------------------------------------

// One schedule, one event: the burst you hear is the speed burst you see on
// the first-road tumbleweed (windGusts.js, seed 0.84 = that weed's seed).
export { gustAt } from "../game/world/windGusts.js";
export const GUST_AUDIO_SEED = 0.84;

// Detect a crossing from 0 → >0 between the previous and current worldTime.
// Returns true on the exact frame the window opens (prevT outside, t inside).
export function gustWindowOpened(prevT, t, seed) {
  return windGustAt(prevT, seed) === 0 && windGustAt(t, seed) > 0;
}

// ---------------------------------------------------------------------------
// R1.5 — Biome pocket levels (pure, testable)
// ---------------------------------------------------------------------------

// World-space centres of each sonic biome pocket.
const POCKET_CENTRES = Object.freeze({
  marsh:  { x: 76,   y: 58 },
  folly:  { x: 33.5, y: -29.5 },
  ranch:  { x: 128,  y: 12 },
  saloon: { x: 19.3, y: 2.7 },  // Lucky Lantern — from frontierLayout.js WALKIN_SALOON
});

const POCKET_RADIUS = 20; // full-level within this radius; falls to 0 at 2× radius

// Returns per-pocket mix levels {marsh, folly, ranch, saloon}, each 0..1.
// Smooth fade using a cosine curve within [0, POCKET_RADIUS*2].
export function biomePocketLevels(x, y) {
  const result = {};
  for (const [name, c] of Object.entries(POCKET_CENTRES)) {
    const dx = x - c.x;
    const dy = y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= POCKET_RADIUS * 2) {
      result[name] = 0;
    } else if (dist <= 0) {
      result[name] = 1;
    } else {
      // cosine fade: 1 at centre, 0 at 2× radius
      result[name] = 0.5 * (1 + Math.cos(Math.PI * dist / (POCKET_RADIUS * 2)));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// R1.5 — Night bed gain by palette key (pure, testable)
// ---------------------------------------------------------------------------

// Cricket gain per palette key — ramps in dusk→night, out at day/goldenHour.
export const NIGHT_BED_GAINS = Object.freeze({
  day:        0,
  goldenHour: 0,
  dusk:       0.35,
  night:      1.0,
});

export function nightBedGainFor(paletteKey) {
  return NIGHT_BED_GAINS[paletteKey] ?? 0;
}

// ---------------------------------------------------------------------------
// Imperative shell
// ---------------------------------------------------------------------------

function noiseBuffer(ctx, durationSec = 2) {
  const size = Math.floor(ctx.sampleRate * durationSec);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// One looped noise source → two parallel bandpasses (whistle + body) with slow
// LFO drift on the whistle cutoff. Extended for R1.4: whistle cutoff is also
// driven by windSpeed via slewed setTargetAtTime so weather changes blend smoothly.
function buildWindBed(ctx, out) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 4);
  src.loop = true;

  const body = ctx.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 240;
  body.Q.value = 0.4;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.6;

  const whistle = ctx.createBiquadFilter();
  whistle.type = "bandpass";
  whistle.frequency.value = 900;
  whistle.Q.value = 2.2;
  const whistleGain = ctx.createGain();
  whistleGain.gain.value = 0.25;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07; // ~14s gust cycle
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 320; // whistle drifts 580–1220 Hz
  lfo.connect(lfoGain);
  lfoGain.connect(whistle.frequency);

  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(body);
  body.connect(bodyGain);
  bodyGain.connect(gain);
  src.connect(whistle);
  whistle.connect(whistleGain);
  whistleGain.connect(gain);
  gain.connect(out);
  src.start();
  lfo.start();
  // Expose whistle filter so R1.4 update can slew its base frequency.
  return { src, lfo, gain, whistle };
}

// Short filtered-noise burst — boots, splats, chalk all derive from this.
function noiseBurst(ctx, out, { freq, q = 1, decay, gain, type = "lowpass", rate = 1 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, Math.max(0.3, decay + 0.1));
  src.playbackRate.value = rate;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = ctx.createGain();
  const now = ctx.currentTime;
  env.gain.setValueAtTime(gain, now);
  env.gain.exponentialRampToValueAtTime(0.0001, now + decay);
  src.connect(filter);
  filter.connect(env);
  env.connect(out);
  src.start(now);
  src.stop(now + decay + 0.05);
}

// Oscillator one-shot with a pitch glide — the basis of chimes, hurt, menace.
function tone(ctx, out, { type = "sine", from, to = null, decay, gain, delay = 0 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  const now = ctx.currentTime + delay;
  osc.frequency.setValueAtTime(from, now);
  if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + decay);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain, now + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, now + decay);
  osc.connect(env);
  env.connect(out);
  osc.start(now);
  osc.stop(now + decay + 0.05);
}

// The lonely spawn sting: two detuned reeds through a vibrato'd bandpass,
// swelling in and dying away — close enough to a far-off harmonica chord.
function harmonicaSting(ctx, out) {
  const now = ctx.currentTime;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 880;
  band.Q.value = 1.4;
  const vib = ctx.createOscillator();
  vib.frequency.value = 5.2;
  const vibGain = ctx.createGain();
  vibGain.gain.value = 26;
  vib.connect(vibGain);
  vibGain.connect(band.frequency);
  vib.start(now);
  vib.stop(now + 3.4);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.16, now + 0.9); // slow swell
  env.gain.setValueAtTime(0.16, now + 1.7);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
  band.connect(env);
  env.connect(out);

  // A minor-ish dyad (A4 + E5) with a third reed shadowing an octave down.
  for (const [freq, detune, level] of [
    [440, 0, 1],
    [659.25, 6, 0.8],
    [220, -4, 0.5],
  ]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = ctx.createGain();
    g.gain.value = level;
    osc.connect(g);
    g.connect(band);
    osc.start(now);
    osc.stop(now + 3.4);
  }
}

// R1.4 — White-noise gust burst: bandpassed noise swell matching GUST_DURATION.
const GUST_DURATION = 1.8; // seconds — natural wind-swell length (shorter than the 3.4s howl)
function fireGustBurst(ctx, out, windSpeed) {
  const gainAmt = 0.18 * Math.max(0.3, (windSpeed - 0.5) / 2.1); // scales with wind
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = windCutoffFor(windSpeed) * 0.8;
  bp.Q.value = 1.5;
  const env = ctx.createGain();
  const now = ctx.currentTime;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gainAmt, now + GUST_DURATION * 0.4);  // swell up
  env.gain.exponentialRampToValueAtTime(0.0001, now + GUST_DURATION * 1.1);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, GUST_DURATION + 0.3);
  src.loop = false;
  src.connect(bp);
  bp.connect(env);
  env.connect(out);
  src.start(now);
  src.stop(now + GUST_DURATION + 0.2);
}

// R1.5 — Marsh trickle: looped bandpass noise with 0.3 Hz AM.
function buildMarshBed(ctx, out) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 3);
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 420;
  bp.Q.value = 2.8;
  const am = ctx.createOscillator();
  am.type = "sine";
  am.frequency.value = 0.3;
  const amGain = ctx.createGain();
  amGain.gain.value = 0.4;
  const bias = ctx.createGain();
  bias.gain.value = 0.6; // keep signal audible at trough
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(bp);
  bp.connect(bias);
  bias.connect(gain);
  am.connect(amGain);
  amGain.connect(gain.gain); // AM modulates gain
  gain.connect(out);
  src.start();
  am.start();
  return { src, am, gain };
}

// R1.5 — Folly low timber-moan: a sine tone with slow vibrato.
function buildFollyMoan(ctx, out) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 62;
  const vib = ctx.createOscillator();
  vib.type = "sine";
  vib.frequency.value = 0.6;
  const vibG = ctx.createGain();
  vibG.gain.value = 3;
  vib.connect(vibG);
  vibG.connect(osc.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 180;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(lp);
  lp.connect(gain);
  gain.connect(out);
  osc.start();
  vib.start();
  return { osc, vib, gain };
}

// R1.5 — Ranch cattle low: a gain gate for one-shot cattle moos.
function buildRanchBed(ctx, out) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(out);
  return { gain };
}

// One-shot cattle moo: sine swell ~80–110 Hz with slow vibrato.
function fireCattleMoo(ctx, out, level) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  const baseFreq = 80 + Math.random() * 30;
  osc.frequency.value = baseFreq;
  const vib = ctx.createOscillator();
  vib.type = "sine";
  vib.frequency.value = 3.5 + Math.random() * 1.5;
  const vibG = ctx.createGain();
  vibG.gain.value = 5;
  vib.connect(vibG);
  vibG.connect(osc.frequency);
  const env = ctx.createGain();
  const now = ctx.currentTime;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.14 * level, now + 0.4);
  env.gain.setValueAtTime(0.14 * level, now + 1.2);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
  osc.connect(env);
  env.connect(out);
  osc.start(now);
  vib.start(now);
  osc.stop(now + 2.4);
  vib.stop(now + 2.4);
}

// R1.5 — Saloon piano bed: a gain gate for one-shot plinks.
function buildSaloonBed(ctx, out) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  // Hard low-pass to muffle the piano leak through walls.
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 600;
  lp.Q.value = 0.5;
  gain.connect(lp);
  lp.connect(out);
  return { gain, lp };
}

// Pentatonic-ish notes (detuned triangle plinks) — saloon piano leak.
const PLINK_FREQS = [196, 220, 246.9, 293.7, 329.6, 370, 392]; // G3 pentatonic-ish

function fireSaloonPlinks(ctx, out, level) {
  const now = ctx.currentTime;
  const count = 3 + Math.floor(Math.random() * 4); // 3–6 notes
  for (let i = 0; i < count; i++) {
    const delay = i * (0.08 + Math.random() * 0.06);
    const freq = PLINK_FREQS[Math.floor(Math.random() * PLINK_FREQS.length)];
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq * (0.98 + Math.random() * 0.04); // slight detune
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now + delay);
    env.gain.linearRampToValueAtTime(0.09 * level, now + delay + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
    osc.connect(env);
    env.connect(out);
    osc.start(now + delay);
    osc.stop(now + delay + 0.4);
  }
}

// R1.5 — Cricket chirp bed: looped short filtered-noise ticks at ~4-6 Hz.
function buildCricketBed(ctx, out) {
  // Ticks are driven by a sine LFO gating a noise source.
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 3);
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 4800;
  bp.Q.value = 6;
  const chopLfo = ctx.createOscillator();
  chopLfo.type = "sine";
  chopLfo.frequency.value = 4.8 + Math.random() * 1.2; // 4–6 Hz chirp rate
  const chopGain = ctx.createGain();
  chopGain.gain.value = 0.5;
  const bias = ctx.createGain();
  bias.gain.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(bp);
  bp.connect(bias);
  bias.connect(gain);
  chopLfo.connect(chopGain);
  chopGain.connect(gain.gain); // LFO chops the cricket noise
  gain.connect(out);
  src.start();
  chopLfo.start();
  return { src, chopLfo, gain };
}

// R1.5 — Coyote howl one-shot: pitch-glide sine 600→350 Hz over ~1.5 s with vibrato,
// routed through a StereoPannerNode with a random pan per howl.
function fireCoyoteHowl(ctx, out) {
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  const target = pan || out;
  if (pan) {
    pan.pan.value = (Math.random() * 2 - 1) * 0.7; // –0.7…+0.7 pan
    pan.connect(out);
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(350, now + 1.5);

  // Vibrato — wolves warble.
  const vib = ctx.createOscillator();
  vib.type = "sine";
  vib.frequency.value = 6.5;
  const vibG = ctx.createGain();
  vibG.gain.value = 14;
  vib.connect(vibG);
  vibG.connect(osc.frequency);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.22, now + 0.25);
  env.gain.setValueAtTime(0.22, now + 1.0);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  osc.connect(env);
  env.connect(target);
  osc.start(now);
  vib.start(now);
  osc.stop(now + 1.85);
  vib.stop(now + 1.85);
}

// createAudioView() — the spike's audio singleton.
//   unlock()                       call inside a user gesture; idempotent.
//   update(dt, opts)               per-frame; drives boots, wind, pockets, night.
//     opts: { moving, running, paletteKey, windSpeed, worldTime, playerX, playerY }
//   play(name)                     fire a one-shot by SFX_NAMES name.
//   onLoopEvent(event)             route a transitionLoopPhase event to its sfx.
//   muted / setMuted(m), dispose()
//
// New public API added for R1.4 + R1.5:
//   windSpeed (opts) — float; 1=clear, 1.8=dust, 2.6=storm. Drives whistle cutoff + gust gain.
//   worldTime (opts) — float seconds; drives the seeded gust schedule.
//   playerX, playerY (opts) — world coords; drives biome pocket cross-fades.
export function createAudioView({ contextFactory } = {}) {
  let ctx = null;
  let buses = null;
  let wind = null;
  let footClock = 0;
  let muted = false;
  let stungOnce = false;

  // R1.4 — gust tracking
  let prevWorldTime = 0;
  let lastWindSpeed = 1;

  // R1.5 — pocket beds (created in unlock, gain-gated)
  let marsh = null;
  let folly = null;   // { gain } — no continuous bed (moan only on timer)
  let follyMoan = null;
  let ranch = null;
  let saloon = null;
  let cricket = null;

  // R1.5 — one-shot timers (seconds until next fire)
  let creakTimer = 0;
  let cattleTimer = 0;
  let saloonTimer = 0;
  let coyoteTimer = 0;

  // Randomise a timer in [lo, hi] seconds.
  const rng = (lo, hi) => lo + Math.random() * (hi - lo);
  const resetCreak  = () => { creakTimer  = rng(12, 20); };
  const resetCattle = () => { cattleTimer = rng(20, 40); };
  const resetSaloon = () => { saloonTimer = rng(15, 30); };
  const resetCoyote = () => { coyoteTimer = rng(60, 120); };

  const makeContext = () => {
    if (contextFactory) return contextFactory();
    const Ctor = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
    return Ctor ? new Ctor() : null;
  };

  const unlock = () => {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return true;
    }
    try {
      ctx = makeContext();
    } catch {
      ctx = null;
    }
    if (!ctx) return false;
    const master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    const sfx = ctx.createGain();
    sfx.gain.value = 0.9;
    sfx.connect(master);
    const ambient = ctx.createGain();
    ambient.gain.value = 0.35;
    ambient.connect(master);
    buses = { master, sfx, ambient };

    // Wind bed (extended: returns .whistle filter for cutoff slew)
    wind = buildWindBed(ctx, ambient);
    const now = ctx.currentTime;
    wind.gain.gain.setValueAtTime(0, now);
    wind.gain.gain.linearRampToValueAtTime(0.5, now + 2.5);

    // R1.5 — pocket beds
    marsh = buildMarshBed(ctx, ambient);
    follyMoan = buildFollyMoan(ctx, ambient);
    folly = { gain: follyMoan.gain }; // alias for level tracking
    ranch = buildRanchBed(ctx, ambient);
    saloon = buildSaloonBed(ctx, ambient);
    cricket = buildCricketBed(ctx, ambient);

    // Seed one-shot timers
    resetCreak();
    resetCattle();
    resetSaloon();
    resetCoyote();

    if (!stungOnce) {
      stungOnce = true;
      harmonicaSting(ctx, sfx);
    }
    return true;
  };

  const RECIPES = {
    uiTick: () => tone(ctx, buses.sfx, { type: "triangle", from: 720, to: 540, decay: 0.09, gain: 0.12 }),
    chalkScratch: () => {
      noiseBurst(ctx, buses.sfx, { type: "highpass", freq: 2400, q: 0.8, decay: 0.16, gain: 0.18 });
      tone(ctx, buses.sfx, { type: "sine", from: 1318.5, decay: 0.5, gain: 0.08, delay: 0.16 });
    },
    chime: () => {
      tone(ctx, buses.sfx, { type: "sine", from: 1046.5, decay: 0.9, gain: 0.14 });
      tone(ctx, buses.sfx, { type: "sine", from: 2825.5, decay: 0.45, gain: 0.05 });
    },
    resolveChime: () => {
      tone(ctx, buses.sfx, { type: "sine", from: 784, decay: 0.5, gain: 0.13 });
      tone(ctx, buses.sfx, { type: "sine", from: 1174.7, decay: 0.9, gain: 0.12, delay: 0.18 });
    },
    creak: () => {
      tone(ctx, buses.sfx, { type: "sawtooth", from: 90, to: 160, decay: 0.34, gain: 0.1 });
      noiseBurst(ctx, buses.sfx, { freq: 600, decay: 0.22, gain: 0.1 });
    },
    menace: () => {
      tone(ctx, buses.sfx, { type: "sawtooth", from: 70, to: 38, decay: 1.1, gain: 0.22 });
      noiseBurst(ctx, buses.sfx, { freq: 300, q: 2, decay: 0.9, gain: 0.14, type: "bandpass", rate: 0.5 });
    },
    splat: () => {
      tone(ctx, buses.sfx, { type: "sine", from: 190, to: 55, decay: 0.18, gain: 0.3 });
      noiseBurst(ctx, buses.sfx, { freq: 900, decay: 0.14, gain: 0.22 });
    },
    bigSplat: () => {
      tone(ctx, buses.sfx, { type: "sine", from: 220, to: 36, decay: 0.5, gain: 0.36 });
      noiseBurst(ctx, buses.sfx, { freq: 700, decay: 0.4, gain: 0.3 });
      noiseBurst(ctx, buses.sfx, { type: "highpass", freq: 1800, decay: 0.5, gain: 0.1 });
    },
    playerHurt: () => {
      tone(ctx, buses.sfx, { type: "square", from: 300, to: 130, decay: 0.22, gain: 0.16 });
      noiseBurst(ctx, buses.sfx, { freq: 500, decay: 0.18, gain: 0.12 });
    },
    whoosh: () => noiseBurst(ctx, buses.sfx, { type: "bandpass", freq: 1100, q: 1.2, decay: 0.24, gain: 0.16, rate: 1.6 }),
    footstep: () => {
      const hot = footRunning ? 1.5 : 1;
      noiseBurst(ctx, buses.sfx, {
        freq: 340 + Math.random() * 120,
        decay: 0.07,
        gain: 0.09 * hot,
        rate: 0.9 + Math.random() * 0.25,
      });
    },
    sting: () => harmonicaSting(ctx, buses.sfx),
  };

  let footRunning = false;

  const play = (name) => {
    if (!ctx || !buses || muted) return false;
    const recipe = RECIPES[name];
    if (!recipe) return false;
    recipe();
    return true;
  };

  // Smooth slew toward a target gain value.
  const slew = (gainNode, target, dt, rate = 0.5) => {
    const current = gainNode.gain.value;
    gainNode.gain.value = current + (target - current) * Math.min(1, dt * rate);
  };

  /**
   * Per-frame update.
   * @param {number} dt - frame delta seconds
   * @param {object} opts
   * @param {boolean} [opts.moving]
   * @param {boolean} [opts.running]
   * @param {string}  [opts.paletteKey] - "day"|"goldenHour"|"dusk"|"night"
   * @param {number}  [opts.windSpeed]  - 1=clear, 1.8=dust, 2.6=storm
   * @param {number}  [opts.worldTime]  - seconds (monotonic); drives gust schedule
   * @param {number}  [opts.playerX]    - world X coord; drives pocket cross-fades
   * @param {number}  [opts.playerY]    - world Y coord; drives pocket cross-fades
   */
  const update = (dt, {
    moving = false,
    running = false,
    paletteKey = "dusk",
    windSpeed = 1,
    worldTime = 0,
    playerX = 0,
    playerY = 0,
  } = {}) => {
    if (!ctx || !wind) return;

    // Gate ambient master on visibility — ramp to 0 when tab hidden.
    const visible = typeof document === "undefined" || document.visibilityState === "visible";
    const ambientTarget = visible ? 0.35 : 0;
    slew(buses.ambient, ambientTarget, dt, 2.0);

    footRunning = running;
    const stepped = stepFootstepClock(footClock, dt, moving, running);
    footClock = stepped.clock;
    if (stepped.fire) play("footstep");

    // R1.4 — wind gain tracks palette with gentle slew.
    const windGainTarget = 0.5 * windLevelForPalette(paletteKey);
    slew(wind.gain, windGainTarget, dt, 0.5);

    // R1.4 — whistle cutoff tracks windSpeed, smoothly slewed.
    lastWindSpeed = windSpeed;
    const cutoffTarget = windCutoffFor(windSpeed);
    // Slew the whistle filter's base frequency (LFO still rides on top).
    // We use setTargetAtTime for audio-thread smooth transition.
    const whistleBase = wind.whistle.frequency.value;
    wind.whistle.frequency.value = whistleBase + (cutoffTarget - whistleBase) * Math.min(1, dt * 0.3);

    // R1.4 — gust burst: fire once per window opening (0→>0 crossing).
    if (gustWindowOpened(prevWorldTime, worldTime, GUST_AUDIO_SEED)) {
      fireGustBurst(ctx, buses.ambient, windSpeed);
    }
    prevWorldTime = worldTime;

    // R1.5 — biome pocket levels.
    const pockets = biomePocketLevels(playerX, playerY);

    // Marsh: continuous trickle bed.
    if (marsh) {
      slew(marsh.gain, pockets.marsh * 0.55, dt, 1.0);
    }

    // Folly: no continuous bed; moan tone + creak timer while in pocket.
    if (follyMoan) {
      slew(follyMoan.gain, pockets.folly * 0.18, dt, 0.8);
    }
    if (pockets.folly > 0.3) {
      creakTimer -= dt;
      if (creakTimer <= 0) {
        RECIPES.creak();
        resetCreak();
      }
    } else {
      // Reset timer when outside pocket so the creak doesn't instantly fire on re-entry.
      if (creakTimer < 4) resetCreak();
    }

    // Ranch: one-shot cattle moos on timer.
    if (pockets.ranch > 0.05) {
      cattleTimer -= dt;
      if (cattleTimer <= 0) {
        fireCattleMoo(ctx, buses.ambient, pockets.ranch);
        resetCattle();
      }
    } else {
      if (cattleTimer < 5) resetCattle();
    }

    // Saloon: one-shot piano plinks on timer.
    if (saloon && pockets.saloon > 0.05) {
      saloonTimer -= dt;
      if (saloonTimer <= 0) {
        fireSaloonPlinks(ctx, saloon.lp, pockets.saloon);
        resetSaloon();
      }
    } else {
      if (saloonTimer < 5) resetSaloon();
    }

    // R1.5 — night bed: cricket gain tracks paletteKey.
    if (cricket) {
      const nightGain = nightBedGainFor(paletteKey);
      slew(cricket.gain, nightGain * 0.5, dt, 0.8);
    }

    // R1.5 — coyote: fires at night only on a 60–120 s timer.
    const isNight = paletteKey === "night";
    if (isNight) {
      coyoteTimer -= dt;
      if (coyoteTimer <= 0) {
        fireCoyoteHowl(ctx, buses.ambient);
        resetCoyote();
      }
    } else {
      // Reset so coyote doesn't instantly howl when night starts.
      if (coyoteTimer < 10) resetCoyote();
    }
  };

  const onLoopEvent = (event) => {
    const name = sfxForLoopEvent(event);
    return name ? play(name) : false;
  };

  const setMuted = (m) => {
    muted = !!m;
    if (buses) buses.master.gain.value = muted ? 0 : 1;
  };

  const dispose = () => {
    try {
      wind?.src.stop();
      wind?.lfo.stop();
      marsh?.src.stop();
      marsh?.am.stop();
      follyMoan?.osc.stop();
      follyMoan?.vib.stop();
      cricket?.src.stop();
      cricket?.chopLfo.stop();
      ctx?.close();
    } catch {
      /* already torn down */
    }
    ctx = null;
    buses = null;
    wind = null;
    marsh = null;
    follyMoan = null;
    folly = null;
    ranch = null;
    saloon = null;
    cricket = null;
  };

  return {
    unlock,
    update,
    play,
    onLoopEvent,
    setMuted,
    get muted() {
      return muted;
    },
    get unlocked() {
      return !!ctx;
    },
    dispose,
  };
}
