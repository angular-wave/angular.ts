// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { dealoc, createElementFromHTML } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import { ngHideDirective, ngShowDirective } from "./show-hide.ts";

describe("ngShow / ngHide", () => {
  let $scope;

  let $compile;

  let element;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    createInjector(["myModule"]).invoke([
      "$rootScope",
      "$compile",
      ($rootScope, _$compile_) => {
        $scope = $rootScope.$new();
        $compile = _$compile_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(element);
  });

  describe("ngShow", () => {
    it("should show and hide an element", async () => {
      element = createElementFromHTML('<div ng-show="exp"></div>');
      element = $compile(element)($scope);
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
    });

    it("should support normalized data-ng-show aliases", async () => {
      element = createElementFromHTML('<div data-ng-show="exp"></div>');
      element = $compile(element)($scope);
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
    });

    // https://github.com/angular/angular.js/issues/5414
    it("should hide if the expression is a function with a no arguments", async () => {
      element = createElementFromHTML('<div ng-show="exp"></div>');
      element = $compile(element)($scope);
      $scope.exp = function () {};
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
    });

    it("should make hidden element visible", async () => {
      element = createElementFromHTML(
        '<div class="ng-hide" ng-show="exp"></div>',
      );
      element = $compile(element)($scope);
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

      element = createElementFromHTML(
        '<section><button type="button" ng-click="$ctrl.show()">Show</button>' +
          '<span ng-show="$ctrl.visible">Visible</span></section>',
      );
      element = $compile(element)($scope);
      $scope.$ctrl = new TestController();

      await wait();
      expect(element.querySelector("span").classList.contains("ng-hide")).toBe(
        true,
      );

      element.querySelector("button").click();
      await wait();

      expect(element.querySelector("span").classList.contains("ng-hide")).toBe(
        false,
      );
    });

    ["false", "undefined", "null", "NaN", "''", "0"].forEach((x) => {
      it(`should hide the element if condition is falsy: ${x}`, async () => {
        element = createElementFromHTML(`<div ng-show="${x}"></div>`);
        element = $compile(element)($scope);
        await wait();
        expect(element.classList.contains("ng-hide")).toBeTrue();
      });
    });

    ["'f'", "'0'", "'false'", "'no'", "'n'", "'[]'"].forEach((x) => {
      it(`should show the element if condition is a non-empty string: ${x}`, async () => {
        element = createElementFromHTML(`<div ng-show="${x}"></div>`);
        element = $compile(element)($scope);
        await wait();
        expect(element.classList.contains("ng-hide")).toBeFalse();
      });
    });

    ["[]", "{}"].forEach((x) => {
      it(`should show the element if condition is an object: ${x}`, async () => {
        element = createElementFromHTML(`<div ng-show="${x}"></div>`);
        element = $compile(element)($scope);
        await wait();
        expect(element.classList.contains("ng-hide")).toBeFalse();
      });
    });

    it("does nothing when ng-show attribute is missing", () => {
      const directive = ngShowDirective({
        get: () => undefined,
      } as unknown as ng.InjectorService);
      const node = createElementFromHTML("<div>Visible</div>");

      expect(() =>
        directive.link({} as unknown as ng.Scope, node),
      ).not.toThrow();
    });
  });

  describe("ngHide", () => {
    it("should hide an element", async () => {
      element = createElementFromHTML('<div ng-hide="exp"></div>');
      element = $compile(element)($scope);
      await wait();
      expect(element.classList.contains("ng-hide")).toBeFalse();
      $scope.exp = true;
      await wait();
      expect(element.classList.contains("ng-hide")).toBeTrue();
    });

    it("should support normalized data-ng-hide aliases", async () => {
      element = createElementFromHTML('<div data-ng-hide="exp"></div>');
      element = $compile(element)($scope);
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

      element = createElementFromHTML(
        '<section><button type="button" ng-click="$ctrl.hide()">Hide</button>' +
          '<span ng-hide="$ctrl.hidden">Visible</span></section>',
      );
      element = $compile(element)($scope);
      $scope.$ctrl = new TestController();

      await wait();
      expect(element.querySelector("span").classList.contains("ng-hide")).toBe(
        false,
      );

      element.querySelector("button").click();
      await wait();

      expect(element.querySelector("span").classList.contains("ng-hide")).toBe(
        true,
      );
    });

    ["false", "undefined", "null", "NaN", "''", "0"].forEach((x) => {
      it(`should show the element if condition is falsy: ${x}`, async () => {
        element = createElementFromHTML(`<div ng-hide="${x}"></div>`);
        element = $compile(element)($scope);
        await wait();
        expect(element.classList.contains("ng-hide")).toBeFalse();
      });
    });

    ["'f'", "'0'", "'false'", "'no'", "'n'", "'[]'"].forEach((x) => {
      it(`should hide the element if condition is a non-empty string ${x}`, async () => {
        element = createElementFromHTML(`<div ng-hide="${x}"></div>`);
        element = $compile(element)($scope);
        await wait();
        expect(element.classList.contains("ng-hide")).toBeTrue();
      });
    });

    ["[]", "{}"].forEach((x) => {
      it(`should hide the element if condition is an object ${x}`, async () => {
        element = createElementFromHTML(`<div ng-hide="${x}"></div>`);
        element = $compile(element)($scope);
        await wait();
        expect(element.classList.contains("ng-hide")).toBeTrue();
      });
    });

    it("does nothing when ng-hide attribute is missing", () => {
      const directive = ngHideDirective({
        get: () => undefined,
      } as unknown as ng.InjectorService);
      const node = createElementFromHTML("<div>Visible</div>");

      expect(() =>
        directive.link({} as unknown as ng.Scope, node),
      ).not.toThrow();
    });

    it("uses animate methods for animated ng-hide state changes", () => {
      const animate = {
        removeClass: jasmine.createSpy("removeClass"),
        addClass: jasmine.createSpy("addClass"),
      };

      const directive = ngShowDirective({
        get: () => animate,
      } as unknown as ng.InjectorService);

      const node = createElementFromHTML(
        '<div ng-show="show" data-animate="true"></div>',
      );
      let onChange;

      directive.link(
        {
          $watch: (_expression: string, callback: (value: boolean) => void) => {
            onChange = callback;
            callback(false);
          },
        } as unknown as ng.Scope,
        node,
      );

      expect(animate.addClass).toHaveBeenCalledWith(
        node,
        "ng-hide",
        jasmine.objectContaining({ tempClasses: "ng-hide-animate" }),
      );

      onChange(true);

      expect(animate.removeClass).toHaveBeenCalledWith(
        node,
        "ng-hide",
        jasmine.objectContaining({ tempClasses: "ng-hide-animate" }),
      );
    });

    it("uses animate methods for animated ng-hide elements", () => {
      const animate = {
        removeClass: jasmine.createSpy("removeClass"),
        addClass: jasmine.createSpy("addClass"),
      };

      const directive = ngHideDirective({
        get: () => animate,
      } as unknown as ng.InjectorService);

      const node = createElementFromHTML(
        '<div ng-hide="hide" data-animate="true"></div>',
      );
      let onChange;

      directive.link(
        {
          $watch: (_expression: string, callback: (value: boolean) => void) => {
            onChange = callback;
            callback(false);
          },
        } as unknown as ng.Scope,
        node,
      );

      expect(animate.removeClass).toHaveBeenCalledWith(
        node,
        "ng-hide",
        jasmine.objectContaining({ tempClasses: "ng-hide-animate" }),
      );

      onChange(true);

      expect(animate.addClass).toHaveBeenCalledWith(
        node,
        "ng-hide",
        jasmine.objectContaining({ tempClasses: "ng-hide-animate" }),
      );
    });
  });
});

// describe("ngShow / ngHide animations", () => {
//   let body;
//   let element;
//   let $rootElement;

//   function html(content) {
//     body.append($rootElement);
//     $rootElement.html(content);
//     element = $rootElement.children()[0];
//     return element;
//   }

//   beforeEach(() => {
//     // we need to run animation on attached elements;
//     body = (document.body);
//   });

//   afterEach(() => {
//     dealoc(body);
//     dealoc(element);
//     body[0].removeAttribute("ng-animation-running");
//   });

//   beforeEach(module("ngAnimateMock"));

//   beforeEach(
//     module(
//       ($provide) =>
//         function (_$rootElement_) {
//           $rootElement = _$rootElement_;
//         },
//     ),
//   );

//   describe("ngShow", () => {
//     it("should fire off the $animate.show and $animate.hide animation", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       $scope.on = true;
//       element = $compile(html('<div ng-show="on">data</div>'))($scope);
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("removeClass");
//       expect(item.element.textContent).toBe("data");
//       expect(item.element).toBeShown();

//       $scope.on = false;
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("addClass");
//       expect(item.element.textContent).toBe("data");
//       expect(item.element).toBeHidden();
//     }));

//     it("should apply the temporary `.ng-hide-animate` class to the element", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       $scope.on = false;
//       element = $compile(
//         html('<div class="show-hide" ng-show="on">data</div>'),
//       )($scope);
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toEqual("addClass");
//       expect(item.options.tempClasses).toEqual("ng-hide-animate");

//       $scope.on = true;
//       ;
//       item = $animate.queue.shift();
//       expect(item.event).toEqual("removeClass");
//       expect(item.options.tempClasses).toEqual("ng-hide-animate");
//     }));
//   });

//   describe("ngHide", () => {
//     it("should fire off the $animate.show and $animate.hide animation", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       $scope.off = true;
//       element = $compile(html('<div ng-hide="off">datum</div>'))($scope);
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("addClass");
//       expect(item.element.textContent).toBe("datum");
//       expect(item.element).toBeHidden();

//       $scope.off = false;
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("removeClass");
//       expect(item.element.textContent).toBe("datum");
//       expect(item.element).toBeShown();
//     }));

//     it("should apply the temporary `.ng-hide-animate` class to the element", inject((
//       $compile,
//       $rootScope,
//       $animate,
//     ) => {
//       let item;
//       const $scope = $rootScope.$new();
//       $scope.on = false;
//       element = $compile(
//         html('<div class="show-hide" ng-hide="on">data</div>'),
//       )($scope);
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toEqual("removeClass");
//       expect(item.options.tempClasses).toEqual("ng-hide-animate");

//       $scope.on = true;
//       ;
//       item = $animate.queue.shift();
//       expect(item.event).toEqual("addClass");
//       expect(item.options.tempClasses).toEqual("ng-hide-animate");
//     }));
//   });
// });
