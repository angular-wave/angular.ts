/** @typedef  {import("../transition/interface.js").TreeChanges} TreeChanges */
export const RESOLVE_HOOK_PRIORITY: 1000;
export function registerEagerResolvePath(
  transitionService: ng.TransitionService,
): import("../transition/interface.js").DeregisterFn;
export function registerLazyResolveState(
  transitionService: ng.TransitionService,
): import("../transition/interface.js").DeregisterFn;
export function registerResolveRemaining(
  transitionService: ng.TransitionService,
): import("../transition/interface.js").DeregisterFn;
export type TreeChanges = import("../transition/interface.js").TreeChanges;
