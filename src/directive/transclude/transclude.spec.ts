/// <reference types="jasmine" />
import { defined, htmlNode } from "../../shared/test-fixtures.spec.ts";
import type { CompileRegistry } from "../../core/compile/compile.ts";

import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngTransclude", () => {
  let $compile: ng.CompileService;
  let compileRegistry: CompileRegistry;
  let $rootScope: ng.Scope;
  let element: HTMLElement;

  beforeEach(() => {
    const app = defined(defined(document.getElementById("app")));

    dealoc(app);
    window.angular = new Angular();
    compileRegistry = window.angular._composition.compileRegistry;
    window.angular.createModule("test", []);

    const injector = window.angular.bootstrap(app, ["test"]);

    injector.invoke([
      "$compile",
      "$rootScope",
      (_$compile_: ng.CompileService, _$rootScope_: ng.Scope) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should read data-ng-transclude from the host element", async () => {
    compileRegistry.directive("slotHost", () => ({
      restrict: "E",
      scope: {},
      transclude: {
        itemSlot: "item",
      },
      template:
        '<div class="item" data-ng-transclude="itemSlot"></div>' +
        '<div class="other" data-ng-transclude></div>',
    }));

    element = htmlNode(
      $compile(
        "<slot-host>" +
          "<item>selected</item>" +
          "<span>default</span>" +
          "</slot-host>",
      )($rootScope),
    );

    await wait();

    expect(defined(element.querySelector(".item")).textContent).toBe(
      "selected",
    );
    expect(defined(element.querySelector(".other")).textContent).toBe(
      "default",
    );
  });

  it("should read data-ng-transclude-slot from ng-transclude elements", async () => {
    compileRegistry.directive("slotHost", () => ({
      restrict: "E",
      scope: {},
      transclude: {
        itemSlot: "item",
      },
      template:
        '<ng-transclude class="item" data-ng-transclude-slot="itemSlot"></ng-transclude>' +
        '<ng-transclude class="other"></ng-transclude>',
    }));

    element = htmlNode(
      $compile(
        "<slot-host>" +
          "<item>selected</item>" +
          "<span>default</span>" +
          "</slot-host>",
      )($rootScope),
    );

    await wait();

    expect(defined(element.querySelector(".item")).textContent).toBe(
      "selected",
    );
    expect(defined(element.querySelector(".other")).textContent).toBe(
      "default",
    );
  });
  it("destroys a transcluded scope when its last node is destroyed", async () => {
    let transcludedScope: ng.Scope | undefined;

    compileRegistry.directive("captureTranscludedScope", () => ({
      link(scope: ng.Scope) {
        transcludedScope = scope;
      },
    }));
    compileRegistry.directive("destroySlotHost", () => ({
      restrict: "E",
      transclude: true,
      template: "<div ng-transclude></div>",
    }));

    element = htmlNode(
      $compile(
        "<destroy-slot-host>" +
          "<span capture-transcluded-scope>content</span>" +
          "</destroy-slot-host>",
      )($rootScope),
    );
    await wait();

    const destroy = spyOn(
      defined<ng.Scope>(transcludedScope),
      "destroy",
    ).and.callThrough();

    defined(element.querySelector("span")).dispatchEvent(new Event("$destroy"));

    expect(destroy).toHaveBeenCalled();
  });
});
