/** @typedef  {import("../transition/interface.ts").TreeChanges} TreeChanges */
export const RESOLVE_HOOK_PRIORITY: 1000;
export function registerEagerResolvePath(
  transitionService: ng.TransitionService,
): import("../transition/interface.ts").DeregisterFn;
export function registerLazyResolveState(
  transitionService: ng.TransitionService,
): import("../transition/interface.ts").DeregisterFn;
export function registerResolveRemaining(
  transitionService: ng.TransitionService,
): import("../transition/interface.ts").DeregisterFn;
export type TreeChanges = import("../transition/interface.ts").TreeChanges;
