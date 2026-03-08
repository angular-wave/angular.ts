import type { TransitionService } from "../transition/interface.ts";
import type { Transition } from "../transition/transition.ts";

function invalidTransitionHook(trans: Transition): void {
  if (!trans.valid()) {
    throw new Error(trans.error()?.toString());
  }
}

export const registerInvalidTransitionHook = (
  transitionService: TransitionService,
) =>
  transitionService.onBefore({}, invalidTransitionHook, { priority: -10000 });
