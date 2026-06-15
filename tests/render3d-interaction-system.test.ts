import { describe, expect, it } from "vitest";
import { pickNearest, promptFor } from "../src/render3d/interactionSystem.js";

describe("interactionSystem — mountHorse prompt", () => {
  const horse = { kind: "mountHorse", x: 16.2, y: 12.0 };

  it("surfaces a Mount Up prompt for the horse when in range", () => {
    const near = pickNearest({ x: 16.2, z: 12.0 }, [horse]);
    expect(near).toBe(horse);
    expect(promptFor(horse)).toContain("Mount");
  });

  it("does not surface the prompt when out of range", () => {
    expect(pickNearest({ x: 30, z: 30 }, [horse])).toBe(null);
  });
});
