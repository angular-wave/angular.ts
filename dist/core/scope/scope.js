import { _exceptionHandler, _parse } from '../../injection-tokens.js';
import { isFunction, isProxy, isArray, isProxySymbol, isObject, hasOwn, keys, isUndefined, isDefined, getHashKey, isString, assert, createObject, isNull, isInstanceOf, nextUid, nullObject } from '../../shared/utils.js';
import { ASTType } from '../parse/ast-type.js';

let uid = 0;
/**
 * Returns the next generated scope/listener id.
 */
function nextId() {
    uid += 1;
    return uid;
}
let $parse;
let $exceptionHandler;
/** @internal */
const $postUpdateQueue = [];
const arrayMutationMeta = new WeakMap();
const arraySwapCandidates = new WeakMap();
let arrayMutationVersion = 0;
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
    return rawArgs || args;
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
    if (candidate &&
        candidate._length === currentLength &&
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
    const target = proxy?.$target;
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
    const target = proxy?.$target;
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
    const target = isProxy(value) ? value.$target : value;
    return isArray(target) ? arrayMutationMeta.get(target) : undefined;
}
class RootScopeProvider {
    constructor() {
        this.$get = [
            _exceptionHandler,
            _parse,
            /** Initializes the shared parse and exception services for root scope behavior. */
            (exceptionHandler, parse) => {
                $exceptionHandler = exceptionHandler;
                $parse = parse;
                return this._rootScope;
            },
        ];
        this._rootScope = createScope();
    }
}
function getNodeName(node) {
    return node?._name;
}
function getNodePropertyName(node) {
    return node?._property?._name;
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
function listenerNeedsNestedCollection(listener) {
    return !!(listener._watchParentFn ||
        listener._watchNestedObject ||
        listener._watchLiteralInput);
}
function pushUniqueListenerKey(keySet, seenKeys, listener, key) {
    if (seenKeys.has(key))
        return;
    seenKeys.add(key);
    keySet.push(key);
    listener._property.push(key);
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
function deregisterListenerKeys(scope, listenerId, watchKeys) {
    for (let i = 0, l = watchKeys.length; i < l; i++) {
        const key = watchKeys[i];
        if (key)
            scope._deregisterKey(key, listenerId);
    }
}
/**
 * Collects all keys that should trigger a grouped `$watch` expression.
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
function collectExpressionListenerKeys(node, keySet, seenKeys, listener) {
    if (!node)
        return;
    switch (node._type) {
        case ASTType._LogicalExpression:
            collectExpressionListenerKeys(node._left, keySet, seenKeys, listener);
            collectExpressionListenerKeys(node._right, keySet, seenKeys, listener);
            return;
        case ASTType._ConditionalExpression:
            collectExpressionListenerKeys(node._test, keySet, seenKeys, listener);
            collectExpressionListenerKeys(node._alternate, keySet, seenKeys, listener);
            collectExpressionListenerKeys(node._consequent, keySet, seenKeys, listener);
            return;
        default:
            collectListenerKeys(node, keySet, seenKeys, listener);
    }
}
/**
 * @private
 * Creates a scope proxy for the target object, intercepting property changes.
 * Nested scopeable values are proxied lazily when read, without writing proxy
 * helper state back into the target model.
 *
 * @param target - The object to be wrapped in a proxy.
 * @param [context] - The context for the handler, used to track listeners.
 * @returns - A proxy that intercepts operations on the target object,
 *                                     or the original value if the target is not an object.
 */
function createScope(target = {}, context) {
    return getCachedScopeProxy(target, context || new Scope());
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
    Date,
    RegExp,
    Map,
    Set,
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
const destroyedScopeCleanupQueue = [];
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
    const queue = destroyedScopeCleanupQueue.splice(0);
    for (let i = 0, l = queue.length; i < l; i++) {
        queue[i]._cleanupDestroyedScope();
    }
}
function unwrapScopeValue(value) {
    return isProxy(value) ? value.$target : value;
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
function addObjectListenerKey(objectListeners, target, key) {
    const keyList = objectListeners.get(target);
    if (keyList) {
        if (!keyList.includes(key)) {
            keyList.push(key);
        }
        return;
    }
    objectListeners.set(target, [key]);
}
function removeObjectListenerKey(objectListeners, target, key) {
    const keyList = objectListeners.get(target);
    if (!keyList) {
        return;
    }
    const keyIndex = keyList.indexOf(key);
    if (keyIndex === -1) {
        return;
    }
    if (keyList.length === 1) {
        objectListeners.delete(target);
        return;
    }
    keyList[keyIndex] = keyList[keyList.length - 1];
    keyList.length--;
}
function getCachedScopeProxy(target, handler) {
    if (!isObject(target) || isNonScope(target))
        return target;
    if (isProxy(target))
        return target;
    const objectTarget = target;
    let proxiesByHandler = scopeProxyCache.get(objectTarget);
    if (!proxiesByHandler) {
        proxiesByHandler = new WeakMap();
        scopeProxyCache.set(objectTarget, proxiesByHandler);
    }
    let proxy = proxiesByHandler.get(handler);
    if (!proxy) {
        proxy = new Proxy(target, handler);
        proxiesByHandler.set(handler, proxy);
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
    if (nonScopeCache.has(objectTarget)) {
        return true;
    }
    if (scopeCache.has(objectTarget)) {
        return false;
    }
    // 3. Explicit non-scope flags
    if (objectTarget.$nonscope === true ||
        objectTarget?.constructor?.$nonscope === true) {
        nonScopeCache.add(objectTarget);
        return true;
    }
    // 4. Global objects
    if (objectTarget === global.window ||
        objectTarget === global.document ||
        objectTarget === global.self ||
        objectTarget === global.frames) {
        nonScopeCache.add(objectTarget);
        return true;
    }
    // 5. Safe instanceof checks
    for (let i = 0, l = nonScopeConstructors.length; i < l; i++) {
        try {
            const ctor = nonScopeConstructors[i];
            if (isInstanceOf(objectTarget, ctor)) {
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
 * @extends {Record<string, any>}
 */
class Scope {
    /**
     * Initializes the handler with the target object and a context.
     *
     * @param [context] - The context containing listeners.
     * @param [parent] - Custom parent.
     */
    constructor(context, parent) {
        this._watchers = context?._watchers ?? new Map();
        this._watcherIndexes = context?._watcherIndexes ?? new Map();
        this._watchersByHash = context?._watchersByHash ?? new Map();
        this._listeners = new Map();
        this._foreignListeners = context?._foreignListeners ?? new Map();
        this._foreignListenerIndexes =
            context?._foreignListenerIndexes ?? new Map();
        this._foreignListenersByHash =
            context?._foreignListenersByHash ?? new Map();
        this._foreignProxies = context?._foreignProxies ?? new Set();
        this._foreignProxyTargets = context?._foreignProxyTargets ?? new WeakMap();
        this._objectListeners = context?._objectListeners ?? new WeakMap();
        this._listenerStats = context?._listenerStats ?? {
            _nestedCandidateCount: 0,
        };
        this.$handler = this;
        this.$target = null;
        this._children = [];
        this._childIndices = new WeakMap();
        this._childTargets = new WeakMap();
        this.$id = nextId();
        this.$root = context ? context.$root : this;
        this.$parent = parent || (this.$root === this ? undefined : context);
        this._destroyed = false;
        this._scheduled = [];
        this._arrayOwnerListenersScheduled = false;
        this.$scopename = undefined;
        this._ownedForeignListeners = [];
        this._ownedWatchers = [];
        this._listenerScheduler = context?._listenerScheduler ?? {
            _queue: [],
            _index: 0,
            _queued: false,
            _flushing: false,
            _flushTask: () => {
                this._flushScheduledTasks();
            },
        };
        this._arrayMutationWrappers =
            context?._arrayMutationWrappers ?? new WeakMap();
        this._propertyMap = {
            $broadcast: this.$broadcast.bind(this),
            _children: this._children,
            $destroy: this.$destroy.bind(this),
            $emit: this.$emit.bind(this),
            $flushQueue: this.$flushQueue.bind(this),
            $getById: this.$getById.bind(this),
            $handler: this,
            $id: this.$id,
            $isRoot: this._isRoot.bind(this),
            $merge: this.$merge.bind(this),
            $new: this.$new.bind(this),
            $newIsolate: this.$newIsolate.bind(this),
            $on: this.$on.bind(this),
            $parent: this.$parent,
            $postUpdate: this.$postUpdate.bind(this),
            $proxy: this.$proxy,
            $root: this.$root,
            $scopename: this.$scopename,
            $searchByName: this.$searchByName.bind(this),
            $transcluded: this.$transcluded.bind(this),
            $watch: this.$watch.bind(this),
        };
    }
    /** @internal Destroys displaced direct child scopes found in the provided value or collection. */
    _destroyDisplacedValue(value, visited = new Set()) {
        if (!value || typeof value !== "object")
            return;
        const objectValue = value;
        if (visited.has(objectValue))
            return;
        visited.add(objectValue);
        const childScope = this._childTargets.get(objectValue);
        if (childScope) {
            if (childScope.$handler._destroyed)
                return;
            const destroy = childScope.$destroy;
            if (isFunction(destroy)) {
                destroy();
            }
            return;
        }
        if (isProxy(value)) {
            const scopeValue = value;
            if (this._children.includes(scopeValue)) {
                if (scopeValue.$handler._destroyed)
                    return;
                const destroy = scopeValue.$destroy;
                if (isFunction(destroy)) {
                    destroy();
                }
                return;
            }
            const targetValue = scopeValue.$target;
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
        const keyList = keys(value);
        for (let i = 0, l = keyList.length; i < l; i++) {
            this._destroyDisplacedValue(value[keyList[i]], visited);
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
        if (property === "$scopename") {
            this.$scopename = value;
            return true;
        }
        const nonscopeProps = target.constructor?.$nonscope ?? target.$nonscope;
        if (isArray(nonscopeProps) && nonscopeProps.includes(property)) {
            target[property] = value;
            return true;
        }
        this.$proxy = proxy;
        this.$target = target;
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
        if (oldValue && oldValue[isProxySymbol]) {
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
                            delete oldValue[k];
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
                const keyList = keys(oldValue.$target);
                const tgt = oldValue.$target;
                for (let i = 0, l = keyList.length; i < l; i++) {
                    const k = keyList[i];
                    const v = tgt[k];
                    if (v && v[isProxySymbol]) {
                        called = true;
                    }
                }
                for (let i = 0, l = keyList.length; i < l; i++) {
                    delete oldValue[keyList[i]];
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
                const hasForeignPropertyListeners = this._foreignListeners.has(property) ||
                    !!this.$parent?._foreignListeners?.has(property);
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
                let expectedTarget = this.$target;
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
                    const keyList = keys(nestedTarget);
                    for (let i = 0, l = keyList.length; i < l; i++) {
                        const key = keyList[i];
                        const keyListeners = this._watchers.get(key);
                        if (keyListeners) {
                            for (let j = 0, jl = keyListeners.length; j < jl; j++) {
                                pushUniqueListener(nestedListeners, keyListeners[j]);
                            }
                        }
                        if (isObject(nestedTarget[key])) {
                            collectNestedListeners(nestedTarget[key]);
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
                        ? this._hasObjectMutationWatchers(String(property))
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
                const targetHashKey = getHashKey(target);
                if (isDefined(targetHashKey)) {
                    const hashedPropListeners = this._watchersByHash
                        .get(String(property))
                        ?.get(targetHashKey);
                    if (hashedPropListeners) {
                        propListeners = hashedPropListeners;
                    }
                }
                if (propListeners) {
                    for (let i = 0, l = propListeners.length; i < l; i++) {
                        pushUniqueListener(directListeners, propListeners[i]);
                    }
                }
                if (directListeners.length > 0) {
                    this._scheduleListener(directListeners, (list) => {
                        const scheduled = [];
                        for (let i = 0, l = list.length; i < l; i++) {
                            const x = list[i];
                            if (!x._watchProp) {
                                scheduled.push(x);
                                continue;
                            }
                            const expectedParent = x._watchParentFn?.(x._originalTarget);
                            const expectedParentTarget = unwrapScopeValue(expectedParent);
                            if (expectedTarget === expectedParentTarget ||
                                (isArray(expectedParentTarget) &&
                                    expectedTarget === x._originalTarget) ||
                                (x._watchProp.includes("[") &&
                                    expectedTarget === x._originalTarget)) {
                                scheduled.push(x);
                            }
                        }
                        return scheduled;
                    });
                }
                if (nestedListeners.length > 0) {
                    this._scheduleListener(nestedListeners);
                }
                if (isArray(target) &&
                    property === "length" &&
                    valueChanged &&
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
                if (!_foreignListeners && this.$parent?._foreignListeners) {
                    _foreignListeners = this.$parent._foreignListeners.get(property);
                }
                if (_foreignListeners) {
                    let scheduled = _foreignListeners;
                    // filter for repeaters
                    const hashKey = getHashKey(this.$target);
                    if (isDefined(hashKey)) {
                        scheduled =
                            this._foreignListenersByHash
                                .get(String(property))
                                ?.get(hashKey) ?? [];
                    }
                    if (scheduled.length > 0) {
                        this._scheduleListener(scheduled);
                    }
                }
            }
            if (this._objectListeners.has(target) && property !== "length") {
                const keyList = this._objectListeners.get(target);
                if (keyList) {
                    for (let i = 0, l = keyList.length; i < l; i++) {
                        const key = keyList[i];
                        const listeners = this._watchers.get(key);
                        if (listeners && this._scheduled !== listeners) {
                            this._scheduleListener(listeners);
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
        if (property === "$scopename" && this.$scopename)
            return this.$scopename;
        if (property === "$$watchersCount")
            return calculateWatcherCount(this);
        if (property === isProxySymbol)
            return true;
        if (this._destroyed &&
            typeof property !== "symbol" &&
            hasOwn(this._propertyMap, property)) {
            return this._propertyMap[property];
        }
        const targetProp = isString(property) ? target[property] : target[property];
        const nonscopeProps = target.constructor?.$nonscope ?? target.$nonscope;
        const scopedTargetProp = isString(property) &&
            isArray(nonscopeProps) &&
            nonscopeProps.includes(property)
            ? targetProp
            : getCachedScopeProxy(targetProp, this);
        if (isProxy(scopedTargetProp)) {
            this.$proxy = scopedTargetProp;
        }
        else {
            this.$proxy = proxy;
        }
        if (this._propertyMap.$target !== target) {
            this._propertyMap.$target = target;
        }
        if (this._propertyMap.$proxy !== proxy) {
            this._propertyMap.$proxy = proxy;
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
                if (this._objectListeners.has(target)) {
                    const keyList = this._objectListeners.get(target);
                    if (keyList) {
                        for (let i = 0, l = keyList.length; i < l; i++) {
                            const key = keyList[i];
                            const listeners = this._watchers.get(key);
                            if (listeners) {
                                this._scheduled = listeners;
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
                        const lengthListeners = this._watchers.get("length");
                        if (lengthListeners) {
                            this._scheduleListener(lengthListeners);
                        }
                    }
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
        if (typeof property !== "symbol" && hasOwn(this._propertyMap, property)) {
            this.$target = target;
            return this._propertyMap[property];
        }
        else {
            // we are a simple getter
            return scopedTargetProp;
        }
    }
    /**
     * @param target - The target object.
     * @param property - The name of the property being deleted.
     */
    // noinspection JSUnusedGlobalSymbols -- Proxy trap invoked via the Proxy handler contract.
    deleteProperty(target, property) {
        if (isArray(target)) {
            clearArrayMutationMeta(this.$proxy);
            clearArraySwapCandidate(this.$proxy);
        }
        // Currently deletes $model
        if (target[property] && target[property][isProxySymbol]) {
            target[property] = undefined;
            const listeners = this._watchers.get(String(property));
            if (listeners) {
                this._scheduleListener(listeners);
            }
            if (this._scheduled.length === 0 && this._objectListeners.has(target)) {
                const keyList = this._objectListeners.get(target);
                if (keyList) {
                    for (let i = 0, l = keyList.length; i < l; i++) {
                        const key = keyList[i];
                        const currentListeners = this._watchers.get(key);
                        if (currentListeners)
                            this._scheduleListener(currentListeners);
                    }
                }
            }
            if (this._scheduled.length > 0) {
                this._scheduleListener(this._scheduled);
                this._arrayOwnerListenersScheduled = true;
                this._scheduled = [];
            }
            return true;
        }
        delete target[property];
        if (this._scheduled.length === 0 && this._objectListeners.has(target)) {
            const keyList = this._objectListeners.get(target);
            if (keyList) {
                for (let i = 0, l = keyList.length; i < l; i++) {
                    const key = keyList[i];
                    const listeners = this._watchers.get(key);
                    if (listeners)
                        this._scheduleListener(listeners);
                }
            }
        }
        else {
            const listeners = this._watchers.get(String(property));
            if (listeners) {
                this._scheduleListener(listeners, target[property]);
            }
        }
        if (this._scheduled.length > 0) {
            this._scheduleListener(this._scheduled);
            this._arrayOwnerListenersScheduled = true;
            this._scheduled = [];
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
        const keyList = keys(target);
        for (let i = 0, l = keyList.length; i < l; i++) {
            const k = keyList[i];
            const listeners = this._watchers.get(k);
            if (listeners) {
                this._scheduleListener(listeners);
            }
            if (isObject(target[k])) {
                this._checkListenersForAllKeysRecursive(target[k], visited);
            }
        }
    }
    /** @internal Queues a shared scheduled task flush for this scope family. */
    _queueScheduledFlush() {
        const scheduler = this._listenerScheduler;
        if (scheduler._queued) {
            return;
        }
        scheduler._queued = true;
        queueMicrotask(scheduler._flushTask);
    }
    /** @internal Queues a shared scheduled task flush for this scope family. */
    _enqueueScheduledTask(task) {
        const scheduler = this._listenerScheduler;
        scheduler._queue.push(task);
        if (!scheduler._queued && !scheduler._flushing) {
            this._queueScheduledFlush();
        }
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
                    this._drainPostUpdateQueue();
                    continue;
                }
                const filteredListeners = task._filter
                    ? task._filter(task._listeners)
                    : task._listeners;
                for (let i = 0, l = filteredListeners.length; i < l; i++) {
                    this._notifyListener(filteredListeners[i], task._target);
                    this._drainPostUpdateQueue();
                }
            }
        }
        finally {
            scheduler._index = processed;
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
            }
            scheduler._flushing = false;
            if (queue.length > 0 && !scheduler._queued) {
                this._queueScheduledFlush();
            }
        }
    }
    /** @internal Drains post-update callbacks in FIFO order. */
    _drainPostUpdateQueue() {
        if ($postUpdateQueue.length === 0) {
            return;
        }
        let index = 0;
        while (index < $postUpdateQueue.length) {
            $postUpdateQueue[index++]();
        }
        $postUpdateQueue.length = 0;
    }
    /** @internal Schedules a callback to run in the shared listener flush queue. */
    _scheduleCallback(callback) {
        this._enqueueScheduledTask({
            _kind: "callback",
            _callback: callback,
        });
    }
    /** @internal Queues listener notification for the next microtask, optionally filtering the list first. */
    _scheduleListener(listeners, filterOrTarget) {
        const filter = isFunction(filterOrTarget)
            ? filterOrTarget
            : undefined;
        const target = filter ? this.$target : (filterOrTarget ?? this.$target);
        this._enqueueScheduledTask({
            _kind: "listener",
            _listeners: listeners,
            _target: target,
            _filter: filter,
        });
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
    $watch(watchProp, listenerFn, lazy = false) {
        assert(isString(watchProp), "Watched property required");
        watchProp = watchProp.trim();
        const get = $parse(watchProp);
        // Constant are immediately passed to listener function
        if (get._constant) {
            if (listenerFn) {
                this._scheduleCallback(() => {
                    let res = get();
                    while (isFunction(res)) {
                        res = res();
                    }
                    listenerFn(res, this.$target);
                });
            }
            return () => {
                /* empty */
            };
        }
        const expr = get._decoratedNode._body[0]?._expression;
        if (!expr) {
            throw new Error("Unable to determine watched expression");
        }
        if (!listenerFn) {
            let res = get(this.$target);
            while (isFunction(res)) {
                res = res(this.$target);
            }
            return undefined;
        }
        const listener = {
            _originalTarget: this.$target,
            _listenerFn: listenerFn,
            _watchFn: get,
            _scopeId: this.$id,
            _id: nextUid(),
            _property: [],
        };
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
                if (keySet.length === 0) {
                    throw new Error("Unable to determine key");
                }
                break;
            }
            // 5
            case ASTType._LogicalExpression: {
                collectExpressionListenerKeys(expr, keySet, seenKeys, listener);
                if (keySet.length === 0) {
                    throw new Error("Unable to determine key");
                }
                registerListenerKeys(this, listener, keySet);
                return () => {
                    deregisterListenerKeys(this, listener._id, keySet);
                };
            }
            // 6
            case ASTType._BinaryExpression: {
                if (expr._isPure) {
                    const watch = expr._toWatch[0];
                    key = resolveNodeWatchKey(watch);
                    if (!key) {
                        throw new Error("Unable to determine key");
                    }
                    pushUniqueListenerKey(keySet, seenKeys, listener, key);
                    break;
                }
                else {
                    const { _toWatch: toWatch } = expr;
                    const keyList = new Array(toWatch.length);
                    for (let i = 0, l = toWatch.length; i < l; i++) {
                        const registerKey = resolveNodeWatchKey(toWatch[i]);
                        if (!registerKey)
                            throw new Error("Unable to determine key");
                        keyList[i] = registerKey;
                    }
                    registerListenerKeys(this, listener, keyList, true);
                    // Return deregistration function
                    return () => {
                        deregisterListenerKeys(this, listener._id, keyList);
                    };
                }
            }
            // 7
            case ASTType._UnaryExpression: {
                const x = expr._toWatch[0];
                key = resolveNodeWatchKey(x);
                if (!key) {
                    throw new Error("Unable to determine key");
                }
                pushUniqueListenerKey(keySet, seenKeys, listener, key);
                break;
            }
            // 8 function
            case ASTType._CallExpression: {
                const { _toWatch: toWatch } = expr;
                const keyList = new Array(toWatch.length);
                let hasRegisteredKey = false;
                for (let i = 0, l = toWatch.length; i < l; i++) {
                    const x = toWatch[i];
                    if (!isDefined(x))
                        continue;
                    keyList[i] = resolveWatchKey(x);
                    hasRegisteredKey = hasRegisteredKey || !!keyList[i];
                }
                registerListenerKeys(this, listener, keyList, true);
                if (!hasRegisteredKey) {
                    this._scheduleListener([listener]);
                }
                return () => {
                    deregisterListenerKeys(this, listener._id, keyList);
                };
            }
            // 9
            case ASTType._MemberExpression: {
                key = getNodePropertyName(expr);
                // array watcher
                if (!key) {
                    key = getNodeName(expr._object);
                }
                if (!key) {
                    throw new Error("Unable to determine key");
                }
                pushUniqueListenerKey(keySet, seenKeys, listener, key);
                if (watchProp !== key) {
                    // Handle nested expression call
                    listener._watchProp = watchProp;
                    listener._watchParentFn = $parse(getWatchParentExpression(watchProp));
                    const potentialProxy = listener._watchParentFn(listener._originalTarget);
                    const foreignKey = key;
                    let foreignProxy;
                    if (potentialProxy && this._foreignProxies.has(potentialProxy)) {
                        foreignProxy = potentialProxy;
                    }
                    else {
                        const foreignTarget = getObjectListenerTarget(potentialProxy);
                        if (foreignTarget) {
                            foreignProxy = this._foreignProxyTargets.get(foreignTarget);
                        }
                    }
                    if (foreignKey && foreignProxy) {
                        foreignProxy.$handler._registerForeignKey(foreignKey, listener);
                        this._trackOwnedForeignListener(foreignProxy.$handler, foreignKey, listener._id);
                        foreignProxy.$handler._scheduleListener([listener]);
                        return () => {
                            foreignProxy.$handler._deregisterForeignKey(foreignKey, listener._id);
                            this._untrackOwnedForeignListener(foreignProxy.$handler, foreignKey, listener._id);
                            return foreignProxy.$handler._deregisterKey(foreignKey, listener._id);
                        };
                    }
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
                const { _elements: elements } = expr;
                for (let i = 0, l = elements.length; i < l; i++) {
                    const element = elements[i];
                    const registerKey = resolveWatchKey(element);
                    if (registerKey) {
                        pushUniqueListenerKey(keySet, seenKeys, listener, registerKey);
                        continue;
                    }
                    collectExpressionListenerKeys(element, keySet, seenKeys, listener);
                }
                if (keySet.length === 0) {
                    throw new Error("Unable to determine key");
                }
                registerListenerKeys(this, listener, keySet, true);
                return () => {
                    deregisterListenerKeys(this, listener._id, keySet);
                };
            }
            // 14
            case ASTType._ObjectExpression: {
                listener._watchLiteralInput = true;
                const { _properties: properties } = expr;
                const collectedKeys = new Set();
                for (let i = 0, l = properties.length; i < l; i++) {
                    const prop = properties[i];
                    let currentKey;
                    if (prop._key._isPure === false) {
                        listener._watchNestedObject = true;
                        currentKey = resolveNodeWatchKey(prop._key);
                        if (!currentKey) {
                            collectWatchKeys(prop._key, collectedKeys);
                        }
                    }
                    else if (getNodeName(prop._value)) {
                        currentKey = getNodeName(prop._value);
                    }
                    else {
                        const target = expr._toWatch[0];
                        currentKey = resolveNodeWatchKey(target);
                        if (!currentKey && target) {
                            collectWatchKeys(target, collectedKeys);
                        }
                    }
                    if (currentKey) {
                        pushUniqueListenerKey(keySet, seenKeys, listener, currentKey);
                    }
                }
                for (const collectedKey of collectedKeys) {
                    pushUniqueListenerKey(keySet, seenKeys, listener, collectedKey);
                }
                break;
            }
            default: {
                throw new Error(`Unsupported type ${type}`);
            }
        }
        // if the target is an object, then start observing it
        const listenerObject = listener._watchFn(this.$target);
        if (isObject(listenerObject)) {
            if (!key && keySet.length > 0) {
                key = keySet[0];
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
            this._scheduleListener([listener]);
        }
        return () => {
            if (keySet.length > 0) {
                let res = true;
                for (let i = 0, l = keySet.length; i < l; i++) {
                    const success = this._deregisterKey(keySet[i], listener._id);
                    if (!success) {
                        res = false;
                    }
                }
                return res;
            }
            else {
                if (!key) {
                    return false;
                }
                return this._deregisterKey(key, listener._id);
            }
        };
    }
    /** Creates a prototypically inherited child scope. */
    $new(childInstance) {
        let child;
        if (childInstance) {
            const proto = Object.getPrototypeOf(childInstance);
            // If child is plain object, or already inherits from target, set prototype to target
            if (proto === Object.prototype || proto === this.$target) {
                Object.setPrototypeOf(childInstance, this.$target);
            }
            else {
                // If child has some other prototype, preserve it but link to this.$target
                Object.setPrototypeOf(proto || childInstance, this.$target);
            }
            child = childInstance;
        }
        else {
            child = createObject(this.$target);
        }
        const proxy = new Proxy(child, new Scope(this));
        this._children.push(proxy);
        this._childIndices.set(proxy, this._children.length - 1);
        this._childTargets.set(child, proxy);
        return proxy;
    }
    /** Creates an isolate child scope that does not inherit watchable properties directly. */
    $newIsolate(instance) {
        const child = instance ? createObject(instance) : nullObject();
        const proxy = new Proxy(child, new Scope(this, this.$root));
        this._children.push(proxy);
        this._childIndices.set(proxy, this._children.length - 1);
        this._childTargets.set(child, proxy);
        return proxy;
    }
    /** Creates a transcluded child scope linked to this scope and an optional parent instance. */
    $transcluded(parentInstance) {
        const child = createObject(this.$target);
        const proxy = new Proxy(child, new Scope(this, parentInstance));
        this._children.push(proxy);
        this._childIndices.set(proxy, this._children.length - 1);
        this._childTargets.set(child, proxy);
        return proxy;
    }
    /** @internal Registers a listener under a watched key on this scope. */
    _registerKey(key, listener) {
        this._ownedWatchers.push({
            _key: key,
            _id: listener._id,
        });
        this._registerInheritedKey(key);
        this._trackNestedListenerCandidate(listener);
        const listeners = this._watchers.get(key);
        let listenerIndex = 0;
        if (listeners) {
            listenerIndex = listeners.length;
            listeners.push(listener);
        }
        else {
            this._watchers.set(key, [listener]);
        }
        let keyIndexes = this._watcherIndexes.get(key);
        if (!keyIndexes) {
            keyIndexes = new Map();
            this._watcherIndexes.set(key, keyIndexes);
        }
        keyIndexes.set(listener._id, listenerIndex);
        const hashKey = getHashKey(listener._originalTarget);
        if (!isDefined(hashKey)) {
            return;
        }
        let listenersByHash = this._watchersByHash.get(key);
        if (!listenersByHash) {
            listenersByHash = new Map();
            this._watchersByHash.set(key, listenersByHash);
        }
        const hashedListeners = listenersByHash.get(hashKey);
        if (hashedListeners) {
            hashedListeners.push(listener);
            return;
        }
        listenersByHash.set(hashKey, [listener]);
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
        if (hasOwn(this.$target, key)) {
            return;
        }
        const parent = this.$parent?.$handler;
        let owner = parent;
        while (owner && owner !== this) {
            if (owner.$target && hasOwn(owner.$target, key)) {
                this._registerForeignKeyOwner(owner, key);
                return;
            }
            owner = owner.$parent?.$handler;
        }
        if (parent) {
            this._registerForeignKeyOwner(parent, key);
        }
    }
    /** @internal Registers one inherited key against a resolved parent scope owner. */
    _registerForeignKeyOwner(owner, key) {
        const ownerValue = owner.$target[key];
        if (isObject(ownerValue) && !isNonScope(ownerValue)) {
            const ownerTarget = ownerValue;
            addObjectListenerKey(owner._objectListeners, ownerTarget, key);
        }
    }
    /** @internal Removes a tracked local watcher registration record. */
    _untrackOwnedWatcher(key, id) {
        const refs = this._ownedWatchers;
        for (let i = 0; i < refs.length; i++) {
            const ref = refs[i];
            if (ref._key === key && ref._id === id) {
                refs[i] = refs[refs.length - 1];
                refs.length--;
                return;
            }
        }
    }
    /** @internal Registers a listener under a watched key owned by a foreign proxied scope. */
    _registerForeignKey(key, listener) {
        this._trackNestedListenerCandidate(listener);
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
        const hashKey = getHashKey(listener._originalTarget);
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
            hashedListeners.push(listener);
            return;
        }
        listenersByHash.set(hashKey, [listener]);
    }
    /** @internal Tracks a foreign-listener registration owned by this scope. */
    _trackOwnedForeignListener(handler, key, id) {
        this._ownedForeignListeners.push({
            _handler: handler,
            _key: key,
            _id: id,
        });
    }
    /** @internal Removes a tracked foreign-listener registration record. */
    _untrackOwnedForeignListener(handler, key, id) {
        const refs = this._ownedForeignListeners;
        for (let i = 0; i < refs.length; i++) {
            const ref = refs[i];
            if (ref._handler === handler && ref._key === key && ref._id === id) {
                refs[i] = refs[refs.length - 1];
                refs.length--;
                return;
            }
        }
    }
    /** @internal Removes a listener by id from the local watcher map. */
    _deregisterKey(key, id, untrack = true) {
        const listenerList = this._watchers.get(key);
        if (!listenerList) {
            return false;
        }
        const len = listenerList.length;
        const keyIndexes = this._watcherIndexes.get(key);
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
            this._watchers.delete(key);
            this._watcherIndexes.delete(key);
        }
        else {
            listenerList[listenerIndex] = movedListener;
            listenerList.length = len - 1;
            keyIndexes?.set(movedListener._id, listenerIndex);
            keyIndexes?.delete(id);
        }
        const hashKey = getHashKey(listener._originalTarget);
        if (isDefined(hashKey)) {
            const listenersByHash = this._watchersByHash.get(key);
            const hashedListeners = listenersByHash?.get(hashKey);
            if (hashedListeners) {
                const hashedLen = hashedListeners.length;
                for (let j = 0; j < hashedLen; j++) {
                    if (hashedListeners[j]._id === id) {
                        if (hashedLen === 1) {
                            listenersByHash?.delete(hashKey);
                            if (listenersByHash?.size === 0) {
                                this._watchersByHash.delete(key);
                            }
                        }
                        else {
                            hashedListeners[j] = hashedListeners[hashedLen - 1];
                            hashedListeners.length = hashedLen - 1;
                        }
                        break;
                    }
                }
            }
        }
        this._untrackNestedListenerCandidate(listener);
        if (untrack)
            this._untrackOwnedWatcher(key, id);
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
        const hashKey = getHashKey(listener._originalTarget);
        if (isDefined(hashKey)) {
            const listenersByHash = this._foreignListenersByHash.get(key);
            const hashedListeners = listenersByHash?.get(hashKey);
            if (hashedListeners) {
                const hashedLen = hashedListeners.length;
                for (let j = 0; j < hashedLen; j++) {
                    if (hashedListeners[j]._id === id) {
                        if (hashedLen === 1) {
                            listenersByHash?.delete(hashKey);
                            if (listenersByHash?.size === 0) {
                                this._foreignListenersByHash.delete(key);
                            }
                        }
                        else {
                            hashedListeners[j] = hashedListeners[hashedLen - 1];
                            hashedListeners.length = hashedLen - 1;
                        }
                        break;
                    }
                }
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
        for (let i = 0, l = keyList.length; i < l; i++) {
            const currentListeners = this._watchers.get(keyList[i]);
            if (currentListeners) {
                this._scheduleListener(currentListeners);
            }
            const currentForeignListeners = this._foreignListeners.get(keyList[i]);
            if (currentForeignListeners) {
                this._scheduleListener(currentForeignListeners);
            }
        }
    }
    /** Merges enumerable properties from the provided object into the current scope target. */
    $merge(newTarget) {
        const newTargetRecord = newTarget;
        const keyList = keys(newTargetRecord);
        for (let i = 0, l = keyList.length; i < l; i++) {
            const key = keyList[i];
            this.set(this.$target, key, newTargetRecord[key], this.$proxy);
        }
    }
    /** Registers an event listener on this scope and returns a deregistration function. */
    $on(name, listener) {
        let namedListeners = this._listeners.get(name);
        if (!namedListeners) {
            namedListeners = [];
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
    $emit(name, ...args) {
        return this._eventHelper({ name, event: undefined, broadcast: false }, ...args);
    }
    /** Broadcasts an event downward through the scope hierarchy. */
    $broadcast(name, ...args) {
        return this._eventHelper({ name, event: undefined, broadcast: true }, ...args);
    }
    /**
     * @internal
     * Internal event propagation helper.
     *
     * Propagates either upward (`$emit`) or downward (`$broadcast`) and
     * constructs the shared event object on first use.
     */
    _eventHelper({ name, event, broadcast, }, ...args) {
        if (!broadcast) {
            if (!this._listeners.has(name)) {
                if (this.$parent) {
                    return this.$parent.$handler._eventHelper({ name, event, broadcast }, ...args);
                }
                return undefined;
            }
        }
        if (event) {
            event.currentScope = this.$proxy;
        }
        else {
            event = {
                name,
                targetScope: this.$proxy,
                currentScope: this.$proxy,
                stopped: false,
                stopPropagation() {
                    event.stopped = true;
                },
                preventDefault() {
                    event.defaultPrevented = true;
                },
                defaultPrevented: false,
            };
        }
        const currentEvent = event;
        if (!currentEvent) {
            return undefined;
        }
        const listenerArgs = [currentEvent, ...args];
        const listeners = this._listeners.get(name);
        if (listeners) {
            let { length } = listeners;
            for (let i = 0; i < length; i++) {
                try {
                    const cb = listeners[i];
                    cb.apply(null, listenerArgs);
                    const currentLength = listeners.length;
                    if (currentLength !== length) {
                        if (currentLength < length) {
                            i--;
                        }
                        length = currentLength;
                    }
                }
                catch (err) {
                    $exceptionHandler(err);
                }
            }
        }
        currentEvent.currentScope = null;
        if (currentEvent.stopped) {
            return currentEvent;
        }
        if (broadcast) {
            const children = this._children;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (!child)
                    continue;
                event = child.$handler._eventHelper({ name, event: currentEvent, broadcast }, ...args);
            }
            return event;
        }
        else {
            if (this.$parent) {
                return this.$parent.$handler._eventHelper({ name, event: currentEvent, broadcast }, ...args);
            }
            else {
                return currentEvent;
            }
        }
    }
    /** @internal Returns whether this scope instance is the root scope. */
    _isRoot() {
        return this.$root === this;
    }
    /** Queues a callback to run after the current listener batch completes. */
    $postUpdate(fn) {
        const owner = this;
        $postUpdateQueue.push(() => {
            if (owner._destroyed)
                return;
            fn();
        });
    }
    $destroy() {
        if (this._destroyed)
            return;
        if (this._listeners.has("$destroy") || this._children.length > 0) {
            this.$broadcast("$destroy");
        }
        const scopeId = this.$id;
        const ownedWatchers = this._ownedWatchers;
        for (let i = 0, l = ownedWatchers.length; i < l; i++) {
            const ref = ownedWatchers[i];
            this._deregisterKey(ref._key, ref._id, false);
        }
        ownedWatchers.length = 0;
        for (let i = 0; i < this._ownedForeignListeners.length; i++) {
            const ref = this._ownedForeignListeners[i];
            ref._handler._deregisterForeignKey(ref._key, ref._id);
        }
        this._ownedForeignListeners.length = 0;
        if (this._isRoot()) {
            this._watchers.clear();
            this._watcherIndexes.clear();
            this._watchersByHash.clear();
            this._foreignListeners.clear();
            this._foreignListenerIndexes.clear();
            this._foreignListenersByHash.clear();
        }
        else {
            const parent = this.$parent;
            if (!parent) {
                this._listeners.clear();
                this._destroyed = true;
                return;
            }
            const parentHandler = parent.$handler;
            const children = parentHandler._children;
            const childProxy = this.$proxy;
            const childIndex = parentHandler._childIndices.get(childProxy);
            const childTarget = this.$target;
            if (childTarget) {
                parentHandler._childTargets.delete(childTarget);
            }
            const lastIndex = children.length - 1;
            if (childIndex !== undefined && childIndex <= lastIndex) {
                const movedChild = children[lastIndex];
                parentHandler._childIndices.delete(childProxy);
                if (childIndex !== lastIndex) {
                    children[childIndex] = movedChild;
                    parentHandler._childIndices.set(movedChild, childIndex);
                }
                children.length = lastIndex;
            }
            else {
                for (let i = 0, l = children.length; i < l; i++) {
                    if (children[i].$id === scopeId) {
                        const movedChild = children[l - 1];
                        parentHandler._childIndices.delete(children[i]);
                        if (i !== l - 1) {
                            children[i] = movedChild;
                            parentHandler._childIndices.set(movedChild, i);
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
        this._watcherIndexes = new Map();
        this._watchersByHash = new Map();
        this._foreignListeners = new Map();
        this._foreignListenerIndexes = new Map();
        this._foreignListenersByHash = new Map();
        this._objectListeners = new WeakMap();
        if (this._isRoot()) {
            this._listenerStats._nestedCandidateCount = 0;
        }
        this._childIndices = new WeakMap();
        this._childTargets = new WeakMap();
        this._listeners.clear();
        this._destroyed = true;
        queueDestroyedScopeCleanup(this);
    }
    /** @internal Completes deferred reference cleanup after destroy observers have run. */
    _cleanupDestroyedScope() {
        if (!this._destroyed)
            return;
        if (this._isRoot()) {
            this._children.length = 0;
        }
        else {
            this._children.length = 0;
            this._watchers = new Map();
            this._watcherIndexes = new Map();
            this._watchersByHash = new Map();
        }
        this.$target = null;
        this.$proxy = undefined;
        if (!this._isRoot()) {
            this.$parent = undefined;
            this.$root = undefined;
        }
        this._propertyMap = {
            $destroy: this._propertyMap.$destroy,
            $handler: this,
            $id: this.$id,
            $isRoot: this._propertyMap.$isRoot,
            $parent: this.$parent,
            $proxy: this.$proxy,
            $root: this.$root,
            $scopename: this.$scopename,
            $target: this.$target,
            _children: this._children,
        };
    }
    /** @internal Resolves the watched value and notifies a single listener. */
    _notifyListener(listener, target) {
        const { _originalTarget, _listenerFn, _watchFn } = listener;
        try {
            let newVal = _watchFn(_originalTarget);
            if (isUndefined(newVal) && target !== _originalTarget) {
                newVal = _watchFn(target);
            }
            if (isFunction(newVal)) {
                if (!listener._invokeWatchFn && listener._watchProp) {
                    listener._invokeWatchFn = $parse(`${listener._watchProp}()`);
                }
                newVal = listener._invokeWatchFn
                    ? listener._invokeWatchFn(_originalTarget)
                    : newVal(_originalTarget);
            }
            else if (!isArray(newVal)) {
                _listenerFn(newVal, _originalTarget);
                return;
            }
            else {
                for (let i = 0, l = newVal.length; i < l; i++) {
                    if (isFunction(newVal[i])) {
                        newVal[i] = newVal[i](_originalTarget);
                    }
                }
            }
            _listenerFn(newVal, _originalTarget);
        }
        catch (err) {
            $exceptionHandler(err);
        }
    }
    /* @ignore */
    $flushQueue() {
        this._drainPostUpdateQueue();
    }
    /** Searches this scope tree for a scope with the given id. */
    $getById(id) {
        if (isString(id)) {
            id = parseInt(id, 10);
        }
        if (this.$id === id) {
            return this;
        }
        else {
            let res = undefined;
            for (const child of this._children) {
                const found = child.$getById(id);
                if (found) {
                    res = found;
                    break;
                }
            }
            return res;
        }
    }
    /** Searches the scope tree for a scope registered under the provided name. */
    $searchByName(name) {
        const stack = [this.$root];
        while (stack.length) {
            const scope = stack.pop();
            if (!scope) {
                continue;
            }
            if (scope.$scopename === name) {
                return scope;
            }
            if (scope._children?.length) {
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
            if (childIds.has(watchers[i]._scopeId)) {
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
        if (!ids.has(node.$id)) {
            ids.add(node.$id);
            if (node._children) {
                for (let i = 0, l = node._children.length; i < l; i++) {
                    stack.push(node._children[i]);
                }
            }
        }
    }
    return ids;
}

export { $postUpdateQueue, RootScopeProvider, Scope, createScope, getArrayMutationMeta, isNonScope };
