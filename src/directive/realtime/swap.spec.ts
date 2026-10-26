/// <reference types="jasmine" />
import { AnimationHandle } from "../../animations/animate.ts";
import type { SwapMode } from "./protocol.ts";
import { defined, elementNode } from "../../shared/test-fixtures.spec.ts";
import type { CompiledFragmentRecord } from "../../core/compile/incremental-fragment.ts";

import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { getCompiledFragmentRecord } from "../../core/compile/incremental-fragment.ts";
import { createRealtimeSwapHandler } from "./swap.ts";

describe("createRealtimeSwapHandler", () => {
  let app: HTMLElement;
  let $compile: ng.CompileService;
  let $rootScope: ng.Scope;
  let warnSpy: jasmine.Spy<ng.LogService["warn"]>;
  let $log: ng.LogService;
  let $animate: ng.AnimateService;
  let angular: Angular;

  function animateFixture(overrides: Partial<ng.AnimateService>) {
    return Object.assign($animate, overrides);
  }

  beforeEach(() => {
    app = defined(document.getElementById("app"));
    dealoc(app);
    app.innerHTML = '<section id="target">old</section><div id="host"></div>';

    angular = new Angular();

    angular.bootstrap(app, []).invoke([
      "$compile",
      "$rootScope",
      "$log",
      "$animate",
      (
        _$compile_: ng.CompileService,
        _$rootScope_: ng.Scope,
        _$log_: ng.LogService,
        _$animate_: ng.AnimateService,
      ) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $log = _$log_;
        $animate = _$animate_;
        warnSpy = spyOn(_$log_, "warn");
      },
    ]);
  });

  afterEach(() => {
    dealoc(app);
    angular._composition.destroy();
  });

  it("reads data-target from the directive host element", () => {
    const host = defined(document.getElementById("host"));

    host.setAttribute("data-target", "#target");

    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>new</span>", "innerHTML")).toBeTrue();
    expect(defined(document.getElementById("target")).innerHTML).toBe(
      "<span>new</span>",
    );
  });

  it("does not treat the native target attribute as a swap selector", () => {
    const host = defined(document.getElementById("host"));

    host.setAttribute("target", "#target");

    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>new</span>", "innerHTML")).toBeTrue();
    expect(host.innerHTML).toBe("<span>new</span>");
    expect(defined(document.getElementById("target")).textContent).toBe("old");
  });

  it("reads data-view-transition from the directive host element", () => {
    const host = defined(document.getElementById("host"));
    const startViewTransition = jasmine
      .createSpy("startViewTransition")
      .and.callFake((callback: () => void) => {
        callback();
        return nativeTransition();
      });

    spyOn(document, "startViewTransition").and.callFake((update) => {
      startViewTransition(() => {
        transitionUpdate(update)?.();
      });
      return nativeTransition();
    });
    host.setAttribute("data-view-transition", "");

    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>new</span>", "innerHTML")).toBeTrue();
    expect(startViewTransition).toHaveBeenCalled();
    expect(host.innerHTML).toBe("<span>new</span>");
  });

  it("disposes replaced innerHTML fragments before installing the next fragment", () => {
    const host = defined(document.getElementById("host"));
    const scope = $rootScope.new();
    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope,
      element: host,
      logPrefix: "test",
    });

    expect(swap('<span id="first">first</span>', "innerHTML")).toBeTrue();

    const first = defined(host.querySelector("#first"));
    const firstRecord = getCompiledFragmentRecord(first);

    expect(firstRecord).toBeDefined();

    expect(swap('<span id="second">second</span>', "innerHTML")).toBeTrue();

    const second = defined(host.querySelector("#second"));
    const secondRecord = getCompiledFragmentRecord(second);

    expect(firstRecord?.disposed).toBeTrue();
    expect(getCompiledFragmentRecord(first)).toBeUndefined();
    expect(secondRecord).toBeDefined();
    expect(secondRecord?.disposed).toBeFalse();
    expect(host.textContent).toBe("second");
  });

  it("disposes appended stream fragments when the directive scope is destroyed", () => {
    const host = defined(document.getElementById("host"));
    const scope = $rootScope.new();
    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope,
      element: host,
      logPrefix: "test",
    });

    expect(swap('<span id="chunk-a">A</span>', "beforeend")).toBeTrue();
    expect(swap('<span id="chunk-b">B</span>', "beforeend")).toBeTrue();

    const first = defined(host.querySelector("#chunk-a"));
    const second = defined(host.querySelector("#chunk-b"));
    const firstRecord = getCompiledFragmentRecord(first);
    const secondRecord = getCompiledFragmentRecord(second);

    expect(firstRecord).toBeDefined();
    expect(secondRecord).toBeDefined();

    scope.destroy();

    expect(firstRecord?.disposed).toBeTrue();
    expect(secondRecord?.disposed).toBeTrue();
    expect(host.querySelector("#chunk-a")).toBeNull();
    expect(host.querySelector("#chunk-b")).toBeNull();
  });

  it("disposes a compiled target fragment when deleting the target", () => {
    const host = defined(document.getElementById("host"));
    const target = elementNode(
      $compile('<span id="compiled-target">old</span>')($rootScope),
    );
    const targetRecord = getCompiledFragmentRecord(target);

    app.appendChild(target);

    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(targetRecord).toBeDefined();
    expect(swap("", "delete", { targetSelector: "#compiled-target" })).toBe(
      true,
    );
    expect(targetRecord?.disposed).toBeTrue();
    expect(document.getElementById("compiled-target")).toBeNull();
  });

  it("disposes compiled children when replacing with text content", () => {
    const host = defined(document.getElementById("host"));
    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(
      swap('<span id="compiled-child">old</span>', "innerHTML"),
    ).toBeTrue();

    const child = defined(host.querySelector("#compiled-child"));
    const childRecord = getCompiledFragmentRecord(child);

    expect(childRecord).toBeDefined();
    expect(swap("new text", "textContent")).toBeTrue();
    expect(childRecord?.disposed).toBeTrue();
    expect(host.textContent).toBe("new text");
  });

  it("falls back to plain replacement for mixed compiled fragments", () => {
    const host = defined(document.getElementById("host"));
    const compileMixed = () => () => {
      const fragment = document.createDocumentFragment();

      fragment.appendChild(
        elementNode($compile('<span id="mixed-a">A</span>')($rootScope)),
      );
      fragment.appendChild(
        elementNode($compile('<span id="mixed-b">B</span>')($rootScope)),
      );

      return fragment;
    };
    const swap = createRealtimeSwapHandler({
      $compile: Object.assign(compileMixed, $compile),
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<ignored></ignored>", "innerHTML")).toBeTrue();
    expect(host.textContent).toBe("AB");
    expect(host.querySelector("#mixed-a")).toBeDefined();
    expect(host.querySelector("#mixed-b")).toBeDefined();
  });

  it("falls back to plain replacement when incoming nodes are untracked", () => {
    const host = defined(document.getElementById("host"));
    const compilePlain = () => () => {
      const span = document.createElement("span");

      span.id = "plain-node";
      span.textContent = "plain";

      return span;
    };
    const swap = createRealtimeSwapHandler({
      $compile: Object.assign(compilePlain, $compile),
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<ignored></ignored>", "innerHTML")).toBeTrue();
    expect(
      getCompiledFragmentRecord(defined(host.querySelector("#plain-node"))),
    ).toBe(undefined);
    expect(host.textContent).toBe("plain");
  });

  it("disposes compiled payloads when their target is missing", () => {
    const host = defined(document.getElementById("host"));
    let compiledNode: Element | undefined;
    let compiledRecord: CompiledFragmentRecord | undefined;
    const compile: ng.CompileService = Object.assign(
      (html: Parameters<ng.CompileService>[0]) => {
        const link = $compile(html);

        return (scope: ng.Scope) => {
          compiledNode = elementNode(link(scope));
          compiledRecord = getCompiledFragmentRecord(compiledNode);

          return compiledNode;
        };
      },
      $compile,
    );
    const swap = createRealtimeSwapHandler({
      $compile: Object.assign(compile, $compile),
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(
      swap('<span id="orphan">orphan</span>', "innerHTML", {
        targetSelector: "#missing-target",
      }),
    ).toBeFalse();

    expect(compiledNode).toBeDefined();
    expect(compiledRecord?.disposed).toBeTrue();
    expect(getCompiledFragmentRecord(defined(compiledNode))).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("does not commit an animated replacement after scope destruction", () => {
    const host = defined(document.getElementById("host"));
    const target = defined(document.getElementById("target"));
    const scope = $rootScope.new();
    let finishLeave: ((completed: boolean) => void) | undefined;
    const leaveHandle = new AnimationHandle(new Promise<void>(() => {}));
    spyOn(leaveHandle, "cancel").and.callThrough();
    spyOn(leaveHandle, "done").and.callFake((callback) => {
      finishLeave = callback;
    });
    const animate = animateFixture({
      enter: jasmine
        .createSpy<ng.AnimateService["enter"]>("enter")
        .and.returnValue(immediateAnimation(true)),
      leave: jasmine
        .createSpy<ng.AnimateService["leave"]>("leave")
        .and.returnValue(leaveHandle),
    });

    host.setAttribute("data-animate", "true");

    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: () => animate,
      scope,
      element: host,
      logPrefix: "test",
    });

    expect(
      swap('<span id="late-payload">late</span>', "outerHTML", {
        targetSelector: "#target",
      }),
    ).toBeTrue();

    scope.destroy();
    finishLeave?.(true);

    expect(leaveHandle.cancel).toHaveBeenCalled();
    expect(target.parentNode).toBe(app);
    expect(document.getElementById("late-payload")).toBeNull();
    expect(animate.enter).not.toHaveBeenCalled();
    expect(app.querySelector("span[style]")).toBeNull();
  });

  it("does not commit a deferred view transition after scope destruction", () => {
    const host = defined(document.getElementById("host"));
    const scope = $rootScope.new();
    let commit: (() => void | Promise<void>) | undefined;

    host.setAttribute("data-view-transition", "true");
    spyOn(document, "startViewTransition").and.callFake((update) => {
      commit = transitionUpdate(update);
      return nativeTransition();
    });

    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope,
      element: host,
      logPrefix: "test",
    });

    expect(swap('<span id="deferred">deferred</span>', "innerHTML")).toBeTrue();

    scope.destroy();
    commit?.();

    expect(host.querySelector("#deferred")).toBeNull();
    expect(swap("late", "textContent")).toBeFalse();
  });

  it("rejects parent-relative swaps for detached targets", () => {
    for (const mode of [
      "outerHTML",
      "beforebegin",
      "afterend",
    ] satisfies SwapMode[]) {
      const host = document.createElement("div");
      const swap = createRealtimeSwapHandler({
        $compile,
        $log,
        getAnimate: jasmine
          .createSpy<() => ng.AnimateService>("getAnimate")
          .and.throwError("Unexpected animation request"),
        scope: $rootScope,
        element: host,
        logPrefix: "test",
      });

      expect(swap("<span>detached</span>", mode)).toBeFalse();
    }
  });

  it("supports every non-animated positional swap mode", () => {
    const host = defined(document.getElementById("host"));
    const target = defined(document.getElementById("target"));
    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: jasmine
        .createSpy<() => ng.AnimateService>("getAnimate")
        .and.throwError("Unexpected animation request"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(
      swap('<i id="before">before</i>', "beforebegin", {
        targetSelector: "#target",
      }),
    ).toBeTrue();
    expect(
      swap('<i id="first">first</i>', "afterbegin", {
        targetSelector: "#target",
      }),
    ).toBeTrue();
    expect(
      swap('<i id="last">last</i>', "beforeend", {
        targetSelector: "#target",
      }),
    ).toBeTrue();
    expect(
      swap('<i id="after">after</i>', "afterend", {
        targetSelector: "#target",
      }),
    ).toBeTrue();
    expect(swap("ignored", "none")).toBeTrue();

    expect(app.querySelector("#before")).not.toBeNull();
    expect(target.firstElementChild?.id).toBe("first");
    expect(target.lastElementChild?.id).toBe("last");
    expect(app.querySelector("#after")).not.toBeNull();
  });

  it("delegates element insertion for positional swaps to animation", () => {
    const host = defined(document.getElementById("host"));
    const animate = animateFixture({
      enter: jasmine
        .createSpy<ng.AnimateService["enter"]>("enter")
        .and.returnValue(immediateAnimation(true)),
    });

    host.setAttribute("data-animate", "true");

    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: () => animate,
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    for (const mode of ["beforebegin", "afterbegin", "afterend"] as const) {
      expect(
        swap(`<i data-mode="${mode}">${mode}</i>`, mode, {
          targetSelector: "#target",
        }),
      ).toBeTrue();
    }

    expect(animate.enter).toHaveBeenCalledTimes(3);
  });

  it("inserts text nodes during animated outerHTML replacement", () => {
    const host = defined(document.getElementById("host"));
    const target = defined(document.getElementById("target"));
    const animate = animateFixture({
      leave: (element: Element) => {
        element.remove();
        return immediateAnimation(true);
      },
      enter: jasmine
        .createSpy<ng.AnimateService["enter"]>("enter")
        .and.returnValue(immediateAnimation(true)),
    });
    const compile = () => () => {
      const fragment = document.createDocumentFragment();
      fragment.append("text", document.createElement("strong"));
      return fragment;
    };

    host.setAttribute("data-animate", "true");
    const swap = createRealtimeSwapHandler({
      $compile: Object.assign(compile, $compile),
      $log,
      getAnimate: () => animate,
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(
      swap("payload", "outerHTML", { targetSelector: "#target" }),
    ).toBeTrue();
    expect(target.isConnected).toBeFalse();
    expect(app.textContent).toContain("text");
    expect(animate.enter).toHaveBeenCalled();
  });

  it("handles cancelled and completed animated text swaps", () => {
    const host = defined(document.getElementById("host"));
    const target = defined(document.getElementById("target"));
    const completions = [false, true];
    const animate = animateFixture({
      leave: () => immediateAnimation(defined(completions.shift())),
      enter: () => immediateAnimation(true),
    });

    host.setAttribute("data-animate", "true");
    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: () => animate,
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(
      swap("cancelled", "textContent", { targetSelector: "#target" }),
    ).toBeTrue();
    expect(target.textContent).toBe("old");
    expect(
      swap("completed", "textContent", { targetSelector: "#target" }),
    ).toBeTrue();
    expect(target.textContent).toBe("completed");
  });

  it("contains cancelled animated innerHTML replacements", () => {
    const host = defined(document.getElementById("host"));
    const animate = animateFixture({
      enter(element: Element, parent: ParentNode | null) {
        defined(parent).appendChild(element);
        return immediateAnimation(true);
      },
      leave: () => immediateAnimation(false),
    });

    host.setAttribute("data-animate", "true");
    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: () => animate,
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>first</span>", "innerHTML")).toBeTrue();
    expect(swap("<span>second</span>", "innerHTML")).toBeTrue();
    expect(host.textContent).toBe("first");
  });

  it("contains cancelled and completed animated deletes", () => {
    const host = defined(document.getElementById("host"));
    const completions = [false, true];
    const animate = animateFixture({
      leave: jasmine
        .createSpy("leave")
        .and.callFake(() => immediateAnimation(defined(completions.shift()))),
    });

    host.setAttribute("data-animate", "true");
    const swap = createRealtimeSwapHandler({
      $compile,
      $log,
      getAnimate: () => animate,
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("", "delete", { targetSelector: "#target" })).toBeTrue();
    expect(swap("", "delete", { targetSelector: "#target" })).toBeTrue();
    expect(animate.leave).toHaveBeenCalledTimes(2);
  });
});

function immediateAnimation(completed: boolean): ng.AnimationHandle {
  const handle = new AnimationHandle(undefined);
  handle.complete(completed);
  return handle;
}

function nativeTransition(): ViewTransition {
  return {
    ready: Promise.resolve(),
    finished: Promise.resolve(),
    updateCallbackDone: Promise.resolve(),
    types: new Set(),
    skipTransition() {},
  };
}
function transitionUpdate(
  update: Parameters<Document["startViewTransition"]>[0],
) {
  return (typeof update === "function" ? update : update?.update) ?? undefined;
}
