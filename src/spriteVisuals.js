import { TAU } from "./constants.js";

const SELF_LIT_WORLD_PROPS = new Set([
  "lamp",
  "seam",
  "relay",
  "smoke",
  "gate",
  "watchtower",
  "tower",
  "signal",
  "road",
]);

export function isSelfLitSprite(sprite = {}) {
  if (sprite.kind === "pressure" || sprite.kind === "job-route" || sprite.kind === "job-board") return true;
  if (sprite.kind === "roadside-discovery") return sprite.poiKind === "camp" || sprite.poiKind === "shrine";
  if (sprite.kind === "poi") return sprite.poiKind === "camp" || sprite.poiKind === "shrine" || sprite.poiKind === "mine";
  if (sprite.kind === "landmark") return sprite.landmarkVariant === "signal_mast" || sprite.landmarkVariant === "slag_tower";
  if (sprite.kind === "world-prop") return SELF_LIT_WORLD_PROPS.has(sprite.propKind);
  return false;
}

export function resolveSpriteLightOverlayAlpha(sprite = {}, lightFactor = 1) {
  const light = Number.isFinite(lightFactor) ? lightFactor : 1;
  const baseAlpha = 0.18 * (1 - light + 0.24);
  return baseAlpha * (isSelfLitSprite(sprite) ? 0.56 : 1);
}

function applyAlpha(color, alpha, hexToRgba) {
  if (typeof color !== "string") return color;
  const a = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  if (color.startsWith("#")) return hexToRgba(color, a);
  const rgba = color.match(/^rgba\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(",").map((part) => part.trim()).slice(0, 3);
    return `rgba(${parts.join(", ")}, ${a})`;
  }
  const rgb = color.match(/^rgb\(([^)]+)\)$/i);
  if (rgb) return `rgba(${rgb[1]}, ${a})`;
  return color;
}

export function createSpriteLightHelpers(ctx, options = {}) {
  const hexToRgba = options.hexToRgba || ((color) => color);

  function drawSpriteGlow(cx, cy, radius, color, alpha, innerRatio = 0.18) {
    if (radius <= 0 || alpha <= 0) return;
    const glow = ctx.createRadialGradient(cx, cy, radius * innerRatio, cx, cy, radius);
    glow.addColorStop(0, applyAlpha(color, alpha, hexToRgba));
    glow.addColorStop(0.55, applyAlpha(color, alpha * 0.45, hexToRgba));
    glow.addColorStop(1, applyAlpha(color, 0, hexToRgba));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSpritePulseRing(cx, cy, radius, color, alpha, lineWidth = 2) {
    if (radius <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = applyAlpha(color, alpha, hexToRgba);
    ctx.lineWidth = Math.max(1, lineWidth);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  return {
    drawSpriteGlow,
    drawSpritePulseRing,
  };
}
