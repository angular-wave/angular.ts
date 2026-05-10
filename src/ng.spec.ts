/// <reference types="jasmine" />
import { createInjector } from "./core/di/injector.ts";
import { Angular } from "./angular.ts";

describe("public", () => {
  beforeEach(() => {
    window.angular = new Angular();
  });

  it("sets up the angular object and the module loader", () => {
    expect(window.angular).toBeDefined();
    expect(window.angular.module).toBeDefined();
    expect(window.angular.$t).toBeDefined();
  });

  it("sets up the ng module", () => {
    expect(createInjector(["ng"])).toBeDefined();
  });

  it("sets up the $filter service", () => {
    const injector = createInjector(["ng"]);

    expect(injector.has("$filter")).toBe(true);
  });

  it("sets up the $parse service", () => {
    const injector = createInjector(["ng"]);

    expect(injector.has("$parse")).toBe(true);
  });

  it("sets up the $rootScope", () => {
    const injector = createInjector(["ng"]);

    expect(injector.has("$rootScope")).toBe(true);
  });

  it("sets up $window", () => {
    const injector = createInjector(["ng"]);

    expect(injector.has("$window")).toBe(true);
    expect(injector.get("$window")).toBe(window);
  });

  it("sets up $document", () => {
    const injector = createInjector(["ng"]);

    expect(injector.has("$document")).toBe(true);
    expect(injector.get("$document")).toBe(document);
  });
});
