import type { TransitionService } from "../transition/interface.ts";
/**
 * Base priority for resolve-related transition hooks.
 */
export declare const RESOLVE_HOOK_PRIORITY = 1000;
export declare const registerEagerResolvePath: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
export declare const registerLazyResolveState: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
export declare const registerResolveRemaining: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
