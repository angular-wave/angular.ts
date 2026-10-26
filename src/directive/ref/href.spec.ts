/// <reference types="jasmine" />
import {
  defined,
  elementNode,
  instance,
} from "../../shared/test-fixtures.spec.ts";

import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { dealoc } from "../../shared/dom.ts";
import { isDefined } from "../../shared/utils.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngHref", () => {
  let $rootScope: FixtureScope;

  let $compile: ng.CompileService;

  let element: Element;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .createModule("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception: unknown, cause: unknown) => {
          throw new Error(instance(exception, Error).message);
        };
      });
    createInjector(["myModule"]).invoke([
      "$rootScope",
      "$compile",
      (_$rootScope_: FixtureScope, _$compile_: ng.CompileService) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should interpolate the expression and bind to href", async () => {
    element = elementNode(
      $compile('<a ng-href="some/{{id}}"></div>')($rootScope),
    );
    await wait();
    expect(element.getAttribute("href")).toEqual("some/");

    $rootScope.id = 1;
    await wait();
    expect(element.getAttribute("href")).toEqual("some/1");
  });

  it("should bind href and merge with other attrs", async () => {
    element = elementNode(
      $compile('<a ng-href="{{url}}" rel="{{rel}}"></a>')($rootScope),
    );
    $rootScope.url = "http://server";
    $rootScope.rel = "REL";
    await wait();
    expect(element.getAttribute("href")).toEqual("http://server");
    expect(element.getAttribute("rel")).toEqual("REL");
  });

  it("should bind href even if no interpolation", async () => {
    element = elementNode(
      $compile('<a ng-href="http://server"></a>')($rootScope),
    );
    await wait();
    expect(element.getAttribute("href")).toEqual("http://server");
  });

  it("should not set the href if ng-href is empty", async () => {
    $rootScope.url = null;
    element = elementNode($compile('<a ng-href="{{url}}">')($rootScope));
    await wait();
    expect(element.getAttribute("href")).toEqual(null);
  });

  it("should remove the href if ng-href changes to empty", async () => {
    $rootScope.url = "http://www.google.com/";
    element = elementNode($compile('<a ng-href="{{url}}">')($rootScope));
    $rootScope.url = null;
    await wait();
    expect(element.getAttribute("href")).toEqual(null);
  });

  it("should sanitize interpolated url", async () => {
    $rootScope.imageUrl = "javascript:alert(1);";
    element = elementNode($compile('<a ng-href="{{imageUrl}}">')($rootScope));
    await wait();
    expect(element.getAttribute("href")).toBe("unsafe:javascript:alert(1);");
  });

  it("should sanitize non-interpolated url", async () => {
    element = elementNode(
      $compile('<a ng-href="javascript:alert(1);">')($rootScope),
    );
    await wait();
    expect(element.getAttribute("href")).toBe("unsafe:javascript:alert(1);");
  });

  it("should bind numbers", async () => {
    element = elementNode($compile('<a ng-href="{{1234}}"></a>')($rootScope));
    await wait();
    expect(element.getAttribute("href")).toEqual("1234");
  });

  it("should bind and sanitize the result of a (custom) toString() function", async () => {
    $rootScope.value = {};
    element = elementNode($compile('<a ng-href="{{value}}"></a>')($rootScope));
    await wait();
    expect(element.getAttribute("href")).toEqual("{}");

    class SafeClass {
      toString() {
        return "custom value";
      }
    }

    $rootScope.value = new SafeClass();
    await wait();
    expect(element.getAttribute("href")).toEqual("custom value");

    class UnsafeClass {
      toString() {
        return "javascript:alert(1);";
      }
    }

    $rootScope.value = new UnsafeClass();
    await wait();
    expect(element.getAttribute("href")).toEqual("unsafe:javascript:alert(1);");
  });

  if (isDefined(window.SVGElement)) {
    describe("SVGAElement", () => {
      it("should interpolate the expression and bind to href", async () => {
        element = elementNode(
          $compile('<svg><a ng-href="some/{{id}}"></a></svg>')($rootScope),
        );
        await wait();
        const child = element.querySelector("a");

        expect(defined(child).getAttribute("href")).toEqual("some/");

        $rootScope.id = 1;
        await wait();
        expect(defined(child).getAttribute("href")).toEqual("some/1");
      });

      it("should bind href even if no interpolation", async () => {
        element = elementNode(
          $compile('<svg><a ng-href="http://server"></a></svg>')($rootScope),
        );
        const child = element.querySelector("a");

        expect(defined(child).getAttribute("href")).toEqual("http://server");
      });
    });
  }
});

interface FixtureScope extends ng.Scope {
  "new"(childInstance?: ng.Scope): FixtureScope;
  newIsolate(childInstance?: ng.Scope): FixtureScope;
  url?: string | null;
  rel?: string;
  imageUrl?: string;
  value?: unknown;
}
