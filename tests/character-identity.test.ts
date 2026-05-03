import { describe, expect, it } from "vitest";
import {
  ATTRIBUTE_IDS,
  ORIGINS,
  applyOrigin,
  buildCharacterIdentitySummary,
  createInitialCharacterIdentity,
  deriveAttributeEffects,
  normalizeCharacterIdentity,
  resolveIdentityShopPriceMultiplier,
  spendAttributePoint,
} from "../src/characterIdentity.js";

describe("characterIdentity", () => {
  it("creates a valid default origin and bounded attributes", () => {
    const identity = createInitialCharacterIdentity();
    expect(identity.originId).toBe("exiled_marshal");
    expect(Object.keys(identity.attributes)).toEqual(ATTRIBUTE_IDS);
    expect(identity.attributes.grit).toBeGreaterThan(identity.attributes.lore);
    expect(identity.unspentAttributePoints).toBe(0);
  });

  it("applies origin presets without mutating the original identity", () => {
    const base = createInitialCharacterIdentity();
    const next = applyOrigin(base, "lantern_defector");
    expect(next).not.toBe(base);
    expect(next.originId).toBe("lantern_defector");
    expect(next.attributes.lore).toBe(ORIGINS.lantern_defector.attributes.lore);
    expect(base.originId).toBe("exiled_marshal");
  });

  it("normalizes invalid saved data to safe defaults", () => {
    const identity = normalizeCharacterIdentity({
      originId: "missing",
      attributes: { might: 99, grit: -5, speech: 4 },
      unspentAttributePoints: 3.7,
    });
    expect(identity.originId).toBe("exiled_marshal");
    expect(identity.attributes.might).toBe(10);
    expect(identity.attributes.grit).toBe(1);
    expect(identity.attributes.speech).toBe(4);
    expect(identity.unspentAttributePoints).toBe(3);
  });

  it("spends attribute points only on known attributes", () => {
    const identity = normalizeCharacterIdentity({ unspentAttributePoints: 1 });
    const spent = spendAttributePoint(identity, "craft");
    expect(spent.attributes.craft).toBe(identity.attributes.craft + 1);
    expect(spent.unspentAttributePoints).toBe(0);
    expect(spendAttributePoint(spent, "unknown" as any)).toBe(spent);
  });

  it("builds player-facing role labels and derived effect hooks", () => {
    const identity = createInitialCharacterIdentity("guild_errandhand");
    const summary = buildCharacterIdentitySummary(identity);
    const effects = deriveAttributeEffects(identity);
    expect(summary.originLabel).toBe("Guild Errandhand");
    expect(summary.roleLabel).toBe("Envoy");
    expect(summary.attributeLine).toContain("Speech");
    expect(effects.barterBonusPct).toBeGreaterThan(0);
    expect(effects.maxHpBonus).toBeGreaterThan(0);
  });

  it("turns Speech into a bounded shop discount hook", () => {
    const lowSpeech = normalizeCharacterIdentity({ attributes: { speech: 1 } });
    const envoy = createInitialCharacterIdentity("guild_errandhand");
    expect(resolveIdentityShopPriceMultiplier(lowSpeech)).toBe(1);
    expect(resolveIdentityShopPriceMultiplier(envoy)).toBeLessThan(1);
    expect(resolveIdentityShopPriceMultiplier({ attributes: { speech: 10 } })).toBeGreaterThanOrEqual(0.82);
  });
});
