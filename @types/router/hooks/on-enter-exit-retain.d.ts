import type { TransitionService } from "../transition/interface.ts";
export declare const registerOnExitHook: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
export declare const registerOnRetainHook: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
export declare const registerOnEnterHook: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
