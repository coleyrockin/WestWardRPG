import { describe, it, expect } from "vitest";
import {
  applyMiniBossPhaseTransition,
  cancelChargedAttack,
  getMiniBossPhaseTwo,
  resolveParryChain,
  shouldTransitionMiniBossPhase,
  startChargedAttack,
  tickChargedAttack,
  tickMiniBossInvulnerability,
  tickParryChain,
} from "../src/combatMilestones.js";

describe("combat milestones", () => {
  it("transitions mini-bosses into phase two at half health", () => {
    const enemy: any = {
      miniBossId: "ashfall_scrap_tyrant",
      phase: 1,
      alive: true,
      type: "brute",
      behavior: "tank",
      hp: 40,
      maxHp: 100,
      speed: 1,
      baseDamage: 10,
      stagger: 0,
    };

    expect(shouldTransitionMiniBossPhase(enemy)).toBe(true);
    const transition = applyMiniBossPhaseTransition(enemy);
    expect(transition?.phase).toBe(2);
    expect(enemy.phase).toBe(2);
    expect(enemy.behavior).toBe(getMiniBossPhaseTwo("ashfall_scrap_tyrant")?.behavior);
    expect(enemy.invulnTimer).toBeCloseTo(0.6);
    expect(enemy.hp).toBeGreaterThanOrEqual(50);
  });

  it("ticks mini-boss invulnerability down to zero", () => {
    const enemy: any = { invulnTimer: 0.6 };
    expect(tickMiniBossInvulnerability(enemy, 0.25)).toBeCloseTo(0.35);
    expect(tickMiniBossInvulnerability(enemy, 1)).toBe(0);
  });

  it("upgrades a second parry inside the chain window", () => {
    const first = resolveParryChain({ parryChainTimer: 0 });
    const second = resolveParryChain({ parryChainTimer: 1.4 });
    expect(first.chained).toBe(false);
    expect(first.staminaRefund).toBe(8);
    expect(second.chained).toBe(true);
    expect(second.text).toBe("CHAIN!");
    expect(second.stagger).toBeGreaterThan(first.stagger);
  });

  it("ticks parry chain timers", () => {
    const player: any = { parryChainTimer: 2.5 };
    tickParryChain(player, 0.75);
    expect(player.parryChainTimer).toBeCloseTo(1.75);
    tickParryChain(player, 5);
    expect(player.parryChainTimer).toBe(0);
  });

  it("starts, releases, and cancels charged attack windups", () => {
    const player: any = { stamina: 30, attackCooldown: 0 };
    expect(startChargedAttack(player, [], "playing")).toBe(true);
    expect(player.chargeAttackWindup).toBeCloseTo(0.3);
    expect(player.stamina).toBe(24);
    expect(tickChargedAttack(player, 0.29)).toBe(false);
    expect(tickChargedAttack(player, 0.02)).toBe(true);

    expect(startChargedAttack(player, ["order_keeper"], "playing")).toBe(true);
    expect(player.chargeAttackWindup).toBeCloseTo(0.24);
    expect(cancelChargedAttack(player)).toBe(true);
    expect(player.chargeAttackWindup).toBe(0);
    expect(player.stamina).toBe(24);
  });
});
