// @ts-nocheck
/// <reference types="jasmine" />
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import { Rejection, RejectType } from "./reject-factory.ts";
import { TransitionEventType } from "./transition-event-type.ts";
import {
  afterPaintTask,
  applyRouterFocus,
  applyRouterScroll,
  resolveFocusTarget,
  resolveScrollTarget,
  scrollToHash,
} from "./transition-hooks.ts";
import "./security-policy.spec.ts";

function createHook({
  callback = () => undefined,
  transition = {},
  eventType = {},
  options = {},
  registeredHook = {},
} = {}) {
  const hook = {
    _deregistered: false,
    _eventType: {
      _hookPhase: TransitionHookPhase._BEFORE,
      _synchronous: false,
      _handleError: (_hook, error) => error,
      _handleResult: (transitionHook, result) =>
        transitionHook._handleHookResult(result),
      ...eventType,
    },
    _callback: callback,
    _invokeCount: 0,
    _deregister() {},
    ...registeredHook,
  };

  return new TransitionHook(
    {
      _aborted: false,
      isActive: () => true,
      ...transition,
    },
    null,
    hook,
    {
      _current: () => null,
      _transition: null,
      ...options,
    },
    () => undefined,
  );
}

describe("TransitionHook", () => {
  let originalHash: string;
  let originalScrollTo: typeof window.scrollTo;

  beforeEach(() => {
    originalHash = window.location.hash;
    originalScrollTo = window.scrollTo;
  });

  afterEach(() => {
    window.location.hash = originalHash;
    window.scrollTo = originalScrollTo;
    document.querySelectorAll("[data-router-helper-test]").forEach((node) => {
      node.remove();
    });
  });

  it("falls back to a timer when requestAnimationFrame is unavailable", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window,
      "requestAnimationFrame",
    );

    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: undefined,
    });

    try {
      await afterPaintTask();
      expect(true).toBeTrue();
    } finally {
      if (descriptor) {
        Object.defineProperty(window, "requestAnimationFrame", descriptor);
      }
    }
  });

  it("resolves scroll and focus targets through the document", () => {
    const target = document.createElement("button");
    target.id = "router-helper-target";
    target.setAttribute("data-router-helper-test", "");
    document.body.appendChild(target);

    expect(resolveScrollTarget("#router-helper-target")).toBe(target);
    expect(resolveFocusTarget("#router-helper-target")).toBe(target);
    expect(resolveFocusTarget({ selector: "#router-helper-target" })).toBe(
      target,
    );
  });

  it("handles missing DOM globals in router UX helpers", () => {
    expect(resolveScrollTarget("#missing", null)).toBeNull();
    expect(scrollToHash(null, document)).toBeFalse();
    expect(scrollToHash(window, null)).toBeFalse();
    expect(resolveFocusTarget("#missing", null)).toBeNull();
  });

  it("scrolls to hash targets when present", () => {
    const target = document.createElement("section");
    target.id = "router-hash-target";
    target.setAttribute("data-router-helper-test", "");
    target.scrollIntoView = jasmine.createSpy("scrollIntoView");
    document.body.appendChild(target);

    window.location.hash = "#";
    expect(scrollToHash()).toBeFalse();

    window.location.hash = "#missing-router-hash-target";
    expect(scrollToHash()).toBeFalse();

    window.location.hash = "#router-hash-target";
    expect(scrollToHash()).toBeTrue();
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it("applies router scroll policies", () => {
    const target = document.createElement("section");
    target.id = "router-scroll-target";
    target.setAttribute("data-router-helper-test", "");
    target.scrollIntoView = jasmine.createSpy("scrollIntoView");
    document.body.appendChild(target);

    const scrollTo = jasmine.createSpy("scrollTo");
    window.scrollTo = scrollTo as typeof window.scrollTo;

    applyRouterScroll({ _scroll: undefined } as any);
    applyRouterScroll({ _scroll: "preserve" } as any);
    expect(scrollTo).not.toHaveBeenCalled();

    applyRouterScroll({
      _scroll: {
        selector: "#router-scroll-target",
        behavior: "smooth",
      },
    } as any);
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });

    applyRouterScroll({
      _scroll: {
        left: 4,
        top: 8,
        behavior: "auto",
      },
    } as any);
    expect(scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      left: 4,
      top: 8,
    });

    applyRouterScroll({
      _scroll: {
        behavior: "smooth",
      },
    } as any);
    expect(scrollTo).toHaveBeenCalledWith({
      behavior: "smooth",
      left: 0,
      top: 0,
    });

    applyRouterScroll({ _scroll: { behavior: "auto" } } as any, null);
    expect(scrollTo).toHaveBeenCalledTimes(2);

    applyRouterScroll({ _scroll: true } as any);
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
  });

  it("applies hash router scroll policies", () => {
    const target = document.createElement("section");
    target.id = "router-hash-scroll-target";
    target.setAttribute("data-router-helper-test", "");
    target.scrollIntoView = jasmine.createSpy("scrollIntoView");
    document.body.appendChild(target);

    const scrollTo = jasmine.createSpy("scrollTo");
    window.scrollTo = scrollTo as typeof window.scrollTo;

    window.location.hash = "#router-hash-scroll-target";
    applyRouterScroll({ _scroll: "hash" } as any);
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();

    window.location.hash = "#missing-router-hash-scroll-target";
    applyRouterScroll({ _scroll: "hash" } as any);
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
  });

  it("applies router focus policies", () => {
    const explicit = document.createElement("button");
    explicit.id = "router-focus-explicit";
    explicit.setAttribute("data-router-helper-test", "");
    explicit.focus = jasmine.createSpy("explicitFocus");
    document.body.appendChild(explicit);

    const fallback = document.createElement("main");
    fallback.id = "router-focus-fallback";
    fallback.setAttribute("data-router-focus", "");
    fallback.setAttribute("data-router-helper-test", "");
    fallback.focus = jasmine.createSpy("fallbackFocus");
    document.body.appendChild(fallback);

    applyRouterFocus({ _focus: false } as any);
    expect(explicit.focus).not.toHaveBeenCalled();

    applyRouterFocus({ _focus: "#router-focus-explicit" } as any);
    expect(explicit.focus).toHaveBeenCalledWith({ preventScroll: true });

    applyRouterFocus({
      _focus: {
        selector: "#router-focus-explicit",
        preventScroll: false,
      },
    } as any);
    expect(explicit.focus).toHaveBeenCalledWith({ preventScroll: false });

    applyRouterFocus({ _focus: true } as any);
    expect(fallback.focus).toHaveBeenCalledWith({ preventScroll: true });

    applyRouterFocus({ _focus: "#missing-router-focus-target" } as any);
    expect(explicit.focus).toHaveBeenCalledTimes(2);
  });

  it("chains hooks without an initial promise", async () => {
    const order = [];

    await TransitionHook._chain([
      {
        _invokeHook() {
          order.push("hook");
        },
      },
    ]);

    expect(order).toEqual(["hook"]);
  });

  it("returns the async done callback result after remaining hooks run", async () => {
    const order = [];

    const result = await TransitionHook._invokeHooks(
      [
        {
          _invokeHook() {
            order.push("first");

            return Promise.resolve().then(() => order.push("async"));
          },
        },
        {
          _invokeHook() {
            order.push("second");
          },
        },
      ],
      () => {
        order.push("done");

        return Promise.resolve("done-result");
      },
    );

    expect(result).toBe("done-result");
    expect(order).toEqual(["first", "async", "second", "done"]);
  });

  it("does not invoke deregistered hooks", () => {
    const callback = jasmine.createSpy("callback");

    const hook = createHook({
      callback,
      registeredHook: { _deregistered: true },
    });

    expect(hook._invokeHook()).toBeUndefined();
    expect(callback).not.toHaveBeenCalled();
  });

  it("deregisters hooks when invoke limit is reached", () => {
    const deregister = jasmine.createSpy("_deregister");

    const hook = createHook({
      callback: () => undefined,
      registeredHook: { _invokeLimit: 1, _deregister: deregister },
    });

    hook._invokeHook();

    expect(deregister).toHaveBeenCalled();
  });

  it("returns a rejection for aborted transitions", async () => {
    const hook = createHook({
      transition: { _aborted: true },
    });

    await expectAsync(hook._getNotCurrentRejection()).toBeRejected();
  });

  it("returns a rejection for superseded run hooks", async () => {
    const hook = createHook({
      eventType: { _hookPhase: TransitionHookPhase._RUN },
      options: {
        _current: () => null,
        _transition: { isActive: () => false },
      },
    });

    await expectAsync(hook._getNotCurrentRejection()).toBeRejected();
  });

  it("handles promise hook results recursively", async () => {
    const hook = createHook();

    await expectAsync(
      hook._handleHookResult(Promise.resolve(false)),
    ).toBeRejected();
  });

  it("logs rejected hook results", async () => {
    const logError = jasmine.createSpy("logError");

    TransitionHook._logRejectedResult(
      { _logError: logError },
      Promise.reject("nope"),
    );

    await new Promise((resolve) => setTimeout(resolve));

    expect(logError).toHaveBeenCalled();
  });

  it("exposes default error handlers", async () => {
    TransitionHook._logError(undefined, "ignored");

    await expectAsync(
      TransitionHook._rejectError(undefined, "rejected"),
    ).toBeRejectedWith("rejected");

    expect(() => TransitionHook._throwError(undefined, "thrown")).toThrow(
      "thrown",
    );
  });

  it("formats debug strings using available hook context", () => {
    expect(createHook().toString()).toContain("internal context: unknown");

    expect(
      createHook({
        options: {
          _hookType: "custom",
          _target: { state: { name: "stateName" } },
        },
      }).toString(),
    ).toContain("custom context: stateName");

    expect(
      createHook({
        options: { _target: { name: "targetName" } },
      }).toString(),
    ).toContain("internal context: targetName");
  });

  it("creates and normalizes transition rejections", async () => {
    const superseded = Rejection.superseded("next");
    const redirected = Rejection.redirected({ toString: () => "redirect" });
    const invalid = Rejection.invalid("bad target");
    const ignored = Rejection.ignored();
    const aborted = Rejection.aborted("guard");
    const errored = Rejection.errored(new Error("boom"));

    expect(superseded.type).toBe(RejectType._SUPERSEDED);
    expect(superseded.redirected).toBeFalse();
    expect(redirected.redirected).toBeTrue();
    expect(redirected.toString()).toContain("detail: redirect");
    expect(invalid.type).toBe(RejectType._INVALID);
    expect(ignored.type).toBe(RejectType._IGNORED);
    expect(aborted.type).toBe(RejectType._ABORTED);
    expect(errored.type).toBe(RejectType._ERROR);
    expect(Rejection.normalize(aborted)).toBe(aborted);
    expect(Rejection.normalize("plain").type).toBe(RejectType._ERROR);

    const promise = invalid._toPromise();

    expect(promise._transitionRejection).toBe(invalid);
    await expectAsync(promise).toBeRejectedWith(invalid);
  });

  it("stringifies rejection details without custom toString methods", () => {
    const objectDetail = Rejection.aborted({ id: 1 });
    const undefinedDetail = Rejection.ignored(undefined);

    expect(objectDetail.toString()).toContain('detail: {"id":1}');
    expect(undefinedDetail.toString()).toContain("detail: undefined");
  });

  it("stores transition event type metadata and delegates handlers", async () => {
    const hook = createHook();
    const resultHandler = jasmine
      .createSpy("resultHandler")
      .and.returnValue("result");
    const errorHandler = jasmine
      .createSpy("errorHandler")
      .and.returnValue("err");
    const eventType = new TransitionEventType(
      "onTest",
      1,
      2,
      "to",
      true,
      resultHandler,
      errorHandler,
      true,
    );

    expect(eventType._name).toBe("onTest");
    expect(eventType._hookPhase).toBe(1);
    expect(eventType._hookOrder).toBe(2);
    expect(eventType._criteriaMatchPath).toBe("to");
    expect(eventType._reverseSort).toBeTrue();
    expect(eventType._synchronous).toBeTrue();
    expect(eventType._handleResult(hook, "value")).toBe("result");
    expect(eventType._handleError(hook, "error")).toBe("err");
    expect(resultHandler).toHaveBeenCalledWith(hook, "value");
    expect(errorHandler).toHaveBeenCalledWith(hook, "error");
  });

  it("uses default transition event type handlers", async () => {
    const eventType = new TransitionEventType("onDefault", 1, 1, "from");
    const hook = createHook();

    await expectAsync(eventType._handleResult(hook, false)).toBeRejected();
    await expectAsync(eventType._handleError(hook, "error")).toBeRejectedWith(
      "error",
    );
  });
});
