import { Angular } from "../../angular.js";
import { createInjector } from "../../core/di/injector.ts";
import { wait } from "../../shared/test-utils.js";

describe("ngSrc", () => {
  let $scope;
  let $compile;
  let element;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    createInjector(["myModule"]).invoke(($rootScope, _$compile_) => {
      $scope = $rootScope.$new();
      $compile = _$compile_;
    });
  });

  describe("img[ng-src]", () => {
    it("should not result empty string in img src", async () => {
      $scope.image = {};
      element = $compile('<img ng-src="{{image.url}}">')($scope);
      await wait();
      expect(element.getAttribute("src")).not.toBe("");
      expect(element.getAttribute("src")).toBeNull();
    });

    it("should sanitize interpolated url", async () => {
      $scope.imageUrl = "javascript:alert(1);";
      element = $compile('<img ng-src="{{imageUrl}}">')($scope);
      await wait();
      expect(element.getAttribute("src")).toBe("unsafe:javascript:alert(1);");
    });

    it("should sanitize non-interpolated url", async () => {
      element = $compile('<img ng-src="javascript:alert(1);">')($scope);
      expect(element.getAttribute("src")).toBe("unsafe:javascript:alert(1);");
    });

    it("should interpolate the expression and bind to src with raw same-domain value", async () => {
      element = $compile('<img ng-src="{{id}}"></img>')($scope);
      expect(element.getAttribute("src")).toBeNull();

      $scope.id = "/somewhere/here";
      await wait();
      expect(element.getAttribute("src")).toEqual("/somewhere/here");
    });

    it("should interpolate a multi-part expression for img src attribute (which requires the MEDIA_URL context)", async () => {
      element = $compile('<img ng-src="some/{{id}}"></img>')($scope);
      await wait();
      expect(element.getAttribute("src")).toBeNull(); // URL concatenations are all-or-nothing
      $scope.id = 1;
      await wait();
      expect(element.getAttribute("src")).toEqual("some/1");
    });

    it("should work with `src` attribute on the same element", async () => {
      $scope.imageUrl = "dynamic";
      element = $compile('<img ng-src="{{imageUrl}}" src="static">')($scope);
      expect(element.getAttribute("src")).toBe("static");
      await wait();
      expect(element.getAttribute("src")).toBe("dynamic");

      element = $compile('<img src="static" ng-src="{{imageUrl}}">')($scope);
      expect(element.getAttribute("src")).toBe("static");
      await wait();
      expect(element.getAttribute("src")).toBe("dynamic");
    });
  });

  describe("iframe[ng-src]", () => {
    let $scope;
    let $compile;
    let element;
    let $sce;
    let error;

    beforeEach(() => {
      error = undefined;
      window.angular = new Angular();
      window.angular
        .module("myModule", ["ng"])
        .decorator("$exceptionHandler", () => {
          return (exception, cause) => {
            error = exception;
          };
        });
      createInjector(["myModule"]).invoke(($rootScope, _$compile_, _$sce_) => {
        $scope = $rootScope.$new();
        $compile = _$compile_;
        $sce = _$sce_;
      });
    });

    it("should pass through src attributes for the same domain", async () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = "different_page";
      await wait();
      expect(element.getAttribute("src")).toEqual("different_page");
    });

    it("should error on src attributes for a different domain", async () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = "http://a.different.domain.example.com";
      await wait();

      expect(error).toBeDefined();
    });

    it("should error on JS src attributes", async () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = "javascript:alert(1);";
      await wait();

      expect(error).toBeDefined();
    });

    it("should error on non-resource_url src attributes", async () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = $sce.trustAsUrl("javascript:doTrustedStuff()");
      await wait();

      expect(error).toBeDefined();
    });

    it("should pass through $sce.trustAs() values in src attributes", async () => {
      element = $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope);
      $scope.testUrl = $sce.trustAsResourceUrl("javascript:doTrustedStuff()");
      await wait();

      expect(element.getAttribute("src")).toEqual(
        "javascript:doTrustedStuff()",
      );
    });

    it("should interpolate the expression and bind to src with a trusted value", async () => {
      element = $compile('<iframe ng-src="{{id}}"></iframe>')($scope);

      expect(element.getAttribute("src")).toBeNull();

      $scope.id = $sce.trustAsResourceUrl("http://somewhere");
      await wait();
      expect(element.getAttribute("src")).toEqual("http://somewhere");
    });

    it("should NOT interpolate a multi-part expression in a `src` attribute that requires a non-MEDIA_URL context", async () => {
      element = $compile('<iframe ng-src="some/{{id}}"></iframe>')($scope);
      $scope.id = 1;
      await wait();

      expect(error).toBeDefined();
    });

    it("should NOT interpolate a wrongly typed expression", async () => {
      element = $compile('<iframe ng-src="{{id}}"></iframe>')($scope);
      $scope.id = $sce.trustAsUrl("http://somewhere");
      await wait();

      expect(error).toBeDefined();
    });
  });
});
