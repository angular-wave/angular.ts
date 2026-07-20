import { createScope, SCOPE_PROXY_BIND } from '../../core/scope/scope.js';
import { isObject, isString, hasOwn, isFunction, isPromiseLike, isArray, keys, isInstanceOf } from '../../shared/utils.js';
import { normalizePolicyDecision } from '../../core/policy/policy.js';

/** @internal */
function createMachineService() {
    return createMachine;
}
function createMachine(scopeOrConfig, maybeConfig) {
    const { _scope: scope, _config: typedConfig } = normalizeMachineArgs(scopeOrConfig, maybeConfig);
    const config = {
        ...typedConfig,
        data: defaultMachineData(typedConfig.data),
    };
    assertMachineConfig(config);
    const rawData = config.data;
    let currentState = config.initial;
    let activeBinding;
    const bindings = new Map();
    const machineTarget = {
        get state() {
            return currentState;
        },
        get data() {
            return rawData;
        },
        send(type, payload) {
            if (!isString(type)) {
                return createSendResult("invalid-event", "", false);
            }
            return dispatchMachineStateTransition(type, payload, config);
        },
        can(type, payload) {
            if (!isString(type)) {
                return false;
            }
            const transition = getStateTransition(currentState, config, type);
            if (!transition) {
                return false;
            }
            const activeMachine = getActiveMachine();
            const from = currentState;
            const to = resolveMachineTransitionTarget(transition, type, from, payload, activeMachine, config);
            const context = createStateTransitionContext(type, from, to, payload, activeMachine);
            if (!canRunStateTransition(transition, context)) {
                return false;
            }
            return !isMachinePolicyDenied(checkMachineTransitionPolicy(config, createTransitionPolicyContext(config, type, from, context.to, payload, activeMachine)));
        },
        matches(state) {
            return currentState === state;
        },
        snapshot() {
            return {
                state: currentState,
                data: cloneMachineData(rawData),
            };
        },
        restore(snapshot) {
            assertMachineSnapshot(snapshot, config);
            const binding = getActiveBinding();
            batch(binding?._handler, () => {
                const previousDataKeys = collectMachineDataKeys(rawData);
                currentState = snapshot.state;
                restoreMachineData(rawData, snapshot.data);
                scheduleMachineBindings(previousDataKeys);
            });
        },
    };
    Object.defineProperty(machineTarget, SCOPE_PROXY_BIND, {
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
            binding._handler._scheduleWatchKeys(["state", "data"]);
            binding._handler._checkListenersForAllKeys(rawData);
            if (dataKeys.length > 0) {
                binding._handler._scheduleWatchKeys(dataKeys);
            }
        }
    }
    function dispatchMachineStateTransition(type, payload, stateConfig) {
        const transition = getStateTransition(currentState, stateConfig, type);
        if (!transition) {
            return createSendResult("missing-transition", type, false);
        }
        const binding = getActiveBinding();
        return batch(binding?._handler, () => {
            let transitionStarted = false;
            try {
                const activeMachine = getActiveMachine();
                const from = machineTarget.state;
                const to = resolveMachineTransitionTarget(transition, type, from, payload, activeMachine, stateConfig);
                const context = createStateTransitionContext(type, from, to, payload, activeMachine);
                if (!canRunStateTransition(transition, context)) {
                    transitionStarted = !!transition._denied;
                    transition._denied?.(context);
                    return createSendResult("guard-denied", type, false, from, from);
                }
                const policyDecision = checkMachineTransitionPolicy(stateConfig, createTransitionPolicyContext(stateConfig, type, from, context.to, payload, activeMachine));
                if (isMachinePolicyDenied(policyDecision)) {
                    return createSendResult("policy-denied", type, false, from, from, policyDecision.reason);
                }
                transitionStarted = true;
                transition._before?.(context);
                transition._update?.(context);
                const hookContext = context;
                if (from !== to) {
                    getModeHook(stateConfig.hooks?.exit, from)?.(hookContext);
                }
                currentState = to;
                if (from !== to) {
                    getModeHook(stateConfig.hooks?.enter, to)?.(hookContext);
                }
                transition._after?.(context);
                getTransitionHook(stateConfig.hooks)?.(hookContext);
                return createSendResult(from === to ? "updated" : "transitioned", type, true, from, to);
            }
            finally {
                if (transitionStarted) {
                    scheduleMachineBindings();
                }
            }
        });
    }
    function createStateTransitionContext(type, from, to, payload, activeMachine) {
        return {
            type,
            from,
            to,
            payload,
            data: activeMachine.data,
            machine: activeMachine,
        };
    }
    function resolveMachineTransitionTarget(transition, type, from, payload, activeMachine, stateConfig) {
        const to = isFunction(transition._to)
            ? transition._to(createStateTransitionContext(type, from, from, payload, activeMachine))
            : (transition._to ?? from);
        if (!isNonEmptyString(to)) {
            throw new Error("$machine transition target resolver must return a non-empty state.");
        }
        if (!hasOwn(stateConfig.states, to)) {
            throw new Error(`$machine transition target '${to}' is not a configured state.`);
        }
        return to;
    }
    function createSendResult(status, type, ok, from = currentState, to = from, reason) {
        return {
            ok,
            status,
            type,
            from,
            to,
            ...(reason === undefined ? {} : { reason }),
        };
    }
}
const ALLOW_MACHINE_TRANSITION = {
    type: "allow",
};
function createTransitionPolicyContext(config, type, from, to, payload, activeMachine) {
    return {
        operation: "machine.transition",
        machineId: config.id,
        type,
        from,
        to,
        payload,
        data: activeMachine.data,
        machine: activeMachine,
        meta: config.meta,
    };
}
function checkMachineTransitionPolicy(config, context) {
    if (!config.policy) {
        return ALLOW_MACHINE_TRANSITION;
    }
    const decision = config.policy(context);
    if (isPromiseLike(decision)) {
        throw new Error("$machine policy must return a synchronous decision.");
    }
    return normalizePolicyDecision(decision);
}
function isMachinePolicyDenied(decision) {
    return decision.type === "deny";
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
function defaultMachineData(data) {
    if (data === undefined) {
        return {};
    }
    return data;
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
function getStateTransition(currentState, config, type) {
    if (!hasOwn(config.states, currentState)) {
        return undefined;
    }
    const stateDefinition = config.states[currentState];
    if (!isObject(stateDefinition) ||
        !isObject(stateDefinition.on) ||
        !hasOwn(stateDefinition.on, type)) {
        return undefined;
    }
    const transition = stateDefinition.on[type];
    return resolveMachineStateTransition(transition);
}
function resolveMachineStateTransition(transition) {
    if (!isPlainObject(transition)) {
        return undefined;
    }
    const descriptor = transition;
    const hasTo = hasOwn(transition, "to");
    const hasUpdate = hasOwn(transition, "update");
    if (hasTo && !isNonEmptyString(descriptor.to) && !isFunction(descriptor.to)) {
        return undefined;
    }
    if (!hasTo && !isFunction(descriptor.update)) {
        return undefined;
    }
    if (hasUpdate && !isFunction(descriptor.update)) {
        return undefined;
    }
    if (descriptor.guard !== undefined && !isFunction(descriptor.guard)) {
        return undefined;
    }
    if (descriptor.before !== undefined && !isFunction(descriptor.before)) {
        return undefined;
    }
    if (descriptor.after !== undefined && !isFunction(descriptor.after)) {
        return undefined;
    }
    if (descriptor.denied !== undefined && !isFunction(descriptor.denied)) {
        return undefined;
    }
    return {
        _to: isNonEmptyString(descriptor.to) || isFunction(descriptor.to)
            ? descriptor.to
            : undefined,
        _guard: isFunction(descriptor.guard) ? descriptor.guard : undefined,
        _before: isFunction(descriptor.before) ? descriptor.before : undefined,
        _update: isFunction(descriptor.update) ? descriptor.update : undefined,
        _after: isFunction(descriptor.after) ? descriptor.after : undefined,
        _denied: isFunction(descriptor.denied) ? descriptor.denied : undefined,
    };
}
function canRunStateTransition(transition, context) {
    return transition._guard ? transition._guard(context) : true;
}
function getModeHook(hooks, state) {
    if (!hooks || !hasOwn(hooks, state)) {
        return undefined;
    }
    const hook = hooks[state];
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
        throw new Error("$machine requires a non-empty initial state.");
    }
    if (!isObject(config.data)) {
        throw new Error("$machine requires a data object.");
    }
    if (!isObject(config.states)) {
        throw new Error("$machine requires a states object.");
    }
    if (!hasOwn(config.states, config.initial)) {
        throw new Error("$machine initial state must exist in states.");
    }
    assertMachineHooks(config.hooks);
}
function assertMachineSnapshot(snapshot, config) {
    if (!snapshot || !isObject(snapshot)) {
        throw new Error("$machine restore requires a snapshot object.");
    }
    const candidate = snapshot;
    if (!isString(candidate.state) || !candidate.state) {
        throw new Error("$machine restore requires a non-empty state.");
    }
    if (!isObject(candidate.data)) {
        throw new Error("$machine restore requires a data object.");
    }
    if (!hasOwn(config.states, candidate.state)) {
        throw new Error("$machine restore state must exist in states.");
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

export { createMachineService };
