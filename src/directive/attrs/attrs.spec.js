import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngSrcset", () => {
  let $scope;
  let $compile;
  let element;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", () => {
        return (exception) => {
          throw new Error(exception.message);
        };
      });
    createInjector(["myModule"]).invoke(($rootScope, _$compile_) => {
      $scope = $rootScope.$new();
      $compile = _$compile_;
    });
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should not result empty string in img srcset", () => {
    $scope.image = {};
    element = $compile('<img ng-srcset="{{image.url}} 2x">')($scope);
    expect(element.getAttribute("srcset")).toBeNull();
  });

  it("should sanitize good urls", async () => {
    $scope.imageUrl =
      "http://example.com/image1.png 1x, http://example.com/image2.png 2x";
    element = $compile('<img ng-srcset="{{imageUrl}}">')($scope);
    await wait();
    expect(element.getAttribute("srcset")).toBe(
      "http://example.com/image1.png 1x,http://example.com/image2.png 2x",
    );
  });

  it("should sanitize evil url", async () => {
    $scope.imageUrl =
      "http://example.com/image1.png 1x, javascript:doEvilStuff() 2x";
    element = $compile('<img ng-srcset="{{imageUrl}}">')($scope);
    await wait();
    expect(element.getAttribute("srcset")).toBe(
      "http://example.com/image1.png 1x,unsafe:javascript:doEvilStuff() 2x",
    );
  });

  it("should not throw an error if undefined", async () => {
    element = $compile('<img ng-attr-srcset="{{undefined}}">')($scope);
    await wait();
    expect().toBe();
  });

  it("should interpolate the expression and bind to srcset", async () => {
    const element = $compile('<img ng-srcset="some/{{id}} 2x"></div>')($scope);

    expect(element.getAttribute("ng-srcset")).toBeNull();

    $scope.id = 1;
    await wait();
    expect(element.getAttribute("srcset")).toEqual("some/1 2x");
  });
});
