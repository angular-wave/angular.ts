/// <reference types="jasmine" />
import * as publicApi from "./index.ts";
import { angular } from "./index.ts";

const exports = publicApi as Record<string, unknown>;

describe("index", () => {
  it("exports angular", () => {
    expect(angular).toBeDefined();
  });

  it("initializes ng modules", async () => {
    expect(angular._bootsrappedModules[0]).toEqual("ng");
  });

  it("does not export REST cache implementation details", () => {
    expect(exports.CachedRestBackend).toBeUndefined();
    expect(publicApi.HttpRestBackend).toBeDefined();
    expect(exports.MemoryRestCacheStore).toBeUndefined();
    expect(exports.createRestCacheKey).toBeUndefined();
  });
});
