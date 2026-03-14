import { Angular } from "../../angular.js";
import { createInjector } from "../../core/di/injector.ts";
import { dealoc } from "../../shared/dom.js";
import { isDefined } from "../../shared/utils.js";
import { wait } from "../../shared/test-utils.js";

describe("ngHref", () => {
  let $rootScope;
  let $compile;
  let element;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          throw new Error(exception.message);
        };
      });
    createInjector(["myModule"]).invoke((_$rootScope_, _$compile_) => {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
    });
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should interpolate the expression and bind to href", async () => {
    element = $compile('<a ng-href="some/{{id}}"></div>')($rootScope);
    await wait();
    expect(element.getAttribute("href")).toEqual("some/");

    $rootScope.id = 1;
    await wait();
    expect(element.getAttribute("href")).toEqual("some/1");
  });

  it("should bind href and merge with other attrs", async () => {
    element = $compile('<a ng-href="{{url}}" rel="{{rel}}"></a>')($rootScope);
    $rootScope.url = "http://server";
    $rootScope.rel = "REL";
    await wait();
    expect(element.getAttribute("href")).toEqual("http://server");
    expect(element.getAttribute("rel")).toEqual("REL");
  });

  it("should bind href even if no interpolation", async () => {
    element = $compile('<a ng-href="http://server"></a>')($rootScope);
    await wait();
    expect(element.getAttribute("href")).toEqual("http://server");
  });

  it("should not set the href if ng-href is empty", async () => {
    $rootScope.url = null;
    element = $compile('<a ng-href="{{url}}">')($rootScope);
    await wait();
    expect(element.getAttribute("href")).toEqual(null);
  });

  it("should remove the href if ng-href changes to empty", async () => {
    $rootScope.url = "http://www.google.com/";
    element = $compile('<a ng-href="{{url}}">')($rootScope);
    $rootScope.url = null;
    await wait();
    expect(element.getAttribute("href")).toEqual(null);
  });

  it("should sanitize interpolated url", async () => {
    $rootScope.imageUrl = "javascript:alert(1);";
    element = $compile('<a ng-href="{{imageUrl}}">')($rootScope);
    await wait();
    expect(element.getAttribute("href")).toBe("unsafe:javascript:alert(1);");
  });

  it("should sanitize non-interpolated url", async () => {
    element = $compile('<a ng-href="javascript:alert(1);">')($rootScope);
    await wait();
    expect(element.getAttribute("href")).toBe("unsafe:javascript:alert(1);");
  });

  it("should bind numbers", async () => {
    element = $compile('<a ng-href="{{1234}}"></a>')($rootScope);
    await wait();
    expect(element.getAttribute("href")).toEqual("1234");
  });

  it("should bind and sanitize the result of a (custom) toString() function", async () => {
    $rootScope.value = {};
    element = $compile('<a ng-href="{{value}}"></a>')($rootScope);
    await wait();
    expect(element.getAttribute("href")).toEqual("[object Object]");

    function SafeClass() {}

    SafeClass.prototype.toString = function () {
      return "custom value";
    };

    $rootScope.value = new SafeClass();
    await wait();
    expect(element.getAttribute("href")).toEqual("custom value");

    function UnsafeClass() {}

    UnsafeClass.prototype.toString = function () {
      return "javascript:alert(1);";
    };

    $rootScope.value = new UnsafeClass();
    await wait();
    expect(element.getAttribute("href")).toEqual("unsafe:javascript:alert(1);");
  });

  if (isDefined(window.SVGElement)) {
    describe("SVGAElement", () => {
      it("should interpolate the expression and bind to xlink:href", async () => {
        element = $compile('<svg><a ng-href="some/{{id}}"></a></svg>')(
          $rootScope,
        );
        await wait();
        const child = element.querySelector("a");
        expect(child.getAttribute("href")).toEqual("some/");

        $rootScope.id = 1;
        await wait();
        expect(child.getAttribute("href")).toEqual("some/1");
      });

      it("should bind xlink:href even if no interpolation", async () => {
        element = $compile('<svg><a ng-href="http://server"></a></svg>')(
          $rootScope,
        );
        const child = element.querySelector("a");
        expect(child.getAttribute("href")).toEqual("http://server");
      });
    });
  }
});
