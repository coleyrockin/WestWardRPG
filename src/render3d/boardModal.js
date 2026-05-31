// Job-board modal controller for the Three.js first-road spike.
// Keeps modal state and button wiring testable without tying it to Three.js.

export function createBoardModalController({
  modal = null,
  acceptButton = null,
  optionButtons = [],
  closeButton = null,
  setPromptText = () => {},
  onAccept = () => {},
  onChoose = null,
  onClose = () => {},
  onOpen = () => {},
} = {}) {
  let open = false;

  function show() {
    open = true;
    if (modal) modal.hidden = false;
    setPromptText("");
    onOpen();
    if (typeof acceptButton?.focus === "function") acceptButton.focus();
  }

  function close() {
    open = false;
    if (modal) modal.hidden = true;
    onClose();
  }

  function accept() {
    onAccept();
    close();
  }

  function choose(optionId) {
    if (typeof onChoose === "function") onChoose(optionId);
    else onAccept();
    close();
  }

  const onAcceptClick = () => accept();
  const onCloseClick = () => close();
  const optionEntries = Array.from(optionButtons || []).map((button) => {
    const fn = () => choose(button?.dataset?.option || button?.getAttribute?.("data-option") || "accept_bounty");
    return { button, fn };
  });

  if (acceptButton?.addEventListener) acceptButton.addEventListener("click", onAcceptClick);
  for (const { button, fn } of optionEntries) {
    if (button?.addEventListener) button.addEventListener("click", fn);
  }
  if (closeButton?.addEventListener) closeButton.addEventListener("click", onCloseClick);

  return {
    open: show,
    close,
    accept,
    choose,
    dispose() {
      if (acceptButton?.removeEventListener) acceptButton.removeEventListener("click", onAcceptClick);
      for (const { button, fn } of optionEntries) {
        if (button?.removeEventListener) button.removeEventListener("click", fn);
      }
      if (closeButton?.removeEventListener) closeButton.removeEventListener("click", onCloseClick);
    },
    isOpen() {
      return open;
    },
  };
}
