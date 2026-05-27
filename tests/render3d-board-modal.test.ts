import { describe, expect, it, vi } from "vitest";
import { createBoardModalController } from "../src/render3d/boardModal.js";

function makeButton() {
  const handlers: Record<string, Set<() => void>> = {};
  return {
    focused: false,
    addEventListener(type: string, fn: () => void) {
      (handlers[type] ||= new Set()).add(fn);
    },
    removeEventListener(type: string, fn: () => void) {
      handlers[type]?.delete(fn);
    },
    click() {
      for (const fn of Array.from(handlers.click || [])) fn();
    },
    focus() {
      this.focused = true;
    },
  };
}

describe("render3d board modal controller", () => {
  it("opens the modal, clears prompt text, and focuses the accept action", () => {
    const modal = { hidden: true };
    const acceptButton = makeButton();
    const setPromptText = vi.fn();
    const onOpen = vi.fn();
    const controller = createBoardModalController({ modal, acceptButton, setPromptText, onOpen });

    controller.open();

    expect(controller.isOpen()).toBe(true);
    expect(modal.hidden).toBe(false);
    expect(setPromptText).toHaveBeenCalledWith("");
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(acceptButton.focused).toBe(true);
  });

  it("accepts the board, closes the modal, and reports close state", () => {
    const modal = { hidden: true };
    const acceptButton = makeButton();
    const onAccept = vi.fn();
    const onClose = vi.fn();
    const controller = createBoardModalController({ modal, acceptButton, onAccept, onClose });

    controller.open();
    acceptButton.click();

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(controller.isOpen()).toBe(false);
    expect(modal.hidden).toBe(true);
  });

  it("closes without accepting when the secondary action is clicked", () => {
    const modal = { hidden: true };
    const closeButton = makeButton();
    const onAccept = vi.fn();
    const onClose = vi.fn();
    const controller = createBoardModalController({ modal, closeButton, onAccept, onClose });

    controller.open();
    closeButton.click();

    expect(onAccept).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(controller.isOpen()).toBe(false);
  });

  it("disposes event listeners", () => {
    const modal = { hidden: true };
    const acceptButton = makeButton();
    const onAccept = vi.fn();
    const controller = createBoardModalController({ modal, acceptButton, onAccept });

    controller.dispose();
    acceptButton.click();

    expect(onAccept).not.toHaveBeenCalled();
  });
});
