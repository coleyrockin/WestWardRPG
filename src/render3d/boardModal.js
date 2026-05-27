// Job-board modal controller for the Three.js first-road spike.
// Keeps modal state and button wiring testable without tying it to Three.js.

export function createBoardModalController({
  modal = null,
  acceptButton = null,
  closeButton = null,
  setPromptText = () => {},
  onAccept = () => {},
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

  const onAcceptClick = () => accept();
  const onCloseClick = () => close();

  if (acceptButton?.addEventListener) acceptButton.addEventListener("click", onAcceptClick);
  if (closeButton?.addEventListener) closeButton.addEventListener("click", onCloseClick);

  return {
    open: show,
    close,
    accept,
    dispose() {
      if (acceptButton?.removeEventListener) acceptButton.removeEventListener("click", onAcceptClick);
      if (closeButton?.removeEventListener) closeButton.removeEventListener("click", onCloseClick);
    },
    isOpen() {
      return open;
    },
  };
}
