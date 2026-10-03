/// <reference types="jasmine" />
import { Angular } from "./angular.ts";
import {
  _animate,
  _compile,
  _controller,
  _eventBus,
  _exceptionHandler,
  _filter,
  _interpolate,
  _parse,
  _rootScope,
  _state,
  _templateCache,
  _templateRequest,
  _worker,
} from "./injection-tokens.ts";
import type { StateRuntime } from "./router/state/state-service.ts";
import type {
  NgViewAnimData,
  ViewConfig,
  ViewService,
} from "./router/view/view.ts";
import { wait } from "./shared/test-utils.ts";

describe("AngularRuntime composition ownership", () => {
  const runtimes: Angular[] = [];
  const angularHost = window as unknown as { angular?: ng.Angular };
  let originalAngular: ng.Angular | undefined;
  let originalWorker: typeof Worker;

  beforeEach(() => {
    originalAngular = angularHost.angular;
    originalWorker = window.Worker;
  });

  afterEach(() => {
    runtimes.forEach((runtime) => {
      runtime._composition.destroy();
    });
    runtimes.length = 0;

    if (originalAngular) {
      angularHost.angular = originalAngular;
    } else {
      delete angularHost.angular;
    }

    window.Worker = originalWorker;
  });

  function createRuntime(): {
    runtime: Angular;
    injector: ng.InjectorService;
  } {
    const runtime = new Angular();

    runtimes.push(runtime);

    return {
      runtime,
      injector: runtime.injector(["ng"]),
    };
  }

  describe("getModel", () => {
    it("lazily initializes a model once and shares it with injection", () => {
      const runtime = new Angular();
      let initializations = 0;

      runtimes.push(runtime);
      runtime
        .createModule("modelAccess", ["ng"])
        .value("initialCount", 3)
        .model("counter", [
          "initialCount",
          (count: number) => {
            initializations++;

            return { count };
          },
        ]);

      const injector = runtime.injector(["modelAccess"]);

      expect(initializations).toBe(0);
      expect(runtime._appContext.getModel("counter")).toBeUndefined();

      const counter: ng.Model<{ count: number }> = runtime.getModel("counter");

      expect(counter.count).toBe(3);
      expect(counter.snapshot()).toEqual({ count: 3 });
      expect(runtime.getModel("counter")).toBe(counter);
      expect(injector.get("counter")).toBe(counter);
      expect(initializations).toBe(1);
    });

    it("returns a model already initialized by an injected consumer", () => {
      const runtime = new Angular();

      runtimes.push(runtime);
      runtime
        .createModule("injectedModelAccess", ["ng"])
        .model("cart", () => ({ items: [] as string[] }));
      const injector = runtime.injector(["injectedModelAccess"]);
      const injected = injector.get<ng.Model<{ items: string[] }>>("cart");

      expect(runtime.getModel("cart")).toBe(injected);
    });

    it("updates observing views from an external callback after bootstrap", async () => {
      const runtime = new Angular();
      const element = document.createElement("main");

      runtimes.push(runtime);
      runtime
        .createModule("externalModelAccess", ["ng"])
        .model("cart", () => ({ items: [] as string[] }));
      element.innerHTML = "<span>{{ cart.items.length }}</span>";
      const injector = runtime.bootstrap(element, ["externalModelAccess"]);
      const cart = runtime.getModel<{ items: string[] }>("cart");
      const scope = injector.get(_rootScope);

      scope.cart = cart;
      await wait();
      expect(element.textContent).toBe("0");

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          cart.items.push("book");
          resolve();
        }, 0);
      });
      await wait();
      expect(element.textContent).toBe("1");

      scope.destroy();
      expect(runtime.getModel("cart")).toBe(cart);
    });

    it("rejects access before initialization without starting the app", () => {
      const runtime = new Angular();
      const initialize = jasmine
        .createSpy("initialize")
        .and.returnValue({ count: 0 });

      runtimes.push(runtime);
      runtime
        .createModule("uninitializedModelAccess", ["ng"])
        .model("counter", initialize);

      expect(() => runtime.getModel("counter")).toThrowError(
        /before bootstrap\(\) or injector\(\) completes/,
      );
      expect(initialize).not.toHaveBeenCalled();
      expect(runtime.currentInjector).toBeUndefined();
    });

    it("rejects unknown names, unloaded models, and ordinary services", () => {
      const { runtime } = createRuntime();
      const initializeService = jasmine
        .createSpy("initializeService")
        .and.returnValue({ count: 0 });

      runtime
        .createModule("unloadedModel", ["ng"])
        .model("counter", () => ({ count: 0 }));
      runtime
        .createModule("ordinaryService", ["ng"])
        .factory("plainState", initializeService);
      runtime.injector(["ordinaryService"]);

      for (const name of ["missing", "counter", "plainState"]) {
        expect(() => runtime.getModel(name)).toThrowError(
          /is not registered in this app/,
        );
      }
      expect(initializeService).not.toHaveBeenCalled();

      runtime.injector(["unloadedModel"]);
      expect(runtime.getModel<{ count: number }>("counter").count).toBe(0);
    });

    it("rejects a model registration overridden by an ordinary service", () => {
      const runtime = new Angular();

      runtimes.push(runtime);
      runtime
        .createModule("overriddenModelAccess", ["ng"])
        .model("counter", () => ({ count: 0 }))
        .value("counter", { count: 10 })
        .model("emptyCounter", () => ({ count: 0 }))
        .value("emptyCounter", undefined);
      runtime.injector(["overriddenModelAccess"]);

      expect(() => runtime.getModel("counter")).toThrowError(
        /does not resolve to an app-owned model/,
      );
      expect(() => runtime.getModel("emptyCounter")).toThrowError(
        /does not resolve to an app-owned model/,
      );
    });

    it("isolates models between independent runtimes", () => {
      const first = new Angular();
      const second = new Angular();

      runtimes.push(first, second);
      for (const runtime of [first, second]) {
        runtime
          .createModule("isolatedModelAccess", ["ng"])
          .model("counter", () => ({ count: 0 }));
        runtime.injector(["isolatedModelAccess"]);
      }

      const firstCounter = first.getModel<{ count: number }>("counter");
      const secondCounter = second.getModel<{ count: number }>("counter");

      firstCounter.count = 2;
      expect(firstCounter).not.toBe(secondCounter);
      expect(secondCounter.count).toBe(0);
    });

    it("rejects access after the app context is destroyed", () => {
      const runtime = new Angular();

      runtimes.push(runtime);
      runtime
        .createModule("destroyedModelAccess", ["ng"])
        .model("counter", () => ({ count: 0 }));
      runtime.injector(["destroyedModelAccess"]);
      runtime.getModel("counter");
      runtime._appContext.destroy();

      expect(() => runtime.getModel("counter")).toThrowError(/destroyed app/);
    });
  });

  it("gives sub-applications non-owning compositions", () => {
    const runtime = new Angular();
    const subapp = new Angular(true);

    runtimes.push(runtime, subapp);

    expect(subapp._appContext).toBe(runtime._appContext);

    subapp._composition.destroy();

    expect(subapp._composition.destroyed).toBeTrue();
    expect(runtime._composition.destroyed).toBeFalse();
    expect(runtime._appContext.destroyed).toBeFalse();

    runtime._composition.destroy();

    expect(runtime._composition.destroyed).toBeTrue();
    expect(runtime._appContext.destroyed).toBeTrue();
  });

  it("isolates mutable framework services between top-level runtimes", () => {
    const first = createRuntime();
    const firstEventBus = first.injector.get(_eventBus);
    const firstCompileLifecycle = first.runtime._composition.compileLifecycle;
    const firstTemplateCache = first.injector.get(_templateCache);
    const repeatedFirstInjector = first.runtime.injector(["ng"]);
    const second = createRuntime();
    const secondEventBus = second.injector.get(_eventBus);
    const secondCompileLifecycle = second.runtime._composition.compileLifecycle;
    const secondTemplateCache = second.injector.get(_templateCache);
    const listener = jasmine.createSpy("firstRuntimeListener");

    firstEventBus.subscribe("runtime:event", listener);
    firstTemplateCache.set("runtime-owner", "first");

    expect(first.runtime._appContext).not.toBe(second.runtime._appContext);
    expect(first.runtime._appContext.modelScheduler).not.toBe(
      second.runtime._appContext.modelScheduler,
    );
    expect(repeatedFirstInjector.get(_eventBus)).toBe(firstEventBus);
    expect(first.runtime._composition.compileLifecycle).toBe(
      firstCompileLifecycle,
    );
    expect(firstEventBus).not.toBe(secondEventBus);
    expect(firstCompileLifecycle).not.toBe(secondCompileLifecycle);
    expect(firstTemplateCache).not.toBe(secondTemplateCache);
    expect(firstEventBus.getCount("runtime:event")).toBe(1);
    expect(secondEventBus.getCount("runtime:event")).toBe(0);
    expect(firstTemplateCache.get("runtime-owner")).toBe("first");
    expect(secondTemplateCache.has("runtime-owner")).toBeFalse();

    const runtimeOwnedCoreTokens = [
      _animate,
      _compile,
      _controller,
      _exceptionHandler,
      _filter,
      _interpolate,
      _parse,
      _rootScope,
      _templateRequest,
    ] as const;

    runtimeOwnedCoreTokens.forEach((token) => {
      expect(repeatedFirstInjector.get(token))
        .withContext(`${token} should be stable within its runtime`)
        .toBe(first.injector.get(token));
      expect(first.injector.get(token))
        .withContext(`${token} should be isolated between runtimes`)
        .not.toBe(second.injector.get(token));
    });

    first.runtime._appContext.destroy();

    expect(firstEventBus.isDisposed()).toBeTrue();
    expect(firstEventBus.getCount("runtime:event")).toBe(0);
    expect(secondEventBus.isDisposed()).toBeFalse();
    expect(second.runtime._appContext.destroyed).toBeFalse();
  });

  it("keeps composed services lazy at the public injector boundary", () => {
    const runtime = new Angular();
    let constructions = 0;

    runtimes.push(runtime);

    runtime.createModule("lazyCompositionProbe", ["ng"]).decorator(_animate, [
      "$delegate",
      ($delegate: ng.AnimateService) => {
        constructions++;

        return $delegate;
      },
    ]);

    const injector = runtime.injector(["lazyCompositionProbe"]);

    expect(constructions).toBe(0);

    const service = injector.get(_animate);

    expect(constructions).toBe(1);
    expect(injector.get(_animate)).toBe(service);
    expect(constructions).toBe(1);
  });

  it("routes fire-and-forget invocation failures through the exception handler", async () => {
    const runtime = new Angular();
    const syncError = new Error("sync invocation failed");
    const asyncError = new Error("async invocation failed");
    const errors: unknown[] = [];

    runtimes.push(runtime);

    runtime
      .createModule("invocationFailureBoundary", ["ng"])
      .config({
        $exceptionHandler: {
          handler(exception): never {
            errors.push(exception);

            // The test sink absorbs failures so every detached path can be observed.
            return undefined as never;
          },
        },
      })
      .value("invocationTarget", {
        failAsync: () => Promise.reject(asyncError),
        failSync: () => {
          throw syncError;
        },
      });

    runtime.injector(["invocationFailureBoundary"]);
    runtime.emit("invocationTarget.failSync()");
    runtime.emit("invocationTarget.failAsync()");
    runtime.emit("missingTarget.run()");
    await wait();

    const missingTargetError = errors.find(
      (error) => error !== syncError && error !== asyncError,
    );

    expect(errors).toHaveSize(3);
    expect(errors).toContain(syncError);
    expect(errors).toContain(asyncError);
    expect(missingTargetError).toEqual(jasmine.any(Error));
    expect((missingTargetError as Error).message).toBe(
      'No target found for "missingTarget"',
    );
  });

  it("keeps awaited invocation failures on the returned promise", async () => {
    const runtime = new Angular();
    const operationError = new Error("awaited invocation failed");
    const errors: unknown[] = [];

    runtimes.push(runtime);

    runtime
      .createModule("invocationPromiseBoundary", ["ng"])
      .config({
        $exceptionHandler: {
          handler(exception): never {
            errors.push(exception);
            throw exception;
          },
        },
      })
      .value("invocationTarget", {
        fail: () => Promise.reject(operationError),
      });

    runtime.injector(["invocationPromiseBoundary"]);

    await expectAsync(runtime.call("invocationTarget.fail()")).toBeRejectedWith(
      operationError,
    );
    expect(errors).toEqual([]);
  });

  it("keeps scope runtime dependencies isolated between top-level runtimes", async () => {
    const firstErrors: unknown[] = [];
    const secondErrors: unknown[] = [];
    const firstRuntime = new Angular();
    const secondRuntime = new Angular();

    runtimes.push(firstRuntime, secondRuntime);

    firstRuntime
      .createModule("firstRuntime", ["ng"])
      .filter(
        "runtimeOwner",
        () => (value: unknown) => `first:${String(value)}`,
      )
      .decorator("$exceptionHandler", () => (exception: unknown) => {
        firstErrors.push(exception);
      });
    secondRuntime
      .createModule("secondRuntime", ["ng"])
      .filter(
        "runtimeOwner",
        () => (value: unknown) => `second:${String(value)}`,
      )
      .decorator("$exceptionHandler", () => (exception: unknown) => {
        secondErrors.push(exception);
      });

    const firstModel = firstRuntime._appContext.createReactive({
      value: "model",
    });

    const firstRoot = firstRuntime.injector(["firstRuntime"]).get(_rootScope);
    const secondRoot = secondRuntime
      .injector(["secondRuntime"])
      .get(_rootScope);
    const observed: unknown[] = [];
    const modelObserved: unknown[] = [];
    const expectedError = new Error("first runtime failure");

    firstRoot.value = "value";
    firstRoot.watch("value | runtimeOwner", (value) => {
      observed.push(value);
    });
    firstModel.watch("value | runtimeOwner", (value) => {
      modelObserved.push(value);
    });
    firstRoot.on("runtime:error", () => {
      throw expectedError;
    });

    firstRoot.emit("runtime:error");
    await wait();

    expect(observed).toEqual(["first:value"]);
    expect(modelObserved).toEqual(["first:model"]);
    expect(firstErrors).toEqual([expectedError]);
    expect(secondErrors).toEqual([]);
    expect(secondRoot._handler._parse).not.toBe(firstRoot._handler._parse);
  });

  it("releases root and app-owned resources during teardown", () => {
    const terminate = jasmine.createSpy("terminate");

    class TestWorker {
      onerror: ((this: AbstractWorker, ev: ErrorEvent) => unknown) | null =
        null;
      onmessage: ((this: Worker, ev: MessageEvent) => unknown) | null = null;

      postMessage(): void {
        /* empty */
      }

      terminate(): void {
        terminate();
      }
    }

    window.Worker = TestWorker as unknown as typeof Worker;

    const runtime = new Angular();
    const rootElement = document.createElement("main");

    runtimes.push(runtime);
    document.body.append(rootElement);

    const injector = runtime.bootstrap(rootElement);
    const eventBus = injector.get(_eventBus);
    const worker = injector.get(_worker)("/worker.js");
    const rootScope = injector.get(_rootScope);
    const root = runtime._appContext.getRootByScope(rootScope);
    const view = (injector.get(_state) as StateRuntime)._viewService;
    const retainedScope = rootScope.new();
    const retainedElement = document.createElement("section");
    const scheduled = jasmine.createSpy("scheduled");

    document.body.append(retainedElement);
    eventBus.subscribe("runtime:event", () => undefined);
    root?.scheduler.schedule(scheduled);
    view._retainView({
      _key: "retained:test",
      _config: {
        _retention: {
          _key: "retained:test",
          _mode: "keep-alive",
          _state: "test",
        },
        _targetKey: "$default",
      } as ViewConfig,
      _element: retainedElement,
      _nodes: [],
      _scope: retainedScope,
      _animation: {} as NgViewAnimData,
    });

    runtime._appContext.destroy();
    worker.terminate();
    root?.scheduler.flush();

    expect(root?.destroyed).toBeTrue();
    expect(root?.scheduler.destroyed).toBeTrue();
    expect(scheduled).not.toHaveBeenCalled();
    expect(eventBus.isDisposed()).toBeTrue();
    expect(eventBus.getCount("runtime:event")).toBe(0);
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(view._retainedViews.size).toBe(0);
    expect(retainedScope._handler._destroyed).toBeTrue();
    expect(retainedElement.isConnected).toBeFalse();

    rootElement.remove();
  });
});
