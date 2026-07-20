import { isObject, isArray, deleteProperty, isFunction, isPromiseLike, isString } from '../../shared/utils.js';
import { createScope, Scope, createScopeListenerScheduler } from '../scope/scope.js';

/** @internal */
function requireAppRoot(appContext, rootScope) {
    const root = appContext.getRootByScope(rootScope);
    if (!root) {
        throw new Error("No AppContext root record is registered for the current $rootScope.");
    }
    return root;
}
class AppContext {
    constructor() {
        /** @internal */
        this._exceptionHandler = (exception) => {
            throw exception;
        };
        /** @internal */
        this._modelFactories = new Map();
        /** @internal */
        this._models = new Map();
        /** @internal */
        this._reactiveModels = new Set();
        /** @internal */
        this._roots = [];
        /** @internal */
        this._rootsByElement = new WeakMap();
        /** @internal */
        this._rootsByScope = new WeakMap();
        /** @internal */
        this._attachHooks = [];
        /** @internal */
        this._destroyHooks = [];
        /** @internal */
        this._appDestroyHooks = [];
        /** @internal */
        this._nextRootId = 1;
        this.generation = 0;
        this.destroyed = false;
        this.modelScheduler = createAppModelScheduler((exception) => {
            this._exceptionHandler(exception);
        });
    }
    get roots() {
        return this._roots;
    }
    get models() {
        return this._models;
    }
    getCurrentRoot() {
        return this._currentRoot;
    }
    isDestroyed() {
        return this.destroyed;
    }
    setExceptionHandler(exceptionHandler) {
        this._assertAlive("configure AppContext exception handling");
        this._exceptionHandler = exceptionHandler;
    }
    /** @internal */
    setScopeRuntime(runtime) {
        this.setExceptionHandler(runtime.exceptionHandler);
        this._scopeRuntime = runtime;
        this._reactiveModels.forEach((model) => {
            model.$handler._setRuntimeDependencies(runtime);
        });
    }
    runWithRoot(root, operation) {
        this._assertAlive("run AppContext root work");
        const previousRoot = this._currentRoot;
        this._currentRoot = root;
        try {
            return operation();
        }
        finally {
            this._currentRoot = previousRoot;
        }
    }
    createRoot(options) {
        this._assertAlive("create AppContext roots");
        const existingRoot = this._rootsByScope.get(options.rootScope);
        if (existingRoot) {
            return this.attachRoot(existingRoot, options);
        }
        const root = {
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
    attachRoot(rootOrScope, options) {
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
    registerModel(name, factory, options = {}) {
        this._assertAlive("register AppContext models");
        const existingFactory = this._modelFactories.get(name);
        if (existingFactory) {
            if (existingFactory !== factory) {
                throw new Error(`Model '${name}' is already registered with this AppContext.`);
            }
            return this._models.get(name);
        }
        const initial = factory();
        if (!isPlainModelRoot(initial)) {
            throw new Error(`Model '${name}' must be initialized with a plain object root.`);
        }
        const model = this.createReactive(initial, {
            injector: options.injector,
            name,
        });
        this._modelFactories.set(name, factory);
        this._models.set(name, model);
        this.generation++;
        return model;
    }
    getModel(name) {
        return this._models.get(name);
    }
    createReactive(target, options = {}) {
        this._assertAlive("create AppContext reactive models");
        if (!isPlainModelRoot(target)) {
            throw new Error("Reactive app models require a plain object root.");
        }
        const model = createScope(target, undefined, this.modelScheduler._listenerScheduler);
        if (this._scopeRuntime) {
            model.$handler._setRuntimeDependencies(this._scopeRuntime);
        }
        attachModelLifecycle(this, model, options);
        this._reactiveModels.add(model);
        return model;
    }
    /** @internal Transfers lifecycle ownership of an anonymous model to its caller. */
    _releaseReactive(model) {
        this._reactiveModels.delete(model);
    }
    /** @internal */
    _reportModelException(exception) {
        this._exceptionHandler(exception);
    }
    getRootByElement(element) {
        return this._rootsByElement.get(element);
    }
    getRootByScope(scope) {
        return this._rootsByScope.get(scope);
    }
    destroyRoot(rootOrScope) {
        if (this.destroyed) {
            return;
        }
        const root = this._resolveRoot(rootOrScope);
        if (!root || root.destroyed) {
            return;
        }
        root.destroy();
    }
    onDestroy(callback) {
        this._assertAlive("register AppContext destroy hooks");
        this._appDestroyHooks.push(callback);
        return () => {
            this._removeHook(this._appDestroyHooks, callback);
        };
    }
    destroy() {
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
    onRootAttach(callback) {
        this._assertAlive("register AppContext root attach hooks");
        this._attachHooks.push(callback);
        return () => {
            this._removeHook(this._attachHooks, callback);
        };
    }
    onRootDestroy(callback) {
        this._assertAlive("register AppContext root destroy hooks");
        this._destroyHooks.push(callback);
        return () => {
            this._removeHook(this._destroyHooks, callback);
        };
    }
    /** @internal */
    _assertAlive(operation) {
        if (this.destroyed) {
            throw new Error(`Cannot ${operation} after AppContext is destroyed.`);
        }
    }
    /** @internal */
    _resolveRoot(rootOrScope) {
        return this._isRootRecord(rootOrScope)
            ? rootOrScope
            : this._rootsByScope.get(rootOrScope);
    }
    /** @internal */
    _isRootRecord(value) {
        const candidate = value;
        return (typeof candidate.id === "string" &&
            typeof candidate.destroy === "function" &&
            typeof candidate.generation === "number" &&
            typeof candidate.destroyed === "boolean" &&
            !!candidate.rootScope);
    }
    /** @internal */
    _markRootDestroyed(root) {
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
    _notify(hooks, root) {
        const callbacks = hooks.slice();
        for (let i = 0, l = callbacks.length; i < l; i++) {
            callbacks[i](root);
        }
    }
    /** @internal */
    _removeHook(hooks, callback) {
        const index = hooks.indexOf(callback);
        if (index >= 0) {
            hooks.splice(index, 1);
        }
    }
}
function isPlainModelRoot(value) {
    if (!isObject(value) || isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function attachModelLifecycle(context, model, options) {
    const handler = model.$handler;
    const target = model.$target;
    const syncRecords = new Set();
    const pendingKeys = new Set();
    let pendingOrigin;
    let scheduled = false;
    let snapshotVersion = 0;
    let currentOrigin;
    let nextSyncId = 1;
    const snapshot = () => cloneModelData(target);
    const flushChanges = () => {
        scheduled = false;
        if (pendingKeys.size === 0 || syncRecords.size === 0) {
            pendingKeys.clear();
            pendingOrigin = undefined;
            return;
        }
        const change = {
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
                    Promise.resolve(result).catch((exception) => {
                        handleModelSyncException(context, record, exception);
                    });
                }
            }
            catch (exception) {
                handleModelSyncException(context, record, exception);
            }
        }
    };
    const tracker = {
        record(property) {
            pendingKeys.add(String(property));
            pendingOrigin ?? (pendingOrigin = currentOrigin);
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
    handler._propertyMap.$restore = (incoming, restoreOptions = {}) => {
        assertPlainModelSnapshot(incoming);
        const normalizedRestoreOptions = normalizeModelRestoreOptions(restoreOptions);
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
                            deleteProperty(model, key);
                        }
                    }
                }
                const nextRecord = next;
                for (const key of Object.keys(nextRecord)) {
                    model[key] = nextRecord[key];
                }
            });
        }
        finally {
            currentOrigin = previousOrigin;
        }
    };
    handler._propertyMap.$sync = (input, syncOptions = {}) => {
        const origin = createModelSyncOrigin(options.name, nextSyncId++);
        const failure = normalizeModelSyncFailureMode(syncOptions);
        const syncTarget = resolveModelSyncTarget(input, options.injector);
        const record = {
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
                        const normalizedRestoreOptions = normalizeModelRestoreOptions(restoreOptions);
                        model.$restore(incoming, {
                            ...normalizedRestoreOptions,
                            origin: normalizedRestoreOptions.origin ?? origin,
                        });
                    }
                    catch (exception) {
                        handleModelSyncException(context, record, exception);
                    }
                });
                if (disposer !== undefined && !isFunction(disposer)) {
                    throw new Error("Model sync target receive() must return a disposer function or undefined.");
                }
                if (disposer) {
                    record.receiveDisposer = disposer;
                }
            }
            catch (exception) {
                handleModelSyncException(context, record, exception);
            }
        }
        if (syncTarget.restore) {
            try {
                const result = syncTarget.restore();
                const applyRestored = (incoming) => {
                    if (record.disposed || incoming == null) {
                        return;
                    }
                    model.$restore(incoming, { origin });
                };
                if (isPromiseLike(result)) {
                    Promise.resolve(result)
                        .then(applyRestored)
                        .catch((exception) => {
                        handleModelSyncException(context, record, exception);
                    });
                }
                else {
                    applyRestored(result);
                }
            }
            catch (exception) {
                handleModelSyncException(context, record, exception);
            }
        }
        return () => {
            disposeModelSyncRecord(context, syncRecords, record);
        };
    };
}
function cloneModelData(value) {
    return structuredClone(value);
}
function createModelSyncOrigin(name, id) {
    return `model:${name ?? "anonymous"}:sync:${String(id)}`;
}
function resolveModelSyncTarget(input, injector) {
    if (isString(input)) {
        throw new Error("Model sync targets must be objects or injectable factories, not service-name strings.");
    }
    if (isModelSyncTarget(input)) {
        assertModelSyncTarget(input, "Model sync target");
        return input;
    }
    if (!injector) {
        throw new Error("Injectable model sync targets require the model to be created by an injector.");
    }
    const resolved = injector.invoke(input);
    if (!isModelSyncTarget(resolved)) {
        throw new Error("Injectable model sync target must resolve to an object.");
    }
    assertModelSyncTarget(resolved, "Injectable model sync target");
    return resolved;
}
function assertModelSyncTarget(target, label) {
    const operationNames = ["restore", "write", "receive", "dispose"];
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
        throw new Error(`${label} must implement restore, write, receive, or dispose.`);
    }
}
function normalizeModelSyncFailureMode(options) {
    if (!isObject(options) || isArray(options)) {
        throw new Error("Model sync options must be an object.");
    }
    const failure = options.failure ?? "report";
    if (failure !== "report" && failure !== "throw" && failure !== "ignore") {
        throw new Error('Model sync failure must be "report", "throw", or "ignore".');
    }
    return failure;
}
function normalizeModelRestoreOptions(options) {
    if (!isObject(options) || isArray(options)) {
        throw new Error("Model restore options must be an object.");
    }
    const candidate = options;
    if (candidate.mode !== undefined &&
        candidate.mode !== "replace" &&
        candidate.mode !== "merge") {
        throw new Error('Model restore mode must be "replace" or "merge".');
    }
    if (candidate.origin !== undefined && !isString(candidate.origin)) {
        throw new Error("Model restore origin must be a string.");
    }
    return candidate;
}
function assertPlainModelSnapshot(snapshot) {
    if (!isPlainModelRoot(snapshot)) {
        throw new Error("Model restore snapshot must be a plain object.");
    }
}
function disposeModelSyncRecord(context, records, record) {
    if (record.disposed) {
        return;
    }
    record.disposed = true;
    records.delete(record);
    try {
        record.receiveDisposer?.();
    }
    catch (exception) {
        handleModelSyncException(context, record, exception);
    }
    try {
        record.target.dispose?.();
    }
    catch (exception) {
        handleModelSyncException(context, record, exception);
    }
}
function isModelSyncTarget(value) {
    return !isArray(value) && isObject(value);
}
function handleModelSyncException(context, record, exception) {
    if (record.failure === "ignore") {
        return;
    }
    if (record.failure === "throw") {
        throw exception;
    }
    context._reportModelException(exception);
}
function createRootDomScheduler() {
    const queue = [];
    let destroyed = false;
    return {
        get destroyed() {
            return destroyed;
        },
        schedule(operation) {
            if (destroyed) {
                throw new Error("Cannot schedule DOM work for a destroyed AppContext root.");
            }
            queue.push(operation);
        },
        flush() {
            while (queue.length) {
                const operation = queue.shift();
                operation?.();
            }
        },
        destroy() {
            destroyed = true;
            queue.length = 0;
        },
    };
}
function createAppModelScheduler(handleError) {
    const listenerScheduler = createScopeListenerScheduler();
    const owner = new Scope(undefined, undefined, listenerScheduler);
    let destroyed = false;
    return {
        get destroyed() {
            return destroyed;
        },
        get pending() {
            return listenerScheduler._queue.length - listenerScheduler._index;
        },
        get _listenerScheduler() {
            return listenerScheduler;
        },
        schedule(operation) {
            if (destroyed) {
                throw new Error("Cannot schedule model work for a destroyed AppContext.");
            }
            owner._scheduleCallback(() => {
                try {
                    operation();
                }
                catch (exception) {
                    handleError(exception);
                }
            });
        },
        flush() {
            if (!destroyed) {
                owner._flushScheduledTasks();
            }
        },
        destroy() {
            destroyed = true;
            listenerScheduler._queue.length = 0;
            listenerScheduler._index = 0;
            listenerScheduler._queued = false;
            listenerScheduler._flushing = false;
            listenerScheduler._batchDepth = 0;
        },
    };
}

export { AppContext, requireAppRoot };
