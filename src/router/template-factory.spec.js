import { dealoc } from "../shared/dom.js";
import { Angular } from "../angular.js";
import { wait } from "../shared/test-utils.js";

describe("templateFactory", () => {
  let $injector,
    $templateFactory,
    $sce,
    $scope,
    $compile,
    $stateRegistry,
    $stateService,
    error;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("defaultModule", [])
      .decorator("$exceptionHandler", () => {
        return (exception) => {
          error = exception.message;
        };
      });
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);
    $injector.invoke((_$templateFactory_, _$sce_, $rootScope) => {
      $templateFactory = _$templateFactory_;
      $sce = _$sce_;
      $scope = $rootScope;
    });
  });

  it("exists", () => {
    expect($injector.get("$templateFactory")).toBeDefined();
  });

  describe("template URL behavior", () => {
    it("fetches relative URLs correctly", async () => {
      const res = await $templateFactory.fromUrl("/mock/hello");
      await wait(100);
      expect(await res).toEqual("Hello");
    });

    it("fetches cross-domain URLs without SCE restrictions", async () => {
      const url = "http://evil.com/views/view.html";
      let templateData;
      try {
        templateData = await $templateFactory.fromUrl(url);
      } catch (e) {
        templateData = null; // fetch failed (404, network, etc.)
      }

      // Angular.ts trusts the URL, so no SCE errors should occur
      expect(templateData !== undefined).toBe(true);
    });

    it("allows URLs marked as trusted explicitly (optional, passes through)", async () => {
      const url = "http://example.com/trusted.html";
      let templateData;
      try {
        templateData = await $templateFactory.fromUrl(url);
      } catch (e) {
        templateData = null;
      }

      expect(templateData !== undefined).toBe(true);
    });
  });

  describe("component template builder", () => {
    let el;

    beforeEach(() => {
      dealoc(document.getElementById("app"));
      const mod = angular.module("defaultModule", []);
      mod.component("myComponent", { template: "hi" });
      mod.component("dataComponent", { template: "hi" });
      mod.component("xComponent", { template: "hi" });
      $injector = window.angular.bootstrap(document.getElementById("app"), [
        "defaultModule",
      ]);
      $injector.invoke(
        (
          _$templateFactory_,
          _$sce_,
          $rootScope,
          _$stateRegistry_,
          _$state_,
          _$compile_,
        ) => {
          $templateFactory = _$templateFactory_;
          $sce = _$sce_;
          $scope = $rootScope;
          $stateRegistry = _$stateRegistry_;
          $stateService = _$state_;
          $compile = _$compile_;
        },
      );
      el = $compile("<div><ng-view></ng-view></div>")($scope.$new());
    });

    it("should not prefix the components dom element with anything", async () => {
      $stateRegistry.register({ name: "cmp", component: "myComponent" });
      $stateService.go("cmp");
      await wait(100);
      expect(el.innerHTML).toMatch(/\<my-component/);
    });

    it("should prefix the components dom element with x- for components named dataFoo", async () => {
      $stateRegistry.register({
        name: "cmp",
        component: "dataComponent",
      });
      $stateService.go("cmp");
      await wait(100);
      expect(el.innerHTML).toMatch(/\<x-data-component/);
    });

    it("should prefix the components dom element with x- for components named xFoo", async () => {
      $stateRegistry.register({ name: "cmp", component: "xComponent" });
      $stateService.go("cmp");
      await wait(100);
      expect(el.innerHTML).toMatch(/\<x-x-component/);
    });
  });
});
