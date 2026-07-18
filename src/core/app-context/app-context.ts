import {
  deleteProperty,
  isArray,
  isFunction,
  isObject,
  isPromiseLike,
  isString,
} from "../../shared/utils.ts";
import type { Injectable } from "../../interface.ts";
import {
  createScope,
  createScopeListenerScheduler,
  Scope,
  type ModelChangeTracker,
  type ScopeListenerScheduler,
  type ScopeRuntimeDependencies,
} from "../scope/scope.ts";

export interface AppRootAttachOptions {
  injector?: ng.InjectorService;
  rootElement?: Element | Document;
}

/** @inline */
export type ModelState = Record<string, unknown>;

export type ModelStateFactory<T extends ModelState> = () => T;

export interface ModelRestoreOptions {
  origin?: string;
  mode?: "replace" | "merge";
}

export interface ModelChange {
  origin?: string;
  keys: string[];
  snapshotVersion: number;
}

export interface ModelSyncTarget<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  restore?(): T | null | undefined | Promise<T | null | undefined>;
  write?(snapshot: T, change: ModelChange): void | Promise<void>;
  receive?(
    apply: (snapshot: T, options?: ModelRestoreOptions) => void,
  ): undefined | (() => void);
  dispose?(): void;
}

export type ModelSyncFailureMode = "report" | "throw" | "ignore";

export interface ModelSyncOptions {
  failure?: ModelSyncFailureMode;
}

type ModelSyncTargetFactory<T extends ModelState = ModelState> = (
  ...args: never[]
) => ModelSyncTarget<T>;

type ModelSyncTargetInput<T extends ModelState = ModelState> =
  | ModelSyncTarget<T>
  | Injectable<ModelSyncTargetFactory<T>>;

export interface AppRootCreateOptions extends AppRootAttachOptions {
  rootScope: ng.Scope;
}

export interface RootDomScheduler {
  readonly destroyed: boolean;
  schedule(operation: () => void): void;
  flush(): void;
  destroy(): void;
}

export interface AppModelScheduler {
  readonly destroyed: boolean;
  readonly pending: number;
  /** @internal */
  readonly _listenerScheduler: ScopeListenerScheduler;
  schedule(operation: () => void): void;
  flush(): void;
  destroy(): void;
}

export interface AppRootRecord {
  readonly id: string;
  readonly rootScope: ng.Scope;
  readonly scheduler: RootDomScheduler;
  injector?: ng.InjectorService;
  rootElement?: Element | Document;
  generation: number;
  destroyed: boolean;
  destroy(): void;
}

/** @internal */
export function requireAppRoot(
  appContext: AppContext,
  rootScope: ng.Scope,
): AppRootRecord {
  const root = appContext.getRootByScope(rootScope);

  if (!root) {
    throw new Error(
      "No AppContext root record is registered for the current $rootScope.",
    );
  }

  return root;
}

type RootHook = (root: AppRootRecord) => void;
type AppDestroyHook = () => void;

export type Model<T extends Record<string, unknown> = Record<string, unknown>> =
  T &
    ng.Scope & {
      $snapshot(): T;
      $restore(snapshot: T, options?: ModelRestoreOptions): void;
      $sync(
        target:
          | ModelSyncTarget<T>
          | Injectable<(...args: never[]) => ModelSyncTarget<T>>,
        options?: ModelSyncOptions,
      ): () => void;
    };

interface AppModelRegisterOptions {
  injector?: ng.InjectorService;
}

interface ModelSyncRecord<T extends ModelState> {
  origin: string;
  target: ModelSyncTarget<T>;
  failure: ModelSyncFailureMode;
  receiveDisposer?: () => void;
  disposed: boolean;
}

export class AppContext {
  readonly modelScheduler: AppModelScheduler;

  /** @internal */
  private _exceptionHandler: ng.ExceptionHandlerService = (exception) => {
    throw exception;
  };

  /** @internal */
  private _scopeRuntime: ScopeRuntimeDependencies | undefined;

  /** @internal */
  private readonly _modelFactories = new Map<
    string,
    ModelStateFactory<ModelState>
  >();
  /** @internal */
  private readonly _models = new Map<string, Model>();
  /** @internal */
  private readonly _reactiveModels = new Set<Model>();
  /** @internal */
  private readonly _roots: AppRootRecord[] = [];
  /** @internal */
  private readonly _rootsByElement = new WeakMap<
    Element | Document,
    AppRootRecord
  >();
  /** @internal */
  private readonly _rootsByScope = new WeakMap<ng.Scope, AppRootRecord>();
  /** @internal */
  private readonly _attachHooks: RootHook[] = [];
  /** @internal */
  private readonly _destroyHooks: RootHook[] = [];
  /** @internal */
  private readonly _appDestroyHooks: AppDestroyHook[] = [];
  /** @internal */
  private _nextRootId = 1;
  /** @internal */
  private _currentRoot: AppRootRecord | undefined;

  generation = 0;
  destroyed = false;

  constructor() {
    this.modelScheduler = createAppModelScheduler((exception) => {
      (this._exceptionHandler as (exception: unknown) => unknown)(exception);
    });
  }

  get roots(): readonly AppRootRecord[] {
    return this._roots;
  }

  get models(): ReadonlyMap<string, Model> {
    return this._models;
  }

  getCurrentRoot(): AppRootRecord | undefined {
    return this._currentRoot;
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  setExceptionHandler(exceptionHandler: ng.ExceptionHandlerService): void {
    this._assertAlive("configure AppContext exception handling");
    this._exceptionHandler = exceptionHandler;
  }

  /** @internal */
  setScopeRuntime(runtime: ScopeRuntimeDependencies): void {
    this.setExceptionHandler(runtime.exceptionHandler);
    this._scopeRuntime = runtime;

    this._reactiveModels.forEach((model) => {
      model.$handler._setRuntimeDependencies(runtime);
    });
  }

  runWithRoot<T>(root: AppRootRecord, operation: () => T): T {
    this._assertAlive("run AppContext root work");

    const previousRoot = this._currentRoot;

    this._currentRoot = root;

    try {
      return operation();
    } finally {
      this._currentRoot = previousRoot;
    }
  }

  createRoot(options: AppRootCreateOptions): AppRootRecord {
    this._assertAlive("create AppContext roots");

    const existingRoot = this._rootsByScope.get(options.rootScope);

    if (existingRoot) {
      return this.attachRoot(existingRoot, options);
    }

    const root: AppRootRecord = {
      id: `app:${String(this._nextRootId++)}`,
      rootScope: options.rootScope,
      scheduler: createRootDomScheduler(),
      injector: options.injector,
      rootElement: options.rootElement,
      generation: ++this.generation,
      destroyed: false,
      destroy: () => {
        if (root.destroyed) {
          return;
        }

        root.rootScope.$destroy();
      },
    };

    this._roots.push(root);
    this._rootsByScope.set(root.rootScope, root);

    if (root.rootElement) {
      this._rootsByElement.set(root.rootElement, root);
    }

    root.rootScope.$on("$destroy", () => {
      this._markRootDestroyed(root);
    });

    this._notify(this._attachHooks, root);

    return root;
  }

  attachRoot(
    rootOrScope: AppRootRecord | ng.Scope,
    options: AppRootAttachOptions,
  ): AppRootRecord {
    this._assertAlive("attach metadata to AppContext roots");

    const root = this._resolveRoot(rootOrScope);

    if (!root) {
      throw new Error("Cannot attach metadata to an unknown AppContext root.");
    }

    if (root.destroyed) {
      throw new Error("Cannot attach metadata to a destroyed AppContext root.");
    }

    if (options.injector) {
      root.injector = options.injector;
    }

    if (options.rootElement) {
      root.rootElement = options.rootElement;
      this._rootsByElement.set(options.rootElement, root);
    }

    root.generation = ++this.generation;

    return root;
  }

  registerModel<T extends ModelState>(
    name: string,
    factory: ModelStateFactory<T>,
    options: AppModelRegisterOptions = {},
  ): Model<T> {
    this._assertAlive("register AppContext models");

    const existingFactory = this._modelFactories.get(name);

    if (existingFactory) {
      if (existingFactory !== factory) {
        throw new Error(
          `Model '${name}' is already registered with this AppContext.`,
        );
      }

      return this._models.get(name) as Model<T>;
    }

    const initial = factory();

    if (!isPlainModelRoot(initial)) {
      throw new Error(
        `Model '${name}' must be initialized with a plain object root.`,
      );
    }

    const model = this.createReactive(initial, {
      injector: options.injector,
      name,
    });

    this._modelFactories.set(name, factory as ModelStateFactory<ModelState>);
    this._models.set(name, model);
    this.generation++;

    return model;
  }

  getModel<T extends ModelState>(name: string): Model<T> | undefined {
    return this._models.get(name) as Model<T> | undefined;
  }

  createReactive<T extends ModelState>(
    target: T,
    options: AppModelRegisterOptions & { name?: string } = {},
  ): Model<T> {
    this._assertAlive("create AppContext reactive models");

    if (!isPlainModelRoot(target)) {
      throw new Error("Reactive app models require a plain object root.");
    }

    const model = createScope(
      target,
      undefined,
      this.modelScheduler._listenerScheduler,
    ) as Model<T>;

    if (this._scopeRuntime) {
      model.$handler._setRuntimeDependencies(this._scopeRuntime);
    }

    attachModelLifecycle(this, model, options);
    this._reactiveModels.add(model as Model);

    return model;
  }

  /** @internal Transfers lifecycle ownership of an anonymous model to its caller. */
  _releaseReactive(model: Model): void {
    this._reactiveModels.delete(model);
  }

  /** @internal */
  _reportModelException(exception: unknown): void {
    (this._exceptionHandler as (exception: unknown) => unknown)(exception);
  }

  getRootByElement(element: Element | Document): AppRootRecord | undefined {
    return this._rootsByElement.get(element);
  }

  getRootByScope(scope: ng.Scope): AppRootRecord | undefined {
    return this._rootsByScope.get(scope);
  }

  destroyRoot(rootOrScope: AppRootRecord | ng.Scope): void {
    if (this.destroyed) {
      return;
    }

    const root = this._resolveRoot(rootOrScope);

    if (!root || root.destroyed) {
      return;
    }

    root.destroy();
  }

  onDestroy(callback: AppDestroyHook): () => void {
    this._assertAlive("register AppContext destroy hooks");
    this._appDestroyHooks.push(callback);

    return () => {
      this._removeHook(this._appDestroyHooks, callback);
    };
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    const roots = this._roots.slice();
    this.destroyed = true;

    for (let i = 0, l = roots.length; i < l; i++) {
      roots[i].destroy();
    }

    const reactiveModels = Array.from(this._reactiveModels);

    for (let i = 0, l = reactiveModels.length; i < l; i++) {
      reactiveModels[i].$destroy();
    }

    this.modelScheduler.destroy();
    this._models.clear();
    this._modelFactories.clear();
    this._reactiveModels.clear();
    this._currentRoot = undefined;
    this.generation++;

    const callbacks = this._appDestroyHooks.slice();

    this._appDestroyHooks.length = 0;
    this._attachHooks.length = 0;
    this._destroyHooks.length = 0;

    for (let i = 0, l = callbacks.length; i < l; i++) {
      callbacks[i]();
    }
  }

  onRootAttach(callback: RootHook): () => void {
    this._assertAlive("register AppContext root attach hooks");
    this._attachHooks.push(callback);

    return () => {
      this._removeHook(this._attachHooks, callback);
    };
  }

  onRootDestroy(callback: RootHook): () => void {
    this._assertAlive("register AppContext root destroy hooks");
    this._destroyHooks.push(callback);

    return () => {
      this._removeHook(this._destroyHooks, callback);
    };
  }

  /** @internal */
  private _assertAlive(operation: string): void {
    if (this.destroyed) {
      throw new Error(`Cannot ${operation} after AppContext is destroyed.`);
    }
  }

  /** @internal */
  private _resolveRoot(
    rootOrScope: AppRootRecord | ng.Scope,
  ): AppRootRecord | undefined {
    return this._isRootRecord(rootOrScope)
      ? rootOrScope
      : this._rootsByScope.get(rootOrScope);
  }

  /** @internal */
  private _isRootRecord(
    value: AppRootRecord | ng.Scope,
  ): value is AppRootRecord {
    const candidate = value as Partial<AppRootRecord>;

    return (
      typeof candidate.id === "string" &&
      typeof candidate.destroy === "function" &&
      typeof candidate.generation === "number" &&
      typeof candidate.destroyed === "boolean" &&
      !!candidate.rootScope
    );
  }

  /** @internal */
  private _markRootDestroyed(root: AppRootRecord): void {
    if (root.destroyed) {
      return;
    }

    root.destroyed = true;
    root.generation = ++this.generation;
    root.scheduler.destroy();

    const index = this._roots.indexOf(root);

    if (index >= 0) {
      this._roots.splice(index, 1);
    }

    this._rootsByScope.delete(root.rootScope);

    if (root.rootElement) {
      this._rootsByElement.delete(root.rootElement);
    }

    this._notify(this._destroyHooks, root);
  }

  /** @internal */
  private _notify(hooks: RootHook[], root: AppRootRecord): void {
    const callbacks = hooks.slice();

    for (let i = 0, l = callbacks.length; i < l; i++) {
      callbacks[i](root);
    }
  }

  /** @internal */
  private _removeHook<T>(hooks: T[], callback: T): void {
    const index = hooks.indexOf(callback);

    if (index >= 0) {
      hooks.splice(index, 1);
    }
  }
}

function isPlainModelRoot(value: unknown): value is ModelState {
  if (!isObject(value) || isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function attachModelLifecycle<T extends ModelState>(
  context: AppContext,
  model: Model<T>,
  options: AppModelRegisterOptions & { name?: string },
): void {
  const handler = model.$handler as Scope;
  const target = model.$target as T;
  const syncRecords = new Set<ModelSyncRecord<T>>();
  const pendingKeys = new Set<string>();
  let pendingOrigin: string | undefined;
  let scheduled = false;
  let snapshotVersion = 0;
  let currentOrigin: string | undefined;
  let nextSyncId = 1;

  const snapshot = (): T => cloneModelData(target);

  const flushChanges = (): void => {
    scheduled = false;

    if (pendingKeys.size === 0 || syncRecords.size === 0) {
      pendingKeys.clear();
      pendingOrigin = undefined;
      return;
    }

    const change: ModelChange = {
      origin: pendingOrigin,
      keys: Array.from(pendingKeys),
      snapshotVersion: ++snapshotVersion,
    };

    pendingKeys.clear();
    pendingOrigin = undefined;

    const currentSnapshot = snapshot();

    for (const record of Array.from(syncRecords)) {
      if (record.disposed || record.origin === change.origin) {
        continue;
      }

      if (!record.target.write) {
        continue;
      }

      try {
        const result = record.target.write(currentSnapshot, change);

        if (isPromiseLike(result)) {
          Promise.resolve(result).catch((exception: unknown) => {
            handleModelSyncException(context, record, exception);
          });
        }
      } catch (exception) {
        handleModelSyncException(context, record, exception);
      }
    }
  };

  const tracker: ModelChangeTracker = {
    record(property) {
      pendingKeys.add(String(property));
      pendingOrigin ??= currentOrigin;

      if (!scheduled) {
        scheduled = true;
        context.modelScheduler.schedule(flushChanges);
      }
    },
  };

  handler._modelChangeTracker = tracker;
  model.$on("$destroy", () => {
    context._releaseReactive(model);

    for (const record of Array.from(syncRecords)) {
      disposeModelSyncRecord(context, syncRecords, record);
    }
  });
  handler._propertyMap.$snapshot = snapshot;
  handler._propertyMap.$restore = (
    incoming: T,
    restoreOptions: ModelRestoreOptions = {},
  ): void => {
    assertPlainModelSnapshot(incoming);
    const normalizedRestoreOptions =
      normalizeModelRestoreOptions(restoreOptions);
    const next = cloneModelData(incoming);
    const previousOrigin = currentOrigin;

    currentOrigin = normalizedRestoreOptions.origin;

    try {
      model.$batch(() => {
        if (normalizedRestoreOptions.mode !== "merge") {
          const currentKeys = Object.keys(target);

          for (let i = 0, l = currentKeys.length; i < l; i++) {
            const key = currentKeys[i];

            if (!Object.prototype.hasOwnProperty.call(next, key)) {
              deleteProperty(model as Record<string, unknown>, key);
            }
          }
        }

        const nextRecord = next as Record<string, unknown>;

        for (const key of Object.keys(nextRecord)) {
          (model as Record<string, unknown>)[key] = nextRecord[key];
        }
      });
    } finally {
      currentOrigin = previousOrigin;
    }
  };
  handler._propertyMap.$sync = (
    input: ModelSyncTargetInput<T>,
    syncOptions: ModelSyncOptions = {},
  ): (() => void) => {
    const origin = createModelSyncOrigin(options.name, nextSyncId++);
    const failure = normalizeModelSyncFailureMode(syncOptions);
    const syncTarget = resolveModelSyncTarget(input, options.injector);
    const record: ModelSyncRecord<T> = {
      origin,
      target: syncTarget,
      failure,
      disposed: false,
    };

    syncRecords.add(record);

    if (syncTarget.receive) {
      try {
        const disposer = syncTarget.receive((incoming, restoreOptions = {}) => {
          if (record.disposed) {
            return;
          }

          try {
            const normalizedRestoreOptions =
              normalizeModelRestoreOptions(restoreOptions);

            model.$restore(incoming, {
              ...normalizedRestoreOptions,
              origin: normalizedRestoreOptions.origin ?? origin,
            });
          } catch (exception) {
            handleModelSyncException(context, record, exception);
          }
        });

        if (disposer !== undefined && !isFunction(disposer)) {
          throw new Error(
            "Model sync target receive() must return a disposer function or undefined.",
          );
        }

        if (disposer) {
          record.receiveDisposer = disposer;
        }
      } catch (exception) {
        handleModelSyncException(context, record, exception);
      }
    }

    if (syncTarget.restore) {
      try {
        const result = syncTarget.restore();

        const applyRestored = (incoming: T | null | undefined): void => {
          if (record.disposed || incoming == null) {
            return;
          }

          model.$restore(incoming, { origin });
        };

        if (isPromiseLike(result)) {
          Promise.resolve(result)
            .then(applyRestored)
            .catch((exception: unknown) => {
              handleModelSyncException(context, record, exception);
            });
        } else {
          applyRestored(result);
        }
      } catch (exception) {
        handleModelSyncException(context, record, exception);
      }
    }

    return () => {
      disposeModelSyncRecord(context, syncRecords, record);
    };
  };
}

function cloneModelData<T>(value: T): T {
  return structuredClone(value);
}

function createModelSyncOrigin(name: string | undefined, id: number): string {
  return `model:${name ?? "anonymous"}:sync:${String(id)}`;
}

function resolveModelSyncTarget<T extends ModelState>(
  input: ModelSyncTargetInput<T>,
  injector: ng.InjectorService | undefined,
): ModelSyncTarget<T> {
  if (isString(input)) {
    throw new Error(
      "Model sync targets must be objects or injectable factories, not service-name strings.",
    );
  }

  if (isModelSyncTarget(input)) {
    assertModelSyncTarget(input, "Model sync target");

    return input;
  }

  if (!injector) {
    throw new Error(
      "Injectable model sync targets require the model to be created by an injector.",
    );
  }

  const resolved = injector.invoke(input);

  if (!isModelSyncTarget(resolved)) {
    throw new Error("Injectable model sync target must resolve to an object.");
  }

  assertModelSyncTarget(resolved, "Injectable model sync target");

  return resolved;
}

function assertModelSyncTarget<T extends ModelState>(
  target: ModelSyncTarget<T>,
  label: string,
): void {
  const operationNames = ["restore", "write", "receive", "dispose"] as const;
  let operationCount = 0;

  for (const operationName of operationNames) {
    const operation = target[operationName];

    if (operation === undefined) {
      continue;
    }

    if (!isFunction(operation)) {
      throw new Error(`${label} ${operationName} must be a function.`);
    }

    operationCount++;
  }

  if (operationCount === 0) {
    throw new Error(
      `${label} must implement restore, write, receive, or dispose.`,
    );
  }
}

function normalizeModelSyncFailureMode(options: unknown): ModelSyncFailureMode {
  if (!isObject(options) || isArray(options)) {
    throw new Error("Model sync options must be an object.");
  }

  const failure = (options as { failure?: unknown }).failure ?? "report";

  if (failure !== "report" && failure !== "throw" && failure !== "ignore") {
    throw new Error(
      'Model sync failure must be "report", "throw", or "ignore".',
    );
  }

  return failure;
}

function normalizeModelRestoreOptions(options: unknown): ModelRestoreOptions {
  if (!isObject(options) || isArray(options)) {
    throw new Error("Model restore options must be an object.");
  }

  const candidate = options as { mode?: unknown; origin?: unknown };

  if (
    candidate.mode !== undefined &&
    candidate.mode !== "replace" &&
    candidate.mode !== "merge"
  ) {
    throw new Error('Model restore mode must be "replace" or "merge".');
  }

  if (candidate.origin !== undefined && !isString(candidate.origin)) {
    throw new Error("Model restore origin must be a string.");
  }

  return candidate as ModelRestoreOptions;
}

function assertPlainModelSnapshot(
  snapshot: unknown,
): asserts snapshot is ModelState {
  if (!isPlainModelRoot(snapshot)) {
    throw new Error("Model restore snapshot must be a plain object.");
  }
}

function disposeModelSyncRecord<T extends ModelState>(
  context: AppContext,
  records: Set<ModelSyncRecord<T>>,
  record: ModelSyncRecord<T>,
): void {
  if (record.disposed) {
    return;
  }

  record.disposed = true;
  records.delete(record);

  try {
    record.receiveDisposer?.();
  } catch (exception) {
    handleModelSyncException(context, record, exception);
  }

  try {
    record.target.dispose?.();
  } catch (exception) {
    handleModelSyncException(context, record, exception);
  }
}

function isModelSyncTarget<T extends ModelState>(
  value: unknown,
): value is ModelSyncTarget<T> {
  return !isArray(value) && isObject(value);
}

function handleModelSyncException<T extends ModelState>(
  context: AppContext,
  record: ModelSyncRecord<T>,
  exception: unknown,
): void {
  if (record.failure === "ignore") {
    return;
  }

  if (record.failure === "throw") {
    throw exception;
  }

  context._reportModelException(exception);
}

function createRootDomScheduler(): RootDomScheduler {
  const queue: Array<() => void> = [];
  let destroyed = false;

  return {
    get destroyed(): boolean {
      return destroyed;
    },

    schedule(operation: () => void): void {
      if (destroyed) {
        throw new Error(
          "Cannot schedule DOM work for a destroyed AppContext root.",
        );
      }

      queue.push(operation);
    },

    flush(): void {
      while (queue.length) {
        const operation = queue.shift();

        operation?.();
      }
    },

    destroy(): void {
      destroyed = true;
      queue.length = 0;
    },
  };
}

function createAppModelScheduler(
  handleError: (exception: unknown) => void,
): AppModelScheduler {
  const listenerScheduler = createScopeListenerScheduler();
  const owner = new Scope(undefined, undefined, listenerScheduler);
  let destroyed = false;

  return {
    get destroyed(): boolean {
      return destroyed;
    },

    get pending(): number {
      return listenerScheduler._queue.length - listenerScheduler._index;
    },

    get _listenerScheduler(): ScopeListenerScheduler {
      return listenerScheduler;
    },

    schedule(operation: () => void): void {
      if (destroyed) {
        throw new Error(
          "Cannot schedule model work for a destroyed AppContext.",
        );
      }

      owner._scheduleCallback(() => {
        try {
          operation();
        } catch (exception) {
          handleError(exception);
        }
      });
    },

    flush(): void {
      if (!destroyed) {
        owner._flushScheduledTasks();
      }
    },

    destroy(): void {
      destroyed = true;
      listenerScheduler._queue.length = 0;
      listenerScheduler._index = 0;
      listenerScheduler._queued = false;
      listenerScheduler._flushing = false;
      listenerScheduler._batchDepth = 0;
    },
  };
}
