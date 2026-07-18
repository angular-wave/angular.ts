/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { dealoc } from "../shared/dom.ts";
import { waitUntil } from "../shared/test-utils.ts";

describe("router services", () => {
  let $injector: any;

  let $state: any;

  let routerState: any;

  let $location: any;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    const module = window.angular.module("defaultModule", []).router({
      name: "home",
      url: "/startup-home",
      template: "home",
    });

    $injector = window.angular.bootstrap(document.getElementById("app")!, [
      "defaultModule",
    ]);
    $state = $injector.get("$state");
    routerState = $state._routerState;
    $location = $injector.get("$location");
  });

  it("exposes the public router services", () => {
    expect($injector.get("$stateRegistry")).toBeDefined();
    expect($injector.get("$transitions")).toBeDefined();
    expect($injector.get("$state")).toBeDefined();
  });

  it("activates the initial url-matched state after sync", async () => {
    $location.url("/startup-home");
    routerState._sync();
    await waitUntil(() => $state.current.name === "home");

    expect($state.current.name).toBe("home");
  });

  it("applies typed scroll and focus config through ngModule config", () => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();

    const configuredModule = window.angular.module("routerConfigModule", []);
    configuredModule.config({
      $router: {
        scroll: { top: 12, behavior: "auto" },
        focus: { selector: "[data-route-focus]", preventScroll: true },
        viewTransitions: false,
        loading: "loadingState",
        error: "errorState",
      },
    });

    const configuredInjector = window.angular.bootstrap(
      document.getElementById("app")!,
      ["routerConfigModule"],
    );
    const router = (configuredInjector.get("$state") as any)._routerState;

    expect(router._scroll).toEqual({ top: 12, behavior: "auto" });
    expect(router._focus).toEqual({
      selector: "[data-route-focus]",
      preventScroll: true,
    });
    expect(router._viewTransitions).toBeFalse();
    expect(router._loading).toBe("loadingState");
    expect(router._error).toBe("errorState");
  });

  describe("custom $router.paramTypes", () => {
    let customStateModule: any;
    let customStateModuleInjector: any;
    let state: any;
    let router: any;
    let location: any;

    beforeEach(() => {
      dealoc(document.getElementById("app"));
      window.angular = new Angular();

      customStateModule = window.angular.module("customParamTypeModule", []);
      customStateModule
        .config({
          $router: {
            paramTypes: {
              slug: {
                pattern: /s-[a-z]+-[0-9]+/i,
                encode(value: string) {
                  return `S-${value}`;
                },
                decode(value: string) {
                  return String(value).toLowerCase().replace(/^s-/, "");
                },
                is(value: unknown) {
                  return typeof value === "string" && value.includes("-");
                },
                equals(a: unknown, b: unknown) {
                  return a === b;
                },
              },
            },
          },
        })
        .router({
          name: "item",
          url: "/item/{slug:slug}",
          template: "item",
        });

      customStateModule.config({ $location: { html5Mode: false } });

      customStateModuleInjector = window.angular.bootstrap(
        document.getElementById("app")!,
        ["customParamTypeModule"],
      );
      state = customStateModuleInjector.get("$state");
      router = state._routerState;
      location = customStateModuleInjector.get("$location");
    });

    it("reaches states and decodes params with a custom type", async () => {
      location.url("/item/S-abc-12");
      router._sync();

      await waitUntil(() => state.current.name === "item");

      expect(state.current.name).toBe("item");
      expect(state.params.slug).toBe("abc-12");

      await state.go("item", { slug: "def-34" });
      expect(location.url()).toContain("/item/S-def-34");
      expect(state.params.slug).toBe("def-34");
    });
  });
});
