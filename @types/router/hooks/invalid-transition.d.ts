import type { TransitionService } from "../transition/interface.ts";
/**
 * Fails transitions that are already known to be invalid before any work runs.
 * This keeps invalid targets from progressing into the rest of the hook pipeline.
 */
export declare const registerInvalidTransitionHook: (
  transitionService: TransitionService,
) => import("../transition/interface.ts").DeregisterFn;
