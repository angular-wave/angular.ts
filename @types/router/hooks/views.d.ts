import type { TransitionService } from "../transition/interface.ts";
/**
 * Registers the entering-view load hook.
 */
export declare const registerLoadEnteringViews: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
/**
 * Registers the hook that swaps active view configs after a successful transition.
 */
export declare const registerActivateViews: (
  transitionService: TransitionService,
  viewService: ng.ViewService,
) => import("../transition/interface.ts").DeregisterFn;
