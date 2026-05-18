import { describe, expect, it } from "vitest";
import {
  getRegionArtKit,
  resolveOpeningViewComposition,
  resolveSpriteArtVariant,
  resolveWallMaterial,
  resolveWorldDressingForView,
} from "../src/regionArtKits.js";

describe("regionArtKits", () => {
  it("defines a full Dustward art kit with sky, terrain, road, walls, vegetation, props, and landmark identity", () => {
    const kit = getRegionArtKit("frontier");

    expect(kit.quality).toBe("full");
    expect(kit.sky.style).toBe("haunted-western-dusk");
    expect(kit.sky.cloudBands.length).toBeGreaterThanOrEqual(3);
    expect(kit.horizon.silhouettes).toEqual(expect.arrayContaining(["north watchtower", "dead cottonwood line"]));
    expect(kit.terrain.grass).toMatch(/^#/);
    expect(kit.road.detail).toEqual(expect.arrayContaining(["bright wagon ruts", "fence shadows", "lantern road posts"]));
    expect(Object.keys(kit.walls)).toEqual(expect.arrayContaining(["stone", "water", "timber", "plaster", "neon"]));
    expect(kit.vegetation.map((item: any) => item.kind)).toContain("tree");
    expect(kit.props.map((item: any) => item.kind)).toEqual(expect.arrayContaining(["barrel", "banner", "lantern-post", "wanted-board"]));
    expect(kit.landmark.hero).toContain("Watchtower");
  });

  it("falls back to Dustward for unknown art kits", () => {
    expect(getRegionArtKit("unknown").id).toBe("frontier");
  });

  it("resolves opening composition around sky, road, landmark, town, board, and interactables", () => {
    const composition = resolveOpeningViewComposition({ regionId: "frontier" });

    expect(composition.skyStyle).toBe("haunted-western-dusk");
    expect(composition.roadStyle).toBe("wagon-rut-marshal-road");
    expect(composition.landmark).toContain("Watchtower");
    expect(composition.mustShow).toEqual(expect.arrayContaining(["sky", "road", "landmark", "job-board", "interactable"]));
  });

  it("scales world dressing density by preset without removing key Dustward vegetation", () => {
    const low = resolveWorldDressingForView({ regionId: "frontier", preset: "low" });
    const cinematic = resolveWorldDressingForView({ regionId: "frontier", preset: "cinematic" });

    expect(low.density).toBeLessThan(cinematic.density);
    expect(low.vegetation.length).toBeGreaterThanOrEqual(4);
    expect(cinematic.vegetation.length).toBeGreaterThan(low.vegetation.length);
    expect(cinematic.props.length).toBeGreaterThanOrEqual(low.props.length);
  });

  it("resolves distinct region wall materials by tile type", () => {
    expect(resolveWallMaterial(1, "frontier")).toMatchObject({ key: "stone", material: "low marsh fieldstone" });
    expect(resolveWallMaterial(2, "frontier")).toMatchObject({ key: "water", material: "reeded dusk marsh" });
    expect(resolveWallMaterial(3, "frontier")).toMatchObject({ key: "timber", material: "sun-cut timber" });
    expect(resolveWallMaterial(4, "frontier")).toMatchObject({ key: "plaster", material: "dust plaster" });
    expect(resolveWallMaterial(5, "ironlantern")).toMatchObject({ key: "neon", material: "signal glass" });
    expect(resolveWallMaterial(2, "frontier").visualHeight).toBeLessThan(resolveWallMaterial(3, "frontier").visualHeight);
    expect(resolveWallMaterial(1, "frontier").visualHeight).toBeLessThan(resolveWallMaterial(4, "frontier").visualHeight);
  });

  it("returns sprite art variants for trees, cache, job board, wagon, and enemies", () => {
    expect(resolveSpriteArtVariant({ propKind: "tree" }, "frontier").variant).toBe("layered-tree");
    expect(resolveSpriteArtVariant({ propKind: "dead-tree" }, "frontier").variant).toBe("dead-frontier-tree");
    expect(resolveSpriteArtVariant({ kind: "chest", label: "Smoke Cache" }, "frontier").variant).toBe("smoke-cache");
    expect(resolveSpriteArtVariant({ kind: "job-board" }, "frontier").variant).toBe("lit-notice-board");
    expect(resolveSpriteArtVariant({ poiKind: "wagon", label: "Broken Wagon" }, "frontier").variant).toBe("broken-wagon-hero");
    expect(resolveSpriteArtVariant({ kind: "enemy" }, "frontier").variant).toBe("readable-slime");
  });
});
