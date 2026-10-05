import { isFunction, isObject, assertInvariantDefined, isDefined, isArray, isProxy, isPromiseLike, hasOwn, keys, deleteProperty, isUndefined, isInstanceOf, isProxySymbol, isString, callFunction, createObject, simpleCompare, nullObject, isNull } from '../../shared/utils.js';
import { ASTType } from '../parse/ast-type.js';

/** @internal Scope associated with a directly linked DOM event target. */
const EVENT_SCOPE = Symbol();
const SCOPE_HANDLER = Symbol();
function getScopeHandler(scope) {
    const handler = scope[SCOPE_HANDLER];
    return handler ?? scope._handler;
}
function getOptionalScopeHandler(scope) {
    const handler = scope[SCOPE_HANDLER];
    return handler ?? scope._handler;
}
/** @internal Registers a scope watcher when its explicit deregistration handle is not needed. */
function registerScopeWatch(scope, watchProp, listenerFn, lazy = false, directLeaf = false, synchronousInitial = false, resolvedValue, hasResolvedValue = false, listenerContext, watchPlan) {
    const handler = getScopeHandler(scope);
    if (watchPlan) {
        handler._watchPlanned(watchProp, listenerFn, lazy, synchronousInitial, resolvedValue, hasResolvedValue, listenerContext, watchPlan);
        return;
    }
    handler.watch(watchProp, listenerFn, lazy, directLeaf, false, synchronousInitial, resolvedValue, hasResolvedValue, listenerContext);
}
/** @internal Registers cleanup that runs when a scope is destroyed. */
function registerScopeDestroyCallback(scope, callback) {
    const handler = getOptionalScopeHandler(scope);
    if (handler) {
        handler._registerDestroyCallback(callback);
        return;
    }
    scope.on("$destroy", callback);
}
/** @internal Registers native event cleanup without allocating a destroy closure. */
function registerScopeEventCleanup(scope, target, type, listener, options) {
    const handler = getOptionalScopeHandler(scope);
    if (handler) {
        handler._registerEventCleanup(target, type, listener, options);
        return;
    }
    registerScopeDestroyCallback(scope, () => {
        if (options === undefined) {
            target.removeEventListener(type, listener);
        }
        else {
            target.removeEventListener(type, listener, options);
        }
    });
}
/** @internal Registers scope metadata cleanup for a delegated DOM event target. */
function registerScopeDelegatedEventCleanup(scope, target) {
    const handler = getOptionalScopeHandler(scope);
    if (handler) {
        handler._registerDelegatedEventCleanup(target);
        return;
    }
    registerScopeDestroyCallback(scope, () => {
        deleteProperty(target, EVENT_SCOPE);
    });
}
let nextListenerId = 0;
function getListenerOwnerTarget(listener) {
    const owner = listener._owner;
    return listener._originalTarget ?? owner._scopeTarget ?? owner._target;
}
const scopeWatchIdentityValues = new WeakSet();
const unresolvedForeignWatchParent = Symbol();
/** @internal Associates a repeated child scope with its raw object identity. */
function setScopeWatchIdentity(handler, value, valueIsRaw = false) {
    const rawValue = valueIsRaw ? value : unwrapScopeValue(value);
    if (rawValue !== null && typeof rawValue === "object") {
        handler._watchIdentity = rawValue;
        scopeWatchIdentityValues.add(rawValue);
    }
    else {
        handler._watchIdentity = undefined;
    }
}
function getScopeWatchIdentity(handler, target) {
    const identity = handler._watchIdentity;
    if (identity && target === (handler._scopeTarget ?? handler._target)) {
        return identity;
    }
    return target !== null &&
        typeof target === "object" &&
        scopeWatchIdentityValues.has(target)
        ? target
        : undefined;
}
const scopeExpressionObservers = new WeakMap();
let activeScopeExpressionObserver;
function trackScopeExpressionRead(target, property) {
    const observer = activeScopeExpressionObserver;
    if (!observer || observer._disposed)
        return;
    let properties = observer._nextPropertiesByTarget.get(target);
    if (!properties) {
        properties = new Set();
        observer._nextPropertiesByTarget.set(target, properties);
    }
    if (properties.has(property))
        return;
    properties.add(property);
    observer._nextDependencies.push({ _target: target, _property: property });
}
function unregisterScopeExpressionDependencies(observer) {
    for (let index = 0; index < observer._dependencies.length; index++) {
        const dependency = observer._dependencies[index];
        const observersByProperty = scopeExpressionObservers.get(dependency._target);
        const observers = observersByProperty?.get(dependency._property);
        observers?.delete(observer);
        if (observers?.size === 0) {
            observersByProperty?.delete(dependency._property);
        }
        if (observersByProperty?.size === 0) {
            scopeExpressionObservers.delete(dependency._target);
        }
    }
    observer._dependencies.length = 0;
}
function registerScopeExpressionDependencies(observer) {
    unregisterScopeExpressionDependencies(observer);
    observer._dependencies = observer._nextDependencies;
    observer._nextDependencies = [];
    observer._nextPropertiesByTarget = new WeakMap();
    for (let index = 0; index < observer._dependencies.length; index++) {
        const dependency = observer._dependencies[index];
        let observersByProperty = scopeExpressionObservers.get(dependency._target);
        if (!observersByProperty) {
            observersByProperty = new Map();
            scopeExpressionObservers.set(dependency._target, observersByProperty);
        }
        let observers = observersByProperty.get(dependency._property);
        if (!observers) {
            observers = new Set();
            observersByProperty.set(dependency._property, observers);
        }
        observers.add(observer);
    }
}
function runScopeExpressionObserver(observer) {
    if (observer._disposed || observer._owner._destroyed)
        return;
    const previousObserver = activeScopeExpressionObserver;
    let value;
    activeScopeExpressionObserver = observer;
    try {
        value = observer._read();
    }
    catch (error) {
        observer._owner._exceptionHandler(error);
        return;
    }
    finally {
        activeScopeExpressionObserver = previousObserver;
    }
    registerScopeExpressionDependencies(observer);
    try {
        observer._listener(value);
    }
    catch (error) {
        observer._owner._exceptionHandler(error);
    }
}
function scheduleScopeExpressionObserver(observer) {
    if (observer._scheduled || observer._disposed)
        return;
    observer._scheduled = true;
    observer._owner._scheduleCallback(() => {
        observer._scheduled = false;
        runScopeExpressionObserver(observer);
    });
}
function scheduleScopeExpressionObservers(target, property) {
    const observersByProperty = scopeExpressionObservers.get(target);
    if (!observersByProperty)
        return;
    const observers = new Set();
    const invalidateWholeTarget = isArray(target) ||
        isMapTarget(target) ||
        isSetTarget(target) ||
        isDateTarget(target);
    if (invalidateWholeTarget) {
        for (const propertyObservers of observersByProperty.values()) {
            for (const observer of propertyObservers)
                observers.add(observer);
        }
    }
    else {
        const propertyObservers = observersByProperty.get(property);
        if (propertyObservers) {
            for (const observer of propertyObservers)
                observers.add(observer);
        }
    }
    for (const observer of observers) {
        scheduleScopeExpressionObserver(observer);
    }
}
/** @internal Observes the Scope-backed values read while evaluating a function. */
function observeScopeExpression(scope, read, listener, registerDestroy = true) {
    const owner = getScopeHandler(scope);
    const observer = {
        _owner: owner,
        _read: read,
        _listener: listener,
        _dependencies: [],
        _nextDependencies: [],
        _nextPropertiesByTarget: new WeakMap(),
        _scheduled: false,
        _disposed: false,
    };
    const dispose = () => {
        if (observer._disposed)
            return;
        observer._disposed = true;
        unregisterScopeExpressionDependencies(observer);
        observer._deregisterDestroy?.();
        observer._deregisterDestroy = undefined;
    };
    if (registerDestroy) {
        observer._deregisterDestroy = scope.on("$destroy", dispose);
    }
    runScopeExpressionObserver(observer);
    return dispose;
}
/** @internal Creates a lightweight value cell tracked by scope expression observers. */
function createScopeExpressionValue(initialValue) {
    let value = initialValue;
    const target = {};
    Object.defineProperty(target, "value", {
        enumerable: true,
        get() {
            trackScopeExpressionRead(target, "value");
            return value;
        },
        set(nextValue) {
            if (Object.is(value, nextValue))
                return;
            value = nextValue;
            scheduleScopeExpressionObservers(target, "value");
        },
    });
    return target;
}
const scheduledBindingTask = {
    _kind: "bindings",
};
const foreignProxyParentPathCache = new Map();
function getForeignProxyParentPath(watchProp) {
    if (foreignProxyParentPathCache.has(watchProp)) {
        return foreignProxyParentPathCache.get(watchProp);
    }
    const parentExpression = getWatchParentExpression(watchProp);
    if (!parentExpression || parentExpression.includes("[")) {
        foreignProxyParentPathCache.set(watchProp, undefined);
        return undefined;
    }
    const parts = parentExpression.split(".");
    if (parts.length < 2 ||
        parts.some((part) => !/^[$A-Z_a-z][$\w]*$/.test(part))) {
        foreignProxyParentPathCache.set(watchProp, undefined);
        return undefined;
    }
    foreignProxyParentPathCache.set(watchProp, parts);
    return parts;
}
/** @internal Creates a listener scheduler that can be owned by a scope family or AppContext. */
function createScopeListenerScheduler() {
    const scheduler = {
        _queue: [],
        _bindingQueue: [],
        _bindingEpoch: 0,
        _bindingsQueued: false,
        _index: 0,
        _queued: false,
        _flushing: false,
        _batchDepth: 0,
        _flushTask: () => {
            scheduler._owner?._flushScheduledTasks();
        },
    };
    return scheduler;
}
function isScopeEventStopped(event) {
    return event.stopped;
}
const EMPTY_SCOPE_CHILDREN = [];
const EMPTY_SCHEDULED_LISTENERS = [];
const EMPTY_SCOPE_LISTENERS = new Map();
const SCOPE_PROXY_BIND = Symbol("ngProxyBind");
let uid = 0;
/**
 * Returns the next generated scope/listener id.
 */
function nextId() {
    uid += 1;
    return uid;
}
let defaultParse;
let defaultExceptionHandler;
const arrayMutationMeta = new WeakMap();
const arraySwapCandidates = new WeakMap();
let arrayMutationVersion = 0;
const SET_MUTATION_KEYS = ["add", "delete", "clear"];
const MAP_MUTATION_METHODS = [
    "set",
    "delete",
    "clear",
    "getOrInsert",
    "getOrInsertComputed",
];
function toArrayMutationLength(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || Number.isNaN(numericValue)) {
        return 0;
    }
    return Math.trunc(numericValue);
}
function normalizeSpliceIndex(index, length) {
    const numericIndex = toArrayMutationLength(index);
    if (numericIndex < 0) {
        return Math.max(length + numericIndex, 0);
    }
    return Math.min(numericIndex, length);
}
function createSpliceArrayMutationMeta(index, deleteCount, insertCount, previousLength, currentLength) {
    const normalizedIndex = Math.max(0, Math.min(index, previousLength));
    const normalizedDeleteCount = Math.max(0, deleteCount);
    const normalizedInsertCount = Math.max(0, insertCount);
    if (normalizedDeleteCount === 0 &&
        normalizedInsertCount === 0 &&
        previousLength === currentLength) {
        return undefined;
    }
    return {
        _version: ++arrayMutationVersion,
        _kind: "splice",
        _index: normalizedIndex,
        _deleteCount: normalizedDeleteCount,
        _insertCount: normalizedInsertCount,
        _previousLength: previousLength,
        _currentLength: currentLength,
        _headDeletes: normalizedDeleteCount > 0 &&
            normalizedInsertCount === 0 &&
            normalizedIndex === 0,
        _tailDeletes: normalizedDeleteCount > 0 &&
            normalizedInsertCount === 0 &&
            normalizedIndex + normalizedDeleteCount === previousLength,
        _swapFromIndex: -1,
        _swapToIndex: -1,
    };
}
function createReorderArrayMutationMeta(length) {
    return {
        _version: ++arrayMutationVersion,
        _kind: "reorder",
        _index: 0,
        _deleteCount: 0,
        _insertCount: 0,
        _previousLength: length,
        _currentLength: length,
        _headDeletes: false,
        _tailDeletes: false,
        _swapFromIndex: -1,
        _swapToIndex: -1,
    };
}
function createSwapArrayMutationMeta(previousLength, currentLength, firstIndex, secondIndex) {
    const leftIndex = Math.min(firstIndex, secondIndex);
    const rightIndex = Math.max(firstIndex, secondIndex);
    return {
        _version: ++arrayMutationVersion,
        _kind: "swap",
        _index: leftIndex,
        _deleteCount: 0,
        _insertCount: 0,
        _previousLength: previousLength,
        _currentLength: currentLength,
        _headDeletes: false,
        _tailDeletes: false,
        _swapFromIndex: leftIndex,
        _swapToIndex: rightIndex,
    };
}
function getArrayMutationIndex(property) {
    if (typeof property === "number") {
        return Number.isInteger(property) && property >= 0 ? property : undefined;
    }
    if (!isString(property) || property === "length") {
        return undefined;
    }
    const numericProperty = Number(property);
    if (!Number.isInteger(numericProperty) ||
        numericProperty < 0 ||
        String(numericProperty) !== property) {
        return undefined;
    }
    return numericProperty;
}
function unwrapArrayMutationValue(value) {
    return getAssignedScopeValue(value)._storedValue;
}
function unwrapArrayMutationArgs(args) {
    let rawArgs;
    for (let i = 0, l = args.length; i < l; i++) {
        const rawArg = unwrapArrayMutationValue(args[i]);
        if (rawArg !== args[i] && !rawArgs) {
            rawArgs = args.slice(0, i);
        }
        if (rawArgs) {
            rawArgs[i] = rawArg;
        }
    }
    return rawArgs ?? args;
}
function collectRemovedArrayMutationValues(method, args, target) {
    const previousLength = target.length;
    switch (method) {
        case "pop":
            return previousLength > 0 ? [target[previousLength - 1]] : undefined;
        case "shift":
            return previousLength > 0 ? [target[0]] : undefined;
        case "splice": {
            const index = normalizeSpliceIndex(args[0], previousLength);
            const deleteCount = args.length < 2
                ? previousLength - index
                : Math.min(Math.max(toArrayMutationLength(args[1]), 0), previousLength - index);
            if (deleteCount === 0) {
                return undefined;
            }
            return target.slice(index, index + deleteCount);
        }
        default:
            return undefined;
    }
}
function clearArraySwapCandidate(proxy) {
    arraySwapCandidates.delete(proxy);
}
function trackArraySwapMutation(proxy, property, oldValue, newValue, currentLength) {
    const index = getArrayMutationIndex(property);
    if (index === undefined) {
        clearArraySwapCandidate(proxy);
        return;
    }
    const normalizedOldValue = unwrapArrayMutationValue(oldValue);
    const normalizedNewValue = unwrapArrayMutationValue(newValue);
    if (normalizedOldValue === normalizedNewValue) {
        clearArraySwapCandidate(proxy);
        return;
    }
    const candidate = arraySwapCandidates.get(proxy);
    if (candidate?._length === currentLength &&
        candidate._index !== index &&
        candidate._oldValue === normalizedNewValue &&
        candidate._newValue === normalizedOldValue) {
        clearArraySwapCandidate(proxy);
        setArrayMutationMeta(proxy, createSwapArrayMutationMeta(currentLength, currentLength, candidate._index, index));
        return;
    }
    arraySwapCandidates.set(proxy, {
        _index: index,
        _oldValue: normalizedOldValue,
        _newValue: normalizedNewValue,
        _length: currentLength,
    });
}
function getMethodArrayMutationMeta(method, args, previousLength, currentLength) {
    switch (method) {
        case "push":
            return createSpliceArrayMutationMeta(previousLength, 0, args.length, previousLength, currentLength);
        case "pop":
            return previousLength > 0
                ? createSpliceArrayMutationMeta(previousLength - 1, 1, 0, previousLength, currentLength)
                : undefined;
        case "shift":
            return previousLength > 0
                ? createSpliceArrayMutationMeta(0, 1, 0, previousLength, currentLength)
                : undefined;
        case "unshift":
            return createSpliceArrayMutationMeta(0, 0, args.length, previousLength, currentLength);
        case "splice": {
            const index = normalizeSpliceIndex(args[0], previousLength);
            const deleteCount = args.length < 2
                ? previousLength - index
                : Math.min(Math.max(toArrayMutationLength(args[1]), 0), previousLength - index);
            return createSpliceArrayMutationMeta(index, deleteCount, Math.max(0, args.length - 2), previousLength, currentLength);
        }
        case "reverse":
        case "sort":
            return createReorderArrayMutationMeta(previousLength);
        default:
            return undefined;
    }
}
function clearArrayMutationMeta(proxy) {
    const target = proxy._target;
    if (isArray(target)) {
        arrayMutationMeta.delete(target);
    }
    else {
        arrayMutationMeta.delete(proxy);
    }
}
function setArrayMutationMeta(proxy, meta) {
    if (!meta) {
        clearArrayMutationMeta(proxy);
        return;
    }
    const target = proxy._target;
    if (isArray(target)) {
        arrayMutationMeta.set(target, meta);
    }
    else {
        arrayMutationMeta.set(proxy, meta);
    }
}
function getArrayMutationMeta(value) {
    if (!value) {
        return undefined;
    }
    const target = isProxy(value) ? value._target : value;
    return isArray(target) ? arrayMutationMeta.get(target) : undefined;
}
function warnAsyncBatchCallback() {
    try {
        console.warn("batch callback returned a Promise. Async mutations after await are not batched.");
    }
    catch {
        // Warning delivery should not affect the batched mutation contract.
    }
}
/** @internal */
function createRootScopeService(appContext, exceptionHandler, parse) {
    defaultExceptionHandler = exceptionHandler;
    defaultParse = parse;
    appContext.setScopeRuntime({ exceptionHandler, parse });
    const rootScope = createScope();
    rootScope._handler._setRuntimeDependencies({ exceptionHandler, parse });
    appContext.createRoot({ rootScope });
    return rootScope;
}
function getNodeName(node) {
    return node?._name;
}
function getNodePropertyName(node) {
    const property = node?._property;
    return getNodeName(property);
}
function resolveNodeWatchKey(node) {
    return getNodePropertyName(node) ?? getNodeName(node);
}
function resolveWatchKey(node) {
    if (!node)
        return undefined;
    if (node._type === ASTType._Identifier) {
        return getNodeName(node);
    }
    if (node._type === ASTType._MemberExpression) {
        return getNodePropertyName(node) ?? resolveWatchKey(node._object);
    }
    const { _toWatch: toWatch } = node;
    if (toWatch?.length) {
        const [firstWatchTarget] = toWatch;
        if (firstWatchTarget !== node) {
            return resolveWatchKey(firstWatchTarget);
        }
    }
    return getNodeName(node);
}
function getWatchParentExpression(watchProp) {
    const lastDotIndex = watchProp.lastIndexOf(".");
    return lastDotIndex === -1 ? "" : watchProp.slice(0, lastDotIndex);
}
function getSimpleMemberExpression(node) {
    if (node._type === ASTType._Identifier) {
        return getNodeName(node);
    }
    if (node._type !== ASTType._MemberExpression) {
        return undefined;
    }
    const propertyName = getNodePropertyName(node);
    if (!propertyName || node._computed) {
        return undefined;
    }
    const objectExpression = getSimpleMemberExpression(assertInvariantDefined(node._object));
    return objectExpression ? `${objectExpression}.${propertyName}` : undefined;
}
const directMemberWatchPlanCache = new WeakMap();
function getDirectMemberWatchPlan(watchFn, node, watchProp, parse) {
    const cached = directMemberWatchPlanCache.get(watchFn);
    if (cached !== undefined) {
        return cached || undefined;
    }
    let plan = false;
    if (node._type === ASTType._MemberExpression) {
        const expressionNode = node;
        const objectNode = expressionNode._object;
        const key = getNodePropertyName(node);
        const parentKey = objectNode?._type === ASTType._Identifier
            ? getNodeName(objectNode)
            : undefined;
        if (!expressionNode._computed &&
            key &&
            parentKey &&
            watchProp === `${parentKey}.${key}`) {
            plan = {
                _key: key,
                _parentKey: parentKey,
                _watchProp: watchProp,
                _watchParentFn: parse(parentKey),
            };
        }
    }
    directMemberWatchPlanCache.set(watchFn, plan);
    return plan || undefined;
}
function addForeignWatchDescriptor(listener, watchProp, key) {
    if (!watchProp ||
        !key ||
        watchProp === key ||
        watchProp.includes("[") ||
        !watchProp.includes(".")) {
        return;
    }
    const parentExpression = getWatchParentExpression(watchProp);
    const descriptor = {
        _watchProp: watchProp,
        _watchParentFn: (listener._parse ?? listener._owner._parse)(parentExpression),
        _parentKey: parentExpression.includes(".") || parentExpression.includes("[")
            ? undefined
            : parentExpression,
        _key: key,
    };
    listener._foreignWatchDescriptors ?? (listener._foreignWatchDescriptors = []);
    listener._foreignWatchDescriptors.push(descriptor);
}
function getArrayWatchExpressionElement(watchProp, index) {
    const body = watchProp.slice(1, -1);
    const parts = [];
    let start = 0;
    let depth = 0;
    let quote;
    for (let i = 0, l = body.length; i < l; i++) {
        const char = body[i];
        if (quote) {
            if (char === "\\" && i + 1 < l) {
                i++;
            }
            else if (char === quote) {
                quote = undefined;
            }
            continue;
        }
        if (char === '"' || char === "'" || char === "`") {
            quote = char;
            continue;
        }
        if (char === "(" || char === "[" || char === "{") {
            depth++;
            continue;
        }
        if (char === ")" || char === "]" || char === "}") {
            depth--;
            continue;
        }
        if (char === "," && depth === 0) {
            parts.push(body.slice(start, i).trim());
            start = i + 1;
        }
    }
    parts.push(body.slice(start).trim());
    const expression = parts[index];
    return expression;
}
function listenerNeedsNestedCollection(listener) {
    return !!(listener._watchParentFn ??
        listener._foreignWatchDescriptors?.length ??
        listener._watchNestedObject ??
        listener._watchLiteralInput);
}
function pushUniqueListenerKey(keySet, seenKeys, _listener, key) {
    if (seenKeys.has(key))
        return;
    seenKeys.add(key);
    keySet.push(key);
}
function registerListenerKeys(scope, listener, watchKeys, schedule = false) {
    for (let i = 0, l = watchKeys.length; i < l; i++) {
        const key = watchKeys[i];
        if (!key)
            continue;
        scope._registerKey(key, listener);
        if (schedule)
            scope._scheduleListener([listener]);
    }
}
function deregisterListenerKeys(scope, listener, watchKeys) {
    for (let i = 0, l = watchKeys.length; i < l; i++) {
        const key = watchKeys[i];
        if (key)
            scope._deregisterKey(key, listener);
    }
}
/**
 * Collects all keys that should trigger a grouped `watch` expression.
 * This keeps interpolation arrays reactive for both direct property changes
 * (`todo.done`) and object reassignments (`todo = nextTodo` in `ng-repeat`).
 */
function collectWatchKeys(node, watchKeys) {
    if (!node)
        return;
    if (node._type === ASTType._Identifier) {
        const identifier = getNodeName(node);
        if (identifier)
            watchKeys.add(identifier);
        return;
    }
    if (node._type === ASTType._Literal) {
        const literal = node;
        if (isString(literal._value)) {
            watchKeys.add(literal._value);
        }
        else if (literal._name) {
            watchKeys.add(literal._name);
        }
        return;
    }
    if (node._type === ASTType._MemberExpression) {
        const member = node;
        const propertyKey = getNodePropertyName(member);
        if (propertyKey) {
            watchKeys.add(propertyKey);
        }
        else {
            collectWatchKeys(member._property, watchKeys);
        }
        collectWatchKeys(member._object, watchKeys);
        return;
    }
    const { _toWatch: toWatch } = node;
    if (toWatch?.length) {
        for (let i = 0, l = toWatch.length; i < l; i++) {
            const watchTarget = toWatch[i];
            if (watchTarget !== node) {
                collectWatchKeys(watchTarget, watchKeys);
            }
        }
        if (watchKeys.size > 0) {
            return;
        }
    }
    const fallbackKey = getNodeName(node);
    if (fallbackKey)
        watchKeys.add(fallbackKey);
}
function collectListenerKeys(node, keySet, seenKeys, listener) {
    if (!node || node._type === ASTType._Literal)
        return;
    const watchKeys = new Set();
    collectWatchKeys(node, watchKeys);
    for (const watchKey of watchKeys) {
        pushUniqueListenerKey(keySet, seenKeys, listener, watchKey);
    }
}
function addMemberExpressionDependency(node, listener, keySet, seenKeys) {
    if (node?._type !== ASTType._MemberExpression) {
        return;
    }
    const memberExpression = getSimpleMemberExpression(node);
    const key = resolveWatchKey(node);
    addForeignWatchDescriptor(listener, memberExpression, key);
    const parentKey = resolveWatchKey(node._object);
    if (parentKey) {
        pushUniqueListenerKey(keySet, seenKeys, listener, parentKey);
    }
}
function collectForeignWatchDescriptors(node, listener, keySet, seenKeys) {
    if (node._type === ASTType._MemberExpression) {
        addMemberExpressionDependency(node, listener, keySet, seenKeys);
        collectForeignWatchDescriptors(assertInvariantDefined(node._object), listener, keySet, seenKeys);
        collectForeignWatchDescriptors(assertInvariantDefined(node._property), listener, keySet, seenKeys);
        return;
    }
    if (node._type === ASTType._CallExpression) {
        const callee = node._callee;
        if (callee?._type === ASTType._MemberExpression) {
            addMemberExpressionDependency(assertInvariantDefined(callee._object), listener, keySet, seenKeys);
        }
        else {
            collectForeignWatchDescriptors(assertInvariantDefined(callee), listener, keySet, seenKeys);
        }
        const callArguments = assertInvariantDefined(node._arguments);
        for (let i = 0, l = callArguments.length; i < l; i++) {
            collectForeignWatchDescriptors(assertInvariantDefined(callArguments[i]), listener, keySet, seenKeys);
        }
        return;
    }
    if (node._type === ASTType._LogicalExpression) {
        collectForeignWatchDescriptors(assertInvariantDefined(node._left), listener, keySet, seenKeys);
        collectForeignWatchDescriptors(assertInvariantDefined(node._right), listener, keySet, seenKeys);
        return;
    }
    if (node._type === ASTType._ConditionalExpression) {
        collectForeignWatchDescriptors(assertInvariantDefined(node._test), listener, keySet, seenKeys);
        collectForeignWatchDescriptors(assertInvariantDefined(node._alternate), listener, keySet, seenKeys);
        collectForeignWatchDescriptors(assertInvariantDefined(node._consequent), listener, keySet, seenKeys);
        return;
    }
    const toWatch = node._toWatch;
    if (toWatch?.length) {
        for (let i = 0, l = toWatch.length; i < l; i++) {
            const watchTarget = toWatch[i];
            if (watchTarget !== node) {
                collectForeignWatchDescriptors(watchTarget, listener, keySet, seenKeys);
            }
        }
    }
}
/** @internal Builds reusable registration metadata for a compiled binding. */
function createScopeWatchPlan(parse, watchProp) {
    const watchFn = parse(watchProp);
    const expression = watchFn._decoratedNode._body[0]?._expression;
    if (!expression) {
        return undefined;
    }
    const keys = [];
    const listener = { _parse: parse };
    const seenKeys = new Set();
    collectExpressionListenerKeys(expression, keys, seenKeys, listener);
    collectForeignWatchDescriptors(expression, listener, keys, seenKeys);
    // Leaf keys also notify bindings owned by this scope, including raw nested
    // objects and services that schedule their own reactive property changes.
    if (keys.length === 0) {
        return undefined;
    }
    return {
        _watchFn: watchFn,
        _keys: keys,
        _foreignDescriptors: listener._foreignWatchDescriptors,
    };
}
function collectExpressionListenerKeys(node, keySet, seenKeys, listener) {
    if (!node)
        return;
    if (node._type === ASTType._LogicalExpression) {
        collectExpressionListenerKeys(node._left, keySet, seenKeys, listener);
        collectExpressionListenerKeys(node._right, keySet, seenKeys, listener);
        return;
    }
    if (node._type === ASTType._ConditionalExpression) {
        collectExpressionListenerKeys(node._test, keySet, seenKeys, listener);
        collectExpressionListenerKeys(node._alternate, keySet, seenKeys, listener);
        collectExpressionListenerKeys(node._consequent, keySet, seenKeys, listener);
        return;
    }
    if (node._type === ASTType._CallExpression) {
        collectExpressionListenerKeys(node._callee, keySet, seenKeys, listener);
        const callArguments = node._arguments ?? [];
        for (let i = 0, l = callArguments.length; i < l; i++) {
            collectExpressionListenerKeys(callArguments[i], keySet, seenKeys, listener);
        }
        return;
    }
    collectListenerKeys(node, keySet, seenKeys, listener);
}
function getFilterInputWatchKeys(expr) {
    if (!expr._filter) {
        return undefined;
    }
    const toWatch = expr._toWatch;
    if (!toWatch?.length) {
        return undefined;
    }
    const watchKeys = new Array(toWatch.length);
    for (let i = 0, l = toWatch.length; i < l; i++) {
        const watchKey = resolveWatchKey(toWatch[i]);
        if (!watchKey) {
            return undefined;
        }
        watchKeys[i] = watchKey;
    }
    return watchKeys;
}
function createScope(target = {}, context, scheduler) {
    return getCachedScopeProxy(target, context ?? new Scope(undefined, undefined, scheduler));
}
const global = globalThis;
const arrayMutationMethods = new Set([
    "push",
    "pop",
    "splice",
    "reverse",
    "shift",
    "sort",
    "unshift",
]);
const arrayIdentityMethods = new Set(["includes", "indexOf", "lastIndexOf"]);
function getPrototypeMethodNames(prototype, include) {
    return Object.getOwnPropertyNames(prototype).filter((key) => {
        if (key === "constructor" || !include(key)) {
            return false;
        }
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        return isFunction(descriptor?.value);
    });
}
const mapPrototype = Map.prototype;
const setPrototype = Set.prototype;
const mapMutationMethods = new Set(MAP_MUTATION_METHODS.filter((key) => isFunction(mapPrototype[key])));
const setMutationMethods = new Set(SET_MUTATION_KEYS.filter((key) => isFunction(setPrototype[key])));
const mapValueMutationWatchKeys = getPrototypeMethodNames(mapPrototype, (key) => !mapMutationMethods.has(key) && key !== "has" && key !== "keys");
const mapMembershipMutationWatchKeys = getPrototypeMethodNames(mapPrototype, (key) => !mapMutationMethods.has(key));
if (isFunction(mapPrototype.includes) &&
    !mapMembershipMutationWatchKeys.includes("includes")) {
    mapMembershipMutationWatchKeys.push("includes");
}
if (isFunction(mapPrototype.includes) &&
    !mapValueMutationWatchKeys.includes("includes")) {
    mapValueMutationWatchKeys.push("includes");
}
const setMutationWatchKeys = getPrototypeMethodNames(setPrototype, (key) => !setMutationMethods.has(key));
if (isFunction(setPrototype.includes) &&
    !setMutationWatchKeys.includes("includes")) {
    setMutationWatchKeys.push("includes");
}
const datePrototype = Date.prototype;
const dateValueWatchKeys = Object.getOwnPropertyNames(datePrototype).filter((key) => key !== "constructor" &&
    !key.startsWith("set") &&
    isFunction(datePrototype[key]));
function isDateMutationMethod(property) {
    return property.startsWith("set") && isFunction(datePrototype[property]);
}
const wStr = "[object Window]";
const nonScopeConstructors = [
    Window,
    Document,
    Element,
    Node,
    EventTarget,
    Promise,
    HTMLCollection,
    NodeList,
    Event,
    RegExp,
    WeakMap,
    WeakSet,
    ArrayBuffer,
    DataView,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Float32Array,
    Float64Array,
    Function,
    Error,
    Blob,
    File,
    FormData,
    URL,
    URLSearchParams,
];
const nonScopeCache = new WeakSet();
const scopeCache = new WeakSet();
const scopeProxyCache = new WeakMap();
const scopeProxyTargets = new WeakMap();
const unboundScopeMethod = Symbol("unboundScopeMethod");
const scopeMethodPropertyMap = Object.assign(Object.create(null), {
    broadcast: unboundScopeMethod,
    batch: unboundScopeMethod,
    destroy: unboundScopeMethod,
    emit: unboundScopeMethod,
    getById: unboundScopeMethod,
    _isRoot: unboundScopeMethod,
    merge: unboundScopeMethod,
    new: unboundScopeMethod,
    newIsolate: unboundScopeMethod,
    on: unboundScopeMethod,
    searchByName: unboundScopeMethod,
    transcluded: unboundScopeMethod,
    watch: unboundScopeMethod,
});
let destroyedScopeCleanupQueue = [];
let destroyedScopeCleanupQueued = false;
function queueDestroyedScopeCleanup(scope) {
    destroyedScopeCleanupQueue.push(scope);
    if (destroyedScopeCleanupQueued) {
        return;
    }
    destroyedScopeCleanupQueued = true;
    queueMicrotask(flushDestroyedScopeCleanup);
}
function flushDestroyedScopeCleanup() {
    destroyedScopeCleanupQueued = false;
    const queue = destroyedScopeCleanupQueue;
    destroyedScopeCleanupQueue = [];
    for (let i = 0, l = queue.length; i < l; i++) {
        queue[i]._cleanupDestroyedScope();
    }
}
function unwrapScopeValue(value) {
    if (!isProxy(value))
        return value;
    return scopeProxyTargets.get(value) ?? value._target;
}
function getAssignedScopeValue(value) {
    const rawValue = unwrapScopeValue(value);
    const valueIsProxy = isProxy(value);
    return {
        _rawValue: rawValue,
        _storedValue: valueIsProxy && isObject(rawValue) && isNonScope(rawValue)
            ? value
            : rawValue,
        _isProxy: valueIsProxy,
    };
}
function getObjectListenerTarget(value) {
    const target = unwrapScopeValue(value);
    if (!isObject(target) || isNonScope(target)) {
        return undefined;
    }
    return target;
}
function isMapTarget(target) {
    try {
        return isInstanceOf(target, Map);
    }
    catch {
        return false;
    }
}
function isSetTarget(target) {
    try {
        return isInstanceOf(target, Set);
    }
    catch {
        return false;
    }
}
function isDateTarget(target) {
    try {
        return isInstanceOf(target, Date);
    }
    catch {
        return false;
    }
}
function isNativeScopedTarget(target) {
    return isMapTarget(target) || isSetTarget(target) || isDateTarget(target);
}
function isNativeIteratorTarget(target) {
    try {
        return Object.prototype.toString.call(target).endsWith(" Iterator]");
    }
    catch {
        return false;
    }
}
function unwrapCollectionArgs(args) {
    let rawArgs;
    for (let i = 0, l = args.length; i < l; i++) {
        const rawArg = unwrapScopeValue(args[i]);
        if (rawArg !== args[i] && !rawArgs) {
            rawArgs = args.slice(0, i);
        }
        if (rawArgs) {
            rawArgs[i] = rawArg;
        }
    }
    return rawArgs ?? args;
}
function addObjectListenerKey(objectListeners, target, key) {
    const keyList = objectListeners.get(target);
    if (keyList) {
        if (isArray(keyList)) {
            if (!keyList.includes(key)) {
                keyList.push(key);
            }
        }
        else if (keyList !== key) {
            objectListeners.set(target, [keyList, key]);
        }
        return;
    }
    objectListeners.set(target, key);
}
function removeObjectListenerKey(objectListeners, target, key) {
    const keyList = objectListeners.get(target);
    if (!keyList) {
        return;
    }
    if (!isArray(keyList)) {
        if (keyList === key) {
            objectListeners.delete(target);
        }
        return;
    }
    const keyIndex = keyList.indexOf(key);
    if (keyIndex === -1) {
        return;
    }
    if (keyList.length === 2) {
        objectListeners.set(target, keyList[keyIndex === 0 ? 1 : 0]);
        return;
    }
    keyList[keyIndex] = keyList[keyList.length - 1];
    keyList.length--;
}
function getCachedScopeProxy(target, handler) {
    if (isProxy(target))
        return target;
    if (!isObject(target) || isNonScope(target))
        return target;
    const objectTarget = target;
    const cached = scopeProxyCache.get(objectTarget);
    if (cached && isProxy(cached)) {
        if (cached._handler === handler)
            return cached;
        const proxiesByHandler = new WeakMap();
        proxiesByHandler.set(cached._handler, cached);
        scopeProxyCache.set(objectTarget, proxiesByHandler);
        const proxy = new Proxy(objectTarget, handler);
        handler._scopeTarget ?? (handler._scopeTarget = objectTarget);
        proxiesByHandler.set(handler, proxy);
        scopeProxyTargets.set(proxy, objectTarget);
        const bind = objectTarget[SCOPE_PROXY_BIND];
        if (isFunction(bind)) {
            bind.call(objectTarget, handler, proxy);
        }
        return proxy;
    }
    let proxy = cached?.get(handler);
    if (!proxy) {
        proxy = new Proxy(objectTarget, handler);
        handler._scopeTarget ?? (handler._scopeTarget = objectTarget);
        if (cached) {
            cached.set(handler, proxy);
        }
        else {
            scopeProxyCache.set(objectTarget, proxy);
        }
        scopeProxyTargets.set(proxy, objectTarget);
        const bind = objectTarget[SCOPE_PROXY_BIND];
        if (isFunction(bind)) {
            bind.call(objectTarget, handler, proxy);
        }
    }
    return proxy;
}
/**
 * Checks whether a target should be excluded from scope observability.
 */
function isNonScope(target) {
    // 1. Null or primitive types are non-scope
    if (isNull(target) || typeof target !== "object") {
        return true;
    }
    // 2. Fast cache lookups
    const objectTarget = target;
    const identityTarget = target;
    if (nonScopeCache.has(objectTarget)) {
        return true;
    }
    if (scopeCache.has(objectTarget)) {
        return false;
    }
    // 3. Explicit non-scope flags
    const targetConstructor = objectTarget.constructor;
    if (objectTarget.$nonscope === true ||
        targetConstructor?.$nonscope === true) {
        nonScopeCache.add(objectTarget);
        return true;
    }
    if (targetConstructor === Object) {
        return false;
    }
    // 4. Global objects
    if (identityTarget === global.window ||
        identityTarget === global.document ||
        identityTarget === global.self ||
        identityTarget === global.frames) {
        nonScopeCache.add(objectTarget);
        return true;
    }
    if (isNativeIteratorTarget(objectTarget)) {
        nonScopeCache.add(objectTarget);
        return true;
    }
    // 5. Safe instanceof checks
    for (let i = 0, l = nonScopeConstructors.length; i < l; i++) {
        try {
            const ctor = nonScopeConstructors[i];
            if (!isFunction(ctor)) {
                continue;
            }
            if (objectTarget instanceof ctor) {
                nonScopeCache.add(objectTarget);
                return true;
            }
        }
        catch {
            /* empty */
        }
    }
    try {
        if (Object.prototype.toString.call(objectTarget) === wStr) {
            nonScopeCache.add(objectTarget);
            return true;
        }
    }
    catch {
        return false;
    }
    scopeCache.add(objectTarget);
    return false;
}
/**
 * Scope class for the Proxy. It intercepts operations like property access (get)
 * and property setting (set), and adds support for deep change tracking and
 * observer-like behavior.
 */
class Scope {
    /** @internal Registers an immediate compiled binding without generic watch mode branches. */
    _watchPlannedImmediate(listenerFn, listenerContext, watchPlan) {
        const scopeTarget = this._target;
        const descriptorPlans = watchPlan._foreignDescriptors;
        const listener = {
            _owner: this,
            _originalTarget: scopeTarget,
            _listenerFn: listenerFn,
            _watchFn: watchPlan._watchFn,
            _id: ++nextListenerId,
            _plannedForeignWatchParent: unresolvedForeignWatchParent,
        };
        listener._listenerContext = listenerContext;
        const keys = watchPlan._keys;
        if (descriptorPlans?.length === 1) {
            const descriptor = descriptorPlans[0];
            listener._plannedForeignWatchDescriptor = descriptor;
            if (descriptor._parentKey &&
                scopeTarget[descriptor._parentKey] === this._watchIdentity) {
                listener._plannedForeignWatchParent = this._watchIdentity;
            }
            else {
                this._bindForeignDependency(listener);
            }
        }
        else if (descriptorPlans) {
            const descriptors = new Array(descriptorPlans.length);
            for (let i = 0, l = descriptorPlans.length; i < l; i++) {
                const descriptor = descriptorPlans[i];
                descriptors[i] = {
                    _watchProp: descriptor._watchProp,
                    _watchParentFn: descriptor._watchParentFn,
                    _parentKey: descriptor._parentKey,
                    _key: descriptor._key,
                    _parent: unresolvedForeignWatchParent,
                };
            }
            listener._foreignWatchDescriptors = descriptors;
            this._bindForeignDependency(listener);
        }
        const listenerObject = listener._watchFn(scopeTarget);
        if (isObject(listenerObject)) {
            const listenerTarget = getObjectListenerTarget(listenerObject);
            if (listenerTarget) {
                addObjectListenerKey(this._objectListeners, listenerTarget, assertInvariantDefined(keys[0]));
            }
        }
        const hashKey = getScopeWatchIdentity(this, scopeTarget);
        if (isDefined(hashKey)) {
            for (let i = 0, l = keys.length; i < l; i++) {
                this._registerPlannedHashedKey(keys[i], listener, hashKey);
            }
        }
        else {
            for (let i = 0, l = keys.length; i < l; i++) {
                this._registerKey(keys[i], listener, false, hashKey);
            }
        }
        if (!isFunction(listenerObject) && !isArray(listenerObject)) {
            try {
                listenerFn(listenerObject, getListenerOwnerTarget(listener), listenerContext);
            }
            catch (err) {
                this._exceptionHandler(err);
            }
        }
        else {
            this._notifyListener(listener, scopeTarget);
        }
    }
    /** @internal Registers a compiled binding without entering generic watch analysis. */
    _watchPlanned(watchProp, listenerFn, lazy, synchronousInitial, resolvedValue, hasResolvedValue, listenerContext, watchPlan) {
        const scopeTarget = this._target;
        const descriptorPlans = watchPlan._foreignDescriptors;
        const listener = {
            _owner: this,
            _originalTarget: scopeTarget,
            _listenerFn: listenerFn,
            _watchFn: watchPlan._watchFn,
            _id: ++nextListenerId,
            _plannedForeignWatchParent: unresolvedForeignWatchParent,
        };
        if (listenerContext !== undefined) {
            listener._listenerContext = listenerContext;
        }
        const keys = watchPlan._keys;
        if (descriptorPlans?.length === 1) {
            const descriptor = descriptorPlans[0];
            listener._plannedForeignWatchDescriptor = descriptor;
            if (descriptor._parentKey &&
                scopeTarget[descriptor._parentKey] === this._watchIdentity) {
                listener._plannedForeignWatchParent = this._watchIdentity;
            }
            else {
                this._bindForeignDependency(listener);
            }
        }
        else if (descriptorPlans) {
            const descriptors = new Array(descriptorPlans.length);
            for (let i = 0, l = descriptorPlans.length; i < l; i++) {
                const descriptor = descriptorPlans[i];
                descriptors[i] = {
                    _watchProp: descriptor._watchProp,
                    _watchParentFn: descriptor._watchParentFn,
                    _parentKey: descriptor._parentKey,
                    _key: descriptor._key,
                    _parent: unresolvedForeignWatchParent,
                };
            }
            listener._foreignWatchDescriptors = descriptors;
            this._bindForeignDependency(listener);
        }
        const listenerObject = hasResolvedValue
            ? resolvedValue
            : listener._watchFn(scopeTarget);
        if (isObject(listenerObject)) {
            const listenerTarget = getObjectListenerTarget(listenerObject);
            if (listenerTarget) {
                addObjectListenerKey(this._objectListeners, listenerTarget, assertInvariantDefined(keys[0]));
            }
        }
        const hashKey = getScopeWatchIdentity(this, scopeTarget);
        if (isDefined(hashKey)) {
            for (let i = 0, l = keys.length; i < l; i++) {
                this._registerPlannedHashedKey(keys[i], listener, hashKey);
            }
        }
        else {
            for (let i = 0, l = keys.length; i < l; i++) {
                this._registerKey(keys[i], listener, false, hashKey);
            }
        }
        if (!lazy) {
            if (synchronousInitial &&
                !isFunction(listenerObject) &&
                !isArray(listenerObject)) {
                try {
                    if (listenerContext === undefined) {
                        listenerFn(listenerObject, getListenerOwnerTarget(listener));
                    }
                    else {
                        listenerFn(listenerObject, getListenerOwnerTarget(listener), listenerContext);
                    }
                }
                catch (err) {
                    this._exceptionHandler(err);
                }
            }
            else if (synchronousInitial) {
                this._notifyListener(listener, scopeTarget);
            }
            else {
                this._scheduleListener([listener]);
            }
        }
    }
    /**
     * Initializes the handler with the target object and a context.
     *
     * @param [context] - The context containing listeners.
     * @param [parent] - Custom parent.
     */
    constructor(context, parent, scheduler) {
        var _a;
        /** @internal */
        this._parentIndex = -1;
        this._listeners = EMPTY_SCOPE_LISTENERS;
        this._parse = context?._parse ?? defaultParse;
        this._exceptionHandler =
            context?._exceptionHandler ?? defaultExceptionHandler;
        this._watchers = context?._watchers ?? new Map();
        this._watchersByHash =
            context?._watchersByHash ??
                new Map();
        this._foreignListeners =
            context?._foreignListeners ?? new Map();
        this._foreignListenerIndexes =
            context?._foreignListenerIndexes ??
                new Map();
        this._foreignListenersByHash =
            context?._foreignListenersByHash ??
                new Map();
        this._foreignProxies = context?._foreignProxies ?? new Set();
        this._foreignProxyTargets = context?._foreignProxyTargets ?? new WeakMap();
        this._objectListeners = context?._objectListeners ?? new WeakMap();
        this._listenerStats = context?._listenerStats ?? {
            _nestedCandidateCount: 0,
        };
        this._handler = this;
        this._target = null;
        this._scopeTarget = undefined;
        this._watchIdentity = undefined;
        this._children = EMPTY_SCOPE_CHILDREN;
        this.id = nextId();
        this.root = context ? context.root : this;
        this.parent = parent ?? (this.root === this ? undefined : context);
        this._destroyed = false;
        this._scheduled = EMPTY_SCHEDULED_LISTENERS;
        this._arrayOwnerListenersScheduled = false;
        this.scopeName = undefined;
        this._ownedForeignListeners = [];
        this._ownedWatchers = [];
        this._listenerScheduler =
            context?._listenerScheduler ??
                scheduler ??
                createScopeListenerScheduler();
        if (!context) {
            (_a = this._listenerScheduler)._owner ?? (_a._owner = this);
        }
        this._arrayMutationWrappers =
            context?._arrayMutationWrappers ?? new WeakMap();
        this._collectionMethodWrappers =
            context?._collectionMethodWrappers ?? new WeakMap();
        this._modelChangeTracker = context?._modelChangeTracker;
        this._propertyMap = {
            __proto__: scopeMethodPropertyMap,
            _children: this._children,
            _handler: this,
            id: this.id,
            parent: this.parent,
            _proxy: this._proxy,
            root: this.root,
            scopeName: this.scopeName,
        };
    }
    /** @internal Binds a scope API method only when it is first read through the proxy. */
    _bindScopeMethod(property) {
        switch (property) {
            case "broadcast":
                return this.broadcast.bind(this);
            case "batch":
                return this.batch.bind(this);
            case "destroy":
                return this.destroy.bind(this);
            case "emit":
                return this.emit.bind(this);
            case "getById":
                return this.getById.bind(this);
            case "_isRoot":
                return this._isRoot.bind(this);
            case "merge":
                return this.merge.bind(this);
            case "new":
                return this.new.bind(this);
            case "newIsolate":
                return this.newIsolate.bind(this);
            case "on":
                return this.on.bind(this);
            case "searchByName":
                return this.searchByName.bind(this);
            case "transcluded":
                return this.transcluded.bind(this);
            case "watch":
                return this.watch.bind(this);
            default:
                return undefined;
        }
    }
    /** @internal Updates runtime services for this scope tree. */
    _setRuntimeDependencies(runtime) {
        this._parse = runtime.parse;
        this._exceptionHandler = runtime.exceptionHandler;
        this._children.forEach((child) => {
            child._handler._setRuntimeDependencies(runtime);
        });
    }
    /** @internal Destroys displaced direct child scopes found in the provided value or collection. */
    _destroyDisplacedValue(value, visited = new Set()) {
        if (!value || typeof value !== "object" || isNonScope(value))
            return;
        const objectValue = value;
        if (visited.has(objectValue))
            return;
        visited.add(objectValue);
        const childScope = this._childTargets?.get(objectValue);
        if (childScope) {
            if (childScope._handler._destroyed)
                return;
            childScope.destroy();
            return;
        }
        if (isProxy(value)) {
            const scopeValue = value;
            if (this._children.includes(scopeValue)) {
                if (scopeValue._handler._destroyed)
                    return;
                scopeValue.destroy();
                return;
            }
            const targetValue = scopeValue._target;
            if (!targetValue) {
                return;
            }
            const keyList = keys(targetValue);
            for (let i = 0, l = keyList.length; i < l; i++) {
                this._destroyDisplacedValue(targetValue[keyList[i]], visited);
            }
            return;
        }
        if (isArray(value)) {
            for (let i = 0, l = value.length; i < l; i++) {
                this._destroyDisplacedValue(value[i], visited);
            }
            return;
        }
        const recordValue = value;
        const keyList = keys(recordValue);
        for (let i = 0, l = keyList.length; i < l; i++) {
            this._destroyDisplacedValue(recordValue[keyList[i]], visited);
        }
    }
    /**
     * Intercepts and handles property assignments on the target object. Scopeable
     * objects are stored as raw model values and proxied lazily when read.
     *
     * @param target - The target object.
     * @param property - The name of the property being set.
     * @param value - The new value being assigned to the property.
     * @param proxy - The proxy intercepting property access.
     * @returns Returns true to indicate success of the operation.
     */
    set(target, property, value, proxy) {
        if (property === "undefined") {
            return false;
        }
        if (property === "scopeName") {
            this.scopeName = String(value);
            return true;
        }
        const nonscopeProps = target.constructor?.$nonscope ?? target.$nonscope;
        if (isArray(nonscopeProps) && nonscopeProps.includes(property)) {
            target[property] = value;
            return true;
        }
        this._proxy = proxy;
        this._target = target;
        const oldValue = target[property];
        const rawOldValue = unwrapScopeValue(oldValue);
        const assignedValue = getAssignedScopeValue(value);
        const rawValue = assignedValue._rawValue;
        const valueIsProxy = assignedValue._isProxy;
        const storedValue = assignedValue._storedValue;
        const valueChanged = rawOldValue !== rawValue;
        if (isArray(target) &&
            property === "length" &&
            typeof oldValue === "number" &&
            typeof value === "number" &&
            value < oldValue) {
            for (let i = oldValue - 1; i >= value; i--) {
                this._destroyDisplacedValue(target[i]);
            }
        }
        if (isArray(target) && property !== "length") {
            clearArrayMutationMeta(proxy);
            if (getArrayMutationIndex(property) === undefined) {
                clearArraySwapCandidate(proxy);
            }
        }
        else if (isArray(target)) {
            clearArraySwapCandidate(proxy);
        }
        // Handle NaNs
        if (oldValue !== undefined &&
            Number.isNaN(oldValue) &&
            Number.isNaN(rawValue)) {
            return true;
        }
        if (valueChanged) {
            this._recordModelChange(property, target);
        }
        if (isPromiseLike(rawValue)) {
            if (valueChanged && !valueIsProxy) {
                this._destroyDisplacedValue(oldValue);
            }
            target[property] = storedValue;
            if (valueChanged) {
                const listeners = this._watchers.get(property);
                if (listeners) {
                    this._scheduleListener(listeners);
                }
                const foreignListeners = this._foreignListeners.get(property);
                if (foreignListeners) {
                    this._scheduleListener(foreignListeners);
                }
                if (isArray(target)) {
                    this._scheduleArrayOwnerListeners(target, proxy, property);
                    if (property !== "length") {
                        trackArraySwapMutation(proxy, property, oldValue, value, target.length);
                    }
                }
                if (this._objectListeners.has(target) && property !== "length") {
                    this._scheduleObjectOwnerListeners(target);
                }
            }
            this._schedulePromiseSettlement(target, property, rawValue, proxy);
            return true;
        }
        if (isProxy(oldValue)) {
            if (isArray(rawValue)) {
                const isProxyRebind = valueIsProxy;
                if (valueChanged && !isProxyRebind) {
                    this._destroyDisplacedValue(oldValue);
                }
                if (valueChanged) {
                    const listeners = this._watchers.get(property);
                    if (listeners) {
                        this._scheduleListener(listeners);
                    }
                    const _foreignListeners = this._foreignListeners.get(property);
                    if (_foreignListeners) {
                        this._scheduleListener(_foreignListeners);
                    }
                    this._scheduleArrayOwnerListeners(target, proxy, property);
                }
                const oldObjectListenerTarget = getObjectListenerTarget(target[property]);
                if (oldObjectListenerTarget) {
                    removeObjectListenerKey(this._objectListeners, oldObjectListenerTarget, property);
                }
                target[property] = storedValue;
                addObjectListenerKey(this._objectListeners, rawValue, property);
                if (valueChanged && isArray(target)) {
                    trackArraySwapMutation(proxy, property, oldValue, value, target.length);
                }
                return true;
            }
            if (isObject(rawValue)) {
                const isProxyRebind = valueIsProxy;
                // Moving one existing proxy onto another slot is a rebind, not disposal.
                // Keep nested child scopes alive and let collection watchers handle the move.
                if (valueChanged && !isProxyRebind) {
                    this._destroyDisplacedValue(oldValue);
                }
                if (!isProxyRebind && hasOwn(target, property)) {
                    const keyList = keys(unwrapScopeValue(oldValue));
                    for (const k of keyList) {
                        if (!hasOwn(rawValue, k))
                            deleteProperty(oldValue, k);
                    }
                }
                if (valueChanged) {
                    const listeners = this._watchers.get(property);
                    if (listeners) {
                        this._scheduleListener(listeners);
                    }
                    const _foreignListeners = this._foreignListeners.get(property);
                    if (_foreignListeners) {
                        this._scheduleListener(_foreignListeners);
                    }
                    this._checkListenersForAllKeys(rawValue);
                    this._scheduleArrayOwnerListeners(target, proxy, property);
                }
                target[property] = storedValue;
                if (valueChanged && isArray(target)) {
                    trackArraySwapMutation(proxy, property, oldValue, value, target.length);
                }
                //setDeepValue(target[property], value);
                return true;
            }
            if (isUndefined(rawValue)) {
                this._destroyDisplacedValue(oldValue);
                let called = false;
                const oldTarget = oldValue._target;
                const keyList = keys(oldTarget);
                const tgt = oldTarget;
                for (let i = 0, l = keyList.length; i < l; i++) {
                    const k = keyList[i];
                    const v = tgt[k];
                    if (isProxy(v)) {
                        called = true;
                    }
                }
                for (let i = 0, l = keyList.length; i < l; i++) {
                    deleteProperty(oldValue, keyList[i]);
                }
                target[property] = undefined;
                if (!called) {
                    const listeners = this._watchers.get(property);
                    if (listeners) {
                        this._scheduleListener(listeners);
                    }
                }
                return true;
            }
            if (isDefined(rawValue)) {
                this._destroyDisplacedValue(oldValue);
                target[property] = storedValue;
                const listeners = this._watchers.get(property);
                if (listeners) {
                    this._scheduleListener(listeners);
                }
                if (isArray(target)) {
                    this._scheduleArrayOwnerListeners(target, proxy, property);
                    trackArraySwapMutation(proxy, property, oldValue, value, target.length);
                }
                return true;
            }
            return true;
        }
        else {
            if (valueIsProxy) {
                this._foreignProxies.add(value);
                this._foreignProxyTargets.set(rawValue, value);
            }
            if (isUndefined(target[property]) && valueIsProxy) {
                target[property] = storedValue;
                if (!this._watchers.has(property)) {
                    return true;
                }
            }
            const shouldDestroyOldValue = !(isArray(rawOldValue) &&
                isArray(rawValue) &&
                this._objectListeners.has(rawOldValue));
            if (valueChanged && !valueIsProxy && shouldDestroyOldValue) {
                this._destroyDisplacedValue(oldValue);
            }
            if (isUndefined(rawValue)) {
                target[property] = rawValue;
            }
            else {
                target[property] = storedValue;
            }
            if (valueChanged) {
                const hasDirectPropertyListeners = this._watchers.has(property);
                const parentForeignListeners = this.parent
                    ? this.parent._foreignListeners
                    : undefined;
                const hasForeignPropertyListeners = this._foreignListeners.has(property) ||
                    (isObject(parentForeignListeners) &&
                        isInstanceOf(parentForeignListeners, Map) &&
                        parentForeignListeners.has(property));
                const hasObjectListeners = property !== "length" && this._objectListeners.has(target);
                const hasArrayLengthListeners = isArray(target) && this._watchers.has("length");
                const mayCollectNestedListeners = !isArray(target) &&
                    !isArray(rawOldValue) &&
                    !isArray(rawValue) &&
                    (isObject(rawOldValue) || isObject(rawValue)) &&
                    this._hasNestedListenerCandidates();
                const mayScheduleArrayOwnerListeners = isArray(target) &&
                    !this._arrayOwnerListenersScheduled &&
                    (property === "length" || hasObjectListeners);
                if (!hasDirectPropertyListeners &&
                    !hasForeignPropertyListeners &&
                    !hasObjectListeners &&
                    !hasArrayLengthListeners &&
                    !mayCollectNestedListeners &&
                    !mayScheduleArrayOwnerListeners) {
                    if (isArray(target) && property !== "length") {
                        trackArraySwapMutation(proxy, property, oldValue, value, target.length);
                    }
                    return true;
                }
                let expectedTarget = this._target;
                const directListeners = [];
                const nestedListeners = [];
                const seenListenerIds = new Set();
                const pushUniqueListener = (list, listener) => {
                    if (seenListenerIds.has(listener._id))
                        return;
                    seenListenerIds.add(listener._id);
                    list.push(listener);
                };
                const visitedNestedValues = new WeakSet();
                const collectNestedListeners = (nestedValue) => {
                    const nestedTarget = unwrapScopeValue(nestedValue);
                    if (!isObject(nestedTarget) || isNonScope(nestedTarget)) {
                        return;
                    }
                    const nestedObject = nestedTarget;
                    if (visitedNestedValues.has(nestedObject)) {
                        return;
                    }
                    visitedNestedValues.add(nestedObject);
                    const nestedRecord = nestedTarget;
                    const keyList = keys(nestedRecord);
                    for (let i = 0, l = keyList.length; i < l; i++) {
                        const key = keyList[i];
                        const keyListeners = this._watchers.get(key);
                        if (keyListeners) {
                            for (let j = 0, jl = keyListeners.length; j < jl; j++) {
                                pushUniqueListener(nestedListeners, keyListeners[j]);
                            }
                        }
                        if (isObject(nestedRecord[key])) {
                            collectNestedListeners(nestedRecord[key]);
                        }
                    }
                };
                if (isObject(rawOldValue)) {
                    const oldObjectListenerTarget = getObjectListenerTarget(rawOldValue);
                    if (oldObjectListenerTarget) {
                        removeObjectListenerKey(this._objectListeners, oldObjectListenerTarget, property);
                    }
                }
                // Handle the case where we need to start observing object after a watcher has been set
                if (isObject(target[property]) &&
                    (isArray(target[property])
                        ? this._hasObjectMutationWatchers(property)
                        : isUndefined(oldValue))) {
                    const childObjectListenerTarget = getObjectListenerTarget(target[property]);
                    if (childObjectListenerTarget) {
                        addObjectListenerKey(this._objectListeners, childObjectListenerTarget, property);
                    }
                    if (isUndefined(oldValue) && !isArray(target)) {
                        expectedTarget = rawValue;
                    }
                }
                if (isArray(target)) {
                    const lengthListeners = hasArrayLengthListeners
                        ? this._watchers.get("length")
                        : undefined;
                    if (lengthListeners) {
                        for (let i = 0, l = lengthListeners.length; i < l; i++) {
                            pushUniqueListener(directListeners, lengthListeners[i]);
                        }
                    }
                }
                if (mayCollectNestedListeners && isObject(rawOldValue)) {
                    collectNestedListeners(unwrapScopeValue(oldValue));
                }
                if (mayCollectNestedListeners && isObject(rawValue)) {
                    collectNestedListeners(rawValue);
                }
                let propListeners = hasDirectPropertyListeners
                    ? this._watchers.get(property)
                    : undefined;
                const targetHashKey = getScopeWatchIdentity(this, target);
                let hasExactPropListeners = false;
                if (isDefined(targetHashKey)) {
                    const hashedPropListeners = this._watchersByHash
                        .get(property)
                        ?.get(targetHashKey);
                    if (hashedPropListeners) {
                        propListeners = isArray(hashedPropListeners)
                            ? hashedPropListeners
                            : [hashedPropListeners];
                        hasExactPropListeners = directListeners.length === 0;
                    }
                }
                if (propListeners) {
                    for (let i = 0, l = propListeners.length; i < l; i++) {
                        pushUniqueListener(directListeners, propListeners[i]);
                    }
                }
                if (directListeners.length > 0) {
                    if (hasExactPropListeners) {
                        this._scheduleListener(directListeners, undefined, property);
                    }
                    else {
                        this._scheduleListener(directListeners, (list) => {
                            let scheduled;
                            for (let i = 0, l = list.length; i < l; i++) {
                                const x = list[i];
                                if (!x._watchProp) {
                                    scheduled?.push(x);
                                    continue;
                                }
                                const originalTarget = getListenerOwnerTarget(x);
                                const expectedParent = x._watchParentFn?.(originalTarget);
                                const expectedParentTarget = unwrapScopeValue(expectedParent);
                                if (expectedTarget === expectedParentTarget ||
                                    (isArray(expectedParentTarget) &&
                                        expectedTarget === originalTarget) ||
                                    (x._watchProp.includes("[") &&
                                        expectedTarget === originalTarget)) {
                                    scheduled?.push(x);
                                }
                                else {
                                    scheduled ?? (scheduled = list.slice(0, i));
                                }
                            }
                            return scheduled ?? list;
                        }, property);
                    }
                }
                if (nestedListeners.length > 0) {
                    this._scheduleListener(nestedListeners);
                }
                if (isArray(target) &&
                    property === "length" &&
                    !this._arrayOwnerListenersScheduled) {
                    if (typeof oldValue === "number" &&
                        typeof value === "number" &&
                        value < oldValue) {
                        setArrayMutationMeta(proxy, createSpliceArrayMutationMeta(value, oldValue - value, 0, oldValue, value));
                    }
                    else if (typeof oldValue === "number" &&
                        typeof value === "number" &&
                        value !== oldValue) {
                        clearArrayMutationMeta(proxy);
                    }
                    this._scheduleArrayOwnerListeners(target, proxy, property, true);
                }
                if (isArray(target) && property !== "length") {
                    trackArraySwapMutation(proxy, property, oldValue, value, target.length);
                }
                let _foreignListeners = this._foreignListeners.get(property);
                if (!_foreignListeners && this.parent?._foreignListeners) {
                    _foreignListeners = this.parent._foreignListeners.get(property);
                }
                if (_foreignListeners) {
                    let scheduled = _foreignListeners;
                    // filter for repeaters
                    const hashKey = getScopeWatchIdentity(this, this._target);
                    if (isDefined(hashKey)) {
                        const hashedListeners = this._foreignListenersByHash
                            .get(property)
                            ?.get(hashKey);
                        scheduled = hashedListeners
                            ? isArray(hashedListeners)
                                ? hashedListeners
                                : [hashedListeners]
                            : [];
                    }
                    if (scheduled.length > 0) {
                        if (seenListenerIds.size > 0) {
                            const uniqueForeignListeners = [];
                            for (let i = 0, l = scheduled.length; i < l; i++) {
                                if (!seenListenerIds.has(scheduled[i]._id)) {
                                    uniqueForeignListeners.push(scheduled[i]);
                                }
                            }
                            scheduled = uniqueForeignListeners;
                        }
                        if (scheduled.length > 0) {
                            this._scheduleListener(scheduled, undefined, property);
                        }
                    }
                }
            }
            if (this._objectListeners.has(target) && property !== "length") {
                const keyList = this._objectListeners.get(target);
                if (keyList) {
                    const hasMultipleKeys = isArray(keyList);
                    const keyCount = hasMultipleKeys ? keyList.length : 1;
                    const objectHashKey = getScopeWatchIdentity(this, target);
                    for (let i = 0; i < keyCount; i++) {
                        const key = hasMultipleKeys ? keyList[i] : keyList;
                        const listeners = isDefined(objectHashKey)
                            ? this._watchersByHash.get(key)?.get(objectHashKey)
                            : this._watchers.get(key);
                        if (listeners) {
                            const scheduled = isArray(listeners) ? listeners : [listeners];
                            if (this._scheduled !== scheduled) {
                                this._scheduleListener(scheduled);
                            }
                        }
                    }
                }
            }
            return true;
        }
    }
    /**
     * Intercepts property access on the target object. It checks for specific
     * properties (`watch` and `sync`) and binds their methods. For other properties,
     * it returns the value directly.
     *
     * @param target - The target object.
     * @param property - The name of the property being accessed.
     * @param proxy - The proxy object being invoked.
     * @returns The value of the property or a method if accessing `watch` or `sync`.
     */
    get(target, property, proxy) {
        if (property === SCOPE_HANDLER || property === "_handler") {
            this._target = target;
            this._proxy = proxy;
            return this;
        }
        if (property === "scopeName" && this.scopeName)
            return this.scopeName;
        if (property === "$$watchersCount")
            return calculateWatcherCount(this);
        if (property === isProxySymbol)
            return true;
        trackScopeExpressionRead(target, property);
        if (this._destroyed &&
            typeof property !== "symbol" &&
            hasOwn(this._propertyMap, property)) {
            return this._propertyMap[property];
        }
        const targetProp = isNativeScopedTarget(target)
            ? Reflect.get(target, property, target)
            : isString(property)
                ? target[property]
                : target[property];
        const scopeableTargetProp = isObject(targetProp) && !isNonScope(targetProp) ? targetProp : undefined;
        const nonscopeProps = scopeableTargetProp
            ? (target.constructor?.$nonscope ?? target.$nonscope)
            : undefined;
        const foreignProxy = scopeableTargetProp
            ? this._foreignProxyTargets.get(scopeableTargetProp)
            : undefined;
        let scopedTargetProp;
        if (foreignProxy) {
            scopedTargetProp = foreignProxy;
        }
        else if (isString(property) &&
            isArray(nonscopeProps) &&
            nonscopeProps.includes(property)) {
            scopedTargetProp = targetProp;
        }
        else if (scopeableTargetProp) {
            if (isProxy(scopeableTargetProp)) {
                scopedTargetProp = scopeableTargetProp;
            }
            else {
                const cached = scopeProxyCache.get(scopeableTargetProp);
                let proxiesByHandler;
                let cachedProxy;
                if (cached && isProxy(cached)) {
                    if (cached._handler === this) {
                        cachedProxy = cached;
                    }
                    else {
                        proxiesByHandler = new WeakMap();
                        proxiesByHandler.set(cached._handler, cached);
                        scopeProxyCache.set(scopeableTargetProp, proxiesByHandler);
                    }
                }
                else {
                    proxiesByHandler = cached;
                }
                cachedProxy ?? (cachedProxy = proxiesByHandler?.get(this));
                if (!cachedProxy) {
                    cachedProxy = new Proxy(scopeableTargetProp, this);
                    if (proxiesByHandler) {
                        proxiesByHandler.set(this, cachedProxy);
                    }
                    else {
                        scopeProxyCache.set(scopeableTargetProp, cachedProxy);
                    }
                    scopeProxyTargets.set(cachedProxy, scopeableTargetProp);
                    const bind = scopeableTargetProp[SCOPE_PROXY_BIND];
                    if (isFunction(bind)) {
                        bind.call(scopeableTargetProp, this, cachedProxy);
                    }
                }
                scopedTargetProp = cachedProxy;
            }
        }
        else {
            scopedTargetProp = targetProp;
        }
        if (isProxy(scopedTargetProp)) {
            if (this._proxy !== scopedTargetProp)
                this._proxy = scopedTargetProp;
        }
        else if (this._proxy !== proxy) {
            this._proxy = proxy;
        }
        if (this._propertyMap._target !== target) {
            this._propertyMap._target = target;
        }
        if (this._propertyMap._proxy !== proxy) {
            this._propertyMap._proxy = proxy;
        }
        let scopeMember = typeof property !== "symbol" ? this._propertyMap[property] : undefined;
        const targetShadowsScopeData = isString(property) && !property.startsWith("_") && property in target;
        if (typeof property !== "symbol" &&
            property in this._propertyMap &&
            !targetShadowsScopeData) {
            this._target = target;
            if (scopeMember === unboundScopeMethod) {
                scopeMember = this._bindScopeMethod(String(property));
                this._propertyMap[property] = scopeMember;
            }
            return scopeMember;
        }
        if (isNativeScopedTarget(target)) {
            if (isFunction(targetProp) && property !== "constructor") {
                return this._getNativeCollectionMethodWrapper(target, property, targetProp);
            }
            return targetProp;
        }
        if (isArray(target) &&
            isString(property) &&
            arrayMutationMethods.has(property)) {
            let wrappers = this._arrayMutationWrappers.get(target);
            if (!wrappers) {
                wrappers = {};
                this._arrayMutationWrappers.set(target, wrappers);
            }
            const cachedWrapper = wrappers[property];
            if (cachedWrapper) {
                return cachedWrapper;
            }
            const wrapper = (...args) => {
                const previousLength = target.length;
                clearArrayMutationMeta(proxy);
                clearArraySwapCandidate(proxy);
                this._scheduled = [];
                this._arrayOwnerListenersScheduled = false;
                const scheduledIds = new Set();
                if (this._objectListeners.has(target)) {
                    const keyList = this._objectListeners.get(target);
                    if (keyList) {
                        const hasMultipleKeys = isArray(keyList);
                        const keyCount = hasMultipleKeys ? keyList.length : 1;
                        for (let i = 0; i < keyCount; i++) {
                            const key = hasMultipleKeys ? keyList[i] : keyList;
                            const listenerGroups = [
                                this._watchers.get(key),
                                this._foreignListeners.get(key),
                            ];
                            for (let j = 0; j < listenerGroups.length; j++) {
                                const listeners = listenerGroups[j];
                                if (!listeners)
                                    continue;
                                for (let k = 0; k < listeners.length; k++) {
                                    const listener = listeners[k];
                                    if (scheduledIds.has(listener._id))
                                        continue;
                                    scheduledIds.add(listener._id);
                                    if (this._scheduled === EMPTY_SCHEDULED_LISTENERS) {
                                        this._scheduled = [];
                                    }
                                    this._scheduled.push(listener);
                                }
                            }
                        }
                    }
                }
                if (property === "unshift" && this._scheduled.length > 0) {
                    this._scheduleListener(this._scheduled);
                    this._arrayOwnerListenersScheduled = true;
                }
                try {
                    const rawArgs = unwrapArrayMutationArgs(args);
                    const removedValues = collectRemovedArrayMutationValues(property, rawArgs, target);
                    const result = Reflect.apply(targetProp, target, rawArgs);
                    if (removedValues) {
                        for (let i = 0, l = removedValues.length; i < l; i++) {
                            if (!target.includes(removedValues[i])) {
                                this._destroyDisplacedValue(removedValues[i]);
                            }
                        }
                    }
                    setArrayMutationMeta(proxy, getMethodArrayMutationMeta(property, rawArgs, previousLength, target.length));
                    if (previousLength !== target.length) {
                        this._scheduleWatchKeys("length", scheduledIds);
                    }
                    this._recordModelChange(property, target);
                    if (this._scheduled.length > 0 &&
                        !this._arrayOwnerListenersScheduled) {
                        this._scheduleListener(this._scheduled);
                        this._arrayOwnerListenersScheduled = true;
                    }
                    return result;
                }
                finally {
                    this._scheduled = [];
                    this._arrayOwnerListenersScheduled = false;
                }
            };
            wrappers[property] = wrapper;
            return wrapper;
        }
        if (isArray(target) &&
            isString(property) &&
            arrayIdentityMethods.has(property)) {
            return (...args) => Reflect.apply(targetProp, target, unwrapArrayMutationArgs(args));
        }
        return scopedTargetProp;
    }
    /** @internal Returns a native collection method wrapper bound to the raw collection target. */
    _getNativeCollectionMethodWrapper(target, property, method) {
        let wrappers = this._collectionMethodWrappers.get(target);
        if (!wrappers) {
            wrappers = new Map();
            this._collectionMethodWrappers.set(target, wrappers);
        }
        const cachedWrapper = wrappers.get(property);
        if (cachedWrapper) {
            return cachedWrapper;
        }
        const wrapper = (...args) => {
            const rawArgs = unwrapCollectionArgs(args);
            if (isMapTarget(target) && isString(property)) {
                return this._applyMapMethod(target, property, method, rawArgs);
            }
            if (isSetTarget(target) && isString(property)) {
                return this._applySetMethod(target, property, method, rawArgs);
            }
            if (isDateTarget(target) && isString(property)) {
                return this._applyDateMethod(target, property, method, rawArgs);
            }
            return Reflect.apply(method, target, rawArgs);
        };
        wrappers.set(property, wrapper);
        return wrapper;
    }
    /** @internal Applies a Map method and schedules affected watchers for mutating calls. */
    _applyMapMethod(target, property, method, args) {
        if (!mapMutationMethods.has(property)) {
            return Reflect.apply(method, target, args);
        }
        if (property === "set") {
            const [key] = args;
            const hadKey = target.has(key);
            const previousValue = hadKey ? target.get(key) : undefined;
            const result = Reflect.apply(method, target, args);
            const valueChanged = !hadKey || !Object.is(previousValue, args[1]);
            if (valueChanged) {
                this._scheduleNativeCollectionMutation(target, hadKey ? mapValueMutationWatchKeys : undefined, !hadKey);
                this._recordModelChange(property, target);
            }
            return result;
        }
        if (property === "delete") {
            const hadKey = target.has(args[0]);
            const result = Reflect.apply(method, target, args);
            if (hadKey) {
                this._scheduleNativeCollectionMutation(target, undefined, true);
                this._recordModelChange(property, target);
            }
            return result;
        }
        if (property === "getOrInsert" || property === "getOrInsertComputed") {
            const hadKey = target.has(args[0]);
            const result = Reflect.apply(method, target, args);
            if (!hadKey) {
                this._scheduleNativeCollectionMutation(target, undefined, true);
                this._recordModelChange(property, target);
            }
            return result;
        }
        const previousSize = target.size;
        const result = Reflect.apply(method, target, args);
        if (target.size !== previousSize) {
            this._scheduleNativeCollectionMutation(target, undefined, true);
            this._recordModelChange(property, target);
        }
        return result;
    }
    /** @internal Applies a Set method and schedules affected watchers for mutating calls. */
    _applySetMethod(target, property, method, args) {
        if (!setMutationMethods.has(property)) {
            return Reflect.apply(method, target, args);
        }
        if (property === "add") {
            const hadValue = target.has(args[0]);
            const result = Reflect.apply(method, target, args);
            if (!hadValue) {
                this._scheduleNativeCollectionMutation(target, setMutationWatchKeys, true);
                this._recordModelChange(property, target);
            }
            return result;
        }
        if (property === "delete") {
            const hadValue = target.has(args[0]);
            const result = Reflect.apply(method, target, args);
            if (hadValue) {
                this._scheduleNativeCollectionMutation(target, setMutationWatchKeys, true);
                this._recordModelChange(property, target);
            }
            return result;
        }
        const previousSize = target.size;
        const result = Reflect.apply(method, target, args);
        if (target.size !== previousSize) {
            this._scheduleNativeCollectionMutation(target, setMutationWatchKeys, true);
            this._recordModelChange(property, target);
        }
        return result;
    }
    /** @internal Applies a Date method and schedules affected watchers for mutating calls. */
    _applyDateMethod(target, property, method, args) {
        if (!isDateMutationMethod(property)) {
            return Reflect.apply(method, target, args);
        }
        const previousTime = target.getTime();
        const result = Reflect.apply(method, target, args);
        if (!Object.is(previousTime, target.getTime())) {
            this._scheduleDateMutation(target);
            this._recordModelChange(property, target);
        }
        return result;
    }
    /** @internal Queues watchers that can observe Date mutation. */
    _scheduleDateMutation(target) {
        const seenListenerIds = new Set();
        this._scheduleWatchKeys(dateValueWatchKeys, seenListenerIds);
        this._scheduleObjectOwnerListeners(target, seenListenerIds);
    }
    /** @internal Queues watchers that can observe a native collection mutation. */
    _scheduleNativeCollectionMutation(target, watchKeys, sizeChanged) {
        const seenListenerIds = new Set();
        if (watchKeys) {
            this._scheduleWatchKeys(watchKeys, seenListenerIds);
        }
        else if (isMapTarget(target)) {
            this._scheduleWatchKeys(mapValueMutationWatchKeys, seenListenerIds);
            this._scheduleWatchKeys(mapMembershipMutationWatchKeys, seenListenerIds);
        }
        else {
            this._scheduleWatchKeys(setMutationWatchKeys, seenListenerIds);
        }
        if (sizeChanged) {
            this._scheduleWatchKeys("size", seenListenerIds);
        }
        this._scheduleObjectOwnerListeners(target, seenListenerIds);
    }
    /** @internal Queues local and foreign listeners registered for the provided keys. */
    _scheduleWatchKeys(watchKeys, seenListenerIds) {
        const scheduleUnique = (listeners) => {
            if (!listeners) {
                return;
            }
            if (!seenListenerIds) {
                this._scheduleListener(listeners);
                return;
            }
            const scheduled = [];
            for (let i = 0, l = listeners.length; i < l; i++) {
                const listener = listeners[i];
                if (seenListenerIds.has(listener._id)) {
                    continue;
                }
                seenListenerIds.add(listener._id);
                scheduled.push(listener);
            }
            if (scheduled.length > 0) {
                this._scheduleListener(scheduled);
            }
        };
        const hasMultipleKeys = isArray(watchKeys);
        const keyCount = hasMultipleKeys ? watchKeys.length : 1;
        for (let i = 0; i < keyCount; i++) {
            const key = hasMultipleKeys ? watchKeys[i] : watchKeys;
            scheduleUnique(this._watchers.get(key));
            scheduleUnique(this._foreignListeners.get(key));
        }
    }
    /** @internal Queues watchers registered against a raw object/collection owner. */
    _scheduleObjectOwnerListeners(target, seenListenerIds) {
        if (!this._objectListeners.has(target)) {
            return;
        }
        const keyList = this._objectListeners.get(target);
        if (!keyList) {
            return;
        }
        this._scheduleWatchKeys(keyList, seenListenerIds);
    }
    /** @internal Registers a member-expression listener against its current foreign proxy parent. */
    _bindForeignDependency(listener, resolvedValue, hasResolvedValue = false) {
        const plannedDescriptor = listener._plannedForeignWatchDescriptor;
        const descriptors = listener._foreignWatchDescriptors;
        const descriptorCount = plannedDescriptor ? 1 : (descriptors?.length ?? 0);
        if (descriptorCount === 0) {
            return false;
        }
        let bound = false;
        const listenerTarget = getListenerOwnerTarget(listener);
        for (let i = 0; i < descriptorCount; i++) {
            const descriptor = plannedDescriptor ?? assertInvariantDefined(descriptors?.[i]);
            const mutableDescriptor = descriptor;
            const existing = plannedDescriptor
                ? listener._plannedForeignWatchDependency
                : mutableDescriptor._dependency;
            const parent = descriptor._parentKey
                ? listenerTarget[descriptor._parentKey]
                : descriptor._watchParentFn(listenerTarget);
            const previousParent = plannedDescriptor
                ? listener._plannedForeignWatchParent
                : mutableDescriptor._parent;
            if (previousParent === parent) {
                continue;
            }
            const foreignProxy = this._resolveForeignDependencyProxy(descriptor, parent, listenerTarget);
            if (!foreignProxy) {
                if (plannedDescriptor) {
                    listener._plannedForeignWatchParent = parent;
                }
                else {
                    mutableDescriptor._parent = parent;
                }
                continue;
            }
            /* istanbul ignore next -- avoids replacing an equivalent cached dependency. */
            if (existing?._handler === foreignProxy._handler &&
                existing._key === descriptor._key) {
                if (plannedDescriptor) {
                    listener._plannedForeignWatchParent = parent;
                }
                else {
                    mutableDescriptor._parent = parent;
                }
                continue;
            }
            if (existing) {
                existing._handler._deregisterForeignKey(existing._key, listener._id);
                this._untrackOwnedForeignListener(existing._handler, existing._key, listener._id);
            }
            foreignProxy._handler._registerForeignKey(descriptor._key, listener, hasResolvedValue && descriptorCount === 1
                ? resolvedValue
                : this._parse(descriptor._watchProp)(listenerTarget));
            this._trackOwnedForeignListener(foreignProxy._handler, descriptor._key, listener._id);
            const dependency = {
                _handler: foreignProxy._handler,
                _key: descriptor._key,
                _id: listener._id,
            };
            if (plannedDescriptor) {
                listener._plannedForeignWatchDependency = dependency;
                listener._plannedForeignWatchParent = parent;
            }
            else {
                mutableDescriptor._dependency = dependency;
                mutableDescriptor._parent = parent;
            }
            bound = true;
        }
        return bound;
    }
    /** @internal Removes the current foreign dependency owned by this listener. */
    _releaseForeignDependency(listener) {
        const plannedDescriptor = listener._plannedForeignWatchDescriptor;
        const descriptors = listener._foreignWatchDescriptors;
        const descriptorCount = plannedDescriptor ? 1 : (descriptors?.length ?? 0);
        if (descriptorCount === 0) {
            return;
        }
        for (let i = 0; i < descriptorCount; i++) {
            const descriptor = plannedDescriptor ?? assertInvariantDefined(descriptors?.[i]);
            const mutableDescriptor = descriptor;
            const existing = plannedDescriptor
                ? listener._plannedForeignWatchDependency
                : mutableDescriptor._dependency;
            if (!existing) {
                continue;
            }
            existing._handler._deregisterForeignKey(existing._key, listener._id);
            this._untrackOwnedForeignListener(existing._handler, existing._key, listener._id);
            if (plannedDescriptor) {
                listener._plannedForeignWatchDependency = undefined;
                listener._plannedForeignWatchParent = undefined;
            }
            else {
                mutableDescriptor._dependency = undefined;
                mutableDescriptor._parent = undefined;
            }
        }
    }
    /** @internal Resolves the foreign proxy parent for a member-expression listener. */
    _resolveForeignDependencyProxy(descriptor, potentialProxy, listenerTarget) {
        const potentialScopeProxy = isProxy(potentialProxy)
            ? potentialProxy
            : undefined;
        if (potentialScopeProxy &&
            (this._foreignProxies.has(potentialScopeProxy) ||
                potentialScopeProxy._handler !== this)) {
            return potentialScopeProxy;
        }
        if (isObject(potentialProxy) &&
            isFunction(potentialProxy[SCOPE_PROXY_BIND])) {
            getCachedScopeProxy(potentialProxy, this);
        }
        let foreignProxy;
        const foreignTarget = getObjectListenerTarget(potentialProxy);
        if (foreignTarget) {
            foreignProxy = this._foreignProxyTargets.get(foreignTarget);
        }
        foreignProxy ?? (foreignProxy = this._resolveForeignProxyParent(descriptor._watchProp, listenerTarget));
        return foreignProxy;
    }
    /** @internal Resolves a nested foreign proxy parent from a simple dotted watch path. */
    _resolveForeignProxyParent(watchProp, target) {
        const parts = getForeignProxyParentPath(watchProp);
        if (!parts) {
            return undefined;
        }
        const rootValue = target[parts[0]];
        if (!isObject(rootValue) || isNonScope(rootValue)) {
            return undefined;
        }
        let cursor = this._foreignProxyTargets.get(rootValue);
        if (!cursor) {
            return undefined;
        }
        for (let i = 1, l = parts.length; i < l; i++) {
            cursor = cursor[parts[i]];
        }
        if (isProxy(cursor) && cursor._handler !== this) {
            return cursor;
        }
        return undefined;
    }
    /** @internal Resolves promise-like assignments back through the same scope property. */
    _schedulePromiseSettlement(target, property, promise, proxy) {
        void Promise.resolve(promise)
            .then((value) => {
            this._applyPromiseSettlement(target, property, promise, value, proxy);
            return undefined;
        })
            .catch((reason) => {
            this._applyPromiseSettlement(target, property, promise, reason, proxy);
        });
    }
    /** @internal Applies a promise settlement only if the property still contains that promise. */
    _applyPromiseSettlement(target, property, promise, value, proxy) {
        if (this._destroyed || unwrapScopeValue(target[property]) !== promise) {
            return;
        }
        this.set(target, property, value, proxy);
    }
    /**
     * @param target - The target object.
     * @param property - The name of the property being deleted.
     */
    // noinspection JSUnusedGlobalSymbols -- Proxy trap invoked via the Proxy handler contract.
    deleteProperty(target, property) {
        const propertyExisted = hasOwn(target, property);
        if (isArray(target)) {
            clearArrayMutationMeta(this._proxy);
            clearArraySwapCandidate(this._proxy);
        }
        // Currently deletes $model
        if (isProxy(target[property])) {
            target[property] = undefined;
            this._scheduleWatchKeys(String(property));
            if (this._scheduled.length === 0 && this._objectListeners.has(target)) {
                this._scheduleObjectOwnerListeners(target);
            }
            if (this._scheduled.length > 0) {
                this._scheduleListener(this._scheduled);
                this._arrayOwnerListenersScheduled = true;
                this._scheduled = [];
            }
            this._recordModelChange(property, target);
            return true;
        }
        deleteProperty(target, property);
        if (this._scheduled.length === 0 && this._objectListeners.has(target)) {
            this._scheduleObjectOwnerListeners(target);
        }
        else {
            this._scheduleWatchKeys(String(property));
        }
        if (this._scheduled.length > 0) {
            this._scheduleListener(this._scheduled);
            this._arrayOwnerListenersScheduled = true;
            this._scheduled = [];
        }
        if (propertyExisted) {
            this._recordModelChange(property, target);
        }
        return true;
    }
    /** @internal Recursively schedules listeners for every reachable object key in the value. */
    _checkListenersForAllKeys(value) {
        this._checkListenersForAllKeysRecursive(value, new WeakSet());
    }
    /** @internal Returns true when a key has listeners that should react to object mutation. */
    _hasObjectMutationWatchers(property) {
        const hasMutationWatcher = (listeners) => {
            if (!listeners) {
                return false;
            }
            for (let i = 0, l = listeners.length; i < l; i++) {
                if (!listeners[i]._watchLiteralInput ||
                    listeners[i]._watchNestedObject) {
                    return true;
                }
            }
            return false;
        };
        return (hasMutationWatcher(this._watchers.get(property)) ||
            hasMutationWatcher(this._foreignListeners.get(property)));
    }
    /** @internal Returns true when any registered listener depends on nested object traversal. */
    _hasNestedListenerCandidates() {
        return this._listenerStats._nestedCandidateCount > 0;
    }
    /** @internal Recursive implementation for _checkListenersForAllKeys with cycle protection. */
    _checkListenersForAllKeysRecursive(value, visited) {
        const target = unwrapScopeValue(value);
        if (isUndefined(target) || !isObject(target) || isNonScope(target)) {
            return;
        }
        const objectTarget = target;
        if (visited.has(objectTarget)) {
            return;
        }
        visited.add(objectTarget);
        const targetRecord = target;
        const keyList = keys(targetRecord);
        for (let i = 0, l = keyList.length; i < l; i++) {
            const k = keyList[i];
            const listeners = this._watchers.get(k);
            if (listeners) {
                this._scheduleListener(listeners);
            }
            if (isObject(targetRecord[k])) {
                this._checkListenersForAllKeysRecursive(targetRecord[k], visited);
            }
        }
    }
    /** @internal Queues a shared scheduled task flush for this scope family. */
    _queueScheduledFlush() {
        const scheduler = this._listenerScheduler;
        if (scheduler._queued || scheduler._batchDepth > 0) {
            return;
        }
        scheduler._queued = true;
        queueMicrotask(scheduler._flushTask);
    }
    /** @internal Queues a shared scheduled task flush when pending work can run. */
    _queueScheduledFlushIfNeeded() {
        const scheduler = this._listenerScheduler;
        if (scheduler._batchDepth === 0 &&
            !scheduler._queued &&
            !scheduler._flushing &&
            scheduler._queue.length > scheduler._index) {
            this._queueScheduledFlush();
        }
    }
    /** @internal Queues a shared scheduled task flush for this scope family. */
    _enqueueScheduledTask(task) {
        const scheduler = this._listenerScheduler;
        scheduler._queue.push(task);
        this._queueScheduledFlushIfNeeded();
    }
    /** @internal Flushes queued listener and callback tasks in FIFO order. */
    _flushScheduledTasks() {
        const scheduler = this._listenerScheduler;
        const queue = scheduler._queue;
        if (scheduler._flushing) {
            return;
        }
        scheduler._queued = false;
        scheduler._flushing = true;
        let processed = scheduler._index;
        try {
            while (processed < queue.length) {
                const task = queue[processed++];
                if (task._kind === "callback") {
                    task._callback();
                    continue;
                }
                if (task._kind === "bindings") {
                    const bindingQueue = scheduler._bindingQueue;
                    scheduler._bindingQueue = [];
                    scheduler._bindingsQueued = false;
                    scheduler._bindingEpoch++;
                    for (let i = 0, l = bindingQueue.length; i < l; i++) {
                        this._notifyBindingListener(bindingQueue[i]);
                    }
                    continue;
                }
                const filteredListeners = task._filter
                    ? task._filter(task._listeners)
                    : task._listeners;
                for (let i = 0; i < filteredListeners.length;) {
                    const listener = filteredListeners[i];
                    this._notifyListener(listener, task._target, task._sourceHandler, task._sourceProperty);
                    // Deregistration uses swap-and-pop. Revisit this index when the
                    // current listener was removed so the moved listener is not skipped.
                    if (filteredListeners[i] === listener) {
                        i++;
                    }
                }
            }
        }
        finally {
            scheduler._index = processed;
            let hasRemainingTasks = false;
            if (processed >= queue.length) {
                if (processed > 0) {
                    queue.length = 0;
                    scheduler._index = 0;
                }
            }
            else if (processed > 0) {
                queue.copyWithin(0, processed);
                queue.length -= processed;
                scheduler._index = 0;
                hasRemainingTasks = true;
            }
            scheduler._flushing = false;
            if (hasRemainingTasks) {
                this._queueScheduledFlush();
            }
        }
    }
    /**
     * Runs synchronous scope mutations as one batch. Listener notifications are
     * queued while the callback runs and flushed once after the outermost batch
     * exits. Mutations are not rolled back if the callback throws.
     */
    batch(fn) {
        const scheduler = this._listenerScheduler;
        scheduler._batchDepth++;
        try {
            const result = fn();
            if (isPromiseLike(result)) {
                warnAsyncBatchCallback();
            }
            return result;
        }
        finally {
            scheduler._batchDepth--;
            this._queueScheduledFlushIfNeeded();
        }
    }
    /** @internal Schedules a callback to run in the shared listener flush queue. */
    _scheduleCallback(callback) {
        this._enqueueScheduledTask({
            _kind: "callback",
            _callback: callback,
        });
    }
    /** @internal Queues listener notification for the next microtask, optionally filtering the list first. */
    _scheduleListener(listeners, filterOrTarget, sourceProperty) {
        const filter = isFunction(filterOrTarget) ? filterOrTarget : undefined;
        if (!filter && sourceProperty !== undefined) {
            const scheduler = this._listenerScheduler;
            let genericListeners;
            for (let i = 0, l = listeners.length; i < l; i++) {
                const listener = listeners[i];
                if (!listener._directLeaf) {
                    genericListeners ?? (genericListeners = []);
                    genericListeners.push(listener);
                    continue;
                }
                listener._bindingSourceHandler = this;
                listener._bindingSourceProperty = sourceProperty;
                if (listener._bindingEpoch !== scheduler._bindingEpoch) {
                    listener._bindingEpoch = scheduler._bindingEpoch;
                    scheduler._bindingQueue.push(listener);
                }
            }
            if (scheduler._bindingQueue.length > 0 && !scheduler._bindingsQueued) {
                scheduler._bindingsQueued = true;
                this._enqueueScheduledTask(scheduledBindingTask);
            }
            if (!genericListeners) {
                return;
            }
            listeners = genericListeners;
        }
        const target = filter
            ? this._target
            : (filterOrTarget ?? this._target);
        this._enqueueScheduledTask({
            _kind: "listener",
            _listeners: listeners,
            _target: target,
            _filter: filter,
            _sourceHandler: sourceProperty === undefined ? undefined : this,
            _sourceProperty: sourceProperty,
        });
    }
    /** @internal Records a whole-model change when this scope backs an app model. */
    _recordModelChange(property, target) {
        this._modelChangeTracker?.record(property, target);
        if (isObject(target)) {
            scheduleScopeExpressionObservers(target, property);
        }
    }
    /**
     * Registers a watcher for a property along with a listener function. The listener
     * function is invoked when changes to that property are detected.
     *
     * @param watchProp - An expression to be watched in the context of this model.
     * @param [listenerFn] - A function to execute when changes are detected on watched context.
     * @param [lazy] - A flag to indicate if the listener should be invoked immediately. Defaults to false.
     * @returns A function to deregister the watcher, or undefined if no listener function is provided.
     * @throws Error when `watchProp` is not a string expression.
     */
    watch(watchProp, listenerFn, lazy = false, directLeaf = false, returnDeregister = true, synchronousInitial = false, resolvedValue, hasResolvedValue = false, listenerContext) {
        if (!isString(watchProp)) {
            throw new TypeError("Watched property must be a string");
        }
        watchProp = watchProp.trim();
        const get = this._parse(watchProp);
        const scopeTarget = this._target;
        // Constant are immediately passed to listener function
        if (get._constant) {
            if (listenerFn && !lazy) {
                const notify = () => {
                    let res = get();
                    while (isFunction(res)) {
                        res = res();
                    }
                    listenerFn(res, scopeTarget, listenerContext);
                };
                if (synchronousInitial) {
                    notify();
                }
                else {
                    this._scheduleCallback(notify);
                }
            }
            return returnDeregister
                ? () => {
                    /* empty */
                }
                : undefined;
        }
        const expr = get._decoratedNode._body[0]?._expression;
        if (!expr) {
            throw new Error("Unable to determine watched expression");
        }
        if (!listenerFn) {
            let res = get(scopeTarget);
            while (isFunction(res)) {
                res = callFunction(res, undefined, scopeTarget);
            }
            return undefined;
        }
        const listener = {
            _owner: this,
            _listenerFn: listenerFn,
            _watchFn: get,
            _parse: this._parse,
            _scopeId: this.id,
            _id: ++nextListenerId,
        };
        if (listenerContext !== undefined) {
            listener._listenerContext = listenerContext;
        }
        if (!returnDeregister) {
            const plan = getDirectMemberWatchPlan(get, expr, watchProp, this._parse);
            if (plan) {
                const { _key: memberKey, _parentKey: parentKey } = plan;
                listener._dedupeUnchanged = true;
                listener._watchProp = watchProp;
                listener._watchParentFn = plan._watchParentFn;
                listener._foreignWatchDescriptors = [
                    {
                        _watchProp: plan._watchProp,
                        _watchParentFn: plan._watchParentFn,
                        _key: memberKey,
                    },
                ];
                const listenerObject = hasResolvedValue
                    ? resolvedValue
                    : listener._watchFn(scopeTarget);
                const dependencyBound = this._bindForeignDependency(listener, listenerObject, true);
                listener._directLeaf = directLeaf;
                if (isObject(listenerObject)) {
                    const listenerTarget = getObjectListenerTarget(listenerObject);
                    if (listenerTarget) {
                        addObjectListenerKey(this._objectListeners, listenerTarget, memberKey);
                    }
                }
                this._registerKey(memberKey, listener);
                if (parentKey !== memberKey) {
                    this._registerKey(parentKey, listener);
                }
                if (!lazy) {
                    if (synchronousInitial &&
                        dependencyBound &&
                        !isFunction(listenerObject) &&
                        !isArray(listenerObject)) {
                        try {
                            listenerFn(listenerObject, getListenerOwnerTarget(listener), listenerContext);
                        }
                        catch (err) {
                            this._exceptionHandler(err);
                        }
                    }
                    else if (synchronousInitial) {
                        this._notifyListener(listener, scopeTarget);
                    }
                    else {
                        this._scheduleListener([listener]);
                    }
                }
                return undefined;
            }
        }
        listener._originalTarget = scopeTarget;
        // simplest case
        let key = getNodeName(expr);
        const keySet = [];
        const seenKeys = new Set();
        const { _type: type } = expr;
        switch (type) {
            // 3
            case ASTType._AssignmentExpression:
                // assignment calls without listener functions
                key = getNodeName(expr._left);
                break;
            // 4
            case ASTType._ConditionalExpression: {
                collectExpressionListenerKeys(expr, keySet, seenKeys, listener);
                collectForeignWatchDescriptors(expr, listener, keySet, seenKeys);
                if (keySet.length === 0) {
                    throw new Error("Unable to determine key");
                }
                this._bindForeignDependency(listener);
                break;
            }
            // 5
            case ASTType._LogicalExpression: {
                collectExpressionListenerKeys(expr, keySet, seenKeys, listener);
                collectForeignWatchDescriptors(expr, listener, keySet, seenKeys);
                if (keySet.length === 0) {
                    throw new Error("Unable to determine key");
                }
                registerListenerKeys(this, listener, keySet);
                this._bindForeignDependency(listener);
                if (!returnDeregister)
                    return undefined;
                return () => {
                    this._releaseForeignDependency(listener);
                    deregisterListenerKeys(this, listener, keySet);
                };
            }
            // 6
            case ASTType._BinaryExpression: {
                collectExpressionListenerKeys(expr, keySet, seenKeys, listener);
                collectForeignWatchDescriptors(expr, listener, keySet, seenKeys);
                this._bindForeignDependency(listener);
                break;
            }
            // 7
            case ASTType._UnaryExpression: {
                const [x] = assertInvariantDefined(expr._toWatch);
                key = resolveNodeWatchKey(x);
                if (!key) {
                    throw new Error("Unable to determine key");
                }
                pushUniqueListenerKey(keySet, seenKeys, listener, key);
                break;
            }
            // 8 function
            case ASTType._CallExpression: {
                const toWatch = assertInvariantDefined(expr._toWatch);
                const filterInputWatchKeys = getFilterInputWatchKeys(expr);
                for (let i = 0, l = toWatch.length; i < l; i++) {
                    const x = toWatch[i];
                    if (!isDefined(x))
                        continue;
                    const registerKey = resolveWatchKey(x);
                    if (registerKey) {
                        pushUniqueListenerKey(keySet, seenKeys, listener, registerKey);
                    }
                }
                collectExpressionListenerKeys(expr._callee, keySet, seenKeys, listener);
                collectForeignWatchDescriptors(expr, listener, keySet, seenKeys);
                if (keySet.length === 0) {
                    if (!lazy)
                        this._scheduleListener([listener]);
                    return returnDeregister ? () => false : undefined;
                }
                registerListenerKeys(this, listener, keySet);
                this._bindForeignDependency(listener);
                if (!lazy && filterInputWatchKeys) {
                    for (let i = 0, l = filterInputWatchKeys.length; i < l; i++) {
                        this._scheduleListener([listener]);
                    }
                }
                else if (!lazy) {
                    this._scheduleListener([listener]);
                }
                if (!returnDeregister)
                    return undefined;
                return () => {
                    this._releaseForeignDependency(listener);
                    deregisterListenerKeys(this, listener, keySet);
                };
            }
            // 9
            case ASTType._MemberExpression: {
                key = getNodePropertyName(expr);
                // array watcher
                key ?? (key = getNodeName(expr._object));
                if (!key) {
                    throw new Error("Unable to determine key");
                }
                pushUniqueListenerKey(keySet, seenKeys, listener, key);
                if (watchProp !== key) {
                    // Handle nested expression call
                    listener._dedupeUnchanged = true;
                    listener._watchProp = watchProp;
                    listener._watchParentFn = this._parse(getWatchParentExpression(watchProp));
                    collectForeignWatchDescriptors(expr, listener, keySet, seenKeys);
                    this._bindForeignDependency(listener);
                    listener._directLeaf =
                        directLeaf && listener._foreignWatchDescriptors?.length === 1;
                }
                break;
            }
            // 10
            case ASTType._Identifier: {
                if (!key) {
                    throw new Error("Unable to determine key");
                }
                pushUniqueListenerKey(keySet, seenKeys, listener, key);
                break;
            }
            // 12
            case ASTType._ArrayExpression: {
                listener._watchLiteralInput = true;
                const elements = assertInvariantDefined(expr._elements);
                for (let i = 0, l = elements.length; i < l; i++) {
                    const element = elements[i];
                    const registerKey = resolveWatchKey(element);
                    if (registerKey) {
                        pushUniqueListenerKey(keySet, seenKeys, listener, registerKey);
                        collectForeignWatchDescriptors(element, listener, keySet, seenKeys);
                        const memberExpression = getSimpleMemberExpression(assertInvariantDefined(element)) ??
                            getArrayWatchExpressionElement(watchProp, i);
                        addForeignWatchDescriptor(listener, memberExpression, registerKey);
                        const parentKey = resolveWatchKey(element._object);
                        if (parentKey) {
                            pushUniqueListenerKey(keySet, seenKeys, listener, parentKey);
                        }
                        continue;
                    }
                    collectExpressionListenerKeys(element, keySet, seenKeys, listener);
                    collectForeignWatchDescriptors(assertInvariantDefined(element), listener, keySet, seenKeys);
                }
                if (keySet.length === 0) {
                    throw new Error("Unable to determine key");
                }
                registerListenerKeys(this, listener, keySet, !lazy);
                this._bindForeignDependency(listener);
                if (!returnDeregister)
                    return undefined;
                return () => {
                    this._releaseForeignDependency(listener);
                    deregisterListenerKeys(this, listener, keySet);
                };
            }
            // 14
            case ASTType._ObjectExpression: {
                listener._watchLiteralInput = true;
                const properties = assertInvariantDefined(expr._properties);
                const collectedKeys = new Set();
                for (let i = 0, l = properties.length; i < l; i++) {
                    const prop = properties[i];
                    const value = assertInvariantDefined(prop._value);
                    let currentKey;
                    if (assertInvariantDefined(prop._key)._isPure === false) {
                        listener._watchNestedObject = true;
                        currentKey = resolveNodeWatchKey(prop._key);
                        if (!currentKey) {
                            collectWatchKeys(prop._key, collectedKeys);
                        }
                    }
                    else if (getNodeName(value)) {
                        currentKey = getNodeName(value);
                    }
                    else {
                        const [target] = assertInvariantDefined(expr._toWatch);
                        currentKey = resolveNodeWatchKey(target);
                        if (!currentKey) {
                            collectWatchKeys(target, collectedKeys);
                        }
                    }
                    if (currentKey) {
                        pushUniqueListenerKey(keySet, seenKeys, listener, currentKey);
                    }
                    collectForeignWatchDescriptors(value, listener, keySet, seenKeys);
                }
                for (const collectedKey of collectedKeys) {
                    pushUniqueListenerKey(keySet, seenKeys, listener, collectedKey);
                }
                this._bindForeignDependency(listener);
                break;
            }
            case ASTType._Program:
            case ASTType._ExpressionStatement:
            case ASTType._Literal:
            case ASTType._LocalsExpression:
            case ASTType._Property:
            case ASTType._ThisExpression:
            case ASTType._NGValueParameter:
            case ASTType._UpdateExpression: {
                throw new Error(`Unsupported type ${String(type)}`);
            }
        }
        // if the target is an object, then start observing it
        const listenerObject = hasResolvedValue
            ? resolvedValue
            : listener._watchFn(scopeTarget);
        if (isObject(listenerObject)) {
            if (!key && keySet.length > 0) {
                [key] = keySet;
            }
            if (key) {
                const listenerTarget = getObjectListenerTarget(listenerObject);
                if (listenerTarget) {
                    addObjectListenerKey(this._objectListeners, listenerTarget, key);
                }
            }
        }
        if (keySet.length > 0) {
            for (let i = 0, l = keySet.length; i < l; i++) {
                this._registerKey(keySet[i], listener);
            }
        }
        else {
            if (!key) {
                throw new Error("Unable to determine key");
            }
            this._registerKey(key, listener);
        }
        if (!lazy) {
            if (synchronousInitial) {
                this._notifyListener(listener, scopeTarget);
            }
            else {
                this._scheduleListener([listener]);
            }
        }
        if (!returnDeregister)
            return undefined;
        return () => {
            if (keySet.length > 0) {
                let res = true;
                for (let i = 0, l = keySet.length; i < l; i++) {
                    const success = this._deregisterKey(keySet[i], listener);
                    if (!success) {
                        res = false;
                    }
                }
                this._releaseForeignDependency(listener);
                return res;
            }
            else {
                if (!key) {
                    return false;
                }
                this._releaseForeignDependency(listener);
                return this._deregisterKey(key, listener);
            }
        };
    }
    /** Creates a prototypically inherited child scope. */
    new(childInstance) {
        let child;
        if (childInstance) {
            const proto = Object.getPrototypeOf(childInstance);
            // If child is plain object, or already inherits from target, set prototype to target
            if (proto === Object.prototype || proto === this._target) {
                Object.setPrototypeOf(childInstance, this._target);
            }
            else {
                // If child has some other prototype, preserve it but link to this._target
                Object.setPrototypeOf((proto ?? childInstance), this._target);
            }
            child = childInstance;
        }
        else {
            child = createObject(this._target);
        }
        const handler = new Scope(this);
        const proxy = new Proxy(child, handler);
        handler._target = child;
        handler._scopeTarget = child;
        handler._proxy = proxy;
        scopeProxyTargets.set(proxy, child);
        if (this._children === EMPTY_SCOPE_CHILDREN) {
            this._children = [];
            this._propertyMap._children = this._children;
        }
        handler._parentIndex = this._children.length;
        this._children.push(proxy);
        (this._childTargets ?? (this._childTargets = new WeakMap())).set(child, proxy);
        return proxy;
    }
    /** Creates an isolate child scope that does not inherit watchable properties directly. */
    newIsolate(instance) {
        const child = instance ?? nullObject();
        const handler = new Scope(this);
        const proxy = new Proxy(child, handler);
        handler._target = child;
        handler._scopeTarget = child;
        handler._proxy = proxy;
        scopeProxyTargets.set(proxy, child);
        if (this._children === EMPTY_SCOPE_CHILDREN) {
            this._children = [];
            this._propertyMap._children = this._children;
        }
        handler._parentIndex = this._children.length;
        this._children.push(proxy);
        (this._childTargets ?? (this._childTargets = new WeakMap())).set(child, proxy);
        return proxy;
    }
    /** Creates a transcluded child scope linked to this scope and an optional parent instance. */
    transcluded(parentInstance) {
        const child = Object.create(this._target);
        const handler = new Scope(this, parentInstance);
        const proxy = new Proxy(child, handler);
        handler._target = child;
        handler._scopeTarget = child;
        handler._proxy = proxy;
        scopeProxyTargets.set(proxy, child);
        if (this._children === EMPTY_SCOPE_CHILDREN) {
            this._children = [];
            this._propertyMap._children = this._children;
        }
        const childIndex = this._children.length;
        handler._parentIndex = childIndex;
        this._children[childIndex] = proxy;
        return proxy;
    }
    /** @internal Registers a listener under a watched key on this scope. */
    _registerPlannedHashedKey(key, listener, hashKey) {
        let listenersByHash = this._watchersByHash.get(key);
        if (!listenersByHash) {
            listenersByHash = new Map();
            this._watchersByHash.set(key, listenersByHash);
        }
        const hashedListeners = listenersByHash.get(hashKey);
        if (!hashedListeners) {
            if (!Object.prototype.hasOwnProperty.call(this._target, key)) {
                this._registerInheritedKey(key);
            }
            this._registerObjectMutationTarget(key, getListenerOwnerTarget(listener));
        }
        const listeners = this._watchers.get(key);
        let listenerIndex = 0;
        if (listeners) {
            listenerIndex = listeners.length;
            listeners.push(listener);
        }
        else {
            this._watchers.set(key, [listener]);
        }
        const ownedWatcherIndex = this._ownedWatchers.length;
        this._ownedWatchers[ownedWatcherIndex] = key;
        this._ownedWatchers[ownedWatcherIndex + 1] = listener;
        this._ownedWatchers[ownedWatcherIndex + 2] = listenerIndex;
        if (hashedListeners) {
            if (isArray(hashedListeners)) {
                hashedListeners.push(listener);
            }
            else {
                const listenerPair = [hashedListeners, listener, listener];
                listenerPair.length = 2;
                listenersByHash.set(hashKey, listenerPair);
            }
            return;
        }
        listenersByHash.set(hashKey, listener);
    }
    /** @internal Registers a listener under a watched key on this scope. */
    _registerKey(key, listener, trackNested = true, hashKey = getScopeWatchIdentity(listener._owner, getListenerOwnerTarget(listener))) {
        let listenersByHash = isDefined(hashKey)
            ? this._watchersByHash.get(key)
            : undefined;
        const hashedListeners = listenersByHash?.get(hashKey);
        if (!hashedListeners) {
            if (!hasOwn(this._target, key)) {
                this._registerInheritedKey(key);
            }
            this._registerObjectMutationTarget(key, getListenerOwnerTarget(listener));
        }
        if (trackNested) {
            this._trackNestedListenerCandidate(listener);
        }
        const listeners = this._watchers.get(key);
        let listenerIndex = 0;
        if (listeners) {
            listenerIndex = listeners.length;
            listeners.push(listener);
        }
        else {
            this._watchers.set(key, [listener]);
        }
        const ownedWatcherIndex = this._ownedWatchers.length;
        this._ownedWatchers[ownedWatcherIndex] = key;
        this._ownedWatchers[ownedWatcherIndex + 1] = listener;
        this._ownedWatchers[ownedWatcherIndex + 2] = listenerIndex;
        if (!isDefined(hashKey)) {
            return;
        }
        if (!listenersByHash) {
            listenersByHash = new Map();
            this._watchersByHash.set(key, listenersByHash);
        }
        if (hashedListeners) {
            if (isArray(hashedListeners)) {
                hashedListeners.push(listener);
            }
            else {
                const listenerPair = [hashedListeners, listener, listener];
                listenerPair.length = 2;
                listenersByHash.set(hashKey, listenerPair);
            }
            return;
        }
        listenersByHash.set(hashKey, listener);
    }
    /** @internal Registers owner-key mutation delivery for a watched object value. */
    _registerObjectMutationTarget(key, target) {
        const ownerTarget = getObjectListenerTarget(target[key]);
        if (ownerTarget) {
            const registeredKey = this._objectListeners.get(ownerTarget);
            if (!registeredKey) {
                this._objectListeners.set(ownerTarget, key);
            }
            else if (registeredKey !== key) {
                addObjectListenerKey(this._objectListeners, ownerTarget, key);
            }
        }
    }
    /** @internal Tracks a registered listener that can require nested collection scans. */
    _trackNestedListenerCandidate(listener) {
        if (listenerNeedsNestedCollection(listener)) {
            this._listenerStats._nestedCandidateCount++;
        }
    }
    /** @internal Untracks a registered listener that can require nested collection scans. */
    _untrackNestedListenerCandidate(listener) {
        if (listenerNeedsNestedCollection(listener) &&
            this._listenerStats._nestedCandidateCount > 0) {
            this._listenerStats._nestedCandidateCount--;
        }
    }
    /** @internal Registers inherited property listeners with the owning parent scope. */
    _registerInheritedKey(key) {
        const parent = this.parent
            ?._handler;
        let owner = parent;
        while (owner && owner !== this) {
            if (hasOwn(owner._target, key)) {
                Scope._registerForeignKeyOwner(owner, key);
                return;
            }
            owner = owner.parent?._handler;
        }
        if (parent) {
            Scope._registerForeignKeyOwner(parent, key);
        }
    }
    /** @internal Registers one inherited key against a resolved parent scope owner. */
    static _registerForeignKeyOwner(owner, key) {
        const ownerValue = owner._target[key];
        if (isObject(ownerValue) && !isNonScope(ownerValue)) {
            const ownerTarget = ownerValue;
            addObjectListenerKey(owner._objectListeners, ownerTarget, key);
        }
    }
    /** @internal Removes a tracked local watcher registration record. */
    _untrackOwnedWatcher(key, listener) {
        const refs = this._ownedWatchers;
        for (let i = 0; i < refs.length; i += 3) {
            if (refs[i] === key && refs[i + 1] === listener) {
                const lastIndex = refs.length - 3;
                refs[i] = refs[lastIndex];
                refs[i + 1] = refs[lastIndex + 1];
                refs[i + 2] = refs[lastIndex + 2];
                refs.length = lastIndex;
                return;
            }
        }
    }
    /** @internal Updates a tracked local watcher after swap-and-pop removal. */
    _updateOwnedWatcherIndex(key, listener, listenerIndex) {
        const refs = this._ownedWatchers;
        for (let i = 0; i < refs.length; i += 3) {
            if (refs[i] === key && refs[i + 1] === listener) {
                refs[i + 2] = listenerIndex;
                return;
            }
        }
    }
    /** @internal Registers a listener under a watched key owned by a foreign proxied scope. */
    _registerForeignKey(key, listener, watchedValue) {
        this._trackNestedListenerCandidate(listener);
        const mutationTarget = getObjectListenerTarget(watchedValue);
        if (mutationTarget) {
            addObjectListenerKey(this._objectListeners, mutationTarget, key);
        }
        const listeners = this._foreignListeners.get(key);
        let listenerIndex = 0;
        if (listeners) {
            listenerIndex = listeners.length;
            listeners.push(listener);
        }
        else {
            this._foreignListeners.set(key, [listener]);
        }
        let keyIndexes = this._foreignListenerIndexes.get(key);
        if (!keyIndexes) {
            keyIndexes = new Map();
            this._foreignListenerIndexes.set(key, keyIndexes);
        }
        keyIndexes.set(listener._id, listenerIndex);
        const hashKey = getScopeWatchIdentity(this, this._target);
        if (!isDefined(hashKey)) {
            return;
        }
        let listenersByHash = this._foreignListenersByHash.get(key);
        if (!listenersByHash) {
            listenersByHash = new Map();
            this._foreignListenersByHash.set(key, listenersByHash);
        }
        const hashedListeners = listenersByHash.get(hashKey);
        if (hashedListeners) {
            if (isArray(hashedListeners)) {
                hashedListeners.push(listener);
            }
            else {
                listenersByHash.set(hashKey, [hashedListeners, listener]);
            }
            return;
        }
        listenersByHash.set(hashKey, listener);
    }
    /** @internal Tracks a foreign-listener registration owned by this scope. */
    _trackOwnedForeignListener(handler, key, id) {
        this._ownedForeignListeners.push(handler, key, id);
    }
    /** @internal Removes a tracked foreign-listener registration record. */
    _untrackOwnedForeignListener(handler, key, id) {
        const refs = this._ownedForeignListeners;
        for (let i = 0; i < refs.length; i += 3) {
            if (refs[i] === handler && refs[i + 1] === key && refs[i + 2] === id) {
                const lastIndex = refs.length - 3;
                refs[i] = refs[lastIndex];
                refs[i + 1] = refs[lastIndex + 1];
                refs[i + 2] = refs[lastIndex + 2];
                refs.length = lastIndex;
                return;
            }
        }
    }
    /** @internal Removes a listener from the local watcher map. */
    _deregisterKey(key, listener, untrack = true) {
        const listenerList = this._watchers.get(key);
        if (!listenerList) {
            return false;
        }
        const len = listenerList.length;
        const ownedWatchers = this._ownedWatchers;
        let listenerIndex;
        for (let i = 0; i < ownedWatchers.length; i += 3) {
            if (ownedWatchers[i] === key && ownedWatchers[i + 1] === listener) {
                listenerIndex = ownedWatchers[i + 2];
                break;
            }
        }
        if (listenerIndex === undefined ||
            listenerIndex >= len ||
            listenerList[listenerIndex] !== listener) {
            listenerIndex = undefined;
            for (let i = 0; i < len; i++) {
                if (listenerList[i] === listener) {
                    listenerIndex = i;
                    break;
                }
            }
        }
        if (listenerIndex === undefined) {
            return false;
        }
        this._releaseForeignDependency(listener);
        const movedListener = listenerList[len - 1];
        if (len === 1) {
            this._watchers.delete(key);
        }
        else {
            listenerList[listenerIndex] = movedListener;
            listenerList.length = len - 1;
            if (movedListener !== listener) {
                movedListener._owner._updateOwnedWatcherIndex(key, movedListener, listenerIndex);
            }
        }
        const hashKey = getScopeWatchIdentity(listener._owner, getListenerOwnerTarget(listener));
        if (isDefined(hashKey)) {
            const listenersByHash = this._watchersByHash.get(key);
            const hashedListeners = listenersByHash?.get(hashKey);
            if (hashedListeners) {
                if (isArray(hashedListeners)) {
                    const hashedLen = hashedListeners.length;
                    for (let j = 0; j < hashedLen; j++) {
                        if (hashedListeners[j] === listener) {
                            if (hashedLen === 2) {
                                listenersByHash?.set(hashKey, hashedListeners[j === 0 ? 1 : 0]);
                            }
                            else {
                                hashedListeners[j] = hashedListeners[hashedLen - 1];
                                hashedListeners.length = hashedLen - 1;
                            }
                            break;
                        }
                    }
                }
                else if (hashedListeners === listener) {
                    listenersByHash?.delete(hashKey);
                    if (listenersByHash?.size === 0) {
                        this._watchersByHash.delete(key);
                    }
                }
            }
        }
        this._untrackNestedListenerCandidate(listener);
        if (untrack)
            this._untrackOwnedWatcher(key, listener);
        return true;
    }
    /** @internal Removes a listener by id from the foreign watcher map. */
    _deregisterForeignKey(key, id) {
        const listenerList = this._foreignListeners.get(key);
        if (!listenerList) {
            return false;
        }
        const len = listenerList.length;
        const keyIndexes = this._foreignListenerIndexes.get(key);
        let listenerIndex = keyIndexes?.get(id);
        if (listenerIndex === undefined ||
            listenerIndex >= len ||
            listenerList[listenerIndex]._id !== id) {
            listenerIndex = undefined;
            for (let i = 0; i < len; i++) {
                if (listenerList[i]._id === id) {
                    listenerIndex = i;
                    break;
                }
            }
        }
        if (listenerIndex === undefined) {
            return false;
        }
        const listener = listenerList[listenerIndex];
        const movedListener = listenerList[len - 1];
        if (len === 1) {
            this._foreignListeners.delete(key);
            this._foreignListenerIndexes.delete(key);
        }
        else {
            listenerList[listenerIndex] = movedListener;
            listenerList.length = len - 1;
            keyIndexes?.set(movedListener._id, listenerIndex);
            keyIndexes?.delete(id);
        }
        const listenersByHash = this._foreignListenersByHash.get(key);
        if (listenersByHash) {
            for (const [hashKey, hashedListeners] of listenersByHash) {
                if (isArray(hashedListeners)) {
                    const hashedLen = hashedListeners.length;
                    for (let j = 0; j < hashedLen; j++) {
                        if (hashedListeners[j]._id !== id)
                            continue;
                        if (hashedLen === 2) {
                            listenersByHash.set(hashKey, hashedListeners[j === 0 ? 1 : 0]);
                        }
                        else {
                            hashedListeners[j] = hashedListeners[hashedLen - 1];
                            hashedListeners.length = hashedLen - 1;
                        }
                        break;
                    }
                }
                else if (hashedListeners._id === id) {
                    listenersByHash.delete(hashKey);
                }
            }
            if (listenersByHash.size === 0) {
                this._foreignListenersByHash.delete(key);
            }
        }
        this._untrackNestedListenerCandidate(listener);
        return true;
    }
    /** @internal Reschedules watchers that observe this array through its owning scope property. */
    _scheduleArrayOwnerListeners(target, proxy, property, allowLength = false) {
        if (!isArray(target) ||
            (property === "length" && !allowLength) ||
            this._scheduled.length > 0) {
            return;
        }
        if (!this._objectListeners.has(target)) {
            return;
        }
        const keyList = this._objectListeners.get(target);
        if (!keyList) {
            return;
        }
        const hasMultipleKeys = isArray(keyList);
        const keyCount = hasMultipleKeys ? keyList.length : 1;
        for (let i = 0; i < keyCount; i++) {
            const key = hasMultipleKeys ? keyList[i] : keyList;
            const currentListeners = this._watchers.get(key);
            if (currentListeners) {
                this._scheduleListener(currentListeners);
            }
            const currentForeignListeners = this._foreignListeners.get(key);
            if (currentForeignListeners) {
                this._scheduleListener(currentForeignListeners);
            }
        }
    }
    /** Merges enumerable properties from the provided object into the current scope target. */
    merge(newTarget) {
        const newTargetRecord = newTarget;
        const keyList = keys(newTargetRecord);
        for (let i = 0, l = keyList.length; i < l; i++) {
            const key = keyList[i];
            this.set(this._target, key, newTargetRecord[key], this._proxy);
        }
    }
    /** @internal Registers callback-only cleanup without generic scope-event bookkeeping. */
    _registerDestroyCallback(callback) {
        if (this._destroyed || this._destroyCallbacks === null) {
            callback();
            return;
        }
        (this._destroyCallbacks ?? (this._destroyCallbacks = [])).push(callback);
    }
    /** @internal Records native event cleanup directly on this scope. */
    _registerEventCleanup(target, type, listener, options) {
        if (this._destroyed || this._eventCleanups === null) {
            if (options === undefined) {
                target.removeEventListener(type, listener);
            }
            else {
                target.removeEventListener(type, listener, options);
            }
            return;
        }
        (this._eventCleanups ?? (this._eventCleanups = [])).push(target, type, listener, options);
    }
    /** @internal Records a delegated event target without native listener bookkeeping. */
    _registerDelegatedEventCleanup(target) {
        if (this._destroyed || this._delegatedEventTargets === null) {
            deleteProperty(target, EVENT_SCOPE);
            return;
        }
        (this._delegatedEventTargets ?? (this._delegatedEventTargets = [])).push(target);
    }
    /** Registers an event listener on this scope and returns a deregistration function. */
    on(name, listener) {
        let namedListeners = this._listeners.get(name);
        if (!namedListeners) {
            namedListeners = [];
            if (this._listeners === EMPTY_SCOPE_LISTENERS) {
                this._listeners = new Map();
            }
            this._listeners.set(name, namedListeners);
        }
        namedListeners.push(listener);
        return () => {
            const indexOfListener = namedListeners.indexOf(listener);
            if (indexOfListener !== -1) {
                namedListeners.splice(indexOfListener, 1);
                if (namedListeners.length === 0) {
                    this._listeners.delete(name);
                }
            }
        };
    }
    /** Emits an event upward through the scope hierarchy. */
    emit(name, ...args) {
        return this._eventHelper({ name, event: undefined, broadcast: false }, ...args);
    }
    /** Broadcasts an event downward through the scope hierarchy. */
    broadcast(name, ...args) {
        return this._eventHelper({ name, event: undefined, broadcast: true }, ...args);
    }
    /**
     * @internal
     * Internal event propagation helper.
     *
     * Propagates either upward (`emit`) or downward (`broadcast`) and
     * constructs the shared event object on first use.
     */
    _eventHelper({ name, event, broadcast, }, ...args) {
        const initialChildCount = this._children.length;
        const initialChildren = initialChildCount > 0 ? this._children.slice() : undefined;
        if (event) {
            event.currentScope = this
                ._target;
        }
        else {
            const createdEvent = {
                name,
                targetScope: this._target,
                currentScope: this._target,
                stopped: false,
                stopPropagation() {
                    createdEvent.stopped = true;
                },
                preventDefault() {
                    createdEvent.defaultPrevented = true;
                },
                defaultPrevented: false,
            };
            event = createdEvent;
        }
        const currentEvent = event;
        const listenerArgs = [currentEvent, ...args];
        const listeners = this._listeners.get(name);
        if (listeners) {
            let { length } = listeners;
            for (let i = 0; i < length; i++) {
                try {
                    const cb = listeners[i];
                    cb(...listenerArgs);
                    const currentLength = listeners.length;
                    if (currentLength !== length) {
                        if (currentLength < length && listeners[i] !== cb) {
                            i--;
                        }
                        length = currentLength;
                    }
                }
                catch (err) {
                    this._exceptionHandler(err);
                }
            }
        }
        currentEvent.currentScope = null;
        if (currentEvent.stopped) {
            return currentEvent;
        }
        if (broadcast) {
            if (initialChildren) {
                const children = initialChildren;
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    const childHandler = child._handler;
                    if (childHandler._destroyed || !this._children.includes(child)) {
                        continue;
                    }
                    event = child._handler._eventHelper({ name, event: currentEvent, broadcast }, ...args);
                    if (isScopeEventStopped(currentEvent)) {
                        break;
                    }
                }
            }
            return event;
        }
        else {
            if (this.parent) {
                return this.parent._handler._eventHelper({ name, event: currentEvent, broadcast }, ...args);
            }
            else {
                return currentEvent;
            }
        }
    }
    /** @internal Returns whether this scope instance is the root scope. */
    _isRoot() {
        return this.root === this;
    }
    destroy(skipBroadcast = false) {
        if (this._destroyed)
            return;
        if (!skipBroadcast &&
            (this._listeners.has("$destroy") || this._children.length > 0)) {
            this.broadcast("$destroy");
        }
        const eventCleanups = this._eventCleanups;
        this._eventCleanups = null;
        const delegatedEventTargets = this._delegatedEventTargets;
        this._delegatedEventTargets = null;
        if (delegatedEventTargets) {
            for (let i = 0, l = delegatedEventTargets.length; i < l; i++) {
                deleteProperty(delegatedEventTargets[i], EVENT_SCOPE);
            }
        }
        if (eventCleanups) {
            for (let i = 0, l = eventCleanups.length; i < l; i += 4) {
                const target = eventCleanups[i];
                const type = eventCleanups[i + 1];
                const listener = eventCleanups[i + 2];
                const options = eventCleanups[i + 3];
                try {
                    if (options === undefined) {
                        target.removeEventListener(type, listener);
                    }
                    else {
                        target.removeEventListener(type, listener, options);
                    }
                }
                catch (error) {
                    this._exceptionHandler(error);
                }
                deleteProperty(target, EVENT_SCOPE);
            }
        }
        const destroyCallbacks = this._destroyCallbacks;
        this._destroyCallbacks = null;
        if (destroyCallbacks) {
            for (let i = 0, l = destroyCallbacks.length; i < l; i++) {
                try {
                    destroyCallbacks[i]();
                }
                catch (error) {
                    this._exceptionHandler(error);
                }
            }
        }
        if (this._children.length > 0) {
            const children = this._children.slice();
            for (let i = 0, l = children.length; i < l; i++) {
                const child = children[i];
                const childHandler = child._handler;
                if (childHandler._destroyed || !this._children.includes(child)) {
                    continue;
                }
                childHandler.destroy(true);
            }
        }
        const scopeId = this.id;
        const ownedWatchers = this._ownedWatchers;
        for (let i = 0, l = ownedWatchers.length; i < l; i += 3) {
            this._deregisterKey(ownedWatchers[i], ownedWatchers[i + 1], false);
        }
        ownedWatchers.length = 0;
        const ownedForeignListeners = this._ownedForeignListeners;
        for (let i = 0, l = ownedForeignListeners.length; i < l; i += 3) {
            ownedForeignListeners[i]._deregisterForeignKey(ownedForeignListeners[i + 1], ownedForeignListeners[i + 2]);
        }
        ownedForeignListeners.length = 0;
        if (this._isRoot()) {
            this._watchers.clear();
            this._watchersByHash.clear();
            this._foreignListeners.clear();
            this._foreignListenerIndexes.clear();
            this._foreignListenersByHash.clear();
        }
        else {
            const parent = this.parent;
            if (!parent) {
                this._listeners.clear();
                this._destroyed = true;
                return;
            }
            const parentHandler = parent._handler;
            const children = parentHandler._children;
            const childIndex = this._parentIndex;
            const childTarget = this._target;
            if (childTarget) {
                parentHandler._childTargets?.delete(childTarget);
            }
            const lastIndex = children.length - 1;
            if (childIndex >= 0 && childIndex <= lastIndex) {
                const movedChild = children[lastIndex];
                if (childIndex !== lastIndex) {
                    children[childIndex] = movedChild;
                    movedChild._handler._parentIndex = childIndex;
                }
                children.length = lastIndex;
            }
            else {
                for (let i = 0, l = children.length; i < l; i++) {
                    if (children[i].id === scopeId) {
                        const movedChild = children[l - 1];
                        if (i !== l - 1) {
                            children[i] = movedChild;
                            movedChild._handler._parentIndex = i;
                        }
                        children.length = l - 1;
                        break;
                    }
                }
            }
        }
        this._scheduled = [];
        this._foreignProxies.clear();
        this._foreignProxyTargets = new WeakMap();
        this._watchersByHash = new Map();
        this._foreignListeners = new Map();
        this._foreignListenerIndexes = new Map();
        this._foreignListenersByHash = new Map();
        this._objectListeners = new WeakMap();
        this._collectionMethodWrappers = new WeakMap();
        if (this._isRoot()) {
            this._listenerStats._nestedCandidateCount = 0;
        }
        this._parentIndex = -1;
        this._childTargets = undefined;
        this._listeners.clear();
        this._destroyed = true;
        queueDestroyedScopeCleanup(this);
    }
    /** @internal Completes deferred reference cleanup after destroy observers have run. */
    _cleanupDestroyedScope() {
        if (this._destroyed) {
            if (this._isRoot()) {
                this._children.length = 0;
            }
            else {
                this._children.length = 0;
                this._watchers = new Map();
                this._watchersByHash = new Map();
            }
            this._target = null;
            this._scopeTarget = undefined;
            this._proxy = undefined;
            this._watchIdentity = undefined;
            if (!this._isRoot()) {
                this.parent = undefined;
                this.root = undefined;
            }
            this._propertyMap = {
                destroy: this._propertyMap.destroy === unboundScopeMethod
                    ? this.destroy.bind(this)
                    : this._propertyMap.destroy,
                _handler: this,
                id: this.id,
                _isRoot: this._propertyMap._isRoot === unboundScopeMethod
                    ? this._isRoot.bind(this)
                    : this._propertyMap._isRoot,
                parent: this.parent,
                _proxy: this._proxy,
                root: this.root,
                scopeName: this.scopeName,
                _target: this._target,
                _children: this._children,
            };
        }
    }
    /** @internal Resolves the watched value and notifies a single listener. */
    _notifyBindingListener(listener) {
        const sourceHandler = listener._bindingSourceHandler;
        const sourceProperty = listener._bindingSourceProperty;
        listener._bindingSourceHandler = undefined;
        listener._bindingSourceProperty = undefined;
        if (!sourceHandler || sourceProperty === undefined) {
            return;
        }
        try {
            const value = sourceHandler._proxy[sourceProperty];
            if (isFunction(value) || isArray(value)) {
                this._notifyListener(listener, sourceHandler, sourceHandler, sourceProperty);
                return;
            }
            if (listener._listenerContext === undefined) {
                listener._listenerFn(value, getListenerOwnerTarget(listener));
            }
            else {
                listener._listenerFn(value, getListenerOwnerTarget(listener), listener._listenerContext);
            }
        }
        catch (err) {
            this._exceptionHandler(err);
        }
    }
    /** @internal Resolves the watched value and notifies a single listener. */
    _notifyListener(listener, target, sourceHandler, sourceProperty) {
        const { _listenerFn, _watchFn, _listenerContext } = listener;
        const owner = listener._owner;
        const _originalTarget = listener._originalTarget ??
            owner?._scopeTarget ??
            owner?._target ??
            target;
        try {
            let hasStableForeignSource = false;
            if (sourceProperty !== undefined) {
                const plannedDescriptor = listener._plannedForeignWatchDescriptor;
                const descriptors = listener._foreignWatchDescriptors;
                const descriptorCount = plannedDescriptor
                    ? 1
                    : (descriptors?.length ?? 0);
                if (descriptorCount > 0) {
                    for (let i = 0; i < descriptorCount; i++) {
                        const descriptor = plannedDescriptor ?? assertInvariantDefined(descriptors?.[i]);
                        const dependency = plannedDescriptor
                            ? listener._plannedForeignWatchDependency
                            : descriptor._dependency;
                        if (dependency?._key !== sourceProperty) {
                            continue;
                        }
                        hasStableForeignSource =
                            dependency._handler === sourceHandler ||
                                dependency._handler._target === target;
                        if (!hasStableForeignSource && isString(sourceProperty)) {
                            const parentPath = getForeignProxyParentPath(descriptor._watchProp);
                            hasStableForeignSource =
                                parentPath !== undefined &&
                                    !parentPath.includes(sourceProperty);
                        }
                        if (hasStableForeignSource)
                            break;
                    }
                }
            }
            if (!hasStableForeignSource) {
                this._bindForeignDependency(listener);
            }
            let newVal = _watchFn(_originalTarget);
            if (isUndefined(newVal) && target !== _originalTarget) {
                newVal = _watchFn(target);
            }
            if (!isFunction(newVal) && !isArray(newVal)) {
                const hasForeignDependency = listener._plannedForeignWatchDependency !== undefined ||
                    listener._foreignWatchDescriptors?.some((descriptor) => descriptor._dependency) === true;
                if (listener._dedupeUnchanged && !hasForeignDependency) {
                    if (listener._hasLastValue &&
                        simpleCompare(listener._lastValue, newVal)) {
                        return;
                    }
                    listener._hasLastValue = true;
                    listener._lastValue = newVal;
                }
                if (_listenerContext === undefined) {
                    _listenerFn(newVal, _originalTarget);
                }
                else {
                    _listenerFn(newVal, _originalTarget, _listenerContext);
                }
                return;
            }
            const notify = (value) => {
                const hasForeignDependency = listener._plannedForeignWatchDependency !== undefined ||
                    listener._foreignWatchDescriptors?.some((descriptor) => descriptor._dependency) === true;
                if (listener._dedupeUnchanged && !hasForeignDependency) {
                    if (listener._hasLastValue &&
                        simpleCompare(listener._lastValue, value)) {
                        return;
                    }
                    listener._hasLastValue = true;
                    listener._lastValue = value;
                }
                if (_listenerContext === undefined) {
                    _listenerFn(value, _originalTarget);
                }
                else {
                    _listenerFn(value, _originalTarget, _listenerContext);
                }
            };
            if (isFunction(newVal)) {
                if (!listener._invokeWatchFn && listener._watchProp) {
                    listener._invokeWatchFn = this._parse(`${listener._watchProp}()`);
                }
                newVal = listener._invokeWatchFn
                    ? listener._invokeWatchFn(_originalTarget)
                    : callFunction(newVal, undefined, _originalTarget);
            }
            else {
                for (let i = 0, l = newVal.length; i < l; i++) {
                    if (isFunction(newVal[i])) {
                        newVal[i] = callFunction(newVal[i], undefined, _originalTarget);
                    }
                }
            }
            notify(newVal);
        }
        catch (err) {
            this._exceptionHandler(err);
        }
    }
    /** Searches this scope tree for a scope with the given id. */
    getById(id) {
        if (isString(id)) {
            id = parseInt(id, 10);
        }
        if (this.id === id) {
            return this;
        }
        else {
            let res = undefined;
            for (const child of this._children) {
                const found = child.getById(id);
                if (found) {
                    res = found;
                    break;
                }
            }
            return res;
        }
    }
    /** Searches the scope tree for a scope registered under the provided name. */
    searchByName(name) {
        const stack = [this.root];
        while (stack.length) {
            const scope = stack.pop();
            if (!scope) {
                continue;
            }
            if (scope.scopeName === name) {
                return scope;
            }
            if (scope._children.length) {
                for (let i = scope._children.length - 1; i >= 0; i--) {
                    stack.push(scope._children[i]);
                }
            }
        }
        return undefined;
    }
}
/*------------- Private helpers -------------*/
/** Counts watchers belonging to a scope subtree. */
function calculateWatcherCount(model) {
    const childIds = collectChildIds(model);
    let count = 0;
    for (const watchers of model._watchers.values()) {
        for (let i = 0, l = watchers.length; i < l; i++) {
            if (childIds.has(watchers[i]._scopeId ?? watchers[i]._owner.id)) {
                count++;
            }
        }
    }
    return count;
}
/** Collects all scope ids reachable from the provided child scope. */
function collectChildIds(child) {
    const ids = new Set();
    const stack = [child];
    while (stack.length) {
        const node = stack.pop();
        if (!node) {
            continue;
        }
        if (!ids.has(node.id)) {
            ids.add(node.id);
            for (let i = 0, l = node._children.length; i < l; i++) {
                stack.push(node._children[i]);
            }
        }
    }
    return ids;
}

export { EVENT_SCOPE, SCOPE_PROXY_BIND, Scope, createRootScopeService, createScope, createScopeExpressionValue, createScopeListenerScheduler, createScopeWatchPlan, getArrayMutationMeta, isNonScope, observeScopeExpression, registerScopeDelegatedEventCleanup, registerScopeDestroyCallback, registerScopeEventCleanup, registerScopeWatch, setScopeWatchIdentity };
