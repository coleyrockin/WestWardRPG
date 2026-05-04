import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("security best practices", () => {
  it("keeps runtime UI construction out of HTML parser sinks", () => {
    const mainSource = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

    expect(mainSource).not.toContain(".innerHTML");
    expect(mainSource).not.toContain("insertAdjacentHTML");
    expect(mainSource).not.toContain("document.write");
  });
});
