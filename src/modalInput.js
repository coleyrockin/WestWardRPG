const UP_CODES = new Set(["ArrowUp", "KeyW"]);
const DOWN_CODES = new Set(["ArrowDown", "KeyS"]);
const LEFT_CODES = new Set(["ArrowLeft", "KeyA"]);
const RIGHT_CODES = new Set(["ArrowRight", "KeyD"]);
const DEFAULT_CONFIRM_CODES = new Set(["Enter", "Space"]);
const DEFAULT_CLOSE_CODES = new Set(["Escape"]);

export function wrapSelection(selection = 0, length = 1, delta = 0) {
  const len = Math.max(1, Math.floor(length || 1));
  return (Math.floor(selection || 0) + delta + len) % len;
}

export function resolveVerticalMenuKey(code, selection, length, options = {}) {
  const confirmCodes = new Set(options.confirmCodes || DEFAULT_CONFIRM_CODES);
  const closeCodes = new Set(options.closeCodes || DEFAULT_CLOSE_CODES);
  const horizontal = Boolean(options.horizontal);

  if (UP_CODES.has(code) || (horizontal && LEFT_CODES.has(code))) {
    return { handled: true, action: "move", selection: wrapSelection(selection, length, -1) };
  }
  if (DOWN_CODES.has(code) || (horizontal && RIGHT_CODES.has(code))) {
    return { handled: true, action: "move", selection: wrapSelection(selection, length, 1) };
  }
  if (confirmCodes.has(code)) {
    return { handled: true, action: "confirm", selection: wrapSelection(selection, length, 0) };
  }
  if (closeCodes.has(code)) {
    return { handled: true, action: "close", selection: wrapSelection(selection, length, 0) };
  }
  if (options.blockUnhandled) {
    return { handled: true, action: "block", selection: wrapSelection(selection, length, 0) };
  }
  return { handled: false, action: "none", selection: wrapSelection(selection, length, 0) };
}

export function resolveHorizontalStepKey(code) {
  if (LEFT_CODES.has(code)) return -1;
  if (RIGHT_CODES.has(code)) return 1;
  return 0;
}
