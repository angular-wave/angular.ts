/// <reference types="jasmine" />
import * as publicApi from "./index.ts";
import { angular } from "./index.ts";

const exports = publicApi as Record<string, unknown>;

describe("index", () => {
  it("exports angular", () => {
    expect(angular).toBeDefined();
  });

  it("exports custom runtime constructors", () => {
    expect(exports.AngularRuntime).toBeDefined();
    expect(exports.createAngularBare).toBeDefined();
    expect(exports.createAngularCustom).toBeDefined();
    expect(exports.registerCustomNgModule).toBeDefined();
  });

  it("does not auto-bootstrap ESM imports", () => {
    expect(angular._bootsrappedModules).toEqual([]);
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
