import { describe, it, expect, vi } from "vitest";
import { createInputManager } from "../src/inputManager.js";

function makeEvent(code: string): KeyboardEvent {
  return { code, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}

describe("inputManager", () => {
  it("dispatches registered binding", () => {
    const im = createInputManager();
    const handler = vi.fn();
    im.register("KeyE", handler);
    im.dispatch(makeEvent("KeyE"), "playing");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns false for unregistered code", () => {
    const im = createInputManager();
    expect(im.dispatch(makeEvent("KeyZ"), "playing")).toBe(false);
  });

  it("returns true for registered code", () => {
    const im = createInputManager();
    im.register("KeyE", vi.fn());
    expect(im.dispatch(makeEvent("KeyE"), "playing")).toBe(true);
  });

  it("calls preventDefault when option is set", () => {
    const im = createInputManager();
    im.register("Space", vi.fn(), { preventDefault: true });
    const event = makeEvent("Space");
    im.dispatch(event, "playing");
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("does not dispatch if mode does not match", () => {
    const im = createInputManager();
    const handler = vi.fn();
    im.register("KeyE", handler, { modes: ["playing"] });
    im.dispatch(makeEvent("KeyE"), "menu");
    expect(handler).not.toHaveBeenCalled();
  });

  it("dispatches in correct mode", () => {
    const im = createInputManager();
    const handler = vi.fn();
    im.register("KeyE", handler, { modes: ["playing"] });
    im.dispatch(makeEvent("KeyE"), "playing");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("unregister removes binding", () => {
    const im = createInputManager();
    const handler = vi.fn();
    im.register("KeyE", handler);
    im.unregister("KeyE");
    im.dispatch(makeEvent("KeyE"), "playing");
    expect(handler).not.toHaveBeenCalled();
  });

  it("registerAll bulk-registers handlers", () => {
    const im = createInputManager();
    const a = vi.fn();
    const b = vi.fn();
    im.registerAll({ KeyA: a, KeyB: b });
    im.dispatch(makeEvent("KeyA"), "playing");
    im.dispatch(makeEvent("KeyB"), "playing");
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("size reflects number of bindings", () => {
    const im = createInputManager();
    expect(im.size).toBe(0);
    im.register("KeyE", vi.fn());
    im.register("Space", vi.fn());
    expect(im.size).toBe(2);
    im.unregister("KeyE");
    expect(im.size).toBe(1);
  });
});
