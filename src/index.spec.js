import * as publicApi from "./index.ts";
import { angular } from "./index.ts";

describe("index", () => {
  it("exports angular", () => {
    expect(angular).toBeDefined();
  });

  it("initializes ng modules", async () => {
    expect(angular._bootsrappedModules[0]).toEqual("ng");
  });

  it("does not export REST cache implementation details", () => {
    expect(publicApi.CachedRestBackend).toBeUndefined();
    expect(publicApi.HttpRestBackend).toBeDefined();
    expect(publicApi.MemoryRestCacheStore).toBeUndefined();
    expect(publicApi.createRestCacheKey).toBeUndefined();
  });
});
