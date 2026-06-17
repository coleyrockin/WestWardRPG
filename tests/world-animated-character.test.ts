import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { resolveClipAliases } from "../src/game/world/animatedCharacter.js";

// A sourced rig (e.g. Quaternius) names its clips Idle_Loop / Walk_Loop /
// Jog_Fwd_Loop / Pistol_Shoot, but the locomotion code keys on canonical roles
// idle / walk / run / draw. resolveClipAliases maps the asset names onto the
// canonical roles so the same player code drives any rig.
describe("animatedCharacter — resolveClipAliases", () => {
  const actions = {
    idle_loop: { id: "Idle_Loop" },
    walk_loop: { id: "Walk_Loop" },
    jog_fwd_loop: { id: "Jog_Fwd_Loop" },
    pistol_shoot: { id: "Pistol_Shoot" },
  };

  it("aliases canonical roles onto the asset's actual clip actions", () => {
    const out = resolveClipAliases(actions, {
      idle: "Idle_Loop",
      walk: "Walk_Loop",
      run: "Jog_Fwd_Loop",
      draw: "Pistol_Shoot",
    });
    expect(out.idle).toBe(actions.idle_loop);
    expect(out.walk).toBe(actions.walk_loop);
    expect(out.run).toBe(actions.jog_fwd_loop);
    expect(out.draw).toBe(actions.pistol_shoot);
  });

  it("is case-insensitive on the mapped asset name", () => {
    const out = resolveClipAliases(actions, { run: "JOG_FWD_LOOP" });
    expect(out.run).toBe(actions.jog_fwd_loop);
  });

  it("keeps the original clip actions intact alongside the aliases", () => {
    const out = resolveClipAliases(actions, { idle: "Idle_Loop" });
    expect(out.idle_loop).toBe(actions.idle_loop);
  });

  it("skips a mapping whose target clip is absent (no crash, no bad alias)", () => {
    const out = resolveClipAliases(actions, { turn: "Turn_Left_Loop" });
    expect(out.turn).toBeUndefined();
  });

  it("returns an equivalent map when no clipMap is given", () => {
    const out = resolveClipAliases(actions);
    expect(out.idle_loop).toBe(actions.idle_loop);
    expect(out.idle).toBeUndefined();
  });
});
