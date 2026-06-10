// DOM sync for the job-board modal — renders a boardCopy view into the modal.
// Same shape as objectiveDom.js: refs once, sync per open, no HTML strings
// (everything is textContent + created nodes). Tested with stub elements in
// tests/render3d-board-dom.test.ts.

export function createBoardDomRefs(rootDocument = globalThis.document) {
  const doc = rootDocument && typeof rootDocument.querySelector === "function"
    ? rootDocument
    : null;
  return {
    title: doc?.querySelector("#board-title") || null,
    boone: doc?.querySelector("#board-boone") || null,
    body: doc?.querySelector("#board-body") || null,
    reward: doc?.querySelector("#board-reward") || null,
    listings: doc?.querySelector("#board-listings") || null,
    accept: doc?.querySelector("#board-accept") || null,
    close: doc?.querySelector("#board-close") || null,
    optionButtons: typeof doc?.querySelectorAll === "function"
      ? Array.from(doc.querySelectorAll("[data-option]:not(#board-accept)"))
      : [],
    createElement: typeof doc?.createElement === "function"
      ? doc.createElement.bind(doc)
      : null,
  };
}

function setChildren(el, nodes) {
  if (!el) return;
  if (typeof el.replaceChildren === "function") {
    el.replaceChildren(...nodes);
    return;
  }
  while (el.firstChild && typeof el.removeChild === "function") {
    el.removeChild(el.firstChild);
  }
  for (const node of nodes) {
    if (typeof el.appendChild === "function") el.appendChild(node);
  }
}

function setLine(el, text) {
  if (!el) return;
  el.textContent = text || "";
  el.hidden = !text;
}

export function syncBoardDom(refs, view) {
  if (!refs || !view) return;
  if (refs.title) refs.title.textContent = view.title || "Boone's Board";
  setLine(refs.boone, view.booneLine);
  if (refs.body) {
    const lines = Array.isArray(view.bodyLines) ? view.bodyLines.filter(Boolean) : [];
    refs.body.textContent = lines.join(" ");
  }
  const rewardText = [view.rewardLine, view.progressLine && `Progress: ${view.progressLine}`]
    .filter(Boolean)
    .join(" · ");
  setLine(refs.reward, rewardText);

  const pins = Array.isArray(view.listings) ? view.listings : [];
  if (refs.listings) {
    refs.listings.hidden = pins.length === 0;
    if (typeof refs.createElement === "function") {
      const nodes = pins.map((pin) => {
        const row = refs.createElement("div");
        row.className = "board-pin";
        const title = refs.createElement("span");
        title.className = "pin-title";
        title.textContent = pin.title;
        const detail = refs.createElement("span");
        detail.className = "pin-detail";
        detail.textContent = pin.detail;
        const reward = refs.createElement("span");
        reward.className = "pin-reward";
        reward.textContent = pin.rewardLine;
        for (const node of [title, detail, reward]) {
          if (typeof row.appendChild === "function") row.appendChild(node);
        }
        return row;
      });
      setChildren(refs.listings, nodes);
    } else {
      refs.listings.textContent = pins.map((p) => `${p.title} — ${p.rewardLine}`).join(" · ");
    }
  }

  // Completed board is a read, not a choice: only the close action stays.
  const choosable = view.mode !== "completed";
  if (refs.accept) refs.accept.hidden = !choosable;
  for (const button of refs.optionButtons) {
    if (button) button.hidden = !choosable;
  }
  if (refs.close) refs.close.textContent = choosable ? "Not yet" : "Back to the road";
}
