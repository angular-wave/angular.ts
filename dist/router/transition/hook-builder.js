import { assign, isArray } from '../../shared/utils.js';
import { TransitionHookScope, TransitionHook, TransitionHookPhase } from './transition-hook.js';

/**
 * Builds runnable `TransitionHook` instances for a transition phase.
 */
/** @internal */
class HookBuilder {
    constructor(transition) {
        this.transition = transition;
    }
    buildHooksForPhase(phase) {
        const eventTypes = this.transition._transitionService._getEvents(phase);
        const hooks = [];
        for (let i = 0; i < eventTypes.length; i++) {
            const builtHooks = this.buildHooks(eventTypes[i]);
            for (let j = 0; j < builtHooks.length; j++) {
                if (builtHooks[j])
                    hooks.push(builtHooks[j]);
            }
        }
        return hooks;
    }
    buildHooks(hookType) {
        const { transition } = this;
        const treeChanges = transition.treeChanges();
        const matchingHooks = this.getMatchingHooks(hookType, treeChanges, transition);
        if (!matchingHooks.length)
            return [];
        const baseHookOptions = {
            transition,
            current: () => transition.options().current?.() || undefined,
        };
        const hookTuples = [];
        for (let i = 0; i < matchingHooks.length; i++) {
            const { hook, matches } = matchingHooks[i];
            const matchingNodes = matches[hookType._criteriaMatchPath.name];
            for (let j = 0; j < matchingNodes.length; j++) {
                const node = matchingNodes[j];
                const options = assign({
                    bind: hook.bind,
                    hookType: hookType.name,
                    target: node,
                }, baseHookOptions);
                const state = hookType._criteriaMatchPath.scope === TransitionHookScope._STATE
                    ? node.state.self
                    : null;
                const transitionHook = new TransitionHook(transition, state, hook, options, this.transition._transitionService._exceptionHandler);
                hookTuples.push({ hook, node, transitionHook });
            }
        }
        hookTuples.sort(hookType.reverseSort
            ? sortByReverseNodeDepthThenPriority
            : sortByNodeDepthThenPriority);
        const hooks = [];
        for (let i = 0; i < hookTuples.length; i++) {
            hooks.push(hookTuples[i].transitionHook);
        }
        return hooks;
    }
    getMatchingHooks(hookType, treeChanges, transition) {
        const isCreate = hookType.hookPhase === TransitionHookPhase._CREATE;
        const $transitions = this.transition._transitionService;
        const registries = isCreate
            ? [$transitions]
            : [this.transition, $transitions];
        const matchingHooks = [];
        for (let i = 0; i < registries.length; i++) {
            const hooks = registries[i].getHooks(hookType.name);
            if (!isArray(hooks)) {
                throw new Error(`broken event named: ${hookType.name}`);
            }
            for (let j = 0; j < hooks.length; j++) {
                const hook = hooks[j];
                const matches = hook.matches(treeChanges, transition);
                if (matches) {
                    matchingHooks.push({ hook, matches });
                }
            }
        }
        return matchingHooks;
    }
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
        : right.hook.priority - left.hook.priority;
}
function sortByNodeDepthThenPriority(left, right) {
    return compareHookTupleDepth(left, right, 1);
}
function sortByReverseNodeDepthThenPriority(left, right) {
    return compareHookTupleDepth(left, right, -1);
}

export { HookBuilder };
