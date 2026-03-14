import type { TransitionService } from "../transition/transition-service.ts";
import type { Transition } from "../transition/transition.js";

function invalidTransitionHook(trans: Transition): void {
  if (!trans.valid()) {
    throw new Error(trans.error()?.toString());
  }
}

/**
 * Fails transitions that are already known to be invalid before any work runs.
 * This keeps invalid targets from progressing into the rest of the hook pipeline.
 */
export const registerInvalidTransitionHook = (
  transitionService: TransitionService,
) =>
  transitionService.onBefore({}, invalidTransitionHook, { priority: -10000 });
