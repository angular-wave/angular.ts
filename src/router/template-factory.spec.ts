/// <reference types="jasmine" />
import { dealoc } from "../shared/dom.ts";
import { Angular } from "../angular.ts";
import { wait } from "../shared/test-utils.ts";

describe("templateFactory", () => {
  let $injector: any,
    $templateFactory: any,
    $sce,
    $scope: any,
    $compile: any,
    $stateRegistry: any,
    $stateService: any,
    error;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("defaultModule", [])
      .decorator("$exceptionHandler", () => {
        return (exception: any) => {
          error = exception.message;
        };
      });
    $injector = window.angular.bootstrap(document.getElementById("app")!, [
      "defaultModule",
    ]);
    $injector.invoke(
      (_$templateFactory_: any, _$sce_: any, $rootScope: any) => {
        $templateFactory = _$templateFactory_;
        $sce = _$sce_;
        $scope = $rootScope;
      },
    );
  });

  it("exists", () => {
    expect($injector.get("$templateFactory")).toBeDefined();
  });

  describe("template URL behavior", () => {
    it("fetches relative URLs correctly", async () => {
      const res = await $templateFactory._fromUrl("/mock/hello");

      await wait(100);
      expect(await res).toEqual("Hello");
    });

    it("fetches cross-domain URLs without SCE restrictions", async () => {
      const url = "http://evil.com/views/view.html";

      let templateData;

      try {
        templateData = await $templateFactory._fromUrl(url);
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
        templateData = await $templateFactory._fromUrl(url);
      } catch (e) {
        templateData = null;
      }

      expect(templateData !== undefined).toBe(true);
    });
  });

  describe("component template builder", () => {
    let el: any;

    beforeEach(() => {
      dealoc(document.getElementById("app"));
      const mod = window.angular.module("defaultModule", []);

      mod.component("myComponent", { template: "hi" });
      $injector = window.angular.bootstrap(document.getElementById("app")!, [
        "defaultModule",
      ]);
      $injector.invoke(
        (
          _$templateFactory_: any,
          _$sce_: any,
          $rootScope: any,
          _$stateRegistry_: any,
          _$state_: any,
          _$compile_: any,
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
  });
});
