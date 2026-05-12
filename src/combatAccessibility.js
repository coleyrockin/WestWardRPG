// Combat accessibility layer. When the accessibility flag is enabled:
//   1. Combat subtitles appear as on-screen text overlays (hit/dodge/parry etc.)
//   2. Short audio cues play on key combat events (tone + volume differentiated)
//
// Pure helper — consumers call recordCombatEvent(type) each frame; the
// module dedupes, queues, and renders subtitle text via drawCombatSubtitles().

export const COMBAT_EVENTS = {
  hit:          { label: "HIT",          color: "#ff9060", duration: 0.7 },
  crit:         { label: "CRITICAL HIT", color: "#ffcf5a", duration: 0.9 },
  block:        { label: "BLOCK",        color: "#8fd0ff", duration: 0.55 },
  enemy_alert:  { label: "ENEMY ALERTED", color: "#92f0a3", duration: 0.8 },
  windup:       { label: "WINDUP",       color: "#ff6048", duration: 0.85 },
  stagger:      { label: "STAGGER",      color: "#ffe16a", duration: 0.75 },
  perfect_parry:{ label: "PERFECT PARRY",color: "#9be0ff", duration: 0.9 },
  perfect_dodge:{ label: "PERFECT DODGE",color: "#b0e8ff", duration: 0.9 },
  guard_break:  { label: "GUARD BREAK",  color: "#ffcf8a", duration: 1.0 },
  low_hp:       { label: "LOW HEALTH",   color: "#ff5050", duration: 1.2 },
  enemy_death:  { label: "ENEMY DOWN",   color: "#6be873", duration: 0.7 },
  boss_phase:   { label: "BOSS PHASE",   color: "#ffc490", duration: 1.0 },
  reward_drop:  { label: "REWARD DROP",  color: "#ffd77b", duration: 0.8 },
  regen:        { label: "HP RESTORED",  color: "#6be873", duration: 0.6 },
};

export function createCombatSubtitleState() {
  return { queue: [], ttl: 0, current: null };
}

export function recordCombatEvent(subtitleState, type) {
  if (!subtitleState || !COMBAT_EVENTS[type]) return;
  // Dedupe: don't re-queue the same event if it's already current
  if (subtitleState.current?.type === type && subtitleState.ttl > 0.3) return;
  subtitleState.queue.push({ type, ...COMBAT_EVENTS[type], life: COMBAT_EVENTS[type].duration });
}

export function tickCombatSubtitles(subtitleState, dt) {
  if (!subtitleState) return;
  if (subtitleState.current) {
    subtitleState.current.life -= dt;
    if (subtitleState.current.life <= 0) subtitleState.current = null;
  }
  if (!subtitleState.current && subtitleState.queue.length > 0) {
    subtitleState.current = subtitleState.queue.shift();
  }
}

export function drawCombatSubtitles(ctx, subtitleState, canvasWidth, canvasHeight) {
  if (!subtitleState?.current) return;
  const ev = subtitleState.current;
  const alpha = Math.min(1, ev.life / Math.max(0.2, COMBAT_EVENTS[ev.type]?.duration || 1));
  const x = canvasWidth / 2;
  const y = canvasHeight - 80;
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000a";
  ctx.fillText(ev.label, x + 1, y + 1);
  ctx.fillStyle = ev.color;
  ctx.fillText(ev.label, x, y);
  ctx.restore();
}

// Short Web Audio tones for combat events. Disabled when audioBuses is null
// or when the accessibility audio flag is off.
const AUDIO_CUES = {
  enemy_alert:   { freq: 360, dur: 0.08, vol: 0.11 },
  windup:        { freq: 240, dur: 0.16, vol: 0.14 },
  stagger:       { freq: 520, dur: 0.09, vol: 0.12 },
  perfect_parry: { freq: 880, dur: 0.12, vol: 0.18 },
  perfect_dodge: { freq: 660, dur: 0.10, vol: 0.15 },
  guard_break:   { freq: 200, dur: 0.20, vol: 0.22 },
  crit:          { freq: 440, dur: 0.08, vol: 0.12 },
  boss_phase:    { freq: 150, dur: 0.24, vol: 0.2 },
  reward_drop:   { freq: 720, dur: 0.08, vol: 0.1 },
  low_hp:        { freq: 180, dur: 0.30, vol: 0.25 },
};

export function playCombatAudioCue(audioCtx, type) {
  if (!audioCtx || !AUDIO_CUES[type]) return;
  try {
    const def = AUDIO_CUES[type];
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(def.freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(def.vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + def.dur);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + def.dur);
  } catch { /* AudioContext not ready */ }
}
