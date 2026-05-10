/// <reference types="jasmine" />
import { createInjector } from "./core/di/injector.ts";
import { Angular } from "./angular.ts";
import { ngBuiltInFilters, ngCoreProviders, ngFilterProviders } from "./ng.ts";

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

  it("keeps filters outside the core provider group", () => {
    expect("$filter" in ngCoreProviders).toBe(false);
    expect("$filter" in ngFilterProviders).toBe(true);
  });

  it("registers built-in filters separately from the filter provider", () => {
    const injector = createInjector(["ng"]);

    const $filter = injector.get("$filter") as ng.FilterService;

    expect("json" in ngBuiltInFilters).toBe(true);
    expect($filter("json")({ ok: true })).toBe('{\n  "ok": true\n}');
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
