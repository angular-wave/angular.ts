/// <reference types="jasmine" />
import { createInjector } from "./core/di/injector.ts";
import { Angular } from "./angular.ts";
import { createAngular } from "./runtime/index.ts";
import {
  ngBuiltInFilters,
  ngDefaultDirectiveGroups,
  ngDefaultProviderGroups,
} from "./ng.ts";
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

  it("registers built-in filters separately from the filter provider", () => {
    const injector = createInjector(["ng"]);

    const $filter = injector.get("$filter") as ng.FilterService;

    expect("json" in ngBuiltInFilters).toBe(true);
    expect($filter("json")({ ok: true })).toBe('{\n  "ok": true\n}');
  });

  it("creates an equivalent ng module from runtime exports", async () => {
    const builtInInjector = createInjector(["ng"]);

    const angular = createAngular({
      name: "ngRuntimeEquivalent",
      providers: Object.assign({}, ...ngDefaultProviderGroups),
      directives: ngDefaultDirectiveGroups,
      filters: ngBuiltInFilters,
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
    const $rootScope = injector.get("$rootScope") as ng.Scope &
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

  it("creates $log without Beacon support", () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.navigator,
      "sendBeacon",
    );

    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });

    try {
      const angular = (window.angular = new Angular());
      const injector = angular.injector(["ng"]);

      expect(injector.get("$log")).toBeDefined();
      angular._composition.destroy();
    } finally {
      if (descriptor) {
        Object.defineProperty(window.navigator, "sendBeacon", descriptor);
      } else {
        Reflect.deleteProperty(window.navigator, "sendBeacon");
      }
    }
  });

  it("uses the platform URL for default security request checks", () => {
    const security = createInjector(["ng"]).get(
      "$security",
    ) as ng.SecurityPolicy;

    expect(
      security.check({
        operation: "request",
        transport: "http",
        method: "GET",
        url: "/relative",
        credentials: "include",
      }),
    ).toEqual(jasmine.objectContaining({ type: "deny" }));
  });

  it("disposes the default service-worker facade with either lifecycle order", () => {
    const first = (window.angular = new Angular());
    const firstInjector = first.injector(["ng"]);

    expect(firstInjector.get("$serviceWorker")).toBeDefined();
    first._composition.destroy();

    const second = (window.angular = new Angular());
    const secondInjector = second.injector(["ng"]);

    secondInjector.get("$log");
    secondInjector.get("$exceptionHandler");
    second._composition.destroy();

    expect(secondInjector.get("$serviceWorker")).toBeDefined();
  });

  it("applies module service-worker configuration to the default runtime", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.navigator,
      "serviceWorker",
    );
    const registration = {
      scope: "/app/",
      updateViaCache: "none",
      installing: null,
      waiting: null,
      active: null,
      addEventListener: jasmine.createSpy("registration.addEventListener"),
      removeEventListener: jasmine.createSpy(
        "registration.removeEventListener",
      ),
    } as unknown as ServiceWorkerRegistration;
    const register = jasmine.createSpy("register").and.resolveTo(registration);
    const container = {
      controller: null,
      register,
      addEventListener: jasmine.createSpy("container.addEventListener"),
      removeEventListener: jasmine.createSpy("container.removeEventListener"),
    } as unknown as ServiceWorkerContainer;

    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: container,
    });

    try {
      const angular = (window.angular = new Angular());
      const module = angular
        .module("configuredServiceWorker", [])
        .serviceWorker("/app-sw.js", {
          scope: "/app/",
          type: "module",
          updateViaCache: "none",
        });
      const service = angular
        .injector(["ng", module.name])
        .get("$serviceWorker") as ng.ServiceWorkerService;

      await service.register("/app-sw.js");

      expect(register).toHaveBeenCalledOnceWith("/app-sw.js", {
        scope: "/app/",
        type: "module",
        updateViaCache: "none",
      });
      angular._composition.destroy();
    } finally {
      if (descriptor) {
        Object.defineProperty(window.navigator, "serviceWorker", descriptor);
      } else {
        Reflect.deleteProperty(window.navigator, "serviceWorker");
      }
    }
  });
});
