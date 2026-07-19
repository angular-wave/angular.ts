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

    runtime.module("lazyCompositionProbe", ["ng"]).decorator(_animate, [
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

  it("keeps scope runtime dependencies isolated between top-level runtimes", async () => {
    const firstErrors: unknown[] = [];
    const secondErrors: unknown[] = [];
    const firstRuntime = new Angular();
    const secondRuntime = new Angular();

    runtimes.push(firstRuntime, secondRuntime);

    firstRuntime
      .module("firstRuntime", ["ng"])
      .filter(
        "runtimeOwner",
        () => (value: unknown) => `first:${String(value)}`,
      )
      .decorator("$exceptionHandler", () => (exception: unknown) => {
        firstErrors.push(exception);
      });
    secondRuntime
      .module("secondRuntime", ["ng"])
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
    firstRoot.$watch("value | runtimeOwner", (value) => {
      observed.push(value);
    });
    firstModel.$watch("value | runtimeOwner", (value) => {
      modelObserved.push(value);
    });
    firstRoot.$on("runtime:error", () => {
      throw expectedError;
    });

    firstRoot.$emit("runtime:error");
    await wait();

    expect(observed).toEqual(["first:value"]);
    expect(modelObserved).toEqual(["first:model"]);
    expect(firstErrors).toEqual([expectedError]);
    expect(secondErrors).toEqual([]);
    expect(secondRoot.$handler._parse).not.toBe(firstRoot.$handler._parse);
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
    const retainedScope = rootScope.$new();
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
    expect(retainedScope.$handler._destroyed).toBeTrue();
    expect(retainedElement.isConnected).toBeFalse();

    rootElement.remove();
  });
});
