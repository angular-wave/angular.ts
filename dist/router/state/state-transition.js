import { defaults } from '../../shared/common.js';
import { assign, isInstanceOf } from '../../shared/utils.js';
import { defaultTransOpts } from '../transition/transition-service.js';
import { Rejection, RejectType } from '../transition/reject-factory.js';
import { TargetState } from './target-state.js';

/**
 * Attaches a catch handler to silence unhandled rejection warnings,
 * while preserving the original promise.
 *
 * @internal
 */
function silenceUncaughtInPromise(promise) {
    promise.catch(() => undefined);
    return promise;
}
/**
 * Creates a rejected promise whose rejection is intentionally silenced.
 *
 * @internal
 */
function silentRejection(reason) {
    const promise = Promise.reject(reason instanceof Error ? reason : Rejection.errored(reason));
    return silenceUncaughtInPromise(promise);
}
/** @internal */
function transitionToState(stateService, to, toParams = {}, options = {}) {
    const getCurrent = () => stateService._routerState._transition;
    const transitionOptions = assign(defaults(options, defaultTransOpts), { current: getCurrent });
    const ref = stateService.target(to, toParams, transitionOptions);
    const currentPath = stateService.getCurrentPath();
    if (!ref.exists())
        return stateService._loadLazyTargetState(ref);
    if (!ref.valid())
        return silentRejection(ref.error());
    /**
     * Special handling for Ignored, Aborted, and Redirected transitions.
     *
     * The semantics for the transition.run() promise and the StateService.transitionTo()
     * promise differ. For instance, the run() promise may be rejected because it was
     * IGNORED, but the transitionTo() promise is resolved because from the user perspective
     * no error occurred. Likewise, the transition.run() promise may be rejected because of
     * a Redirect, but the transitionTo() promise is chained to the new Transition's promise.
     */
    const transition = stateService._transitionService.create(currentPath, ref);
    const transitionToPromise = runTransitionTo(stateService, transition);
    void silenceUncaughtInPromise(transitionToPromise); // issue #2676
    // Return a promise for the transition, which also has the transition object on it.
    return assign(transitionToPromise, { transition });
}
async function runTransitionTo(stateService, trans) {
    try {
        return await trans.run();
    }
    catch (error) {
        return handleTransitionRejection(stateService, trans, error);
    }
}
async function runRedirectTransition(stateService, redirect) {
    try {
        return await redirect.run();
    }
    catch (reason) {
        return handleTransitionRejection(stateService, redirect, reason);
    }
}
function handleTransitionRejection(stateService, trans, error) {
    const routerState = stateService._routerState;
    if (isInstanceOf(error, Rejection)) {
        const isLatest = routerState._lastStartedTransitionId <= trans.$id;
        if (error.type === RejectType._IGNORED) {
            if (isLatest) {
                routerState._urlRuntime._update();
            }
            // Consider ignored `Transition.run()` as a successful `transitionTo`.
            return Promise.resolve(routerState._current);
        }
        const { detail } = error;
        if (error.type === RejectType._SUPERSEDED &&
            error.redirected &&
            isInstanceOf(detail, TargetState)) {
            const redirect = trans.redirect(detail);
            return runRedirectTransition(stateService, redirect);
        }
        if (error.type === RejectType._ABORTED) {
            if (isLatest) {
                routerState._urlRuntime._update();
            }
            return Promise.reject(error);
        }
    }
    stateService.defaultErrorHandler()(error);
    return silentRejection(error);
}

export { silenceUncaughtInPromise, silentRejection, transitionToState };
