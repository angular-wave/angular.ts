import { Rejection } from '../transition/reject-factory.js';

function ignoredHook(trans) {
    const ignoredReason = trans._ignoredReason();
    if (!ignoredReason)
        return undefined;
    const pending = trans._routerState._transition;
    if (ignoredReason === "SameAsCurrent" && pending) {
        pending.abort();
    }
    return Rejection.ignored()._toPromise();
}
/**
 * Short-circuits transitions that the router determines are ignorable,
 * such as no-op transitions to the current or pending state.
 */
const registerIgnoredTransitionHook = (transitionService) => transitionService.onBefore({}, ignoredHook, { priority: -9999 });

export { registerIgnoredTransitionHook };
