import { createScope, _SCOPE_PROXY_BIND } from '../../core/scope/scope.js';
import { isObject, isString, isFunction, hasOwn, isArray, keys, isInstanceOf } from '../../shared/utils.js';

/**
 * Provides reactive mode machines backed by AngularTS scope proxies.
 */
class MachineProvider {
    constructor() {
        this.$get = () => createMachine;
    }
}
function defineMachine(config) {
    return config;
}
function createMachine(scopeOrConfig, maybeConfig) {
    const { _scope: scope, _config: config } = normalizeMachineArgs(scopeOrConfig, maybeConfig);
    assertMachineConfig(config);
    const rawData = config.data;
    let activeBinding;
    const bindings = new Map();
    const machineTarget = {
        current: config.initial,
        data: rawData,
        send(type, payload) {
            if (!isString(type)) {
                return false;
            }
            const transition = getTransition(machineTarget.current, config, type);
            if (!transition) {
                return false;
            }
            const binding = getActiveBinding();
            return batch(binding?._handler, () => {
                let transitionStarted = false;
                try {
                    const activeMachine = getActiveMachine();
                    const from = machineTarget.current;
                    transitionStarted = true;
                    const nextMode = transition(activeMachine.data, payload, activeMachine);
                    const to = isNonEmptyString(nextMode) ? nextMode : from;
                    const context = {
                        type,
                        from,
                        to,
                        payload,
                        data: activeMachine.data,
                        machine: activeMachine,
                    };
                    const hookContext = context;
                    if (from !== to) {
                        getModeHook(config.hooks?.exit, from)?.(hookContext);
                    }
                    if (isNonEmptyString(nextMode)) {
                        machineTarget.current = nextMode;
                    }
                    else {
                        machineTarget.current = from;
                    }
                    if (from !== to) {
                        getModeHook(config.hooks?.enter, to)?.(hookContext);
                    }
                    getTransitionHook(config.hooks)?.(hookContext);
                    return true;
                }
                finally {
                    if (transitionStarted) {
                        scheduleMachineBindings();
                    }
                }
            });
        },
        can(type) {
            if (!isString(type)) {
                return false;
            }
            return !!getTransition(machineTarget.current, config, type);
        },
        matches(mode) {
            return machineTarget.current === mode;
        },
        snapshot() {
            return {
                current: machineTarget.current,
                data: cloneMachineData(rawData),
            };
        },
        restore(snapshot) {
            assertMachineSnapshot(snapshot);
            const binding = getActiveBinding();
            batch(binding?._handler, () => {
                const previousDataKeys = collectMachineDataKeys(rawData);
                machineTarget.current = snapshot.current;
                restoreMachineData(rawData, snapshot.data);
                scheduleMachineBindings(previousDataKeys);
            });
        },
    };
    Object.defineProperty(machineTarget, _SCOPE_PROXY_BIND, {
        value(handler, proxy) {
            let binding = bindings.get(handler.$id);
            if (!binding) {
                binding = {
                    _handler: handler,
                    _proxy: proxy,
                };
                bindings.set(handler.$id, binding);
            }
            activeBinding = binding;
        },
    });
    if (scope?.$handler) {
        return createScope(machineTarget, scope.$handler);
    }
    return machineTarget;
    function getActiveMachine() {
        return getActiveBinding()?._proxy ?? machineTarget;
    }
    function getActiveBinding() {
        if (activeBinding && !activeBinding._handler._destroyed) {
            return activeBinding;
        }
        for (const [scopeId, binding] of bindings) {
            if (binding._handler._destroyed) {
                bindings.delete(scopeId);
                continue;
            }
            activeBinding = binding;
            return binding;
        }
        activeBinding = undefined;
        return undefined;
    }
    function scheduleMachineBindings(extraDataKeys = []) {
        const dataKeys = Array.from(new Set([...extraDataKeys, ...collectMachineDataKeys(rawData)]));
        for (const [scopeId, binding] of bindings) {
            if (binding._handler._destroyed) {
                bindings.delete(scopeId);
                continue;
            }
            binding._handler._scheduleWatchKeys(["current", "data"]);
            binding._handler._checkListenersForAllKeys(rawData);
            if (dataKeys.length > 0) {
                binding._handler._scheduleWatchKeys(dataKeys);
            }
        }
    }
}
function collectMachineDataKeys(value) {
    const keySet = new Set();
    const visited = new WeakSet();
    collectKeys(value, keySet, visited);
    return Array.from(keySet);
}
function collectKeys(value, keySet, visited) {
    if (!isObject(value)) {
        return;
    }
    const objectValue = value;
    if (visited.has(objectValue)) {
        return;
    }
    visited.add(objectValue);
    collectNativeCollectionKeys(objectValue, keySet);
    const keyList = keys(objectValue);
    for (let i = 0, l = keyList.length; i < l; i++) {
        const key = keyList[i];
        keySet.add(key);
        collectKeys(objectValue[key], keySet, visited);
    }
}
function collectNativeCollectionKeys(value, keySet) {
    if (isInstanceOf(value, Map)) {
        keySet.add("size");
        keySet.add("get");
        keySet.add("has");
        return;
    }
    if (isInstanceOf(value, Set)) {
        keySet.add("size");
        keySet.add("has");
    }
}
function cloneMachineData(data) {
    return structuredClone(data);
}
function restoreMachineData(target, source) {
    restoreMachineDataValue(target, source, new WeakMap());
}
function restoreMachineDataValue(target, source, visited) {
    let sourceTargets = visited.get(source);
    if (sourceTargets?.has(target)) {
        return;
    }
    if (!sourceTargets) {
        sourceTargets = new WeakSet();
        visited.set(source, sourceTargets);
    }
    sourceTargets.add(target);
    const targetRecord = target;
    const sourceRecord = source;
    const targetKeys = keys(target);
    for (let i = 0, l = targetKeys.length; i < l; i++) {
        const key = targetKeys[i];
        if (!hasOwn(sourceRecord, key)) {
            Reflect.deleteProperty(targetRecord, key);
        }
    }
    const sourceKeys = keys(source);
    for (let i = 0, l = sourceKeys.length; i < l; i++) {
        const key = sourceKeys[i];
        const sourceValue = sourceRecord[key];
        const targetValue = getMachineDataProperty(targetRecord, key);
        if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
            restoreMachineDataValue(targetValue, sourceValue, visited);
            continue;
        }
        setMachineDataProperty(targetRecord, key, cloneSnapshotValue(sourceValue));
    }
}
function cloneSnapshotValue(value) {
    return isObject(value) ? structuredClone(value) : value;
}
function getMachineDataProperty(target, key) {
    if (key === "__proto__") {
        return hasOwn(target, key)
            ? Object.getOwnPropertyDescriptor(target, key)?.value
            : undefined;
    }
    return target[key];
}
function setMachineDataProperty(target, key, value) {
    if (key === "__proto__") {
        Object.defineProperty(target, key, {
            value,
            enumerable: true,
            configurable: true,
            writable: true,
        });
        return;
    }
    target[key] = value;
}
function getTransition(mode, config, type) {
    if (!hasOwn(config.transitions, mode)) {
        return undefined;
    }
    const transitions = config.transitions[mode];
    if (!isObject(transitions) || !hasOwn(transitions, type)) {
        return undefined;
    }
    const transition = transitions[type];
    return isFunction(transition)
        ? transition
        : undefined;
}
function getModeHook(hooks, mode) {
    if (!hooks || !hasOwn(hooks, mode)) {
        return undefined;
    }
    const hook = hooks[mode];
    return isFunction(hook) ? hook : undefined;
}
function getTransitionHook(hooks) {
    if (!hooks || !hasOwn(hooks, "transition")) {
        return undefined;
    }
    return isFunction(hooks.transition) ? hooks.transition : undefined;
}
function batch(scope, fn) {
    if (!scope || scope._destroyed) {
        return fn();
    }
    return scope.$batch(fn);
}
function normalizeMachineArgs(scopeOrConfig, maybeConfig) {
    if (maybeConfig) {
        return {
            _scope: scopeOrConfig,
            _config: maybeConfig,
        };
    }
    return {
        _config: scopeOrConfig,
    };
}
function assertMachineConfig(config) {
    if (!isObject(config)) {
        throw new Error("$machine requires a config object.");
    }
    if (!isString(config.initial) || !config.initial) {
        throw new Error("$machine requires a non-empty initial mode.");
    }
    if (!isObject(config.data)) {
        throw new Error("$machine requires a data object.");
    }
    if (!isObject(config.transitions)) {
        throw new Error("$machine requires a transitions object.");
    }
    assertMachineHooks(config.hooks);
}
function assertMachineSnapshot(snapshot) {
    if (!snapshot || !isObject(snapshot)) {
        throw new Error("$machine restore requires a snapshot object.");
    }
    const candidate = snapshot;
    if (!isString(candidate.current) || !candidate.current) {
        throw new Error("$machine restore requires a non-empty current mode.");
    }
    if (!isObject(candidate.data)) {
        throw new Error("$machine restore requires a data object.");
    }
}
function assertMachineHooks(hooks) {
    if (hooks === undefined) {
        return;
    }
    if (!isPlainObject(hooks)) {
        throw new Error("$machine hooks must be an object.");
    }
    assertMachineHookMap("enter", hooks.enter);
    assertMachineHookMap("exit", hooks.exit);
    if (hooks.transition !== undefined && !isFunction(hooks.transition)) {
        throw new Error("$machine hooks.transition must be a function.");
    }
}
function assertMachineHookMap(name, hooks) {
    if (hooks === undefined) {
        return;
    }
    if (!isPlainObject(hooks)) {
        throw new Error(`$machine hooks.${name} must be an object.`);
    }
    const hookNames = keys(hooks);
    for (let i = 0, l = hookNames.length; i < l; i++) {
        if (!isFunction(hooks[hookNames[i]])) {
            throw new Error(`$machine hooks.${name} entries must be functions.`);
        }
    }
}
function isNonEmptyString(value) {
    return isString(value) && value !== "";
}
function isPlainObject(value) {
    if (!isObject(value) || isArray(value)) {
        return false;
    }
    const prototype = Reflect.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

export { MachineProvider, defineMachine };
