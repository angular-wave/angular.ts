import type { TransitionService } from "../transition/interface.ts";
/**
 * Registers state `onExit` callbacks.
 */
export declare const registerOnExitHook: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
/**
 * Registers state `onRetain` callbacks.
 */
export declare const registerOnRetainHook: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
/**
 * Registers state `onEnter` callbacks.
 */
export declare const registerOnEnterHook: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
