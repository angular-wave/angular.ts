/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { dealoc } from "../shared/dom.ts";
import { waitUntil } from "../shared/test-utils.ts";

describe("router services", () => {
  let providers: any;

  let $injector: any;

  let $state: any;

  let $$r: any;

  let $location: any;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    const module = window.angular.module("defaultModule", []);

    module.config(
      (
        $stateRegistryProvider,
        $$rProvider,
        $transitionsProvider,
        $stateProvider,
      ) => {
        providers = {
          $stateRegistryProvider,
          $$rProvider,
          $transitionsProvider,
          $stateProvider,
        };
      },
    );

    $injector = window.angular.bootstrap(document.getElementById("app")!, [
      "defaultModule",
    ]);
    $state = $injector.get("$state");
    $$r = $injector.get("$$r");
    $location = $injector.get("$location");
  });

  it("Should expose private ng-router providers through internal Angular DI", () => {
    expect(providers.$stateRegistryProvider).toBeDefined();
    expect(providers.$$rProvider).toBeDefined();
    expect(providers.$transitionsProvider).toBeDefined();
    expect(providers.$stateProvider).toBeDefined();
  });

  it("Should expose private ng-router services through internal Angular DI", () => {
    expect($injector.get("$stateRegistry")).toBeDefined();
    expect($injector.get("$$r")).toBeDefined();
    expect($injector.get("$transitions")).toBeDefined();
    expect($injector.get("$state")).toBeDefined();
    expect($injector.get("$view")).toBeDefined();
  });

  it("activates the initial url-matched state after sync", async () => {
    providers.$stateProvider.state({
      name: "home",
      url: "/startup-home",
      template: "home",
    });

    $location.url("/startup-home");
    $$r._sync();
    await waitUntil(() => $state.current.name === "home");

    expect($state.current.name).toBe("home");
  });
});
