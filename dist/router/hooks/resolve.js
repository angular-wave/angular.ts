import { ResolveContext } from '../resolve/resolve-context.js';

/**
 * Base priority for resolve-related transition hooks.
 */
const RESOLVE_HOOK_PRIORITY = 1000;
const eagerResolvePath = (trans) => new ResolveContext(trans.treeChanges().to, trans._routerState._injector)
    .resolvePath(true, trans)
    .then(() => {
    /* empty */
});
const registerEagerResolvePath = (transitionService) => transitionService.onStart({}, eagerResolvePath, {
    priority: RESOLVE_HOOK_PRIORITY,
});
/**
 * Resolves the entering state's lazy resolvables at `onEnter`.
 */
const lazyResolveState = (trans, state) => new ResolveContext(trans.treeChanges().to, trans._routerState._injector)
    .subContext(state._state())
    .resolvePath(false, trans)
    .then(() => {
    /* empty */
});
function matchEnteringState() {
    return true;
}
const registerLazyResolveState = (transitionService) => transitionService.onEnter({ entering: matchEnteringState }, lazyResolveState, {
    priority: RESOLVE_HOOK_PRIORITY,
});
/**
 * Resolves any remaining lazy resolvables before the transition finishes.
 */
const resolveRemaining = (trans) => new ResolveContext(trans.treeChanges().to, trans._routerState._injector)
    .resolvePath(false, trans)
    .then(() => {
    /* empty */
});
const registerResolveRemaining = (transitionService) => transitionService.onFinish({}, resolveRemaining, {
    priority: RESOLVE_HOOK_PRIORITY,
});

export { RESOLVE_HOOK_PRIORITY, registerEagerResolvePath, registerLazyResolveState, registerResolveRemaining };
