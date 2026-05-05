import { describe, expect, it } from "vitest";
import {
  createCodexUnlockNotice,
  createFactionRepNotice,
  createHudNotice,
} from "../src/hudNotice.js";

describe("hudNotice", () => {
  it("normalizes generic notices", () => {
    const notice = createHudNotice({ title: "  Alert  ", line: "Something happened", color: "#fff", ttl: 1 });

    expect(notice).toMatchObject({
      kind: "notice",
      title: "Alert",
      line: "Something happened",
      color: "#fff",
      ttl: 1,
    });
  });

  it("creates a codex unlock notice with tab context", () => {
    const notice = createCodexUnlockNotice({ title: "Broken Wagon" }, "letters");

    expect(notice.kind).toBe("codex");
    expect(notice.title).toBe("Codex updated");
    expect(notice.line).toContain("Broken Wagon");
    expect(notice.line).toContain("letters");
  });

  it("creates faction notices with directional color", () => {
    const rise = createFactionRepNotice({ factionName: "Market Cartel", direction: "rises", label: "friendly" });
    const fall = createFactionRepNotice({ factionName: "Market Cartel", direction: "falls", label: "hostile", priceLine: "Prices rise." });

    expect(rise.color).toBe("#9be0ff");
    expect(fall.color).toBe("#ff9f7b");
    expect(fall.line).toContain("Prices rise.");
  });
});
