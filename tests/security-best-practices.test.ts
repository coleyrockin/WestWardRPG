import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("security best practices", () => {
  it("keeps runtime UI construction out of HTML parser sinks", () => {
    const mainSource = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

    expect(mainSource).not.toContain(".innerHTML");
    expect(mainSource).not.toContain("insertAdjacentHTML");
    expect(mainSource).not.toContain("document.write");
  });

  it("keeps generated static-server configs on modern browser hardening headers", () => {
    const configSource = readFileSync(new URL("../scripts/config_generator.php", import.meta.url), "utf8");

    expect(configSource).toContain("Content-Security-Policy");
    expect(configSource).toContain("Referrer-Policy");
    expect(configSource).toContain("Permissions-Policy");
    expect(configSource).toContain("object-src 'none'");
    // script-src must stay strict — the game uses ES modules, never inline scripts.
    expect(configSource).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(configSource).toContain("https://fonts.googleapis.com");
    expect(configSource).toContain("https://fonts.gstatic.com");
    expect(configSource).not.toContain("X-XSS-Protection");
  });

  it("keeps Vercel deployment headers aligned with the static-server baseline", () => {
    const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
    const headers = (vercel.headers?.[0]?.headers || []) as Array<{ key: string; value: string }>;
    const byKey = Object.fromEntries(headers.map((entry) => [entry.key, entry.value]));

    expect(byKey["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(byKey["Content-Security-Policy"]).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(byKey["Content-Security-Policy"]).toContain("https://fonts.googleapis.com");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
    expect(byKey["X-XSS-Protection"]).toBeUndefined();
  });
});
