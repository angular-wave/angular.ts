import { trace } from "../common/trace.ts";
import { Rejection } from "../transition/reject-factory.ts";
import type { TransitionService } from "../transition/interface.ts";
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

export const registerIgnoredTransitionHook = (
  transitionService: TransitionService,
) => transitionService.onBefore({}, ignoredHook, { priority: -9999 });
