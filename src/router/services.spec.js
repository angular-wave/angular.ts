import { Angular } from "../angular.ts";
import { dealoc } from "../shared/dom.ts";
import { wait } from "../shared/utils.ts";

describe("router services", () => {
  let providers;
  let $injector;
  let $state;
  let $url;
  let $location;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window["angular"] = new Angular();
    let module = window["angular"].module("defaultModule", []);
    module.config(
      (
        $urlProvider,
        $stateRegistryProvider,
        $$rProvider,
        $transitionsProvider,
        $stateProvider,
      ) => {
        providers = {
          $urlProvider,
          $stateRegistryProvider,
          $$rProvider,
          $transitionsProvider,
          $stateProvider,
        };
      },
    );

    $injector = window["angular"].bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);
    $state = $injector.get("$state");
    $url = $injector.get("$url");
    $location = $injector.get("$location");
  });

  it("Should expose private ng-router providers through internal Angular DI", () => {
    expect(providers.$urlProvider).toBeDefined();
    expect(providers.$stateRegistryProvider).toBeDefined();
    expect(providers.$$rProvider).toBeDefined();
    expect(providers.$transitionsProvider).toBeDefined();
    expect(providers.$stateProvider).toBeDefined();
  });

  it("Should expose private ng-router services through internal Angular DI", () => {
    expect($injector.get("$url")).toBeDefined();
    expect($injector.get("$stateRegistry")).toBeDefined();
    expect($injector.get("$$r")).toBeDefined();
    expect($injector.get("$transitions")).toBeDefined();
    expect($injector.get("$state")).toBeDefined();
    expect($injector.get("$view")).toBeDefined();
  });

  it("activates the initial url-matched state after listen and sync", async () => {
    providers.$stateProvider.state({
      name: "home",
      url: "/startup-home",
      template: "home",
    });

    $location.url("/startup-home");
    $url.listen(true);
    $url.sync();
    await wait(50);

    expect($state.current.name).toBe("home");
  });
});
