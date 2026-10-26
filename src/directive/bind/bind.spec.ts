/// <reference types="jasmine" />
import {
  callable,
  defined,
  htmlNode,
  instance,
} from "../../shared/test-fixtures.spec.ts";

import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import { ngBindHtmlDirective } from "./bind.ts";

describe("ng-bind", () => {
  let $rootScope: FixtureScope;

  let $compile: ng.CompileService;
  let $parse: ng.ParseService;

  let element: HTMLElement;

  beforeEach(() => {
    dealoc(defined(document.getElementById("app")));
    window.angular = new Angular();
    window.angular
      .createModule("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception: unknown) => {
          throw new Error(instance(exception, Error).message);
        };
      });
    const injector = window.angular.bootstrap(
      defined(document.getElementById("app")),
      ["myModule"],
    );
    $parse = injector.get("$parse");
    injector.invoke([
      "$rootScope",
      "$compile",

      (_$rootScope_: FixtureScope, _$compile_: ng.CompileService) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
      },
    ]);
  });

  describe("ngBind", () => {
    it("should set text", async () => {
      element = htmlNode($compile('<div ng-bind="a"></div>')($rootScope));
      await wait();
      expect(element.textContent).toEqual("");
      $rootScope.a = "misko";
      await wait();
      expect(element.textContent).toEqual("misko");
    });

    it("should support normalized data-ng-bind aliases", async () => {
      element = htmlNode($compile('<div data-ng-bind="a"></div>')($rootScope));
      $rootScope.a = "misko";
      await wait();
      expect(element.textContent).toEqual("misko");
    });

    it("should set text to blank if undefined", async () => {
      element = htmlNode($compile('<div ng-bind="a"></div>')($rootScope));
      $rootScope.a = "misko";
      await wait();
      expect(element.textContent).toEqual("misko");
      $rootScope.a = undefined;
      await wait();
      expect(element.textContent).toEqual("");
      $rootScope.a = null;
      await wait();
      expect(element.textContent).toEqual("");
    });

    it("should suppress rendering of falsy values", async () => {
      element = htmlNode(
        $compile(
          '<div><span ng-bind="null"></span>' +
            '<span ng-bind="undefined"></span>' +
            "<span ng-bind=\"''\"></span>-" +
            '<span ng-bind="0"></span>' +
            '<span ng-bind="false"></span>' +
            "</div>",
        )($rootScope),
      );
      await wait();
      expect(element.textContent).toEqual("-0false");
    });

    (
      [
        [{ a: 1 }, '{"a":1}'],
        [true, "true"],
        [false, "false"],
      ] satisfies [unknown, string][]
    ).forEach((prop) => {
      it(`should jsonify $prop ${prop}`, async () => {
        $rootScope.value = prop[0];
        element = htmlNode($compile('<div ng-bind="value"></div>')($rootScope));
        await wait();
        expect(element.textContent).toEqual(prop[1]);
      });
    });

    it("should use custom toString when present", async () => {
      $rootScope.value = {
        toString() {
          return "foo";
        },
      };
      element = htmlNode($compile('<div ng-bind="value"></div>')($rootScope));
      await wait();
      expect(element.textContent).toEqual("foo");
    });

    it("should NOT use toString on array objects", async () => {
      $rootScope.value = [];
      element = htmlNode($compile('<div ng-bind="value"></div>')($rootScope));
      await wait();
      expect(element.textContent).toEqual("[]");
    });

    it("should render Date objects using JSON serialization in ng-bind", async () => {
      const date = new Date(2014, 10, 10, 0, 0, 0);

      $rootScope.value = date;

      element = htmlNode($compile('<div ng-bind="value"></div>')($rootScope));
      await wait();

      expect(element.textContent).toBe(JSON.stringify(date));
    });

    it("should support `data-lazy` attribute", async () => {
      $rootScope.value = 0;
      await wait();
      element = htmlNode(
        $compile('<div ng-bind="value" data-lazy="true">Content</div>')(
          $rootScope,
        ),
      );
      expect(element.textContent).toEqual("Content");

      $rootScope.value = 2;
      await wait();
      expect(element.textContent).toEqual("2");
    });

    it("should support conditional fallback expressions", async () => {
      $rootScope.vm = {};
      element = htmlNode(
        $compile(
          `<div ng-bind="vm.caseItem ? vm.caseItem.objectAddress : 'Loading case'"></div>`,
        )($rootScope),
      );

      await wait();
      expect(element.textContent).toEqual("Loading case");

      $rootScope.vm.caseItem = { objectAddress: "Main St" };
      await wait();
      expect(element.textContent).toEqual("Main St");

      $rootScope.vm.caseItem.objectAddress = "Broadway";
      await wait();
      expect(element.textContent).toEqual("Broadway");

      $rootScope.vm.caseItem = null;
      await wait();
      expect(element.textContent).toEqual("Loading case");
    });

    it("should update when a controller instance method changes a bound value", async () => {
      class TestController {
        label = "before";

        rename() {
          this.label = "after";
        }
      }

      element = htmlNode(
        $compile(
          '<section><button type="button" ng-click="$ctrl.rename()">Rename</button>' +
            '<span ng-bind="$ctrl.label"></span></section>',
        )($rootScope),
      );
      $rootScope.$ctrl = new TestController();

      await wait();
      expect(defined(element.querySelector("span")).textContent).toEqual(
        "before",
      );

      defined(element.querySelector("button")).click();
      await wait();

      expect(defined(element.querySelector("span")).textContent).toEqual(
        "after",
      );
    });
  });

  describe("ngBindTemplate", () => {
    it("should ngBindTemplate", async () => {
      element = htmlNode(
        $compile('<div ng-bind-template="Hello {{name}}!"></div>')($rootScope),
      );
      $rootScope.name = "Misko";
      await wait();
      expect(element.textContent).toEqual("Hello Misko!");
    });

    it("should render object as JSON ignore $$", async () => {
      element = htmlNode(
        $compile('<pre>{{ {key:"value", $$key:"hide"}  }}</pre>')($rootScope),
      );
      await wait();
      expect(JSON.parse(element.textContent)).toEqual({ key: "value" });
    });

    it("should support logical fallback expressions in interpolation", async () => {
      $rootScope.vm = { caseItem: {} };
      $rootScope.event = {};
      element = htmlNode(
        $compile(
          `<div ng-bind-template="{{vm.caseItem.customerName || 'Unknown'}} / {{event.fromStatus || 'none'}}"></div>`,
        )($rootScope),
      );

      await wait();
      expect(element.textContent).toEqual("Unknown / none");

      defined($rootScope.vm.caseItem).customerName = "Ada";
      $rootScope.event.fromStatus = "open";
      await wait();
      expect(element.textContent).toEqual("Ada / open");

      $rootScope.vm.caseItem = { customerName: "" };
      $rootScope.event.fromStatus = "";
      await wait();
      expect(element.textContent).toEqual("Unknown / none");
    });
  });

  describe("ngBindHtml", () => {
    it("should parse the expression during compile", () => {
      const parse = jasmine
        .createSpy<ng.ParseService>("$parse")
        .and.returnValue($parse("html"));

      const directive = ngBindHtmlDirective(parse, $compile);
      const element = document.createElement("div");

      element.setAttribute("ng-bind-html", "html");

      callable(directive, "compile");
      const link = defined(directive.compile)(element);

      expect(parse).toHaveBeenCalledWith("html");
      expect(link).toEqual(jasmine.any(Function));
    });

    it("should create a link function that writes watched html", () => {
      const directive = ngBindHtmlDirective($parse, $compile);
      spyOn($compile, "_prepareHtml").and.callFake((html) => {
        if (typeof html !== "string") throw new TypeError("Expected HTML");
        return html;
      });
      const element = document.createElement("div");

      element.setAttribute("ng-bind-html", "html");

      callable(directive, "compile");
      const link = defined(directive.compile)(element);

      spyOn($rootScope, "watch").and.callFake((_expr, listener) => {
        if (typeof listener !== "function")
          throw new TypeError("Expected listener");
        listener("<span>trusted</span>", $rootScope._target);
        return undefined;
      });
      if (typeof link !== "function")
        throw new TypeError("Expected link function");
      link($rootScope, element, () => undefined);

      expect($rootScope.watch).toHaveBeenCalledWith(
        "html",
        jasmine.any(Function),
        false,
        true,
      );
      expect(element.innerHTML).toBe("<span>trusted</span>");
    });

    it("should complain about accidental use of interpolation", async () => {
      expect(() => {
        $compile('<div ng-bind-html="{{myHtml}}"></div>');
      }).toThrowError(/syntax/);
    });
  });
});

interface FixtureScope extends ng.Scope {
  "new"(childInstance?: ng.Scope): FixtureScope;
  newIsolate(childInstance?: ng.Scope): FixtureScope;
  a?: string | undefined | null;
  value?: unknown;
  vm?: { caseItem?: null | { objectAddress?: string; customerName?: string } };
  name?: string;
  event?: { fromStatus?: string };
}
