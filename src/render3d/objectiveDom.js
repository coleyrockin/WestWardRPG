// DOM objective strip helpers for the Three.js spike.
// Keeps phase-driven UI updates out of spike.js and avoids string HTML writes.

import { getPhaseProgress } from "./phaseState.js";

export function createObjectiveDomRefs(rootDocument = globalThis.document) {
  const doc = rootDocument && typeof rootDocument.querySelector === "function"
    ? rootDocument
    : null;
  return {
    label: doc?.querySelector("#objective .label") || null,
    text: doc?.querySelector("#objective .text") || null,
    meta: doc?.querySelector("#objective .meta") || null,
    progress: doc?.querySelector("#route-progress") || null,
    progressLabel: doc?.querySelector("#route-progress .progress-label") || null,
    progressFill: doc?.querySelector("#route-progress .progress-fill") || null,
    tag: doc?.querySelector("#tag") || null,
    createElement: typeof doc?.createElement === "function"
      ? doc.createElement.bind(doc)
      : null,
  };
}

function setMetaChildren(refs, items) {
  const meta = refs?.meta;
  if (!meta) return;

  const createElement = refs?.createElement;
  if (typeof createElement !== "function") {
    meta.textContent = items.join(" ");
    return;
  }

  const nodes = items.map((line) => {
    const span = createElement("span");
    span.textContent = line;
    return span;
  });

  if (typeof meta.replaceChildren === "function") {
    meta.replaceChildren(...nodes);
    return;
  }

  while (meta.firstChild && typeof meta.removeChild === "function") {
    meta.removeChild(meta.firstChild);
  }
  for (const node of nodes) {
    if (typeof meta.appendChild === "function") meta.appendChild(node);
  }
}

export function syncObjectiveDom(refs, snapshot, loopState = null) {
  const view = loopState || {};
  if (refs?.label) {
    refs.label.textContent = view.objectiveLabel || snapshot?.objective?.title || "Objective";
  }
  if (refs?.text) {
    refs.text.textContent = view.objectiveText || (
      snapshot?.objective?.currentTarget
        ? `${snapshot.objective.currentTarget} - ${snapshot.objective.nextAction}`
        : "Open Boone's board - accept the Marsh Slime Bounty."
    );
  }

  const items = Array.isArray(view.objectiveMeta) ? view.objectiveMeta.slice(0, 2) : [];
  setMetaChildren(refs, items);

  if (refs?.progress) {
    // Thread the mission through so mission-1.1 beats (funeral/implant), which
    // are NOT in the default loop, resolve against the dust_to_dust phase list
    // instead of falling back to phase[0].
    const progress = getPhaseProgress(view.phase || "spawn", view.activeMission);
    if (refs.progressLabel) refs.progressLabel.textContent = `Road beat ${progress.label}`;
    if (refs.progressFill?.style) refs.progressFill.style.width = `${Math.round(progress.ratio * 100)}%`;
  }

  if (refs?.tag) {
    const region = snapshot?.region?.label || "Westward Frontier";
    refs.tag.textContent = `Dustwater · ${region} · ${view.phase || "Dusk"}`;
  }
}
