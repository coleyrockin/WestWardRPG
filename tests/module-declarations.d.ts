declare module "../src/decisionEngine.js";
declare module "../src/enemyArchetypes.js";
declare module "node:fs" {
  export function readFileSync(path: URL | string, encoding: "utf8"): string;
}
