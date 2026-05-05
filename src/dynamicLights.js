const DEFAULT_LIGHT = {
  radius: 4,
  intensity: 0.45,
  color: "#ffd77b",
  flicker: 0,
};

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function parseLightColor(color = DEFAULT_LIGHT.color) {
  if (typeof color !== "string" || !color.startsWith("#")) {
    return { r: 255, g: 215, b: 123 };
  }
  const full = color.length === 4
    ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    : color;
  if (full.length !== 7) return { r: 255, g: 215, b: 123 };
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  if (![r, g, b].every(Number.isFinite)) return { r: 255, g: 215, b: 123 };
  return { r, g, b };
}

export function normalizeDynamicLight(light = {}) {
  const x = Number.isFinite(light.x) ? light.x : null;
  const y = Number.isFinite(light.y) ? light.y : null;
  if (x === null || y === null) return null;
  const radius = Math.max(0.1, Number.isFinite(light.radius) ? light.radius : DEFAULT_LIGHT.radius);
  const intensity = clamp01(Number.isFinite(light.intensity) ? light.intensity : DEFAULT_LIGHT.intensity);
  return {
    id: typeof light.id === "string" ? light.id : `light-${x.toFixed(2)}-${y.toFixed(2)}`,
    kind: typeof light.kind === "string" ? light.kind : "light",
    x,
    y,
    radius,
    intensity,
    color: typeof light.color === "string" ? light.color : DEFAULT_LIGHT.color,
    rgb: parseLightColor(light.color || DEFAULT_LIGHT.color),
    flicker: clamp01(Number.isFinite(light.flicker) ? light.flicker : DEFAULT_LIGHT.flicker),
  };
}

export function selectDynamicLights(lights, reference = {}, options = {}) {
  const maxLights = Math.max(0, Math.floor(Number.isFinite(options.maxLights) ? options.maxLights : 8));
  const refX = Number.isFinite(reference.x) ? reference.x : 0;
  const refY = Number.isFinite(reference.y) ? reference.y : 0;
  return (Array.isArray(lights) ? lights : [])
    .map(normalizeDynamicLight)
    .filter(Boolean)
    .map((light) => {
      const distance = Math.hypot(light.x - refX, light.y - refY);
      const reach = Math.max(0, 1 - distance / Math.max(0.001, light.radius + 2));
      return {
        ...light,
        distance,
        priority: light.intensity * 1.6 + light.radius * 0.08 + reach,
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxLights);
}

export function resolveDynamicLightAtPoint(point = {}, lights, options = {}) {
  const x = Number.isFinite(point.x) ? point.x : 0;
  const y = Number.isFinite(point.y) ? point.y : 0;
  const time = Number.isFinite(options.time) ? options.time : 0;
  const strength = clamp01(Number.isFinite(options.strength) ? options.strength : 1);
  let r = 0;
  let g = 0;
  let b = 0;
  let amount = 0;

  for (const light of Array.isArray(lights) ? lights : []) {
    const normalized = light?.rgb ? light : normalizeDynamicLight(light);
    if (!normalized) continue;
    const distance = Math.hypot(normalized.x - x, normalized.y - y);
    if (distance >= normalized.radius) continue;
    const falloff = 1 - distance / normalized.radius;
    const curve = falloff * falloff * (3 - 2 * falloff);
    const flicker = normalized.flicker > 0
      ? 1 + Math.sin(time * 12.7 + normalized.x * 2.1 + normalized.y * 3.3) * normalized.flicker * 0.18
      : 1;
    const contribution = clamp01(curve * normalized.intensity * flicker * strength);
    r += normalized.rgb.r * contribution;
    g += normalized.rgb.g * contribution;
    b += normalized.rgb.b * contribution;
    amount += contribution;
  }

  const alpha = clamp01(amount);
  if (alpha <= 0) {
    return { active: false, alpha: 0, r: 0, g: 0, b: 0, style: "rgba(0, 0, 0, 0)" };
  }

  const denom = Math.max(0.001, amount);
  const out = {
    active: true,
    alpha,
    r: Math.round(r / denom),
    g: Math.round(g / denom),
    b: Math.round(b / denom),
  };
  return {
    ...out,
    style: `rgba(${out.r}, ${out.g}, ${out.b}, ${Number((alpha * 0.34).toFixed(3))})`,
  };
}
