import type { TransitionService } from "../transition/interface.ts";
export declare const registerLoadEnteringViews: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
export declare const registerActivateViews: (
  transitionService: TransitionService,
  viewService: ng.ViewService,
) => import("../transition/interface.ts").DeregisterFn;
