// @ts-nocheck
/// <reference types="jasmine" />
import {
  createElementFromHTML,
  dealoc,
  getCacheData,
  setCacheData,
} from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { wait } from "../../shared/test-utils.ts";
import { ngIfDirective } from "./if.ts";

describe("ngIf", () => {
  describe("basic", () => {
    let $scope;

    let $compile;

    let element;

    let compileRegistry;

    let $rootScope;

    let injector;

    let angular;

    beforeEach(function () {
      dealoc(document.getElementById("app"));
      angular = window.angular = new Angular();
      compileRegistry = angular._composition.compileRegistry;
      window.angular.module("test", []);
      injector = window.angular.bootstrap(document.getElementById("app"), [
        "test",
      ]);
      injector.invoke([
        "$rootScope",
        "$compile",
        (_$rootScope_, _$compile_) => {
          $rootScope = _$rootScope_;
          $scope = $rootScope.$new();
          $compile = _$compile_;
          element = $compile("<div></div>")($scope);
        },
      ]);
    });

    function makeIf() {
      element = createElementFromHTML("<div></div>");
      Array.from(arguments).forEach((expr) => {
        element.append(
          createElementFromHTML(
            `<div class="my-class" ng-if="${expr}"><div>Hi</div></div>`,
          ),
        );
      });
      const res = $compile(element);

      element = res($scope);
    }

    it("removes untracked element nodes supplied by a manual transclusion", () => {
      const directive = ngIfDirective(injector);
      const template = document.createElement("div");
      const container = document.createElement("div");
      const anchor = document.createComment("ngIf");
      const rendered = document.createElement("span");
      const childScope = { $destroy: jasmine.createSpy("$destroy") };
      let listener;
      const manualScope = {
        $watch(_expression, callback) {
          listener = callback;
        },
      };

      template.setAttribute("ng-if", "visible");
      container.append(anchor);
      const link = directive.compile(template);

      link(manualScope, anchor, (callback) => {
        callback(rendered, childScope);

        return rendered;
      });
      listener(true);
      expect(container.contains(rendered)).toBeTrue();

      listener(false);
      expect(container.contains(rendered)).toBeFalse();
      expect(childScope.$destroy).toHaveBeenCalledOnceWith();
    });

    it("should immediately remove the element and replace it with comment node if condition is falsy", async () => {
      makeIf("false", "undefined", "null", "NaN", "''", "0");
      await wait();
      Array.from(element.children).forEach((node) => {
        expect(node.nodeType).toBe(Node.COMMENT_NODE);
      });
      expect().toBe();
    });

    it("should leave the element if condition is true", async () => {
      makeIf("true");
      await wait();
      expect(element.children.length).toBe(1);
    });

    it("should read data-ng-if from the host element", async () => {
      element = createElementFromHTML(
        '<div><span class="visible" data-ng-if="visible">Visible</span></div>',
      );
      $compile(element)($scope);

      $scope.visible = true;
      await wait();
      expect(element.querySelector(".visible")!.textContent).toBe("Visible");

      $scope.visible = false;
      await wait();
      expect(element.querySelector(".visible")).toBeNull();
    });

    it("should leave the element if the condition is a non-empty string", async () => {
      makeIf("'f'", "'0'", "'false'", "'no'", "'n'", "'[]'");
      await wait();
      expect(element.children.length).toBe(6);
    });

    it("should leave the element if the condition is an object", async () => {
      makeIf("[]", "{}");
      await wait();
      expect(element.children.length).toBe(2);
    });

    it("should react to changes on a property of an object", async () => {
      $scope.a = {
        b: true,
      };
      makeIf("a.b");
      await wait();
      expect(element.children.length).toBe(1);

      $scope.a.b = false;
      await wait();
      expect(element.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
    });

    it("should update when a controller instance method changes the condition", async () => {
      class TestController {
        visible = true;

        hide() {
          this.visible = false;
        }
      }

      element = $compile(
        '<section><button type="button" ng-click="$ctrl.hide()">Hide</button>' +
          '<span ng-if="$ctrl.visible">Visible</span></section>',
      )($scope);
      $scope.$ctrl = new TestController();

      await wait();
      expect(element.querySelector("span").textContent).toBe("Visible");

      element.querySelector("button").click();
      await wait();

      expect(element.querySelector("span")).toBeNull();
    });

    it("should react to changes on a property of a nested object", async () => {
      $scope.a = {
        b: {
          c: true,
        },
      };
      makeIf("a.b.c");
      await wait();
      expect(element.children.length).toBe(1);

      $scope.a.b.c = false;
      await wait();
      expect(element.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);

      $scope.a.b.c = true;
      await wait();
      expect(element.children.length).toBe(1);
    });

    it("should not add the element twice if the condition goes from true to true", async () => {
      $scope.hello = "true1";
      makeIf("hello");
      await wait();
      expect(element.children.length).toBe(1);
      $scope.hello = "true2";
      await wait();
      expect(element.children.length).toBe(1);
    });

    it("should not recreate the element if the condition goes from true to true", async () => {
      $scope.hello = "true1";
      makeIf("hello");
      await wait();
      expect(element.children.length).toBe(1);
      setCacheData(element.children[0], "flag", true);
      $scope.hello = "true2";
      await wait();
      expect(element.children.length).toBe(1);
      expect(getCacheData(element.children[0], "flag")).toBe(true);
    });

    it("should create then remove the element if condition changes", async () => {
      $scope.hello = true;
      makeIf("hello");
      await wait();
      expect(element.children.length).toBe(1);
      $scope.hello = false;
      await wait();
      expect(element.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
    });

    it("should create a new scope every time the expression evaluates to true", async () => {
      $scope.value = true;
      await wait();
      element.append(
        createElementFromHTML(
          '<div ng-if="value"><span ng-init="value=false"></span></div>',
        ),
      );
      $compile(element)($scope);
      await wait();
      expect(element.children.length).toBe(1);
    });

    it("should destroy the child scope every time the expression evaluates to false", async () => {
      $scope.value = true;
      element.append(createElementFromHTML('<div ng-if="value"></div>'));
      $compile(element)($scope);
      await wait();
      const childScope = $scope.$handler._children[0];

      let destroyed = false;

      childScope.$on("$destroy", () => {
        destroyed = true;
      });

      $scope.value = false;

      await wait();

      expect(destroyed).toBe(true);
    });

    it("should play nice with other elements beside it", async () => {
      $scope.values = [1, 2, 3, 4];

      element.innerHTML =
        '<div ng-repeat="i in values">1</div>' +
        '<div ng-if="values.length==4">1</div>' +
        '<div ng-repeat="i in values">1</div>';

      $compile(element)($scope);
      await wait();
      expect(element.children.length).toBe(9);

      $scope.values.splice(0, 1);
      await wait();
      expect(element.children.length).toBe(6);

      $scope.values.push(1);
      await wait();
      expect(element.children.length).toBe(9);
    });

    it("should play nice with ngInclude on the same element", (done) => {
      element.innerHTML = `<div><div ng-if="value=='first'" ng-include="'/mock/hello'"></div></div>`;

      window.angular.module("myModule", []).run([
        "$rootScope",
        ($rootScope) => {
          $rootScope.value = "first";
        },
      ]);
      injector = angular.bootstrap(element, ["myModule"]);

      setTimeout(() => {
        expect(element.textContent).toBe("Hello");
        done();
      }, 300);
    });

    it("should restore the element to its compiled state", async () => {
      $scope.value = true;
      makeIf("value");
      await wait();

      expect(element.children.length).toBe(1);
      element.children[0].classList.remove("my-class");
      expect(element.children[0].className).not.toContain("my-class");

      $scope.value = false;
      await wait();

      expect(element.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);

      $scope.value = true;
      await wait();
      expect(element.children.length).toBe(1);
      expect(element.children[0].className).toContain("my-class");
    });

    it("should work when combined with an ASYNC template that loads after the first digest", async () => {
      compileRegistry.directive("test", () => ({
        templateUrl: "/public/test.html",
      }));

      element.innerHTML = '<div ng-if="show" test></div>';
      $compile(element)($rootScope);
      $rootScope.show = true;
      await wait();
      expect(element.textContent).toBe("");

      await wait(100);

      expect(element.textContent.trim()).toBe("hello");

      $rootScope.show = false;
      await wait();
      expect(element.textContent).toBe("");
    });

    describe("and transcludes", () => {
      it("should allow access to directive controller from children when used in a replace template", async () => {
        let controller;

        const { directive } = compileRegistry;

        directive("template", () => ({
          template: '<div ng-if="true"><span test></span></div>',
          replace: true,
          controller() {
            this.flag = true;
          },
        }));
        directive("test", () => ({
          require: "^template",
          link(scope, el, ctrl) {
            controller = ctrl;
          },
        }));
        $compile("<div><div template></div></div>")($rootScope);
        await wait();
        expect(controller.flag).toBe(true);
      });

      it("should use the correct transcluded scope", async () => {
        compileRegistry.directive("iso", () => ({
          link(scope) {
            scope.val = "value in iso scope";
          },
          restrict: "E",
          transclude: true,
          template:
            '<div ng-if="true">val={{val}}-<div ng-transclude></div></div>',
          scope: {},
        }));
        $rootScope.val = "transcluded content";
        const element = $compile('<iso><span ng-bind="val"></span></iso>')(
          $rootScope,
        );

        await wait();
        expect(element.textContent.trim()).toEqual(
          "val=value in iso scope-transcluded content",
        );
      });
    });
  });

  it("returns a no-op link when ng-if expression is missing", () => {
    const directive = ngIfDirective({
      get: () => undefined,
    } as unknown as ng.InjectorService);
    const link = directive.compile(document.createElement("div"));

    expect(typeof link).toBe("function");
    expect(link({}, document.createElement("div"), undefined)).toBeUndefined();
  });

  it("returns early when transclusion is unavailable", () => {
    const directive = ngIfDirective({
      get: () => undefined,
    } as unknown as ng.InjectorService);
    const element = createElementFromHTML('<div ng-if="true">Shown</div>');
    const link = directive.compile(element);

    expect(
      link(
        {
          $watch: () => {},
        } as unknown as ng.Scope,
        element,
        undefined,
      ),
    ).toBeUndefined();
  });

  it("uses animate.enter for animated nodes when condition becomes true", async () => {
    const root = document.createElement("div");
    root.id = "if-animate-root";
    document.body.append(root);

    const localAngular = new Angular();
    const animate = {
      enter: jasmine.createSpy("enter").and.callFake(() => ({
        done: jasmine.createSpy("done"),
      })),
      leave: jasmine.createSpy("leave").and.callFake(() => ({
        done: jasmine
          .createSpy("done")
          .and.callFake((callback) => callback(true)),
      })),
    };

    localAngular.module("if-animate-mock-app", []).value("$animate", animate);
    const localInjector = localAngular.bootstrap(root, ["if-animate-mock-app"]);
    const localCompile = localInjector.get("$compile");
    const localRootScope = localInjector.get("$rootScope");

    localRootScope.shown = false;

    const element = localCompile(
      '<div ng-if="shown" data-animate="true">Content</div>',
    )(localRootScope);

    await wait();
    expect(animate.enter).not.toHaveBeenCalled();

    localRootScope.shown = true;
    await wait();
    expect(animate.enter).toHaveBeenCalledTimes(1);

    localRootScope.shown = false;
    await wait();
    expect(animate.leave).toHaveBeenCalledTimes(1);

    localRootScope.$destroy();
    root.remove();
  });

  it("removes non-element transclusion nodes without animation", () => {
    const directive = ngIfDirective({
      get: () => undefined,
    } as unknown as ng.InjectorService);
    const template = createElementFromHTML('<div ng-if="shown"></div>');
    const marker = document.createElement("span");
    const parent = document.createElement("div");
    const text = document.createTextNode("transcluded");
    const childScope = { $destroy: jasmine.createSpy("$destroy") };
    let listener;

    parent.appendChild(marker);
    directive.compile(template)(
      {
        $watch(_expression, callback) {
          listener = callback;
        },
      },
      marker,
      (attach) => attach([text], childScope),
    );

    listener(true);
    expect(parent.textContent).toBe("transcluded");

    listener(false);

    expect(parent.textContent).toBe("");
    expect(childScope.$destroy).toHaveBeenCalledTimes(1);
  });

  it("retains an animated block when leave is cancelled", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const animate = {
      enter: () => ({ done: () => undefined }),
      leave: () => ({
        done(callback) {
          callback(false);
        },
      }),
    };
    const angular = new Angular();

    angular.module("if-cancel-animation", []).value("$animate", animate);
    const injector = angular.bootstrap(root, ["if-cancel-animation"]);
    const scope = injector.get("$rootScope");
    const element = injector.get("$compile")(
      '<div ng-if="shown" data-animate="true">Content</div>',
    )(scope);

    scope.shown = true;
    await wait();
    scope.shown = false;
    await wait();

    expect(element).toBeDefined();
    angular._composition.destroy();
    root.remove();
  });
});
