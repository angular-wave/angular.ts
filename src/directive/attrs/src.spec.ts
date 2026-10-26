/// <reference types="jasmine" />
import { htmlNode, instance } from "../../shared/test-fixtures.spec.ts";
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngSrc", () => {
  let $scope: FixtureScope;

  let $compile: ng.CompileService;

  let element: HTMLElement;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.createModule("myModule", ["ng"]);
    createInjector(["myModule"]).invoke([
      "$rootScope",
      "$compile",
      ($rootScope: FixtureScope, _$compile_: ng.CompileService) => {
        $scope = $rootScope.new();
        $compile = _$compile_;
      },
    ]);
  });

  describe("img[ng-src]", () => {
    it("should not result empty string in img src", async () => {
      $scope.image = {};
      element = htmlNode($compile('<img ng-src="{{image.url}}">')($scope));
      await wait();
      expect(element.getAttribute("src")).not.toBe("");
      expect(element.getAttribute("src")).toBeNull();
    });

    it("should sanitize interpolated url", async () => {
      $scope.imageUrl = "javascript:alert(1);";
      element = htmlNode($compile('<img ng-src="{{imageUrl}}">')($scope));
      await wait();
      expect(element.getAttribute("src")).toBe("unsafe:javascript:alert(1);");
    });

    it("should sanitize non-interpolated url", async () => {
      element = htmlNode(
        $compile('<img ng-src="javascript:alert(1);">')($scope),
      );
      expect(element.getAttribute("src")).toBe("unsafe:javascript:alert(1);");
    });

    it("should interpolate the expression and bind to src with raw same-domain value", async () => {
      element = htmlNode(
        $compile('<img ng-src="{{resourceId}}"></img>')($scope),
      );
      expect(element.getAttribute("src")).toBeNull();

      $scope.resourceId = "/somewhere/here";
      await wait();
      expect(element.getAttribute("src")).toEqual("/somewhere/here");
    });

    it("should interpolate a multi-part expression for img src attribute (which requires the MEDIA_URL context)", async () => {
      element = htmlNode(
        $compile('<img ng-src="some/{{resourceId}}"></img>')($scope),
      );
      await wait();
      expect(element.getAttribute("src")).toBeNull(); // URL concatenations are all-or-nothing
      $scope.resourceId = 1;
      await wait();
      expect(element.getAttribute("src")).toEqual("some/1");
    });

    it("should work with `src` attribute on the same element", async () => {
      $scope.imageUrl = "dynamic";
      element = htmlNode(
        $compile('<img ng-src="{{imageUrl}}" src="static">')($scope),
      );
      expect(element.getAttribute("src")).toBe("static");
      await wait();
      expect(element.getAttribute("src")).toBe("dynamic");

      element = htmlNode(
        $compile('<img src="static" ng-src="{{imageUrl}}">')($scope),
      );
      expect(element.getAttribute("src")).toBe("static");
      await wait();
      expect(element.getAttribute("src")).toBe("dynamic");
    });
  });

  describe("iframe[ng-src]", () => {
    let $scope: FixtureScope;

    let $compile: ng.CompileService;

    let element: HTMLElement;

    let error: unknown;

    beforeEach(() => {
      error = undefined;
      window.angular = new Angular();
      window.angular
        .createModule("myModule", ["ng"])
        .decorator("$exceptionHandler", () => {
          return (exception: unknown, cause: unknown) => {
            error = exception;
          };
        });
      createInjector(["myModule"]).invoke([
        "$rootScope",
        "$compile",

        ($rootScope: FixtureScope, _$compile_: ng.CompileService) => {
          $scope = $rootScope.new();
          $compile = _$compile_;
        },
      ]);
    });

    it("should pass through src attributes for the same domain", async () => {
      element = htmlNode(
        $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope),
      );
      $scope.testUrl = "different_page";
      await wait();
      expect(element.getAttribute("src")).toEqual("different_page");
    });

    it("should error on src attributes for a different domain", async () => {
      element = htmlNode(
        $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope),
      );
      $scope.testUrl = "http://a.different.domain.example.com";
      await wait();

      expect(error).toBeDefined();
    });

    it("should error on JS src attributes", async () => {
      element = htmlNode(
        $compile('<iframe ng-src="{{testUrl}}"></iframe>')($scope),
      );
      $scope.testUrl = "javascript:alert(1);";
      await wait();

      expect(error).toBeDefined();
    });

    it("should NOT interpolate a multi-part expression in a `src` attribute that requires a non-MEDIA_URL context", async () => {
      element = htmlNode(
        $compile('<iframe ng-src="some/{{resourceId}}"></iframe>')($scope),
      );
      $scope.resourceId = 1;
      await wait();

      expect(error).toBeDefined();
    });
  });
  describe("script URL aliases", () => {
    let errors: unknown[];

    beforeEach(() => {
      errors = [];
      window.angular = new Angular();
      window.angular
        .createModule("scriptAliases", ["ng"])
        .decorator("$exceptionHandler", () => (error: unknown) => {
          errors.push(error);
        });
      createInjector(["scriptAliases"]).invoke([
        "$rootScope",
        "$compile",
        (root: FixtureScope, compile: ng.CompileService) => {
          $scope = root.new();
          $compile = compile;
        },
      ]);
    });

    afterEach(() => {
      $scope.destroy();
    });

    for (const attribute of ["src", "href"]) {
      it(`validates script ng-${attribute} values read from DOM attributes`, async () => {
        element = htmlNode(
          $compile(
            `<script type="application/json" ng-${attribute}="/safe.js"></script>`,
          )($scope),
        );
        expect(element.getAttribute(attribute)).toBe("/safe.js");
        for (const url of [
          "javascript:alert(1)",
          "data:text/javascript,alert(1)",
          "https://untrusted.example/evil.js",
          "unsafe:javascript:alert(1)",
        ]) {
          element.setAttribute(`ng-${attribute}`, url);
          await wait();
          expect(element.getAttribute(attribute)).toBe("/safe.js");
        }
        expect(errors.length).toBe(4);
        expect(
          errors.every((error: unknown) =>
            /insecurl/.test(instance(error, Error).message),
          ),
        ).toBeTrue();
      });
    }
  });
});

interface FixtureScope extends ng.Scope {
  "new"(childInstance?: ng.Scope): FixtureScope;
  newIsolate(childInstance?: ng.Scope): FixtureScope;
  resourceId?: string | number;
  image?: unknown;
  imageUrl?: string;
  testUrl?: string;
}
