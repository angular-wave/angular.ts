/// <reference types="jasmine" />
import { AppContext, requireAppRoot } from "./app-context.ts";
import { createScope } from "../scope/scope.ts";
import { isProxy } from "../../shared/utils.ts";

function createRootScope(): ng.Scope {
  return createScope() as ng.Scope;
}

describe("AppContext", () => {
  let context: AppContext;

  beforeEach(() => {
    context = new AppContext();
  });

  it("should create and look up root records by scope", () => {
    const rootScope = createRootScope();
    const record = context.createRoot({ rootScope });

    expect(record.id).toBe("app:1");
    expect(record.rootScope).toBe(rootScope);
    expect(record.scheduler.destroyed).toBeFalse();
    expect(record.generation).toBe(1);
    expect(record.destroyed).toBeFalse();
    expect(context.generation).toBe(1);
    expect(context.roots).toEqual([record]);
    expect(context.getRootByScope(rootScope)).toBe(record);
  });

  it("should give each root a stable DOM scheduler", () => {
    const first = context.createRoot({ rootScope: createRootScope() });
    const second = context.createRoot({ rootScope: createRootScope() });
    const firstScheduler = first.scheduler;
    const calls: string[] = [];

    first.scheduler.schedule(() => {
      calls.push("first");
    });
    first.scheduler.schedule(() => {
      calls.push("second");
    });

    expect(first.scheduler).toBe(firstScheduler);
    expect(second.scheduler).not.toBe(first.scheduler);
    expect(calls).toEqual([]);

    first.scheduler.flush();

    expect(calls).toEqual(["first", "second"]);
  });

  it("should destroy a root DOM scheduler with the root record", () => {
    const record = context.createRoot({ rootScope: createRootScope() });
    const scheduler = record.scheduler;
    const calls: string[] = [];

    scheduler.schedule(() => {
      calls.push("stale");
    });

    context.destroyRoot(record);

    expect(scheduler.destroyed).toBeTrue();

    scheduler.flush();

    expect(calls).toEqual([]);
    expect(() => {
      scheduler.schedule(() => {
        calls.push("late");
      });
    }).toThrowError(
      "Cannot schedule DOM work for a destroyed AppContext root.",
    );
  });

  it("should keep model scheduler separate from root DOM schedulers", () => {
    const root = context.createRoot({ rootScope: createRootScope() });
    const calls: string[] = [];

    context.modelScheduler.schedule(() => {
      calls.push("model");
    });
    root.scheduler.schedule(() => {
      calls.push("dom");
    });

    context.modelScheduler.flush();

    expect(calls).toEqual(["model"]);

    root.scheduler.flush();

    expect(calls).toEqual(["model", "dom"]);

    context.destroyRoot(root);

    expect(root.scheduler.destroyed).toBeTrue();
    expect(context.modelScheduler.destroyed).toBeFalse();

    context.modelScheduler.schedule(() => {
      calls.push("after-root");
    });
    context.modelScheduler.flush();

    expect(calls).toEqual(["model", "dom", "after-root"]);
  });

  it("should not pause app model scheduler work for retained root scope lifecycle events", () => {
    const root = context.createRoot({ rootScope: createRootScope() });
    const calls: string[] = [];

    root.rootScope.$broadcast("$viewRetentionPause", {
      _pause: "schedulers",
    });
    context.modelScheduler.schedule(() => {
      calls.push("model-during-retention-pause");
    });

    context.modelScheduler.flush();

    expect(calls).toEqual(["model-during-retention-pause"]);

    root.rootScope.$broadcast("$viewRetentionResume", {
      _pause: "schedulers",
    });
    context.modelScheduler.schedule(() => {
      calls.push("model-after-retention-resume");
    });

    context.modelScheduler.flush();

    expect(calls).toEqual([
      "model-during-retention-pause",
      "model-after-retention-resume",
    ]);
  });

  it("should reject model scheduler work after app model scheduler destruction", () => {
    const calls: string[] = [];

    context.modelScheduler.schedule(() => {
      calls.push("stale");
    });

    context.modelScheduler.destroy();
    context.modelScheduler.flush();

    expect(context.modelScheduler.destroyed).toBeTrue();
    expect(context.modelScheduler.pending).toBe(0);
    expect(calls).toEqual([]);
    expect(() => {
      context.modelScheduler.schedule(() => {
        calls.push("late");
      });
    }).toThrowError("Cannot schedule model work for a destroyed AppContext.");
  });

  it("should attach injector and root element metadata", () => {
    const rootScope = createRootScope();
    const rootElement = document.createElement("div");
    const injector = {} as ng.InjectorService;
    const record = context.createRoot({ rootScope });

    const attached = context.attachRoot(rootScope, {
      injector,
      rootElement,
    });

    expect(attached).toBe(record);
    expect(record.injector).toBe(injector);
    expect(record.rootElement).toBe(rootElement);
    expect(record.generation).toBe(2);
    expect(context.generation).toBe(2);
    expect(context.getRootByElement(rootElement)).toBe(record);
  });

  it("should attach metadata when createRoot receives an existing scope", () => {
    const rootScope = createRootScope();
    const rootElement = document.createElement("section");
    const record = context.createRoot({ rootScope });
    const attachSpy = jasmine.createSpy("attach");

    context.onRootAttach(attachSpy);

    const nextRecord = context.createRoot({ rootScope, rootElement });

    expect(nextRecord).toBe(record);
    expect(record.rootElement).toBe(rootElement);
    expect(context.roots.length).toBe(1);
    expect(context.getRootByElement(rootElement)).toBe(record);
    expect(attachSpy).not.toHaveBeenCalled();
  });

  it("should support root attach and destroy hooks", () => {
    const rootScope = createRootScope();
    const attachSpy = jasmine.createSpy("attach");
    const destroySpy = jasmine.createSpy("destroy");
    const removeAttach = context.onRootAttach(attachSpy);
    const removeDestroy = context.onRootDestroy(destroySpy);

    const record = context.createRoot({ rootScope });

    expect(attachSpy).toHaveBeenCalledOnceWith(record);

    record.destroy();

    expect(destroySpy).toHaveBeenCalledOnceWith(record);

    removeAttach();
    removeDestroy();

    const nextScope = createRootScope();
    const nextRecord = context.createRoot({ rootScope: nextScope });

    nextRecord.destroy();

    expect(attachSpy).toHaveBeenCalledTimes(1);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it("should support app destroy hook deregistration", () => {
    const appDestroySpy = jasmine.createSpy("appDestroy");
    const removeDestroy = context.onDestroy(appDestroySpy);

    removeDestroy();
    context.destroy();

    expect(appDestroySpy).not.toHaveBeenCalled();
  });

  it("should restore current root after nested operations and thrown errors", () => {
    const first = context.createRoot({ rootScope: createRootScope() });
    const second = context.createRoot({ rootScope: createRootScope() });

    expect(context.getCurrentRoot()).toBeUndefined();

    expect(
      context.runWithRoot(first, () => {
        expect(context.getCurrentRoot()).toBe(first);

        return context.runWithRoot(second, () => {
          expect(context.getCurrentRoot()).toBe(second);

          return "done";
        });
      }),
    ).toBe("done");

    expect(context.getCurrentRoot()).toBeUndefined();

    expect(() => {
      context.runWithRoot(first, () => {
        throw new Error("boom");
      });
    }).toThrowError("boom");

    expect(context.getCurrentRoot()).toBeUndefined();
  });

  it("should remove scope and element indexes when a root is destroyed", () => {
    const rootScope = createRootScope();
    const rootElement = document.createElement("main");
    const record = context.createRoot({ rootScope, rootElement });

    rootScope.$destroy();

    expect(record.destroyed).toBeTrue();
    expect(context.roots).toEqual([]);
    expect(context.getRootByScope(rootScope)).toBeUndefined();
    expect(context.getRootByElement(rootElement)).toBeUndefined();

    record.destroy();

    expect(context.roots).toEqual([]);
  });

  it("should destroy roots by record or scope", () => {
    const first = context.createRoot({ rootScope: createRootScope() });
    const secondScope = createRootScope();
    const second = context.createRoot({ rootScope: secondScope });

    context.destroyRoot(first);
    context.destroyRoot(secondScope);

    expect(first.destroyed).toBeTrue();
    expect(second.destroyed).toBeTrue();
    expect(context.roots).toEqual([]);
  });

  it("should ignore destroy requests for unknown or already destroyed roots", () => {
    const unknownScope = createRootScope();
    const record = context.createRoot({ rootScope: createRootScope() });

    context.destroyRoot(unknownScope);

    expect(context.roots).toEqual([record]);

    context.destroyRoot(record);
    context.destroyRoot(record);

    expect(context.roots).toEqual([]);
  });

  it("should ignore duplicate root destroy notifications", () => {
    const record = context.createRoot({ rootScope: createRootScope() });
    const destroySpy = jasmine.createSpy("destroy");

    context.onRootDestroy(destroySpy);

    record.destroy();
    (
      context as unknown as {
        _markRootDestroyed(root: typeof record): void;
      }
    )._markRootDestroyed(record);

    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(context.roots).toEqual([]);
  });

  it("should destroy the full app context and app-owned resources", () => {
    const firstElement = document.createElement("main");
    const secondElement = document.createElement("section");
    const firstScope = createRootScope();
    const secondScope = createRootScope();
    const first = context.createRoot({
      rootScope: firstScope,
      rootElement: firstElement,
    });
    const second = context.createRoot({
      rootScope: secondScope,
      rootElement: secondElement,
    });
    const model = context.registerModel("session", () => ({ token: "abc" }));
    const detached = context.createReactive({ value: "detached" });
    const rootDestroySpy = jasmine.createSpy("rootDestroy");
    const appDestroySpy = jasmine.createSpy("appDestroy");
    const calls: string[] = [];

    context.onRootDestroy(rootDestroySpy);
    context.onDestroy(appDestroySpy);
    first.scheduler.schedule(() => {
      calls.push("first-dom");
    });
    second.scheduler.schedule(() => {
      calls.push("second-dom");
    });
    context.modelScheduler.schedule(() => {
      calls.push("model");
    });

    context.destroy();

    expect(context.destroyed).toBeTrue();
    expect(context.isDestroyed()).toBeTrue();
    expect(first.destroyed).toBeTrue();
    expect(second.destroyed).toBeTrue();
    expect(firstScope.$handler._destroyed).toBeTrue();
    expect(secondScope.$handler._destroyed).toBeTrue();
    expect(first.scheduler.destroyed).toBeTrue();
    expect(second.scheduler.destroyed).toBeTrue();
    expect(context.modelScheduler.destroyed).toBeTrue();
    expect(context.modelScheduler.pending).toBe(0);
    expect(model.$handler._destroyed).toBeTrue();
    expect(detached.$handler._destroyed).toBeTrue();
    expect(context.roots).toEqual([]);
    expect(context.models.size).toBe(0);
    expect(context.getModel("session")).toBeUndefined();
    expect(context.getRootByScope(firstScope)).toBeUndefined();
    expect(context.getRootByScope(secondScope)).toBeUndefined();
    expect(context.getRootByElement(firstElement)).toBeUndefined();
    expect(context.getRootByElement(secondElement)).toBeUndefined();
    expect(model.token).toBe("abc");
    expect(calls).toEqual([]);
    expect(rootDestroySpy).toHaveBeenCalledTimes(2);
    expect(rootDestroySpy).toHaveBeenCalledWith(first);
    expect(rootDestroySpy).toHaveBeenCalledWith(second);
    expect(appDestroySpy).toHaveBeenCalledTimes(1);

    first.scheduler.flush();
    second.scheduler.flush();
    context.modelScheduler.flush();
    context.destroy();

    expect(calls).toEqual([]);
    expect(rootDestroySpy).toHaveBeenCalledTimes(2);
    expect(appDestroySpy).toHaveBeenCalledTimes(1);
  });

  it("should not destroy reactive models whose ownership was transferred", () => {
    const transferred = context.createReactive({ status: "ready" });

    context._releaseReactive(transferred);
    context.destroy();

    expect(transferred.$handler._destroyed).toBeFalse();
    expect(transferred.status).toBe("ready");

    transferred.$destroy();
  });

  it("should reject new app resources after full context destroy", () => {
    const root = context.createRoot({ rootScope: createRootScope() });

    context.destroy();

    expect(() => {
      context.createRoot({ rootScope: createRootScope() });
    }).toThrowError(
      "Cannot create AppContext roots after AppContext is destroyed.",
    );
    expect(() => {
      context.attachRoot(root, {});
    }).toThrowError(
      "Cannot attach metadata to AppContext roots after AppContext is destroyed.",
    );
    expect(() => {
      context.registerModel("session", () => ({ token: "abc" }));
    }).toThrowError(
      "Cannot register AppContext models after AppContext is destroyed.",
    );
    expect(() => {
      context.createReactive({ token: "abc" });
    }).toThrowError(
      "Cannot create AppContext reactive models after AppContext is destroyed.",
    );
    expect(() => {
      context.setExceptionHandler(() => undefined as never);
    }).toThrowError(
      "Cannot configure AppContext exception handling after AppContext is destroyed.",
    );
    expect(() => {
      context.onDestroy(() => undefined);
    }).toThrowError(
      "Cannot register AppContext destroy hooks after AppContext is destroyed.",
    );
    expect(() => {
      context.modelScheduler.schedule(() => undefined);
    }).toThrowError("Cannot schedule model work for a destroyed AppContext.");

    context.destroyRoot(root);

    expect(context.roots).toEqual([]);
  });

  it("should reject metadata attachment for unknown or destroyed roots", () => {
    const unknownScope = createRootScope();
    const record = context.createRoot({ rootScope: createRootScope() });

    expect(() => {
      context.attachRoot(unknownScope, {});
    }).toThrowError("Cannot attach metadata to an unknown AppContext root.");

    record.destroy();

    expect(() => {
      context.attachRoot(record, {});
    }).toThrowError("Cannot attach metadata to a destroyed AppContext root.");
  });

  it("should reject resolving an app root for an unregistered root scope", () => {
    const rootScope = createRootScope();

    expect(() => {
      requireAppRoot(context, rootScope);
    }).toThrowError(
      "No AppContext root record is registered for the current $rootScope.",
    );

    const registered = context.createRoot({ rootScope });

    expect(requireAppRoot(context, rootScope)).toBe(registered);
  });

  it("should apply scope runtime dependencies to existing and future models", () => {
    const existing = context.createReactive({ value: 0 });
    const runtime = {
      exceptionHandler: (() =>
        undefined as never) as ng.ExceptionHandlerService,
      parse: (() => undefined) as unknown as ng.ParseService,
    };

    context.setScopeRuntime(runtime);
    const future = context.createReactive({ value: 1 });

    expect(existing.value).toBe(0);
    expect(future.value).toBe(1);
  });

  it("should register app-owned reactive models lazily by name", () => {
    const factory = jasmine.createSpy("factory").and.returnValue({
      name: "John",
      authenticated: false,
    });

    const model = context.registerModel("user", factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(isProxy(model)).toBeTrue();
    expect(model.name).toBe("John");
    expect(context.getModel("user")).toBe(model);
    expect(context.models.get("user")).toBe(model);
  });

  it("should create reactive models on the AppContext model scheduler", () => {
    const root = context.createRoot({ rootScope: createRootScope() });
    const user = context.createReactive({ name: "John" });
    const session = context.createReactive({ token: "" });
    const values: string[] = [];

    expect(user.$handler._listenerScheduler).toBe(
      context.modelScheduler._listenerScheduler,
    );
    expect(session.$handler._listenerScheduler).toBe(
      context.modelScheduler._listenerScheduler,
    );

    root.scheduler.schedule(() => {
      values.push("dom");
    });

    context.modelScheduler.schedule(() => {
      values.push(`user:${String(user.name)}`);
    });
    context.modelScheduler.schedule(() => {
      values.push(`session:${String(session.token)}`);
    });

    context.modelScheduler.flush();

    expect(values).toEqual(["user:John", "session:"]);

    context.destroyRoot(root);

    user.name = "Jane";
    session.token = "def";

    context.modelScheduler.schedule(() => {
      values.push(`user:${String(user.name)}`);
    });
    context.modelScheduler.schedule(() => {
      values.push(`session:${String(session.token)}`);
    });

    context.modelScheduler.flush();

    expect(values).toEqual([
      "user:John",
      "session:",
      "user:Jane",
      "session:def",
    ]);
  });

  it("should preserve remaining model scheduler work when the default handler throws", () => {
    const calls: string[] = [];

    context.modelScheduler.schedule(() => {
      calls.push("first");

      throw new Error("model failure");
    });
    context.modelScheduler.schedule(() => {
      calls.push("second");
    });

    expect(() => {
      context.modelScheduler.flush();
    }).toThrowError("model failure");

    expect(calls).toEqual(["first"]);

    context.modelScheduler.flush();

    expect(calls).toEqual(["first", "second"]);
  });

  it("should route model scheduler failures through the app exception boundary", () => {
    const calls: string[] = [];
    const errors: unknown[] = [];

    context.setExceptionHandler((exception) => {
      errors.push(exception);

      return undefined as never;
    });

    context.modelScheduler.schedule(() => {
      calls.push("first");

      throw new Error("model failure");
    });
    context.modelScheduler.schedule(() => {
      calls.push("second");
    });

    context.modelScheduler.flush();

    expect(calls).toEqual(["first", "second"]);
    expect(errors.length).toBe(1);
    expect((errors[0] as Error).message).toBe("model failure");
  });

  it("should return an existing model for the same factory identity", () => {
    const factory = () => ({ count: 0 });
    const model = context.registerModel("counter", factory);

    model.count = 1;

    expect(context.registerModel("counter", factory)).toBe(model);
    expect(factory()).toEqual({ count: 0 });
    expect(context.getModel("counter")?.count).toBe(1);
  });

  it("should reject duplicate model names with different factories", () => {
    context.registerModel("user", () => ({ name: "John" }));

    expect(() => {
      context.registerModel("user", () => ({ name: "Jane" }));
    }).toThrowError("Model 'user' is already registered with this AppContext.");
  });

  it("should reject non-plain model roots", () => {
    class UserModel {
      name = "John";
    }

    expect(() => {
      context.createReactive([] as unknown as Record<string, unknown>);
    }).toThrowError("Reactive app models require a plain object root.");

    expect(() => {
      context.registerModel("classModel", () => new UserModel() as never);
    }).toThrowError(
      "Model 'classModel' must be initialized with a plain object root.",
    );
  });

  it("should keep app-owned models after root destruction", () => {
    const root = context.createRoot({ rootScope: createRootScope() });
    const model = context.registerModel("session", () => ({ token: "abc" }));

    context.destroyRoot(root);

    expect(context.roots).toEqual([]);
    expect(context.getModel("session")).toBe(model);
    expect(model.token).toBe("abc");
  });

  it("should snapshot app models as cloned plain data", () => {
    const model = context.registerModel("player", () => ({
      name: "Ada",
      position: { x: 1, y: 2 },
    }));

    const snapshot = model.$snapshot();
    const target = model.$target as unknown as {
      name: string;
      position: { x: number; y: number };
    };

    expect(snapshot).toEqual({
      name: "Ada",
      position: { x: 1, y: 2 },
    });
    expect(snapshot).not.toBe(target);
    expect(snapshot.position).not.toBe(target.position);
    expect(
      Object.prototype.hasOwnProperty.call(snapshot, "$handler"),
    ).toBeFalse();
    expect(
      Object.prototype.hasOwnProperty.call(model.$target, "$snapshot"),
    ).toBeFalse();
  });

  it("should restore app model snapshots through the reactive proxy", () => {
    const model = context.registerModel("player", () => ({
      name: "Ada",
      score: 1,
      position: { x: 1, y: 2 },
    }));
    const writes: Array<{ snapshot: unknown; change: unknown }> = [];

    model.$sync({
      write(snapshot, change) {
        writes.push({ snapshot, change });
      },
    });

    model.$restore({
      name: "Lin",
      position: { x: 5, y: 6 },
    } as never);
    context.modelScheduler.flush();

    expect(model.name).toBe("Lin");
    expect(model.score).toBeUndefined();
    expect(model.position.x).toBe(5);
    expect(writes).toEqual([
      {
        snapshot: {
          name: "Lin",
          position: { x: 5, y: 6 },
        },
        change: {
          keys: ["score", "name", "position"],
          snapshotVersion: 1,
          origin: undefined,
        },
      },
    ]);

    model.$restore({ score: 9 } as never, { mode: "merge" });
    context.modelScheduler.flush();

    expect(model.name).toBe("Lin");
    expect(model.score).toBe(9);
    expect(writes[1]).toEqual({
      snapshot: {
        name: "Lin",
        score: 9,
        position: { x: 5, y: 6 },
      },
      change: {
        keys: ["score"],
        snapshotVersion: 2,
        origin: undefined,
      },
    });
  });

  it("should synchronize batched whole-model changes with direct targets", () => {
    const model = context.registerModel("player", () => ({
      health: 10,
      score: 0,
    }));
    const writes: Array<{ snapshot: unknown; change: unknown }> = [];

    model.$sync({
      write(snapshot, change) {
        writes.push({ snapshot, change });
      },
    });

    model.health = 9;
    model.score = 1;
    context.modelScheduler.flush();

    expect(writes.length).toBe(1);
    expect(writes[0].snapshot).toEqual({ health: 9, score: 1 });
    expect(writes[0].change).toEqual({
      keys: ["health", "score"],
      snapshotVersion: 1,
      origin: undefined,
    });
  });

  it("should report model sync target failures by default", () => {
    const errors: unknown[] = [];
    const model = context.registerModel("player", () => ({ health: 10 }));

    context.setExceptionHandler((exception) => {
      errors.push(exception);

      return undefined as never;
    });
    model.$sync({
      write() {
        throw new Error("sync failure");
      },
    });

    model.health = 9;
    context.modelScheduler.flush();

    expect(model.health).toBe(9);
    expect((errors[0] as Error).message).toBe("sync failure");
  });

  it("should ignore model sync target failures when configured", () => {
    const errors: unknown[] = [];
    const model = context.registerModel("player", () => ({ health: 10 }));

    context.setExceptionHandler((exception) => {
      errors.push(exception);

      return undefined as never;
    });
    model.$sync(
      {
        write() {
          throw new Error("sync failure");
        },
      },
      { failure: "ignore" },
    );

    model.health = 9;
    context.modelScheduler.flush();

    expect(model.health).toBe(9);
    expect(errors).toEqual([]);
  });

  it("should throw model sync target failures when configured", () => {
    const model = context.registerModel("player", () => ({ health: 10 }));

    model.$sync(
      {
        write() {
          throw new Error("sync failure");
        },
      },
      { failure: "throw" },
    );

    model.health = 9;

    expect(() => context.modelScheduler.flush()).toThrowError("sync failure");
    expect(model.health).toBe(9);
  });

  it("should restore from sync targets and skip echo writes to the same target", () => {
    let applyRemote:
      | ((snapshot: { value: number }, options?: { origin?: string }) => void)
      | undefined;
    const writes: unknown[] = [];
    const model = context.registerModel("counter", () => ({ value: 0 }));

    model.$sync({
      restore() {
        return { value: 1 };
      },
      receive(apply) {
        applyRemote = apply;
        return undefined;
      },
      write(snapshot, change) {
        writes.push({ snapshot, change });
      },
    });

    context.modelScheduler.flush();

    expect(model.value).toBe(1);
    expect(writes).toEqual([]);

    applyRemote?.({ value: 2 });
    context.modelScheduler.flush();

    expect(model.value).toBe(2);
    expect(writes).toEqual([]);
  });

  it("should preserve inbound restore origin while notifying other sync targets", () => {
    let applyRemote:
      | ((snapshot: { value: number }, options?: { origin?: string }) => void)
      | undefined;
    const sourceWrites: unknown[] = [];
    const mirrorWrites: unknown[] = [];
    const model = context.registerModel("counter", () => ({ value: 0 }));

    model.$sync({
      receive(apply) {
        applyRemote = apply;

        return undefined;
      },
      write(snapshot, change) {
        sourceWrites.push({ snapshot, change });
      },
    });
    model.$sync({
      write(snapshot, change) {
        mirrorWrites.push({ snapshot, change });
      },
    });

    applyRemote?.({ value: 5 });
    context.modelScheduler.flush();

    expect(model.value).toBe(5);
    expect(sourceWrites).toEqual([]);
    expect(mirrorWrites).toEqual([
      {
        snapshot: { value: 5 },
        change: {
          keys: ["value"],
          snapshotVersion: 1,
          origin: "model:counter:sync:1",
        },
      },
    ]);
  });

  it("should dispose model sync targets", () => {
    const model = context.registerModel("settings", () => ({ enabled: false }));
    const dispose = jasmine.createSpy("dispose");
    const receiveDispose = jasmine.createSpy("receiveDispose");
    const write = jasmine.createSpy("write");
    const stop = model.$sync({
      receive() {
        return receiveDispose;
      },
      write,
      dispose,
    });

    stop();
    model.enabled = true;
    context.modelScheduler.flush();

    expect(receiveDispose).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(write).not.toHaveBeenCalled();
  });

  it("should support receive-only targets and report asynchronous write failures", async () => {
    const errors: unknown[] = [];
    const model = context.registerModel("player", () => ({ score: 0 }));

    context.setExceptionHandler((exception) => {
      errors.push(exception);

      return undefined as never;
    });
    model.$sync({ receive: () => undefined });
    model.$sync({
      write: () => Promise.reject(new Error("async write failure")),
    });

    model.score = 1;
    context.modelScheduler.flush();
    await Promise.resolve();
    await Promise.resolve();

    expect(model.score).toBe(1);
    expect((errors[0] as Error).message).toBe("async write failure");
  });

  it("should report receive and restore setup failures", async () => {
    const errors: unknown[] = [];
    const model = context.registerModel("player", () => ({ score: 0 }));

    context.setExceptionHandler((exception) => {
      errors.push(exception);

      return undefined as never;
    });
    model.$sync({
      receive() {
        throw new Error("receive failure");
      },
      restore() {
        throw new Error("restore failure");
      },
    });
    model.$sync({
      restore: () => Promise.reject(new Error("async restore failure")),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(errors.map((error) => (error as Error).message)).toEqual([
      "receive failure",
      "restore failure",
      "async restore failure",
    ]);
  });

  it("should apply asynchronous restores and ignore empty or disposed restores", async () => {
    let resolveLate!: (snapshot: { value: number }) => void;
    const lateRestore = new Promise<{ value: number }>((resolve) => {
      resolveLate = resolve;
    });
    const model = context.registerModel("counter", () => ({ value: 0 }));

    model.$sync({ restore: async () => ({ value: 1 }) });
    model.$sync({ restore: async () => null });
    const stopLate = model.$sync({ restore: () => lateRestore });

    stopLate();
    resolveLate({ value: 9 });
    await Promise.resolve();
    await Promise.resolve();
    context.modelScheduler.flush();

    expect(model.value).toBe(1);
  });

  it("should ignore inbound updates after target disposal", () => {
    let applyRemote!: (snapshot: { value: number }) => void;
    const model = context.registerModel("counter", () => ({ value: 0 }));
    const stop = model.$sync({
      receive(apply) {
        applyRemote = apply;

        return undefined;
      },
    });

    stop();
    applyRemote({ value: 2 });
    context.modelScheduler.flush();

    expect(model.value).toBe(0);
  });

  it("should dispose active targets with the model and report teardown failures", () => {
    const errors: unknown[] = [];
    const model = context.registerModel("settings", () => ({ enabled: false }));

    context.setExceptionHandler((exception) => {
      errors.push(exception);

      return undefined as never;
    });
    const stop = model.$sync({
      receive() {
        return () => {
          throw new Error("receive dispose failure");
        };
      },
      dispose() {
        throw new Error("target dispose failure");
      },
    });

    model.$destroy();
    stop();

    expect(errors.map((error) => (error as Error).message)).toEqual([
      "receive dispose failure",
      "target dispose failure",
    ]);
  });

  it("should validate injectable model sync targets", () => {
    const detached = context.createReactive({ value: 0 });
    const invalidInjector = {
      invoke: jasmine.createSpy("invoke").and.returnValue(null),
    } as unknown as ng.InjectorService;
    const injected = context.registerModel("injected", () => ({ value: 0 }), {
      injector: invalidInjector,
    });

    expect(() => detached.$sync("namedTarget" as never)).toThrowError(
      "Model sync targets must be objects or injectable factories, not service-name strings.",
    );
    expect(() => detached.$sync((() => ({})) as never)).toThrowError(
      "Injectable model sync targets require the model to be created by an injector.",
    );
    expect(() => injected.$sync((() => ({})) as never)).toThrowError(
      "Injectable model sync target must resolve to an object.",
    );

    const write = jasmine.createSpy("write");
    const validInjector = {
      invoke: jasmine.createSpy("invoke").and.returnValue({ write }),
    } as unknown as ng.InjectorService;
    const valid = context.registerModel("validInjected", () => ({ value: 0 }), {
      injector: validInjector,
    });
    const injectableTarget = () => ({ write });
    const stopInjected = valid.$sync(injectableTarget as never);

    valid.value = 1;
    context.modelScheduler.flush();

    expect(validInjector.invoke).toHaveBeenCalledOnceWith(injectableTarget);
    expect(write).toHaveBeenCalled();

    stopInjected();

    const stop = detached.$sync({ write: () => undefined });

    detached.value = 1;
    context.modelScheduler.flush();
    stop();
  });
});
