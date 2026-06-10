declare module "node:fs" {
  export function readFileSync(path: URL | string, encoding: "utf8"): string;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean };
}
declare module "node:url" {
  export function fileURLToPath(url: URL | string): string;
}
declare module "node:path" {
  export function join(...parts: string[]): string;
}
