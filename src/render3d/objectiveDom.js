// DOM objective strip helpers for the Three.js spike.
// Keeps phase-driven UI updates out of spike.js and avoids string HTML writes.

export function createObjectiveDomRefs(rootDocument = globalThis.document) {
  const doc = rootDocument && typeof rootDocument.querySelector === "function"
    ? rootDocument
    : null;
  return {
    label: doc?.querySelector("#objective .label") || null,
    text: doc?.querySelector("#objective .text") || null,
    meta: doc?.querySelector("#objective .meta") || null,
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

  if (refs?.tag) {
    const region = snapshot?.region?.label || "Dustward Frontier";
    refs.tag.textContent = `WestWard · ${region} · ${view.phase || "Dusk"}`;
  }
}
