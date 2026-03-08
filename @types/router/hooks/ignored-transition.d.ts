import type { TransitionService } from "../transition/interface.ts";
/**
 * Short-circuits transitions that the router determines are ignorable,
 * such as no-op transitions to the current or pending state.
 */
export declare const registerIgnoredTransitionHook: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
