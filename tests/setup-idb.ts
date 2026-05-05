// Vitest setup file: polyfill IndexedDB and structuredClone for the node test env.
// Tests that touch savePersistence rely on this being preloaded via vitest config.
import { beforeEach } from "vitest";
import "fake-indexeddb/auto";

if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  } as Storage;
}

beforeEach(async () => {
  // Reset state between tests so each starts with a clean storage layer.
  globalThis.localStorage.clear();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("westward");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
});
