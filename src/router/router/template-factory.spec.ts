/// <reference types="jasmine" />
import { dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { waitUntil } from "../../shared/test-utils.ts";

describe("templateFactory", () => {
  let $injector: any,
    templateFactory: any,
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
    $injector.invoke([
      "$state",
      "$sce",
      "$rootScope",
      (_$state_: any, _$sce_: any, $rootScope: any) => {
        templateFactory = _$state_._viewService._templateFactory;
        $sce = _$sce_;
        $scope = $rootScope;
      },
    ]);
  });

  it("is owned by the state runtime", () => {
    expect(templateFactory).toBeDefined();
  });

  describe("template URL behavior", () => {
    it("fetches relative URLs correctly", async () => {
      const res = await templateFactory._fromUrl("/mock/hello");

      expect(await res).toEqual("Hello");
    });

    it("fetches cross-domain URLs without SCE restrictions", async () => {
      const url = "http://evil.com/views/view.html";
      const fetch = spyOn(window, "fetch").and.resolveTo(
        new Response("Cross-domain template"),
      );

      const templateData = await templateFactory._fromUrl(url);

      expect(fetch).toHaveBeenCalledWith(url, jasmine.any(Object));
      expect(templateData).toBe("Cross-domain template");
    });

    it("allows URLs marked as trusted explicitly (optional, passes through)", async () => {
      const url = "http://example.com/trusted.html";
      const fetch = spyOn(window, "fetch").and.resolveTo(
        new Response("Trusted template"),
      );

      const templateData = await templateFactory._fromUrl(url);

      expect(fetch).toHaveBeenCalledWith(url, jasmine.any(Object));
      expect(templateData).toBe("Trusted template");
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
      $injector.invoke([
        "$sce",
        "$rootScope",
        "$stateRegistry",
        "$state",
        "$compile",
        (
          _$sce_: any,
          $rootScope: any,
          _$stateRegistry_: any,
          _$state_: any,
          _$compile_: any,
        ) => {
          templateFactory = _$state_._viewService._templateFactory;
          $sce = _$sce_;
          $scope = $rootScope;
          $stateRegistry = _$stateRegistry_;
          $stateService = _$state_;
          $compile = _$compile_;
        },
      ]);
      el = $compile("<div><ng-view></ng-view></div>")($scope.$new());
    });

    it("should not prefix the components dom element with anything", async () => {
      $stateRegistry.register({ name: "cmp", component: "myComponent" });
      $stateService.go("cmp");
      await waitUntil(() => /\<my-component/.test(el.innerHTML));
      expect(el.innerHTML).toMatch(/\<my-component/);
    });
  });
});
