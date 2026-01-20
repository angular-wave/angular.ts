import { ResolveContext } from "../resolve/resolve-context.js";
import { val } from "../../shared/hof.js";

export const RESOLVE_HOOK_PRIORITY = 1000;
/**
 * A [[TransitionHookFn]] which resolves all EAGER Resolvables in the To Path
 *
 * Registered using `transitionService.onStart({}, eagerResolvePath, { priority: 1000 });`
 *
 * When a Transition starts, this hook resolves all the EAGER Resolvables, which the transition then waits for.
 *
 * See [[StateDeclaration.resolve]]
 */
const eagerResolvePath = (trans) =>
  new ResolveContext(trans.treeChanges().to)
    .resolvePath("EAGER", trans)
    .then(() => {
      /* empty */
    });

export const registerEagerResolvePath = (transitionService) =>
  transitionService.onStart({}, eagerResolvePath, {
    priority: RESOLVE_HOOK_PRIORITY,
  });
/**
 * A [[TransitionHookFn]] which resolves all LAZY Resolvables for the state (and all its ancestors) in the To Path
 *
 * Registered using `transitionService.onEnter({ entering: () => true }, lazyResolveState, { priority: 1000 });`
 *
 * When a State is being entered, this hook resolves all the Resolvables for this state, which the transition then waits for.
 *
 * See [[StateDeclaration.resolve]]
 */
const lazyResolveState = (trans, state) =>
  new ResolveContext(trans.treeChanges().to)
    .subContext(state._state())
    .resolvePath("LAZY", trans)
    .then(() => {
      /* empty */
    });

export const registerLazyResolveState = (
  /** @type {ng.TransitionService} */ transitionService,
) =>
  transitionService.onEnter({ entering: val(true) }, lazyResolveState, {
    priority: RESOLVE_HOOK_PRIORITY,
  });
/**
 * A [[TransitionHookFn]] which resolves any dynamically added (LAZY or EAGER) Resolvables.
 *
 * Registered using `transitionService.onFinish({}, eagerResolvePath, { priority: 1000 });`
 *
 * After all entering states have been entered, this hook resolves any remaining Resolvables.
 * These are typically dynamic resolves which were added by some Transition Hook using [[Transition.addResolvable]].
 *
 * See [[StateDeclaration.resolve]]
 */
const resolveRemaining = (trans) =>
  new ResolveContext(trans.treeChanges().to)
    .resolvePath("LAZY", trans)
    .then(() => {
      /* empty */
    });

export const registerResolveRemaining = (transitionService) =>
  transitionService.onFinish({}, resolveRemaining, {
    priority: RESOLVE_HOOK_PRIORITY,
  });
