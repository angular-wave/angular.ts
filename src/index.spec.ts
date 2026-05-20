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

  it("keeps the root runtime API narrow", () => {
    expect(exports.CachedRestBackend).toBeUndefined();
    expect(exports.HttpRestBackend).toBeUndefined();
    expect(exports.MemoryRestCacheStore).toBeUndefined();
    expect(exports.ScopeElement).toBeUndefined();
    expect(exports.WasmScope).toBeUndefined();
    expect(exports.WasmScopeAbi).toBeUndefined();
    expect(exports.createRestCacheKey).toBeUndefined();
  });
});
