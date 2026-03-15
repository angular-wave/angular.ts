import { trace } from "../common/trace.ts";
import { Rejection } from "../transition/reject-factory.ts";
import type { TransitionService } from "../transition/transition-service.ts";
import type { Transition } from "../transition/transition.ts";

function ignoredHook(trans: Transition) {
  const ignoredReason = trans._ignoredReason();

  if (!ignoredReason) return undefined;
  trace.traceTransitionIgnored(trans);
  const pending = trans._globals.transition;

  if (ignoredReason === "SameAsCurrent" && pending) {
    pending.abort();
  }

  return Rejection.ignored().toPromise();
}

/**
 * Short-circuits transitions that the router determines are ignorable,
 * such as no-op transitions to the current or pending state.
 */
export const registerIgnoredTransitionHook = (
  transitionService: TransitionService,
) => transitionService.onBefore({}, ignoredHook, { priority: -9999 });
