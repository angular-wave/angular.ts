/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

function pointerEvent(type: string, pointerId: number): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    pointerId,
  });
}

describe("ngPointerCapture", () => {
  let $compile: ng.CompileService;

  let $rootScope: ng.RootScopeService;

  let element: Element;

  let app: HTMLElement;

  function compileElement(template: string): Element {
    return $compile(template)($rootScope) as Element;
  }

  beforeEach(async () => {
    app = document.getElementById("app") as HTMLElement;

    dealoc(app);

    const angular = new Angular();

    angular.module("myModule", ["ng"]);

    angular
      .bootstrap(app, ["myModule"])
      .invoke(
        (_$compile_: ng.CompileService, _$rootScope_: ng.RootScopeService) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
        },
      );

    await wait();
  });

  afterEach(() => {
    dealoc(element);
    dealoc(app);
  });

  it("captures a pointer on pointerdown and releases it on pointerup", async () => {
    element = compileElement("<div ng-pointer-capture></div>");
    await wait();

    const setPointerCapture = spyOn(element, "setPointerCapture");
    const releasePointerCapture = spyOn(element, "releasePointerCapture");

    element.dispatchEvent(pointerEvent("pointerdown", 7));

    expect(setPointerCapture).toHaveBeenCalledWith(7);

    element.dispatchEvent(pointerEvent("pointerup", 7));

    expect(releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it("releases captured pointers on pointercancel", async () => {
    element = compileElement("<div ng-pointer-capture></div>");
    await wait();

    spyOn(element, "setPointerCapture");
    const releasePointerCapture = spyOn(element, "releasePointerCapture");

    element.dispatchEvent(pointerEvent("pointerdown", 8));
    element.dispatchEvent(pointerEvent("pointercancel", 8));

    expect(releasePointerCapture).toHaveBeenCalledWith(8);
  });

  it("forgets browser-released pointers on lostpointercapture", async () => {
    element = compileElement("<div ng-pointer-capture></div>");
    await wait();

    spyOn(element, "setPointerCapture");
    const releasePointerCapture = spyOn(element, "releasePointerCapture");

    element.dispatchEvent(pointerEvent("pointerdown", 9));
    element.dispatchEvent(pointerEvent("lostpointercapture", 9));

    $rootScope.$destroy();

    expect(releasePointerCapture).not.toHaveBeenCalled();
  });

  it("releases active captures when the scope is destroyed", async () => {
    element = compileElement("<div ng-pointer-capture></div>");
    await wait();

    spyOn(element, "setPointerCapture");
    const releasePointerCapture = spyOn(element, "releasePointerCapture");

    element.dispatchEvent(pointerEvent("pointerdown", 10));

    $rootScope.$destroy();

    expect(releasePointerCapture).toHaveBeenCalledWith(10);
  });

  it("does not fail when pointer capture is unavailable", async () => {
    element = document.createElement("div");
    element.setAttribute("ng-pointer-capture", "");
    element.setPointerCapture = undefined as never;
    element.releasePointerCapture = undefined as never;

    const linked = $compile(element)($rootScope) as Element;
    await wait();

    expect(() => {
      linked.dispatchEvent(pointerEvent("pointerdown", 11));
    }).not.toThrow();
  });
});
