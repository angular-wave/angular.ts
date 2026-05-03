import { isArray } from '../../shared/utils.js';
import { TransitionHook } from './transition-hook.js';

/** @internal */
function buildHooksForPhase(transition, phase) {
    const eventTypes = transition._transitionService._getEvents(phase);
    const hooks = [];
    eventTypes.forEach((eventType) => {
        buildHooks(transition, eventType, hooks);
    });
    return hooks;
}
function buildHooks(transition, hookType, hooks) {
    const treeChanges = transition._treeChanges;
    const baseHookOptions = {
        transition,
        current: () => transition._options.current?.() || undefined,
    };
    const hookTuples = [];
    const registeredHooks = transition._transitionService._getHooks(hookType._name);
    if (!isArray(registeredHooks)) {
        throw new Error(`broken event named: ${hookType._name}`);
    }
    registeredHooks.forEach((hook) => {
        const matches = hook._matches(treeChanges, transition);
        if (!matches)
            return;
        const matchingNodes = matches[hookType._criteriaMatchPath._name];
        matchingNodes.forEach((node) => {
            const options = {
                _bind: hook._bind,
                _hookType: hookType._name,
                _target: node,
                _transition: baseHookOptions.transition,
                _current: baseHookOptions.current,
            };
            const state = hookType._criteriaMatchPath
                ._stateHook
                ? node.state.self
                : null;
            const transitionHook = new TransitionHook(transition, state, hook, options, transition._transitionService._exceptionHandler);
            hookTuples.push({ hook, node, transitionHook });
        });
    });
    if (!hookTuples.length)
        return;
    hookTuples.sort(hookType._reverseSort
        ? sortByReverseNodeDepthThenPriority
        : sortByNodeDepthThenPriority);
    hookTuples.forEach((tuple) => hooks.push(tuple.transitionHook));
}
/**
 * Sorts hooks first by state depth, then by explicit hook priority.
 */
function compareHookTupleDepth(left, right, factor) {
    const depthDelta = ((left.node.state.path || []).length -
        (right.node.state.path || []).length) *
        factor;
    return depthDelta !== 0
        ? depthDelta
        : right.hook._priority - left.hook._priority;
}
function sortByNodeDepthThenPriority(left, right) {
    return compareHookTupleDepth(left, right, 1);
}
function sortByReverseNodeDepthThenPriority(left, right) {
    return compareHookTupleDepth(left, right, -1);
}

export { buildHooksForPhase };
