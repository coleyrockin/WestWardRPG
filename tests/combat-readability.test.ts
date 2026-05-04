import { describe, expect, it } from "vitest";
import {
  resolveEnemyReadabilityCue,
  resolveEnemyDefeatCallout,
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
});
