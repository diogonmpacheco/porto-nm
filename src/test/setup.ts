import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

if (typeof window !== "undefined" && !window.crypto?.subtle) {
  Object.defineProperty(window, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

const testStorage = (() => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } satisfies Storage;
})();

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, "localStorage", {
    value: testStorage,
    configurable: true,
  });
}

if (typeof window !== "undefined" && !window.localStorage) {
  Object.defineProperty(window, "localStorage", {
    value: testStorage,
    configurable: true,
  });
}
