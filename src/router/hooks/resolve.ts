import { val } from "../../shared/hof.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import type { TransitionService } from "../transition/transition-service.ts";
import type { Transition, TreeChanges } from "../transition/transition.ts";
import type { StateDeclaration } from "../state/interface.ts";

/**
 * Base priority for resolve-related transition hooks.
 */
export const RESOLVE_HOOK_PRIORITY = 1000;

const eagerResolvePath = (trans: Transition) =>
  new ResolveContext(
    (trans.treeChanges() as TreeChanges).to,
    trans._globals._injector,
  )
    .resolvePath(true, trans)
    .then(() => {
      /* empty */
    });

export const registerEagerResolvePath = (
  transitionService: TransitionService,
) =>
  transitionService.onStart({}, eagerResolvePath, {
    priority: RESOLVE_HOOK_PRIORITY,
  });

/**
 * Resolves the entering state's lazy resolvables at `onEnter`.
 */
const lazyResolveState = (trans: Transition, state: StateDeclaration) =>
  new ResolveContext(
    (trans.treeChanges() as TreeChanges).to,
    trans._globals._injector,
  )
    .subContext((state._state as Function)())
    .resolvePath(false, trans)
    .then(() => {
      /* empty */
    });

export const registerLazyResolveState = (
  transitionService: TransitionService,
) =>
  transitionService.onEnter({ entering: val(true) }, lazyResolveState, {
    priority: RESOLVE_HOOK_PRIORITY,
  });

/**
 * Resolves any remaining lazy resolvables before the transition finishes.
 */
const resolveRemaining = (trans: Transition) =>
  new ResolveContext(
    (trans.treeChanges() as TreeChanges).to,
    trans._globals._injector,
  )
    .resolvePath(false, trans)
    .then(() => {
      /* empty */
    });

export const registerResolveRemaining = (
  transitionService: TransitionService,
) =>
  transitionService.onFinish({}, resolveRemaining, {
    priority: RESOLVE_HOOK_PRIORITY,
  });
