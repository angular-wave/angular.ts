import { Transition } from "../transition/transition.ts";
import type { TransitionService } from "../transition/interface.ts";
/**
 * Adds built-in transition-scoped resolvables such as `$transition$`,
 * `$stateParams`, and `$state$` before the transition starts.
 */
export declare function registerAddCoreResolvables(
  transitionService: TransitionService,
): import("../transition/interface.ts").DeregisterFn;
/**
 * Clears transition object references from cached resolvables once a transition
 * falls out of router history, preventing stale retention.
 */
export declare function treeChangesCleanup(trans: Transition): void;
