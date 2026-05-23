/// <reference types="jasmine" />
import { angular } from "./auto.ts";
import { waitUntil } from "./shared/test-utils.ts";

describe("auto", () => {
  it("auto-bootstraps ng-app documents", async () => {
    await waitUntil(
      () => document.getElementById("app")?.textContent?.trim() === "2",
      1000,
      "Expected ./auto to bootstrap the document",
    );

    expect(angular._bootsrappedModules).toContain("ng");
  });
});
