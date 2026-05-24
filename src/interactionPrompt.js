const PRIORITY = {
  "job-route": 5,
  poi: 8,
  "job-board": 10,
  npc: 14,
  "interior-exit": 16,
  "house-exit": 16,
  bed: 18,
  workbench: 18,
  trophy: 18,
  "house-door": 20,
  "region-interior": 22,
  "road-sign": 30,
  resource: 38,
  pig: 44,
};

const ACTION_LABELS = {
  "road-sign": "Read sign",
  poi: "Inspect",
  "interior-exit": "Exit",
  "house-exit": "Step outside",
  bed: "Rest",
  workbench: "Use workbench",
  trophy: "Inspect trophy",
  "house-door": "Enter house",
  "region-interior": "Enter",
  "job-board": "Open jobs",
  "job-route": "Advance job",
  npc: "Talk",
  pig: "Pet",
  resource: "Gather",
};

const ACTION_COLORS = {
  "road-sign": "#ffde91",
  poi: "#ffd77b",
  "job-board": "#ffd77b",
  "job-route": "#9bd3ff",
  npc: "#ffd77b",
  resource: "#8fd0ff",
  workbench: "#d8bc6a",
  trophy: "#ffe16a",
  bed: "#d8a7a7",
};

function cleanLabel(value, fallback = "nearby") {
  const text = String(value || "").trim();
  return text || fallback;
}

export function resolveInteractionPrompt(candidates = []) {
  const viable = candidates
    .filter((candidate) => candidate && candidate.available !== false)
    .map((candidate) => ({
      ...candidate,
      kind: candidate.kind || "generic",
      distance: Number.isFinite(candidate.distance) ? candidate.distance : 0,
    }))
    .sort((a, b) => {
      const priorityDelta = (PRIORITY[a.kind] ?? 99) - (PRIORITY[b.kind] ?? 99);
      if (priorityDelta !== 0) return priorityDelta;
      return a.distance - b.distance;
    });
  const chosen = viable[0];
  if (!chosen) return null;
  const action = chosen.action || ACTION_LABELS[chosen.kind] || "Use";
  const label = cleanLabel(chosen.label, chosen.kind);
  return {
    kind: chosen.kind,
    action,
    label,
    title: `E: ${action}`,
    line: chosen.line || label,
    color: chosen.color || ACTION_COLORS[chosen.kind] || "#ffd77b",
    urgency: chosen.urgency || (chosen.kind === "job-route" ? "high" : "normal"),
  };
}

export function formatInteractionPrompt(prompt) {
  if (!prompt) return "";
  const title = cleanLabel(prompt.title, "E: Use");
  const line = cleanLabel(prompt.line, prompt.label || "");
  return line ? `${title} - ${line}` : title;
}
