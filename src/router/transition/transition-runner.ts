import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import { Rejection } from "./reject-factory.ts";
import type { Transition } from "./transition.ts";

function resolvedPromise(): Promise<void> {
  return Promise.resolve();
}

/**
 * Executes a transition and owns the terminal success/error bookkeeping.
 *
 * @internal
 */
export const TransitionRunner = {
  /** @internal */
  _run(transition: Transition): void {
    void TransitionRunner._execute(transition);
  },

  /** @internal */
  async _execute(transition: Transition): Promise<void> {
    try {
      const allBeforeHooks = transition._getHooksFor(
        TransitionHookPhase._BEFORE,
      );

      await TransitionHook._invokeHooks(allBeforeHooks, transition);
      await TransitionRunner._runTransitionHooks(transition);
      TransitionRunner._transitionSuccess(transition);
    } catch (reason) {
      TransitionRunner._transitionError(transition, reason);
    }
  },

  /** @internal */
  _runTransitionHooks(transition: Transition): Promise<unknown> {
    // Wait to build the RUN hook chain until BEFORE hooks have completed.
    // This allows a BEFORE hook to add more RUN hooks dynamically.
    const allRunHooks = transition._getHooksFor(TransitionHookPhase._RUN);

    return TransitionHook._invokeHooks(allRunHooks, resolvedPromise);
  },

  /** @internal */
  _transitionSuccess(transition: Transition): void {
    transition.success = true;

    const hooks = transition._getHooksFor(TransitionHookPhase._SUCCESS);

    void TransitionRunner._runSuccessHooks(transition, hooks);
  },

  /** @internal */
  async _runSuccessHooks(
    transition: Transition,
    hooks: TransitionHook[],
  ): Promise<void> {
    try {
      await TransitionHook._invokeHooks(hooks, resolvedPromise);
      transition._deferred.resolve(transition.to());
    } catch (reason) {
      TransitionRunner._transitionError(transition, reason);
    }
  },

  /** @internal */
  _transitionError(transition: Transition, reason: unknown): void {
    const rejection = Rejection.normalize(reason);

    transition.success = false;
    transition._deferred.reject(rejection);
    transition._error = rejection;

    const hooks = transition._getHooksFor(TransitionHookPhase._ERROR);

    TransitionHook._runAllHooks(hooks);
  },
};
