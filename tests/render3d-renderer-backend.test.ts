import { afterEach, describe, expect, it, vi } from "vitest";
import { webgpuAvailable } from "../src/game/renderer/createRenderer.js";

describe("render3d renderer backend selection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not use WebGPU during automated browser smoke runs", () => {
    vi.stubGlobal("navigator", { gpu: {}, webdriver: true });

    expect(webgpuAvailable()).toBe(false);
  });

  it("keeps WebGPU available for non-automation browsers with navigator.gpu", () => {
    vi.stubGlobal("navigator", { gpu: {}, webdriver: false });

    expect(webgpuAvailable()).toBe(true);
  });

  it("falls back when navigator.gpu is missing", () => {
    vi.stubGlobal("navigator", { webdriver: false });

    expect(webgpuAvailable()).toBe(false);
  });
});
