import { describe, expect, it } from "vitest";
import {
  resolveBossPhaseVfx,
  resolveCombatEncounterReadability,
  resolveEnemyDeathVfx,
  resolveEnemyDefeatCallout,
  resolveEnemyReadabilityCue,
} from "../src/combatReadability.js";

describe("combatReadability", () => {
  it("prioritizes windup cues for readable incoming attacks", () => {
    const cue = resolveEnemyReadabilityCue({
      alive: true,
      windupTimer: 0.4,
      windupMax: 0.8,
      flashTimer: 0.1,
      stagger: 0.3,
    });

    expect(cue).toMatchObject({
      state: "windup",
      label: "WINDUP",
      urgency: "high",
      color: "#ff4f3a",
      actionLine: "Interrupt, block, or backstep now.",
      silhouette: "danger",
    });
    expect(cue.meter).toBeCloseTo(0.5);
    expect(cue.outlineAlpha).toBeGreaterThan(0.65);
    expect(cue.bodyScale).toBeGreaterThan(1);
  });

  it("surfaces stagger, phase, and death cues in priority order", () => {
    expect(resolveEnemyReadabilityCue({ alive: true, phase: 2, phaseLabel: "Overdrive" })).toMatchObject({
      state: "phase",
      label: "PHASE 2",
    });
    expect(resolveEnemyReadabilityCue({ alive: true, stagger: 0.5 })).toMatchObject({
      state: "stagger",
      label: "STAGGER",
    });
    expect(resolveEnemyReadabilityCue({ alive: false })).toMatchObject({
      state: "dead",
      label: "DOWN",
      actionLine: "Reward secured.",
    });
  });

  it("returns stronger hit and stagger draw instructions", () => {
    const hitCue = resolveEnemyReadabilityCue({ alive: true, flashTimer: 0.08 });
    expect(hitCue).toMatchObject({
      state: "hit",
      label: "HIT",
      silhouette: "impact",
    });
    expect(hitCue.outlineAlpha).toBeGreaterThan(0.3);

    const staggerCue = resolveEnemyReadabilityCue({ alive: true, stagger: 0.7 });
    expect(staggerCue).toMatchObject({
      state: "stagger",
      label: "STAGGER",
      actionLine: "Safe opening: press the attack.",
      silhouette: "opened",
    });
  });

  it("summarizes the most urgent encounter cue for text smoke output", () => {
    const summary = resolveCombatEncounterReadability({
      player: { x: 5, y: 5 },
      enemies: [
        { id: "near", label: "Road Slime", alive: true, x: 6, y: 5, alerted: true },
        { id: "windup", label: "Shield Brute", alive: true, x: 9, y: 5, windupTimer: 0.4, windupMax: 0.8 },
      ],
      recentEvent: { kind: "enemy_alert", title: "Enemy noticed you", line: "Road Slime has aggro.", ttl: 1.2 },
      subtitlesEnabled: true,
    });

    expect(summary).toMatchObject({
      active: true,
      activeCount: 2,
      highestUrgency: "high",
      primary: {
        id: "windup",
        state: "windup",
        labelCue: "WINDUP",
        responseLine: "Interrupt, block, or backstep now.",
      },
    });
    expect(summary.threatLine).toContain("Shield Brute");
    expect(summary.threatLine).toContain("4.0 tiles");
    expect(summary.states).toMatchObject({ windup: 1, aggro: 1 });
  });

  it("keeps reward drops visible after combat ends", () => {
    const summary = resolveCombatEncounterReadability({
      player: { x: 5, y: 5 },
      enemies: [],
      recentEvent: {
        kind: "reward_drop",
        title: "Reward dropped",
        line: "Road Slime down: +10g, +22 XP, +1 Slime Core.",
        rewardLine: "+10g +22XP +1 Slime Core",
        ttl: 2.4,
      },
    });

    expect(summary).toMatchObject({
      active: false,
      highestUrgency: "none",
      rewardLine: "+10g +22XP +1 Slime Core",
      responseLine: "Collect the reward and check the next objective.",
    });
  });

  it("does not call distant idle enemies active combat pressure", () => {
    const summary = resolveCombatEncounterReadability({
      player: { x: 5, y: 5 },
      enemies: [
        { id: "far", label: "Distant Slime", alive: true, x: 30, y: 30 },
      ],
      maxDistance: 10,
    });

    expect(summary.active).toBe(false);
    expect(summary.threatLine).toBe("No hostile pressure nearby.");
  });

  it("builds readable defeat reward callouts", () => {
    expect(resolveEnemyDefeatCallout({
      label: "Slime",
      gold: 10,
      xp: 22,
      items: { "Slime Core": 1 },
    })).toMatchObject({
      floatingText: "+10g +22XP +1 Slime Core",
      logLine: "Slime down: +10g, +22 XP, +1 Slime Core.",
      particleColor: "#6be873",
    });

    expect(resolveEnemyDefeatCallout({
      label: "Scrap Tyrant",
      miniBoss: true,
      gold: 90,
      xp: 120,
      items: { "Heat Resin": 2 },
      color: "#e08a4a",
    })).toMatchObject({
      floatingText: "BOSS +90g +120XP +2 Heat Resin",
      logLine: "Scrap Tyrant defeated: +90g, +120 XP, +2 Heat Resin.",
      particleBurst: 24,
      screenShake: 0.18,
    });
  });

  it("builds boss-specific phase VFX profiles", () => {
    const tyrant = resolveBossPhaseVfx({
      bossId: "ashfall_scrap_tyrant",
      label: "Scrap Tyrant",
      phaseLabel: "Scrap Tyrant Overdrive",
    });
    const overseer = resolveBossPhaseVfx({
      bossId: "lantern_overseer",
      label: "Lantern Overseer",
      phaseLabel: "Lantern Overseer Override",
    });

    expect(tyrant).toMatchObject({
      floatingText: "PHASE 2: Scrap Tyrant Overdrive",
      effectKind: "scrap-burst",
      particleColor: "#ff9f5f",
      ringColor: "#ffc490",
    });
    expect(tyrant.particleBurst).toBeGreaterThan(20);
    expect(overseer.effectKind).toBe("signal-ring");
    expect(overseer.particleColor).not.toBe(tyrant.particleColor);
  });

  it("builds death smoke VFX for normal enemies and mini-bosses", () => {
    const slime = resolveEnemyDeathVfx({ label: "Road Slime", color: "#6be873" });
    const boss = resolveEnemyDeathVfx({ bossId: "ashfall_scorch_engine", label: "Scorch Engine", color: "#e08a4a", miniBoss: true });

    expect(slime).toMatchObject({
      effectKind: "small-smoke",
      floatingText: "SMOKE",
      particleColor: "#6be873",
    });
    expect(boss).toMatchObject({
      effectKind: "boss-smoke",
      floatingText: "BOSS DOWN",
      smokeColor: "#2b211b",
    });
    expect(boss.particleBurst).toBeGreaterThan(slime.particleBurst);
    expect(boss.screenShake).toBeGreaterThan(slime.screenShake);
  });
});
