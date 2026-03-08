import type { TransitionService } from "../transition/interface.ts";
/**
 * Registers support for state-level `redirectTo` declarations and converts
 * their results into target states.
 */
export declare const registerRedirectToHook: (
  transitionService: TransitionService,
  stateService: ng.StateService,
) => import("../transition/interface.ts").DeregisterFn;
