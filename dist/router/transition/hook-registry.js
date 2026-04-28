import { removeFrom } from '../../shared/common.js';
import { assign, values, isFunction, isString } from '../../shared/utils.js';
import { Glob } from '../glob/glob.js';
import { TransitionHookScope } from './transition-hook.js';

/**
 * Tests a state against one hook match criterion.
 */
function matchState(state, criterion, transition) {
    const toMatch = isString(criterion) ? [criterion] : criterion;
    const matchGlobs = (_state) => {
        const globStrings = toMatch;
        for (let i = 0; i < globStrings.length; i++) {
            const glob = new Glob(globStrings[i]);
            if ((glob && glob.matches(_state.name)) ||
                (!glob && globStrings[i] === _state.name)) {
                return true;
            }
        }
        return false;
    };
    const matchFn = (isFunction(toMatch) ? toMatch : matchGlobs);
    return !!matchFn(state, transition);
}
/**
 * Stores one registered transition hook and evaluates whether it matches
 * a specific transition tree change set.
 */
class RegisteredHook {
    constructor(tranSvc, eventType, callback, matchCriteria, removeHookFromRegistry, options = {}) {
        this.tranSvc = tranSvc;
        this._eventType = eventType;
        this.callback = callback;
        this.matchCriteria = matchCriteria;
        this.removeHookFromRegistry = removeHookFromRegistry;
        this.invokeCount = 0;
        this._deregistered = false;
        this.priority = options.priority || 0;
        this.bind = options.bind || null;
        this.invokeLimit = options.invokeLimit;
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
    _getDefaultMatchCriteria() {
        const pathTypes = this.tranSvc._getPathTypes();
        const criteria = {};
        for (const key in pathTypes) {
            criteria[key] = true;
        }
        return criteria;
    }
    /** @internal */
    _getMatchingNodes(treeChanges, transition) {
        const criteria = assign(this._getDefaultMatchCriteria(), this.matchCriteria);
        const pathTypes = values(this.tranSvc._getPathTypes());
        const matchingNodes = {};
        for (let i = 0; i < pathTypes.length; i++) {
            const pathType = pathTypes[i];
            const isStateHook = pathType.scope === TransitionHookScope._STATE;
            const path = (treeChanges[pathType.name] || []);
            const transitionNode = path.length ? path[path.length - 1] : undefined;
            const nodes = isStateHook
                ? path
                : transitionNode
                    ? [transitionNode]
                    : [];
            matchingNodes[pathType.name] = this._matchingNodes(nodes, criteria[pathType.name], transition);
        }
        return matchingNodes;
    }
    matches(treeChanges, transition) {
        const matches = this._getMatchingNodes(treeChanges, transition);
        const matchedPaths = values(matches);
        let allMatched = true;
        for (let i = 0; i < matchedPaths.length; i++) {
            if (!matchedPaths[i]) {
                allMatched = false;
                break;
            }
        }
        return allMatched ? matches : null;
    }
    deregister() {
        this.removeHookFromRegistry(this);
        this._deregistered = true;
    }
}
/**
 * Registers a hook on either the transition service or a single transition.
 */
function registerHook(hookSource, transitionService, eventType, matchCriteria, callback, options = {}) {
    const typedEventType = eventType;
    const _registeredHooks = (hookSource._registeredHooks =
        hookSource._registeredHooks || {});
    const hooks = (_registeredHooks[typedEventType.name] =
        _registeredHooks[typedEventType.name] || []);
    const removeHookFn = (hook) => {
        removeFrom(hooks, hook);
    };
    const registeredHook = new RegisteredHook(transitionService, typedEventType, callback, matchCriteria, removeHookFn, options);
    hooks.push(registeredHook);
    return registeredHook.deregister.bind(registeredHook);
}
/**
 * Creates a convenience `onX` registration function for a transition event.
 */
function makeEvent(hookSource, transitionService, eventType) {
    const _registeredHooks = (hookSource._registeredHooks =
        hookSource._registeredHooks || {});
    const typedEventType = eventType;
    const hooks = (_registeredHooks[typedEventType.name] =
        []);
    const removeHookFn = (hook) => {
        removeFrom(hooks, hook);
    };
    function hookRegistrationFn(matchObject, callback, options = {}) {
        const registeredHook = new RegisteredHook(transitionService, typedEventType, callback, matchObject, removeHookFn, options);
        hooks.push(registeredHook);
        return registeredHook.deregister.bind(registeredHook);
    }
    hookSource[typedEventType.name] = hookRegistrationFn;
    return hookRegistrationFn;
}

export { RegisteredHook, makeEvent, matchState, registerHook };
