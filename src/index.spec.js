import { angular } from "./index.ts";

describe("index", () => {
  it("exports angular", () => {
    expect(angular).toBeDefined();
  });

  it("initializes ng modules", async () => {
    expect(angular._bootsrappedModules[0]).toEqual("ng");
  });
});
