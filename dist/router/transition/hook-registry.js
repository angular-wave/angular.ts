import { removeFrom } from '../../shared/common.js';
import { hasOwn, isString, isFunction } from '../../shared/utils.js';
import { PATH_TYPES } from './path-types.js';

/**
 * Tests a state against one hook match criterion.
 */
function matchState(state, criterion, transition) {
    if (isString(criterion)) {
        return criterion === state.name;
    }
    if (isFunction(criterion)) {
        return criterion(state, transition);
    }
    return false;
}
/**
 * Stores one registered transition hook and evaluates whether it matches
 * a specific transition tree change set.
 */
/** @internal */
class RegisteredHook {
    constructor(tranSvc, eventType, callback, matchCriteria, hooks, options = {}) {
        this._tranSvc = tranSvc;
        this._eventType = eventType;
        this._callback = callback;
        this._matchCriteria = matchCriteria;
        this._hooks = hooks;
        this._invokeCount = 0;
        this._deregistered = false;
        this._priority = options.priority ?? 0;
        this._bind = options.bind ?? null;
        this._invokeLimit = options.invokeLimit;
    }
    /** @internal */
    _matchingNodes(nodes, criterion, transition) {
        if (criterion === true)
            return nodes;
        const matching = [];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (matchState(node.state, criterion, transition)) {
                matching.push(node);
            }
        }
        return matching.length ? matching : null;
    }
    /** @internal */
    _getMatchingNodes(treeChanges, transition) {
        const matchingNodes = {};
        for (const name in PATH_TYPES) {
            const pathType = PATH_TYPES[name];
            const path = treeChanges[pathType._name] ?? [];
            const transitionNode = path.length ? path[path.length - 1] : undefined;
            const configuredCriterion = hasOwn(this._matchCriteria, pathType._name)
                ? this._matchCriteria[pathType._name]
                : undefined;
            const criterion = configuredCriterion ?? true;
            if (criterion === true) {
                matchingNodes[pathType._name] = pathType._stateHook
                    ? path
                    : transitionNode
                        ? [transitionNode]
                        : [];
                continue;
            }
            const matching = pathType._stateHook
                ? this._matchingNodes(path, criterion, transition)
                : transitionNode &&
                    matchState(transitionNode.state, criterion, transition)
                    ? [transitionNode]
                    : null;
            if (!matching) {
                return null;
            }
            matchingNodes[pathType._name] = matching;
        }
        return matchingNodes;
    }
    /** @internal */
    _matches(treeChanges, transition) {
        return this._getMatchingNodes(treeChanges, transition);
    }
    /** @internal */
    _deregister() {
        removeFrom(this._hooks, this);
        this._deregistered = true;
    }
}
/**
 * Registers a hook on either the transition service or a single transition.
 *
 * @internal
 */
function registerHook(hookSource, transitionService, eventType, matchCriteria, callback, options = {}) {
    const _registeredHooks = (hookSource._registeredHooks =
        hookSource._registeredHooks ?? {});
    const hooks = (_registeredHooks[eventType._name] =
        _registeredHooks[eventType._name] ?? []);
    const registeredHook = new RegisteredHook(transitionService, eventType, callback, matchCriteria, hooks, options);
    hooks.push(registeredHook);
    return registeredHook._deregister.bind(registeredHook);
}
/**
 * Creates a convenience `onX` registration function for a transition event.
 *
 * @internal
 */
function makeEvent(hookSource, transitionService, eventType) {
    const _registeredHooks = (hookSource._registeredHooks =
        hookSource._registeredHooks ?? {});
    const hooks = (_registeredHooks[eventType._name] = []);
    function hookRegistrationFn(matchObject, callback, options = {}) {
        const registeredHook = new RegisteredHook(transitionService, eventType, callback, matchObject, hooks, options);
        hooks.push(registeredHook);
        return registeredHook._deregister.bind(registeredHook);
    }
    hookSource[eventType._name] = hookRegistrationFn;
    return hookRegistrationFn;
}

export { RegisteredHook, makeEvent, registerHook };
