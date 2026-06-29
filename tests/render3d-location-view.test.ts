import { describe, it, expect, vi } from "vitest";
// @ts-expect-error — JS module, no types
import { createLocationView } from "../src/render3d/locationView.js";

// Verify locationView's orchestration with mocks (no Three.js / no browser): on
// enter it must hide the world groups, show the interior, reposition the player,
// and swap the active collision proxies + interaction targets; exit reverses. This
// is the headless-fast proof of the enter/exit loop the slice rests on.

function harness() {
  const worldA = { visible: true };
  const worldB = { visible: true };
  const added: any[] = [];
  const scene = { add: (g: any) => added.push(g) };
  const player = { setPosition: vi.fn(), resetCameraBehind: vi.fn() };
  const interaction = { setTargets: vi.fn() };
  const streetProxies = [{ id: "street-wall" }];
  const streetTargets = [{ kind: "buildingDoor" }];

  const saloonExit = { kind: "exitDoor", x: 400, y: 4 };
  const saloonRoom = {
    group: { visible: false },
    proxies: [{ id: "saloon-wall" }],
    targets: [saloonExit, { kind: "npcTalk", id: "mabel" }],
  };
  const interiors = { saloon: { id: "saloon", spawn: { x: 400, z: 3, yaw: 1.5 }, build: () => saloonRoom } };

  const view = createLocationView({
    scene, worldGroups: [worldA, worldB], player, streetProxies, streetTargets,
    interaction, interiors, interiorIds: ["saloon"],
  });
  return { view, worldA, worldB, added, player, interaction, saloonRoom, streetProxies, streetTargets };
}

describe("locationView — enter", () => {
  it("hides the world, shows the room, repositions, swaps proxies + targets", () => {
    const h = harness();
    expect(h.view.enter("saloon", { returnTo: { x: 15, z: 8, yaw: 0 } })).toBe(true);

    expect(h.view.isInterior()).toBe(true);
    expect(h.view.current()).toBe("saloon");
    expect(h.worldA.visible).toBe(false);
    expect(h.worldB.visible).toBe(false);
    expect(h.saloonRoom.group.visible).toBe(true);
    expect(h.added).toContain(h.saloonRoom.group); // added to the scene once
    expect(h.player.setPosition).toHaveBeenCalledWith({ x: 400, z: 3 });
    expect(h.player.resetCameraBehind).toHaveBeenCalledWith(1.5);
    expect(h.view.activeProxies()).toBe(h.saloonRoom.proxies);
    expect(h.interaction.setTargets).toHaveBeenCalledWith(h.saloonRoom.targets);
  });

  it("refuses an unknown interior", () => {
    const h = harness();
    expect(h.view.enter("nowhere")).toBe(false);
    expect(h.view.isInterior()).toBe(false);
    expect(h.worldA.visible).toBe(true);
  });
});

describe("locationView — exit", () => {
  it("restores the world, hides the room, returns the player, swaps back", () => {
    const h = harness();
    h.view.enter("saloon", { returnTo: { x: 15, z: 8, yaw: 0.5 } });
    h.player.setPosition.mockClear();
    h.player.resetCameraBehind.mockClear();

    expect(h.view.exit()).toBe(true);
    expect(h.view.isInterior()).toBe(false);
    expect(h.view.current()).toBe("street");
    expect(h.worldA.visible).toBe(true);
    expect(h.saloonRoom.group.visible).toBe(false);
    expect(h.player.setPosition).toHaveBeenCalledWith({ x: 15, z: 8 }); // back to the door
    expect(h.player.resetCameraBehind).toHaveBeenCalledWith(0.5);
    expect(h.view.activeProxies()).toBe(h.streetProxies);
    expect(h.interaction.setTargets).toHaveBeenLastCalledWith(h.streetTargets);
  });

  it("exit on the street is a no-op", () => {
    const h = harness();
    expect(h.view.exit()).toBe(false);
  });

  it("re-enter reuses the cached room (built once)", () => {
    const h = harness();
    h.view.enter("saloon");
    h.view.exit();
    h.view.enter("saloon");
    expect(h.added.filter((g) => g === h.saloonRoom.group).length).toBe(1);
  });

  it("defers the swap to the fade callback (the darkest point)", () => {
    const h = harness();
    let pending: (() => void) | null = null;
    const view = createLocationView({
      scene: { add() {} }, worldGroups: [h.worldA], player: h.player, interaction: h.interaction,
      streetProxies: h.streetProxies, streetTargets: h.streetTargets,
      interiors: { saloon: { spawn: { x: 1, z: 2, yaw: 0 }, build: () => h.saloonRoom } }, interiorIds: ["saloon"],
      fade: (cb: () => void) => { pending = cb; }, // hold the swap
    });
    view.enter("saloon");
    expect(h.worldA.visible).toBe(true); // not hidden yet — fade hasn't fired
    pending!();
    expect(h.worldA.visible).toBe(false); // now the swap ran
  });
});
