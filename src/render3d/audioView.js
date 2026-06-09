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
// LFO drift on the whistle cutoff. Mirrors the Canvas drone recipe, retuned as
// open-prairie wind instead of a musical pad.
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
  return { src, lfo, gain };
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

// createAudioView() — the spike's audio singleton.
//   unlock()                       call inside a user gesture; idempotent.
//   update(dt, {moving, running, paletteKey})  per-frame; drives boots + wind.
//   play(name)                     fire a one-shot by SFX_NAMES name.
//   onLoopEvent(event)             route a transitionLoopPhase event to its sfx.
//   muted / setMuted(m), dispose()
export function createAudioView({ contextFactory } = {}) {
  let ctx = null;
  let buses = null;
  let wind = null;
  let footClock = 0;
  let muted = false;
  let stungOnce = false;

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
    wind = buildWindBed(ctx, ambient);
    const now = ctx.currentTime;
    wind.gain.gain.setValueAtTime(0, now);
    wind.gain.gain.linearRampToValueAtTime(0.5, now + 2.5);
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

  const update = (dt, { moving = false, running = false, paletteKey = "dusk" } = {}) => {
    if (!ctx || !wind) return;
    footRunning = running;
    const stepped = stepFootstepClock(footClock, dt, moving, running);
    footClock = stepped.clock;
    if (stepped.fire) play("footstep");
    // Wind tracks the palette with a gentle slew so day/night blends are seamless.
    const target = 0.5 * windLevelForPalette(paletteKey);
    const current = wind.gain.gain.value;
    wind.gain.gain.value = current + (target - current) * Math.min(1, dt * 0.5);
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
      ctx?.close();
    } catch {
      /* already torn down */
    }
    ctx = null;
    buses = null;
    wind = null;
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
