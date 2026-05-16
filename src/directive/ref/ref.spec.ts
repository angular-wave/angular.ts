// @ts-nocheck
/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.ts";
import { createElementFromHTML } from "../../shared/dom.ts";
import { ngRefDirective } from "./ref.ts";

describe("ngRef", () => {
  describe("on a component", () => {
    let myComponentController;

    let attributeDirectiveController;

    let elementDirectiveController;

    let $rootScope;

    let $compile;

    let injector;

    beforeEach(() => {
      window.angular = new Angular();
      window.angular
        .module("myModule", ["ng"])
        .decorator("$exceptionHandler", function () {
          return (exception, cause) => {
            throw new Error(exception.message);
          };
        });
      injector = createInjector([
        "myModule",
        ($compileProvider) => {
          $compileProvider.component("myComponent", {
            template: "foo",
            controller() {
              myComponentController = this;
            },
          });

          $compileProvider.directive("attributeDirective", () => ({
            restrict: "A",
            controller() {
              attributeDirectiveController = this;
            },
          }));

          $compileProvider.directive("elementDirective", () => ({
            restrict: "E",
            template: "my text",
            controller() {
              elementDirectiveController = this;
            },
          }));
        },
      ]);

      $compile = injector.get("$compile");
      $rootScope = injector.get("$rootScope");
    });

    describe("compile", () => {
      it("should create a link function that assigns and clears the element ref", () => {
        const directive = ngRefDirective(injector.get("$parse"));

        const element = document.createElement("div");

        const scope = $rootScope.$new();

        const link = directive.compile(element, {
          ngRef: "elementRef",
        });

        link(scope, element, {});

        expect(scope.elementRef).toBe(element);

        scope.$destroy();

        expect(scope.elementRef).toBeNull();
      });
    });

    it("should bind in the current scope the controller of a component", () => {
      $rootScope.$ctrl = "undamaged";
      $compile('<my-component ng-ref="myComponentRef"></my-component>')(
        $rootScope,
      );
      expect($rootScope.$ctrl).toBe("undamaged");
      expect($rootScope.myComponentRef).toEqual(myComponentController);
    });

    it("should throw if the expression is not assignable", () => {
      expect(() => {
        $compile(
          createElementFromHTML(
            "<my-component ng-ref=\"'hello'\"></my-component>",
          ),
        )($rootScope);
      }).toThrow();
    });

    it("should work with data-non-normalized entity name", () => {
      $compile(
        createElementFromHTML(
          '<data-my-component ng-ref="myComponent2"></data-my-component>',
        ),
      )($rootScope);
      expect($rootScope.myComponent2).toEqual(myComponentController);
    });

    it("should work with data-non-normalized attribute name", () => {
      $compile(
        createElementFromHTML(
          '<my-component data-ng-ref="myComponent1"></my-component>',
        ),
      )($rootScope);
      expect($rootScope.myComponent1).toEqual(myComponentController);
    });

    it("should work with x-non-normalized attribute name", () => {
      $compile(
        createElementFromHTML(
          '<my-component ng-ref="myComponent2"></my-component>',
        ),
      )($rootScope);
      expect($rootScope.myComponent2).toEqual(myComponentController);
    });

    it("should not bind the controller of an attribute directive", () => {
      $compile(
        '<my-component attribute-directive-1 ng-ref="myComponentRef"></my-component>',
      )($rootScope);
      expect($rootScope.myComponentRef).toEqual(myComponentController);
    });

    it("should not leak to parent scopes", () => {
      const template =
        '<div ng-if="true">' +
        '<my-component ng-ref="myComponent"></my-component>' +
        "</div>";

      $compile(template)($rootScope);
      expect($rootScope.myComponent).toBe(undefined);
    });

    it("should allow binding to a nested property", () => {
      $rootScope.obj = {};

      $compile('<my-component ng-ref="obj.myComponent"></my-component>')(
        $rootScope,
      );

      expect($rootScope.obj.myComponent).toBe(myComponentController);
    });

    it("should bind the DOM element if there is no component", () => {
      const element = $compile('<span ng-ref="mySpan">my text</span>')(
        $rootScope,
      );

      expect($rootScope.mySpan).toBe(element);
      expect($rootScope.mySpan.textContent).toBe("my text");
    });

    it("should nullify plain element refs when the owner scope is destroyed", () => {
      const scope = $rootScope.$new();

      $compile('<span ng-ref="mySpan">my text</span>')(scope);

      expect(scope.mySpan.textContent).toBe("my text");

      scope.$destroy();

      expect(scope.mySpan).toBeNull();
    });

    it("should nullify component refs when the owner scope is destroyed", () => {
      const scope = $rootScope.$new();

      $compile('<my-component ng-ref="myComponent"></my-component>')(scope);

      expect(scope.myComponent).toBe(myComponentController);

      scope.$destroy();

      expect(scope.myComponent).toBeNull();
    });

    describe("ngRefRead", () => {
      it('should bind the element instead of the controller of a component if ngRefRead="$element" is set', () => {
        const element = $compile(
          '<my-component ng-ref="myEl" ng-ref-read="$element"></my-component>',
        )($rootScope);

        expect($rootScope.myEl).toBe(element);
        expect($rootScope.myEl.textContent).toBe("foo");
      });

      it("should support normalized data-ng-ref-read aliases", () => {
        const element = $compile(
          '<my-component ng-ref="myEl" data-ng-ref-read="$element"></my-component>',
        )($rootScope);

        expect($rootScope.myEl).toBe(element);
        expect($rootScope.myEl.textContent).toBe("foo");
      });

      it('should bind the element instead of an element directive controller if ngRefRead="$element" is set', () => {
        const element = $compile(
          '<element-directive ng-ref="myEl" ng-ref-read="$element"></element-directive>',
        )($rootScope);

        expect(elementDirectiveController).toBeDefined();
        expect($rootScope.myEl).toBe(element);
        expect($rootScope.myEl.textContent).toBe("my text");
      });

      it("should bind a named attribute directive controller", () => {
        $compile(
          '<my-component attribute-directive ng-ref="attributeRef" ng-ref-read="attributeDirective"></my-component>',
        )($rootScope);

        expect($rootScope.attributeRef).toBe(attributeDirectiveController);
      });

      it("should assign undefined when the requested controller is not present", () => {
        $rootScope.missingControllerRef = "previous";

        $compile(
          '<element-directive ng-ref="missingControllerRef" ng-ref-read="missing"></element-directive>',
        )($rootScope);

        expect($rootScope.missingControllerRef).toBeUndefined();
      });
    });

    it("should bind the controller of an element directive", () => {
      $compile('<element-directive ng-ref="elementRef"></element-directive>')(
        $rootScope,
      );

      expect($rootScope.elementRef).toBe(elementDirectiveController);
    });

    it("should bind the DOM element if the controller is on an attribute directive", () => {
      const element = $compile(
        '<div attribute-directive ng-ref="attributeElementRef"></div>',
      )($rootScope);

      expect(attributeDirectiveController).toBeDefined();
      expect($rootScope.attributeElementRef).toBe(element);
    });
  });
});
