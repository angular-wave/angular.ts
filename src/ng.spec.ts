/// <reference types="jasmine" />
import { createInjector } from "./core/di/injector.ts";
import { Angular } from "./angular.ts";
import {
  createAngularCustom,
  ngBuiltInFilters,
  ngCoreProviders,
  ngDefaultDirectiveGroups,
  ngDefaultProviderGroups,
  ngFilterProviders,
} from "./runtime/index.ts";
import { createElementFromHTML, dealoc } from "./shared/dom.ts";
import { wait } from "./shared/test-utils.ts";

describe("public", () => {
  let element: Element | undefined;

  beforeEach(() => {
    window.angular = new Angular();
  });

  afterEach(() => {
    dealoc(element);
    element = undefined;
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

  it("creates an equivalent ng module from runtime exports", async () => {
    const builtInInjector = createInjector(["ng"]);

    const angular = createAngularCustom({
      attachToWindow: true,
      ngModule: {
        name: "ngRuntimeEquivalent",
        providers: Object.assign({}, ...ngDefaultProviderGroups),
        directives: ngDefaultDirectiveGroups,
        filters: ngBuiltInFilters,
      },
    });

    const injector = angular.injector(["ngRuntimeEquivalent"]);

    const providerNames = Array.from(
      new Set(ngDefaultProviderGroups.flatMap((group) => Object.keys(group))),
    );

    providerNames.forEach((name) => {
      expect(injector.has(name))
        .withContext(`${name} should match built-in ng registration`)
        .toBe(builtInInjector.has(name));
    });

    const $filter = injector.get("$filter") as ng.FilterService;

    Object.keys(ngBuiltInFilters).forEach((name) => {
      expect(() => $filter(name))
        .withContext(`${name} filter should be registered`)
        .not.toThrow();
    });

    expect($filter("json")({ ok: true })).toBe('{\n  "ok": true\n}');

    const $compile = injector.get("$compile") as ng.CompileService;
    const $rootScope = injector.get("$rootScope") as ng.RootScopeService &
      Record<string, unknown>;

    $rootScope.label = "Runtime ng";
    $rootScope.count = 0;

    element = createElementFromHTML(
      '<button ng-bind="label" ng-click="count = count + 1"></button>',
    );

    $compile(element)($rootScope);
    await wait();

    expect(element.textContent).toBe("Runtime ng");

    (element as HTMLButtonElement).click();
    await wait();

    expect($rootScope.count).toBe(1);
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
