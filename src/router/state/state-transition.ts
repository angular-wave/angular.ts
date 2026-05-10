import { defaults } from "../../shared/common.ts";
import { assign, isInstanceOf } from "../../shared/utils.ts";
import { defaultTransOpts } from "../transition/transition-service.ts";
import { RejectType, Rejection } from "../transition/reject-factory.ts";
import { TargetState } from "./target-state.ts";
import type { RawParams } from "../params/interface.ts";
import type { Transition } from "../transition/transition.ts";
import type { TransitionOptions } from "../transition/interface.ts";
import type {
  StateOrName,
  StateTransitionResult,
  TransitionPromise,
} from "./interface.ts";
import type { StateProvider } from "./state-service.ts";

/**
 * Attaches a catch handler to silence unhandled rejection warnings,
 * while preserving the original promise.
 *
 * @internal
 */
export function silenceUncaughtInPromise<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);

  return promise;
}

/**
 * Creates a rejected promise whose rejection is intentionally silenced.
 *
 * @internal
 */
export function silentRejection<E = unknown>(error: E): Promise<never> {
  return silenceUncaughtInPromise(Promise.reject(error));
}

/** @internal */
export function transitionToState(
  stateService: StateProvider,
  to: StateOrName,
  toParams: RawParams = {},
  options: TransitionOptions = {},
): TransitionPromise | Promise<StateTransitionResult> {
  options = defaults(options, defaultTransOpts);
  const getCurrent = () => stateService._routerState._transition;

  options = assign(options, { current: getCurrent });
  const ref = stateService.target(to, toParams, options);

  const currentPath = stateService.getCurrentPath();

  if (!ref.exists()) return stateService._loadLazyTargetState(ref);

  if (!ref.valid()) return silentRejection(ref.error());

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

  silenceUncaughtInPromise(transitionToPromise); // issue #2676

  // Return a promise for the transition, which also has the transition object on it.
  return assign(transitionToPromise, { transition });
}

async function runTransitionTo(
  stateService: StateProvider,
  trans: Transition,
): Promise<StateTransitionResult> {
  try {
    return await trans.run();
  } catch (error) {
    return handleTransitionRejection(stateService, trans, error);
  }
}

async function runRedirectTransition(
  stateService: StateProvider,
  redirect: Transition,
): Promise<StateTransitionResult> {
  try {
    return await redirect.run();
  } catch (reason) {
    return handleTransitionRejection(stateService, redirect, reason);
  }
}

function handleTransitionRejection(
  stateService: StateProvider,
  trans: Transition,
  error: unknown,
): Promise<StateTransitionResult> {
  const routerState = stateService._routerState;

  if (isInstanceOf(error, Rejection)) {
    const isLatest = routerState._lastStartedTransitionId <= trans.$id;

    if (error.type === RejectType._IGNORED) {
      isLatest && routerState._urlRuntime._update();

      // Consider ignored `Transition.run()` as a successful `transitionTo`.
      return Promise.resolve(routerState._current);
    }

    const { detail } = error;

    if (
      error.type === RejectType._SUPERSEDED &&
      error.redirected &&
      isInstanceOf(detail, TargetState)
    ) {
      const redirect = trans.redirect(detail);

      return runRedirectTransition(stateService, redirect);
    }

    if (error.type === RejectType._ABORTED) {
      isLatest && routerState._urlRuntime._update();

      return Promise.reject(error);
    }
  }

  stateService.defaultErrorHandler()(error);

  return Promise.reject(error);
}
