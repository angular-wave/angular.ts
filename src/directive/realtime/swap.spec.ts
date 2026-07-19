// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { getCompiledFragmentRecord } from "../../core/compile/incremental-fragment.ts";
import { createRealtimeSwapHandler } from "./swap.ts";

describe("createRealtimeSwapHandler", () => {
  let app: HTMLElement;
  let $compile: ng.CompileService;
  let $rootScope: ng.Scope;
  let warnSpy: jasmine.Spy;

  beforeEach(() => {
    app = document.getElementById("app") as HTMLElement;
    dealoc(app);
    app.innerHTML = '<section id="target">old</section><div id="host"></div>';

    const angular = new Angular();

    angular.bootstrap(app, []).invoke([
      "$compile",
      "$rootScope",
      "$log",
      (_$compile_, _$rootScope_, _$log_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        warnSpy = spyOn(_$log_, "warn");
      },
    ]);
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
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>new</span>", "innerHTML")).toBeTrue();
    expect(document.getElementById("target")!.innerHTML).toBe(
      "<span>new</span>",
    );
  });

  it("does not treat the native target attribute as a swap selector", () => {
    const host = document.getElementById("host") as HTMLElement;

    host.setAttribute("target", "#target");

    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>new</span>", "innerHTML")).toBeTrue();
    expect(host.innerHTML).toBe("<span>new</span>");
    expect(document.getElementById("target")!.textContent).toBe("old");
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
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>new</span>", "innerHTML")).toBeTrue();
    expect(startViewTransition).toHaveBeenCalled();
    expect(host.innerHTML).toBe("<span>new</span>");
  });

  it("disposes replaced innerHTML fragments before installing the next fragment", () => {
    const host = document.getElementById("host") as HTMLElement;
    const scope = $rootScope.$new();
    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
      scope,
      element: host,
      logPrefix: "test",
    });

    expect(swap('<span id="first">first</span>', "innerHTML")).toBeTrue();

    const first = host.querySelector("#first") as Element;
    const firstRecord = getCompiledFragmentRecord(first);

    expect(firstRecord).toBeDefined();

    expect(swap('<span id="second">second</span>', "innerHTML")).toBeTrue();

    const second = host.querySelector("#second") as Element;
    const secondRecord = getCompiledFragmentRecord(second);

    expect(firstRecord?.disposed).toBeTrue();
    expect(getCompiledFragmentRecord(first)).toBeUndefined();
    expect(secondRecord).toBeDefined();
    expect(secondRecord?.disposed).toBeFalse();
    expect(host.textContent).toBe("second");
  });

  it("disposes appended stream fragments when the directive scope is destroyed", () => {
    const host = document.getElementById("host") as HTMLElement;
    const scope = $rootScope.$new();
    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
      scope,
      element: host,
      logPrefix: "test",
    });

    expect(swap('<span id="chunk-a">A</span>', "beforeend")).toBeTrue();
    expect(swap('<span id="chunk-b">B</span>', "beforeend")).toBeTrue();

    const first = host.querySelector("#chunk-a") as Element;
    const second = host.querySelector("#chunk-b") as Element;
    const firstRecord = getCompiledFragmentRecord(first);
    const secondRecord = getCompiledFragmentRecord(second);

    expect(firstRecord).toBeDefined();
    expect(secondRecord).toBeDefined();

    scope.$destroy();

    expect(firstRecord?.disposed).toBeTrue();
    expect(secondRecord?.disposed).toBeTrue();
    expect(host.querySelector("#chunk-a")).toBeNull();
    expect(host.querySelector("#chunk-b")).toBeNull();
  });

  it("disposes a compiled target fragment when deleting the target", () => {
    const host = document.getElementById("host") as HTMLElement;
    const target = $compile('<span id="compiled-target">old</span>')(
      $rootScope,
    ) as Element;
    const targetRecord = getCompiledFragmentRecord(target);

    app.appendChild(target);

    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
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
    const host = document.getElementById("host") as HTMLElement;
    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(
      swap('<span id="compiled-child">old</span>', "innerHTML"),
    ).toBeTrue();

    const child = host.querySelector("#compiled-child") as Element;
    const childRecord = getCompiledFragmentRecord(child);

    expect(childRecord).toBeDefined();
    expect(swap("new text", "textContent")).toBeTrue();
    expect(childRecord?.disposed).toBeTrue();
    expect(host.textContent).toBe("new text");
  });

  it("falls back to plain replacement for mixed compiled fragments", () => {
    const host = document.getElementById("host") as HTMLElement;
    const compileMixed = () => () => {
      const fragment = document.createDocumentFragment();

      fragment.appendChild(
        $compile('<span id="mixed-a">A</span>')($rootScope) as Node,
      );
      fragment.appendChild(
        $compile('<span id="mixed-b">B</span>')($rootScope) as Node,
      );

      return fragment;
    };
    const swap = createRealtimeSwapHandler({
      $compile: compileMixed as any,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
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
    const host = document.getElementById("host") as HTMLElement;
    const compilePlain = () => () => {
      const span = document.createElement("span");

      span.id = "plain-node";
      span.textContent = "plain";

      return span;
    };
    const swap = createRealtimeSwapHandler({
      $compile: compilePlain as any,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<ignored></ignored>", "innerHTML")).toBeTrue();
    expect(getCompiledFragmentRecord(host.querySelector("#plain-node"))).toBe(
      undefined,
    );
    expect(host.textContent).toBe("plain");
  });

  it("disposes compiled payloads when their target is missing", () => {
    const host = document.getElementById("host") as HTMLElement;
    let compiledNode: Element | undefined;
    let compiledRecord;
    const compile = (html: string) => {
      const link = $compile(html);

      return (scope: ng.Scope) => {
        compiledNode = link(scope) as Element;
        compiledRecord = getCompiledFragmentRecord(compiledNode);

        return compiledNode;
      };
    };
    const swap = createRealtimeSwapHandler({
      $compile: compile as ng.CompileService,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
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
    expect(getCompiledFragmentRecord(compiledNode!)).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("does not commit an animated replacement after scope destruction", () => {
    const host = document.getElementById("host") as HTMLElement;
    const target = document.getElementById("target") as HTMLElement;
    const scope = $rootScope.$new();
    let finishLeave: ((completed: boolean) => void) | undefined;
    const leaveHandle = {
      cancel: jasmine.createSpy("cancel"),
      done(callback: (completed: boolean) => void) {
        finishLeave = callback;
      },
    };
    const animate = {
      enter: jasmine.createSpy("enter"),
      leave: jasmine.createSpy("leave").and.returnValue(leaveHandle),
    };

    host.setAttribute("data-animate", "true");

    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: () => animate as any,
      scope,
      element: host,
      logPrefix: "test",
    });

    expect(
      swap('<span id="late-payload">late</span>', "outerHTML", {
        targetSelector: "#target",
      }),
    ).toBeTrue();

    scope.$destroy();
    finishLeave?.(true);

    expect(leaveHandle.cancel).toHaveBeenCalled();
    expect(target.parentNode).toBe(app);
    expect(document.getElementById("late-payload")).toBeNull();
    expect(animate.enter).not.toHaveBeenCalled();
    expect(app.querySelector("span[style]")).toBeNull();
  });

  it("does not commit a deferred view transition after scope destruction", () => {
    const host = document.getElementById("host") as HTMLElement;
    const scope = $rootScope.$new();
    let commit: (() => void) | undefined;

    host.setAttribute("data-view-transition", "true");
    (document as any).startViewTransition = (callback: () => void) => {
      commit = callback;
    };

    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
      scope,
      element: host,
      logPrefix: "test",
    });

    expect(swap('<span id="deferred">deferred</span>', "innerHTML")).toBeTrue();

    scope.$destroy();
    commit?.();

    expect(host.querySelector("#deferred")).toBeNull();
    expect(swap("late", "textContent")).toBeFalse();
  });

  it("rejects parent-relative swaps for detached targets", () => {
    for (const mode of ["outerHTML", "beforebegin", "afterend"]) {
      const host = document.createElement("div");
      const swap = createRealtimeSwapHandler({
        $compile,
        $log: { warn: warnSpy } as any,
        getAnimate: jasmine.createSpy("getAnimate"),
        scope: $rootScope,
        element: host,
        logPrefix: "test",
      });

      expect(swap("<span>detached</span>", mode)).toBeFalse();
    }
  });

  it("supports every non-animated positional swap mode", () => {
    const host = document.getElementById("host") as HTMLElement;
    const target = document.getElementById("target") as HTMLElement;
    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: jasmine.createSpy("getAnimate"),
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

  it("inserts text nodes during animated outerHTML replacement", () => {
    const host = document.getElementById("host") as HTMLElement;
    const target = document.getElementById("target") as HTMLElement;
    const animate = {
      leave: (element) => {
        element.remove();
        return immediateAnimation(true);
      },
      enter: jasmine.createSpy("enter"),
    };
    const compile = () => () => {
      const fragment = document.createDocumentFragment();
      fragment.append("text", document.createElement("strong"));
      return fragment;
    };

    host.setAttribute("data-animate", "true");
    const swap = createRealtimeSwapHandler({
      $compile: compile as any,
      $log: { warn: warnSpy } as any,
      getAnimate: () => animate as any,
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
    const host = document.getElementById("host") as HTMLElement;
    const target = document.getElementById("target") as HTMLElement;
    const completions = [false, true];
    const animate = {
      leave: () => immediateAnimation(completions.shift()),
      enter: () => immediateAnimation(true),
    };

    host.setAttribute("data-animate", "true");
    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: () => animate as any,
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
    const host = document.getElementById("host") as HTMLElement;
    const animate = {
      enter(element, parent) {
        parent.appendChild(element);
        return immediateAnimation(true);
      },
      leave: () => immediateAnimation(false),
    };

    host.setAttribute("data-animate", "true");
    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: () => animate as any,
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("<span>first</span>", "innerHTML")).toBeTrue();
    expect(swap("<span>second</span>", "innerHTML")).toBeTrue();
    expect(host.textContent).toBe("first");
  });

  it("contains cancelled and completed animated deletes", () => {
    const host = document.getElementById("host") as HTMLElement;
    const completions = [false, true];
    const animate = {
      leave: jasmine
        .createSpy("leave")
        .and.callFake(() => immediateAnimation(completions.shift())),
    };

    host.setAttribute("data-animate", "true");
    const swap = createRealtimeSwapHandler({
      $compile,
      $log: { warn: warnSpy } as any,
      getAnimate: () => animate as any,
      scope: $rootScope,
      element: host,
      logPrefix: "test",
    });

    expect(swap("", "delete", { targetSelector: "#target" })).toBeTrue();
    expect(swap("", "delete", { targetSelector: "#target" })).toBeTrue();
    expect(animate.leave).toHaveBeenCalledTimes(2);
  });
});

function immediateAnimation(completed) {
  return {
    cancel: jasmine.createSpy("cancel"),
    done(callback) {
      callback(completed);
    },
  };
}
