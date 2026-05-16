// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngTransclude", () => {
  let $compile;
  let $compileProvider;
  let $rootScope;
  let element;

  beforeEach(() => {
    const app = document.getElementById("app") as HTMLElement;

    dealoc(app);
    window.angular = new Angular();
    window.angular.module("test", []);

    const injector = window.angular.bootstrap(app, [
      "test",
      function (_$compileProvider_) {
        $compileProvider = _$compileProvider_;
      },
    ]);

    injector.invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should read data-ng-transclude from the host element", async () => {
    $compileProvider.directive("slotHost", () => ({
      restrict: "E",
      scope: {},
      transclude: {
        itemSlot: "item",
      },
      template:
        '<div class="item" data-ng-transclude="itemSlot"></div>' +
        '<div class="other" data-ng-transclude></div>',
    }));

    element = $compile(
      "<slot-host>" +
        "<item>selected</item>" +
        "<span>default</span>" +
        "</slot-host>",
    )($rootScope);

    await wait();

    expect(element.querySelector(".item")!.textContent).toBe("selected");
    expect(element.querySelector(".other")!.textContent).toBe("default");
  });

  it("should read data-ng-transclude-slot from ng-transclude elements", async () => {
    $compileProvider.directive("slotHost", () => ({
      restrict: "E",
      scope: {},
      transclude: {
        itemSlot: "item",
      },
      template:
        '<ng-transclude class="item" data-ng-transclude-slot="itemSlot"></ng-transclude>' +
        '<ng-transclude class="other"></ng-transclude>',
    }));

    element = $compile(
      "<slot-host>" +
        "<item>selected</item>" +
        "<span>default</span>" +
        "</slot-host>",
    )($rootScope);

    await wait();

    expect(element.querySelector(".item")!.textContent).toBe("selected");
    expect(element.querySelector(".other")!.textContent).toBe("default");
  });
});
