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
      hookPhase: TransitionHookPhase._BEFORE,
      synchronous: false,
      getErrorHandler: () => (error) => error,
      getResultHandler: () => (transitionHook) => (result) =>
        transitionHook.handleHookResult(result),
      ...eventType,
    },
    callback,
    invokeCount: 0,
    deregister() {},
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
      current: () => null,
      transition: null,
      ...options,
    },
    () => undefined,
  );
}

describe("TransitionHook", () => {
  it("chains hooks without an initial promise", async () => {
    const order = [];

    await TransitionHook.chain([
      {
        invokeHook() {
          order.push("hook");
        },
      },
    ]);

    expect(order).toEqual(["hook"]);
  });

  it("returns the async done callback result after remaining hooks run", async () => {
    const order = [];

    const result = await TransitionHook.invokeHooks(
      [
        {
          invokeHook() {
            order.push("first");
            return Promise.resolve().then(() => order.push("async"));
          },
        },
        {
          invokeHook() {
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

    expect(hook.invokeHook()).toBeUndefined();
    expect(callback).not.toHaveBeenCalled();
  });

  it("deregisters hooks when invoke limit is reached", () => {
    const deregister = jasmine.createSpy("deregister");
    const hook = createHook({
      callback: () => undefined,
      registeredHook: { invokeLimit: 1, deregister },
    });

    hook.invokeHook();

    expect(deregister).toHaveBeenCalled();
  });

  it("returns a rejection for aborted transitions", async () => {
    const hook = createHook({
      transition: { _aborted: true },
    });

    await expectAsync(hook.getNotCurrentRejection()).toBeRejected();
  });

  it("returns a rejection for superseded run hooks", async () => {
    const hook = createHook({
      eventType: { hookPhase: TransitionHookPhase._RUN },
      options: {
        current: () => null,
        transition: { isActive: () => false },
      },
    });

    await expectAsync(hook.getNotCurrentRejection()).toBeRejected();
  });

  it("handles promise hook results recursively", async () => {
    const hook = createHook();

    await expectAsync(
      hook.handleHookResult(Promise.resolve(false)),
    ).toBeRejected();
  });

  it("logs rejected hook results", async () => {
    const logError = jasmine.createSpy("logError");

    TransitionHook.LOG_REJECTED_RESULT({ logError })(Promise.reject("nope"));

    await new Promise((resolve) => setTimeout(resolve));

    expect(logError).toHaveBeenCalled();
  });

  it("exposes default error handlers", async () => {
    TransitionHook.LOG_ERROR()("ignored");

    await expectAsync(
      TransitionHook.REJECT_ERROR()("rejected"),
    ).toBeRejectedWith("rejected");

    expect(() => TransitionHook.THROW_ERROR()("thrown")).toThrow("thrown");
  });

  it("formats debug strings using available hook context", () => {
    expect(createHook().toString()).toContain("internal context: unknown");

    expect(
      createHook({
        options: {
          hookType: "custom",
          target: { state: { name: "stateName" } },
        },
      }).toString(),
    ).toContain("custom context: stateName");

    expect(
      createHook({
        options: { target: { name: "targetName" } },
      }).toString(),
    ).toContain("internal context: targetName");
  });
});
