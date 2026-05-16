// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { createRealtimeSwapHandler } from "./swap.ts";

describe("createRealtimeSwapHandler", () => {
  let app: HTMLElement;
  let $compile: ng.CompileService;
  let $rootScope: ng.Scope;
  let $attributes: ng.AttributesService;
  let warnSpy: jasmine.Spy;

  beforeEach(() => {
    app = document.getElementById("app") as HTMLElement;
    dealoc(app);
    app.innerHTML = '<section id="target">old</section><div id="host"></div>';

    const angular = new Angular();

    angular
      .bootstrap(app, [])
      .invoke((_$compile_, _$rootScope_, _$attributes_, _$log_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $attributes = _$attributes_;
        warnSpy = spyOn(_$log_, "warn");
      });
  });

  afterEach(() => {
    delete (document as any).startViewTransition;
    dealoc(app);
  });

  it("reads data-target from the directive host element", () => {
    const host = document.getElementById("host") as HTMLElement;

    host.setAttribute("data-target", "#target");

    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
      scope: $rootScope,
      $attributes,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>new</span>", "innerHTML")).toBeTrue();
    expect(document.getElementById("target")!.innerHTML).toBe(
      "<span>new</span>",
    );
  });

  it("reads data-view-transition from the directive host element", () => {
    const host = document.getElementById("host") as HTMLElement;
    const startViewTransition = jasmine
      .createSpy("startViewTransition")
      .and.callFake((callback: () => void) => callback());

    (document as any).startViewTransition = startViewTransition;
    host.setAttribute("data-view-transition", "");

    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
      scope: $rootScope,
      $attributes,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>new</span>", "innerHTML")).toBeTrue();
    expect(startViewTransition).toHaveBeenCalled();
    expect(host.innerHTML).toBe("<span>new</span>");
  });
});
