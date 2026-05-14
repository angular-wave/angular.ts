import { TransitionHookPhase, TransitionHook } from './transition-hook.js';
import { Rejection } from './reject-factory.js';

function resolvedPromise() {
    return Promise.resolve();
}
/**
 * Executes a transition and owns the terminal success/error bookkeeping.
 *
 * @internal
 */
const TransitionRunner = {
    /** @internal */
    _run(transition) {
        void TransitionRunner._execute(transition);
    },
    /** @internal */
    async _execute(transition) {
        try {
            const allBeforeHooks = transition._getHooksFor(TransitionHookPhase._BEFORE);
            await TransitionHook._invokeHooks(allBeforeHooks, transition);
            await TransitionRunner._runTransitionHooks(transition);
            TransitionRunner._transitionSuccess(transition);
        }
        catch (reason) {
            TransitionRunner._transitionError(transition, reason);
        }
    },
    /** @internal */
    _runTransitionHooks(transition) {
        // Wait to build the RUN hook chain until BEFORE hooks have completed.
        // This allows a BEFORE hook to add more RUN hooks dynamically.
        const allRunHooks = transition._getHooksFor(TransitionHookPhase._RUN);
        return TransitionHook._invokeHooks(allRunHooks, resolvedPromise);
    },
    /** @internal */
    _transitionSuccess(transition) {
        transition.success = true;
        const hooks = transition._getHooksFor(TransitionHookPhase._SUCCESS);
        void TransitionRunner._runSuccessHooks(transition, hooks);
    },
    /** @internal */
    async _runSuccessHooks(transition, hooks) {
        try {
            await TransitionHook._invokeHooks(hooks, resolvedPromise);
            transition._deferred.resolve(transition.to());
        }
        catch (reason) {
            TransitionRunner._transitionError(transition, reason);
        }
    },
    /** @internal */
    _transitionError(transition, reason) {
        const rejection = Rejection.normalize(reason);
        transition.success = false;
        transition._deferred.reject(rejection);
        transition._error = rejection;
        const hooks = transition._getHooksFor(TransitionHookPhase._ERROR);
        TransitionHook._runAllHooks(hooks);
    },
};

export { TransitionRunner };
