/// <reference types="jasmine" />
import {
  callable,
  defined,
  htmlNode,
} from "../../shared/test-fixtures.spec.ts";

import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { dealoc, createElementFromHTML } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import { ngHideDirective, ngShowDirective } from "./show-hide.ts";

describe("ngShow / ngHide", () => {
  let $scope: FixtureScope;

  let $injector: ng.InjectorService;

  let $compile: ng.CompileService;

  let element: HTMLElement;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.createModule("myModule", ["ng"]);
    $injector = createInjector(["myModule"]);
    $injector.invoke([
      "$rootScope",
      "$compile",
      ($rootScope: FixtureScope, _$compile_: ng.CompileService) => {
        $scope = $rootScope.new();
        $compile = _$compile_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(element);
  });

  describe("ngShow", () => {
    it("should show and hide an element", async () => {
      element = htmlNode(createElementFromHTML('<div ng-show="exp"></div>'));
      element = htmlNode($compile(element)($scope));
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
    });

    it("should support normalized data-ng-show aliases", async () => {
      element = htmlNode(
        createElementFromHTML('<div data-ng-show="exp"></div>'),
      );
      element = htmlNode($compile(element)($scope));
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
    });

    // https://github.com/angular/angular.js/issues/5414
    it("should hide if the expression is a function with a no arguments", async () => {
      element = htmlNode(createElementFromHTML('<div ng-show="exp"></div>'));
      element = htmlNode($compile(element)($scope));
      $scope.exp = function () {};
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
    });

    it("should make hidden element visible", async () => {
      element = htmlNode(
        createElementFromHTML('<div class="ng-hide" ng-show="exp"></div>'),
      );
      element = htmlNode($compile(element)($scope));
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
    });

    it("should update when a controller instance method changes visibility", async () => {
      class TestController {
        visible = false;

        show() {
          this.visible = true;
        }
      }

      element = htmlNode(
        createElementFromHTML(
          '<section><button type="button" ng-click="$ctrl.show()">Show</button>' +
            '<span ng-show="$ctrl.visible">Visible</span></section>',
        ),
      );
      element = htmlNode($compile(element)($scope));
      $scope.$ctrl = new TestController();

      await wait();
      expect(
        defined(element.querySelector("span")).classList.contains("ng-hide"),
      ).toBe(true);

      defined(element.querySelector("button")).click();
      await wait();

      expect(
        defined(element.querySelector("span")).classList.contains("ng-hide"),
      ).toBe(false);
    });

    ["false", "undefined", "null", "NaN", "''", "0"].forEach((x) => {
      it(`should hide the element if condition is falsy: ${x}`, async () => {
        element = htmlNode(createElementFromHTML(`<div ng-show="${x}"></div>`));
        element = htmlNode($compile(element)($scope));
        await wait();
        expect(element.classList.contains("ng-hide")).toBeTrue();
      });
    });

    ["'f'", "'0'", "'false'", "'no'", "'n'", "'[]'"].forEach((x) => {
      it(`should show the element if condition is a non-empty string: ${x}`, async () => {
        element = htmlNode(createElementFromHTML(`<div ng-show="${x}"></div>`));
        element = htmlNode($compile(element)($scope));
        await wait();
        expect(element.classList.contains("ng-hide")).toBeFalse();
      });
    });

    ["[]", "{}"].forEach((x) => {
      it(`should show the element if condition is an object: ${x}`, async () => {
        element = htmlNode(createElementFromHTML(`<div ng-show="${x}"></div>`));
        element = htmlNode($compile(element)($scope));
        await wait();
        expect(element.classList.contains("ng-hide")).toBeFalse();
      });
    });

    it("does nothing when ng-show attribute is missing", () => {
      const directive = ngShowDirective($injector);
      const node = createElementFromHTML("<div>Visible</div>");

      callable(directive, "link");
      expect(() =>
        directive.link($scope, htmlNode(node), () => undefined),
      ).not.toThrow();
    });
  });

  describe("ngHide", () => {
    it("should hide an element", async () => {
      element = htmlNode(createElementFromHTML('<div ng-hide="exp"></div>'));
      element = htmlNode($compile(element)($scope));
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
    });

    it("should support normalized data-ng-hide aliases", async () => {
      element = htmlNode(
        createElementFromHTML('<div data-ng-hide="exp"></div>'),
      );
      element = htmlNode($compile(element)($scope));
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
    });

    it("should update when a controller instance method changes visibility", async () => {
      class TestController {
        hidden = false;

        hide() {
          this.hidden = true;
        }
      }

      element = htmlNode(
        createElementFromHTML(
          '<section><button type="button" ng-click="$ctrl.hide()">Hide</button>' +
            '<span ng-hide="$ctrl.hidden">Visible</span></section>',
        ),
      );
      element = htmlNode($compile(element)($scope));
      $scope.$ctrl = new TestController();

      await wait();
      expect(
        defined(element.querySelector("span")).classList.contains("ng-hide"),
      ).toBe(false);

      defined(element.querySelector("button")).click();
      await wait();

      expect(
        defined(element.querySelector("span")).classList.contains("ng-hide"),
      ).toBe(true);
    });

    ["false", "undefined", "null", "NaN", "''", "0"].forEach((x) => {
      it(`should show the element if condition is falsy: ${x}`, async () => {
        element = htmlNode(createElementFromHTML(`<div ng-hide="${x}"></div>`));
        element = htmlNode($compile(element)($scope));
        await wait();
        expect(element.classList.contains("ng-hide")).toBeFalse();
      });
    });

    ["'f'", "'0'", "'false'", "'no'", "'n'", "'[]'"].forEach((x) => {
      it(`should hide the element if condition is a non-empty string ${x}`, async () => {
        element = htmlNode(createElementFromHTML(`<div ng-hide="${x}"></div>`));
        element = htmlNode($compile(element)($scope));
        await wait();
        expect(element.classList.contains("ng-hide")).toBeTrue();
      });
    });

    ["[]", "{}"].forEach((x) => {
      it(`should hide the element if condition is an object ${x}`, async () => {
        element = htmlNode(createElementFromHTML(`<div ng-hide="${x}"></div>`));
        element = htmlNode($compile(element)($scope));
        await wait();
        expect(element.classList.contains("ng-hide")).toBeTrue();
      });
    });

    it("does nothing when ng-hide attribute is missing", () => {
      const directive = ngHideDirective($injector);
      const node = createElementFromHTML("<div>Visible</div>");

      callable(directive, "link");
      expect(() =>
        directive.link($scope, htmlNode(node), () => undefined),
      ).not.toThrow();
    });

    it("uses animate methods for animated ng-hide state changes", () => {
      const animate = $injector.get("$animate");
      spyOn(animate, "removeClass");
      spyOn(animate, "addClass");

      const directive = ngShowDirective($injector);

      const node = createElementFromHTML(
        '<div ng-show="show" data-animate="true"></div>',
      );
      let onChange: ng.ListenerFn | undefined;

      callable(directive, "link");
      spyOn($scope, "watch").and.callFake((_expression, callback) => {
        onChange = callback;
        defined(callback)(false);
        return undefined;
      });
      directive.link($scope, htmlNode(node), () => undefined);

      expect(animate.addClass).toHaveBeenCalledWith(
        node,
        "ng-hide",
        jasmine.objectContaining({ tempClasses: "ng-hide-animate" }),
      );

      defined(onChange)(true);

      expect(animate.removeClass).toHaveBeenCalledWith(
        node,
        "ng-hide",
        jasmine.objectContaining({ tempClasses: "ng-hide-animate" }),
      );
    });

    it("uses animate methods for animated ng-hide elements", () => {
      const animate = $injector.get("$animate");
      spyOn(animate, "removeClass");
      spyOn(animate, "addClass");

      const directive = ngHideDirective($injector);

      const node = createElementFromHTML(
        '<div ng-hide="hide" data-animate="true"></div>',
      );
      let onChange: ng.ListenerFn | undefined;

      callable(directive, "link");
      spyOn($scope, "watch").and.callFake((_expression, callback) => {
        onChange = callback;
        defined(callback)(false);
        return undefined;
      });
      directive.link($scope, htmlNode(node), () => undefined);

      expect(animate.removeClass).toHaveBeenCalledWith(
        node,
        "ng-hide",
        jasmine.objectContaining({ tempClasses: "ng-hide-animate" }),
      );

      defined(onChange)(true);

      expect(animate.addClass).toHaveBeenCalledWith(
        node,
        "ng-hide",
        jasmine.objectContaining({ tempClasses: "ng-hide-animate" }),
      );
    });
  });
});

interface FixtureScope extends ng.Scope {
  "new"(childInstance?: ng.Scope): FixtureScope;
  newIsolate(childInstance?: ng.Scope): FixtureScope;
  exp?: boolean | (() => void);
}
