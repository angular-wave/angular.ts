// @ts-nocheck
/// <reference types="jasmine" />
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";

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
});
