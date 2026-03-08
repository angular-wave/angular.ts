import type { TransitionService } from "../transition/interface.ts";
export declare const registerRedirectToHook: (
  transitionService: TransitionService,
  stateService: ng.StateService,
) => import("../transition/interface.ts").DeregisterFn;
