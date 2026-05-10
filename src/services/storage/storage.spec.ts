/// <reference types="jasmine" />
import { createPersistentProxy } from "./storage.ts";

describe("createPersistentProxy", () => {
  let values: any;

  let storage: any;

  beforeEach(() => {
    values = new Map();
    storage = {
      getItem(key: any) {
        return values.get(key) ?? null;
      },
      setItem(key: any, value: any) {
        values.set(key, value);
      },
      removeItem(key: any) {
        values.delete(key);
      },
    };
  });

  it("restores saved state and persists property writes", () => {
    values.set("prefs", JSON.stringify({ theme: "dark" }));

    const prefs = createPersistentProxy(
      { theme: "light", count: 0 },
      "prefs",
      storage,
    );

    expect(prefs.theme).toBe("dark");

    prefs.count = 2;

    expect(JSON.parse(values.get("prefs"))).toEqual({
      theme: "dark",
      count: 2,
    });
  });

  it("persists property deletes", () => {
    const initialPrefs: { theme?: string; count: number } = {
      theme: "dark",
      count: 1,
    };

    const prefs = createPersistentProxy(initialPrefs, "prefs", storage);

    delete prefs.theme;

    expect(JSON.parse(values.get("prefs"))).toEqual({ count: 1 });
  });

  it("supports custom serializers", () => {
    values.set("prefs", "theme=dark");

    const prefs = createPersistentProxy({ theme: "light" }, "prefs", storage, {
      serialize(value) {
        return `theme=${value.theme}`;
      },
      deserialize(value) {
        return { theme: value.slice("theme=".length) };
      },
    });

    expect(prefs.theme).toBe("dark");

    prefs.theme = "blue";

    expect(values.get("prefs")).toBe("theme=blue");
  });
});
