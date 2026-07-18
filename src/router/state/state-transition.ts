import { defaults } from "../../shared/common.ts";
import {
  assign,
  isInstanceOf,
  isObject,
  isFunction,
  isString,
} from "../../shared/utils.ts";
import { defaultTransOpts } from "../transition/transition-service.ts";
import {
  createTransitionErrorPolicyInvocationLocals,
  createTransitionPolicyInvocationLocals,
} from "../invocation-context.ts";
import { RejectType, Rejection } from "../transition/reject-factory.ts";
import { TargetState } from "./target-state.ts";
import type { RawParams } from "../params/interface.ts";
import type { Transition } from "../transition/transition.ts";
import type {
  InternalTransitionOptions,
  TransitionOptions,
} from "../transition/interface.ts";
import type {
  StateDeclaration,
  StateOrName,
  StateTransitionFallbackPolicy,
  StateTransitionErrorPolicyContext,
  StateErrorBoundaryPolicy,
  StateTransitionResult,
  TransitionPromise,
  StateTransitionRetryPolicyContext,
  StateRetryPolicy,
} from "./interface.ts";
import type { StateRuntime } from "./state-service.ts";

interface EffectiveTransitionFallbackPolicy {
  state: StateDeclaration;
  policy: StateTransitionFallbackPolicy;
}

interface EffectiveTransitionErrorBoundaryPolicy {
  state: StateDeclaration;
  policy: RedirectToBoundaryPolicy;
}

type RedirectToObject = {
  state?: string;
  params?: RawParams;
};

type RedirectToBoundaryPolicy =
  | StateErrorBoundaryPolicy
  | RedirectToObject
  | TargetState
  | string
  | undefined;

function isRedirectToObject(value: unknown): value is RedirectToObject {
  return (
    isObject(value) &&
    (Object.hasOwn(value, "state") || Object.hasOwn(value, "params"))
  );
}

interface StateTransitionFallbackTarget {
  state?: string;
  params?: RawParams;
}

interface EffectiveTransitionRetryPolicy {
  state: StateDeclaration;
  policy: boolean | number | StateRetryPolicy;
}

function normalizeRetryPolicy(value: boolean | number): number | undefined {
  if (value === true) return 2;
  if (value === false) return 0;

  if (!Number.isFinite(value) || value < 1) return 0;

  return Math.trunc(value);
}

function toRetryContext(
  transition: Transition,
  policyState: StateDeclaration,
  attempt: number,
  error: unknown,
): StateTransitionRetryPolicyContext {
  return {
    operation: "retry",
    attempt,
    transition,
    from: transition.from(),
    to: transition.to(),
    state: policyState,
    error,
  };
}

function toErrorContext(
  transition: Transition,
  policyState: StateDeclaration,
  error: unknown,
): StateTransitionErrorPolicyContext {
  return {
    operation: "error",
    transition,
    from: transition.from(),
    to: transition.to(),
    state: policyState,
    error,
  };
}

function getTransitionFallbackPolicy(
  transition: Transition,
): EffectiveTransitionFallbackPolicy | undefined {
  const path = transition._treeChanges.to;

  let effective: EffectiveTransitionFallbackPolicy | undefined =
    transition._routerState._fallbackTo !== undefined
      ? {
          state: transition.to(),
          policy: transition._routerState._fallbackTo,
        }
      : undefined;

  for (let i = 0; i < path.length; i++) {
    const state = path[i].state.self;
    const policy = state.policy?.transition?.fallbackTo;

    if (policy !== undefined) {
      effective = {
        state,
        policy,
      };
    }
  }

  return effective;
}

function buildFallbackTarget(
  stateService: StateRuntime,
  transition: Transition,
  policy: StateTransitionFallbackPolicy,
): TargetState | undefined {
  if (isString(policy)) {
    return stateService.target(
      policy,
      transition.params(),
      transition._options,
    );
  }

  if (isFallbackPolicy(policy)) {
    return stateService.target(
      policy.state ?? transition.to().name,
      policy.params ?? transition.params(),
      transition._options,
    );
  }

  return undefined;
}

function buildErrorBoundaryTarget(
  stateService: StateRuntime,
  transition: Transition,
  policyState: StateDeclaration,
  policy: RedirectToBoundaryPolicy,
  error: unknown,
): Promise<TargetState | undefined> {
  if (isString(policy)) {
    return Promise.resolve(
      buildFallbackTarget(stateService, transition, policy),
    );
  }

  if (isRedirectToObject(policy)) {
    const targetState = policy.state ?? transition.to().name;
    const targetParams = policy.params ?? transition.params();

    return Promise.resolve(
      buildFallbackTarget(stateService, transition, {
        state: targetState,
        params: targetParams,
      }),
    );
  }

  if (isInstanceOf(policy, TargetState)) {
    return Promise.resolve(policy);
  }

  if (!isFunction(policy)) {
    return Promise.resolve(undefined);
  }

  const context = toErrorContext(transition, policyState, error);
  const value = stateService._routerState._injector?.invoke(
    policy,
    undefined,
    createTransitionErrorPolicyInvocationLocals(context),
    "route error boundary policy",
  );

  return Promise.resolve(value).then((result: unknown) => {
    if (isInstanceOf(result, TargetState)) {
      return result;
    }

    if (isString(result)) {
      return stateService.target(
        result,
        transition.params(),
        transition._options,
      );
    }

    if (isRedirectToObject(result)) {
      const targetState = result.state ?? transition.to().name;
      const targetParams = result.params ?? transition.params();

      return stateService.target(
        targetState,
        targetParams,
        transition._options,
      );
    }

    throw new Error(
      "Route error boundary policy must return TargetState, redirect target, or undefined.",
    );
  });
}

function isFallbackPolicy(
  policy: StateTransitionFallbackPolicy,
): policy is StateTransitionFallbackTarget {
  return isObject(policy) && ("state" in policy || "params" in policy);
}

function getTransitionErrorBoundaryPolicy(
  transition: Transition,
): EffectiveTransitionErrorBoundaryPolicy | undefined {
  const path = transition._treeChanges.to;

  const routerPolicy =
    transition._routerState._error ?? transition._routerState._errorBoundary;

  let effective: EffectiveTransitionErrorBoundaryPolicy | undefined =
    routerPolicy !== undefined
      ? {
          state: transition.to(),
          policy: routerPolicy,
        }
      : undefined;

  for (let i = 0; i < path.length; i++) {
    const state = path[i].state.self;
    const policy =
      state.policy?.transition?.error ??
      state.policy?.transition?.errorBoundary;

    if (policy !== undefined) {
      effective = {
        state,
        policy,
      };
    }
  }

  return effective;
}

async function runFallbackTransition(
  stateService: StateRuntime,
  trans: Transition,
  error: unknown,
): Promise<StateTransitionResult | undefined> {
  if (isInstanceOf(error, Rejection) && error.type !== RejectType._ERROR) {
    return undefined;
  }

  const fallbackPolicy = getTransitionFallbackPolicy(trans);

  if (!fallbackPolicy) {
    return undefined;
  }

  const fallbackTarget = buildFallbackTarget(
    stateService,
    trans,
    fallbackPolicy.policy,
  );

  if (!fallbackTarget?.valid()) {
    stateService._recordPolicyDiagnostic({
      _kind: "fallback",
      _decision: "skipped",
      _from: trans.from().name,
      _to: trans.to().name,
      _policyState: fallbackPolicy.state.name,
      _reason: "invalid-target",
    });

    return undefined;
  }

  if (fallbackTarget.name() === trans.to().name) {
    stateService._recordPolicyDiagnostic({
      _kind: "fallback",
      _decision: "skipped",
      _from: trans.from().name,
      _to: trans.to().name,
      _policyState: fallbackPolicy.state.name,
      _target: fallbackTarget.name() as string,
      _reason: "same-target",
    });

    return undefined;
  }

  stateService._recordPolicyDiagnostic({
    _kind: "fallback",
    _decision: "redirected",
    _from: trans.from().name,
    _to: trans.to().name,
    _policyState: fallbackPolicy.state.name,
    _target: fallbackTarget.name() as string,
  });

  const redirected = trans.redirect(fallbackTarget);

  return runRedirectTransition(stateService, redirected);
}

async function runErrorBoundaryTransition(
  stateService: StateRuntime,
  trans: Transition,
  error: unknown,
): Promise<StateTransitionResult | undefined> {
  if (isInstanceOf(error, Rejection) && error.type !== RejectType._ERROR) {
    return undefined;
  }

  const errorBoundaryPolicy = getTransitionErrorBoundaryPolicy(trans);

  if (!errorBoundaryPolicy) {
    return undefined;
  }

  const boundaryTarget = await buildErrorBoundaryTarget(
    stateService,
    trans,
    errorBoundaryPolicy.state,
    errorBoundaryPolicy.policy,
    error,
  );

  if (!boundaryTarget?.valid()) {
    return undefined;
  }

  if (boundaryTarget.name() === trans.to().name) {
    return undefined;
  }

  const redirected = trans.redirect(boundaryTarget);

  return runRedirectTransition(stateService, redirected);
}

export function getTransitionRetryPolicy(
  transition: Transition,
): EffectiveTransitionRetryPolicy | undefined {
  const path = transition._treeChanges.to;

  let effective: EffectiveTransitionRetryPolicy | undefined =
    transition._routerState._retry !== undefined
      ? {
          state: transition.to(),
          policy: transition._routerState._retry,
        }
      : undefined;

  for (let i = 0; i < path.length; i++) {
    const state = path[i].state.self;
    const policy = state.policy?.transition?.retry;

    if (policy !== undefined) {
      effective = {
        state,
        policy,
      };
    }
  }

  return effective;
}

export function getTransitionRetryPolicyFromStateName(
  stateProvider: StateRuntime,
  stateName: StateOrName,
): EffectiveTransitionRetryPolicy | undefined {
  if (!stateName) return undefined;

  const stateNameString = isString(stateName)
    ? stateName
    : isObject(stateName) && isString(stateName.name)
      ? stateName.name
      : "";

  if (!stateNameString) return undefined;

  const tokens = stateNameString.split(".");

  for (let i = tokens.length; i > 0; i--) {
    const candidateName = tokens.slice(0, i).join(".");
    const state = stateProvider._stateRegistry.get(candidateName);

    if (!state) continue;

    const policy = state.policy?.transition?.retry;

    if (policy !== undefined) {
      return {
        state,
        policy,
      };
    }
  }

  const routerRetryPolicy = stateProvider._routerState._retry;

  if (routerRetryPolicy !== undefined) {
    return {
      state: stateProvider._stateRegistry._root.self,
      policy: routerRetryPolicy,
    };
  }

  return undefined;
}

async function shouldRetryTransition(
  stateService: StateRuntime,
  transition: Transition,
  retryPolicy: EffectiveTransitionRetryPolicy,
  attempt: number,
  error: unknown,
): Promise<boolean> {
  let decision: unknown = retryPolicy.policy;

  if (typeof decision !== "boolean" && typeof decision !== "number") {
    if (isFunction(retryPolicy.policy)) {
      const context = toRetryContext(
        transition,
        retryPolicy.state,
        attempt,
        error,
      );
      const result = stateService._routerState._injector?.invoke(
        retryPolicy.policy,
        undefined,
        createTransitionPolicyInvocationLocals(context),
        "route retry policy",
      );

      decision = await Promise.resolve(result);
    }
  }

  if (typeof decision !== "boolean" && typeof decision !== "number") {
    throw new Error("Route retry policy must return boolean or number.");
  }

  const maxAttempts = normalizeRetryPolicy(decision);
  const allowed = !!maxAttempts && attempt < maxAttempts;

  stateService._recordPolicyDiagnostic({
    _kind: "retry",
    _decision: allowed ? "retry" : "blocked",
    _from: transition.from().name,
    _to: transition.to().name,
    _policyState: retryPolicy.state.name,
    _attempt: attempt,
  });

  return allowed;
}

/**
 * Attaches a catch handler to silence unhandled rejection warnings,
 * while preserving the original promise.
 */

export function silenceUncaughtInPromise<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);

  return promise;
}

/**
 * Creates a rejected promise whose rejection is intentionally silenced.
 */
export async function silentRejection(reason: unknown): Promise<never> {
  const promise = Promise.reject(
    reason instanceof Error ? reason : Rejection.errored(reason),
  );

  return silenceUncaughtInPromise(promise);
}

/** @internal */

export function transitionToState(
  stateService: StateRuntime,
  to: StateOrName,
  toParams: RawParams = {},
  options: TransitionOptions = {},
): TransitionPromise {
  const getCurrent = () => stateService._routerState._transition;

  const transitionOptions = assign(
    defaults(options, defaultTransOpts) as InternalTransitionOptions,
    { current: getCurrent },
  ) as InternalTransitionOptions;

  const ref = stateService.target(to, toParams, transitionOptions);

  const currentPath = stateService.getCurrentPath();

  if (!ref.exists()) {
    return stateService._loadLazyTargetState(ref) as TransitionPromise;
  }

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

async function runTransitionTo(
  stateService: StateRuntime,
  trans: Transition,
): Promise<StateTransitionResult> {
  const resumeFromLoading = (
    transitionToResume: Transition,
  ): Promise<StateTransitionResult> | undefined => {
    const loadingFor = transitionToResume._options._loadingFor;

    if (!loadingFor) return undefined;

    const resumeOptions = {
      ...(loadingFor.options as Record<string, unknown>),
      _loadingFor: undefined,
      _skipLoadingPolicy: true,
    } as typeof loadingFor.options;

    const resumeTarget = stateService.target(
      loadingFor.identifier,
      loadingFor.params,
      resumeOptions,
    );

    const resumeTransition = stateService._transitionService.create(
      stateService.getCurrentPath(),
      resumeTarget,
    );

    return runTransitionTo(stateService, resumeTransition);
  };

  let attempt = 1;
  let transition = trans;

  for (;;) {
    try {
      const result = await transition.run();
      const resumed = resumeFromLoading(transition);

      if (resumed) {
        return await resumed;
      }

      return result;
    } catch (error) {
      const retryPolicy = getTransitionRetryPolicy(transition);

      if (
        !retryPolicy ||
        !isInstanceOf(error, Rejection) ||
        error.type !== RejectType._ERROR ||
        stateService._routerState._lastStartedTransition !== transition
      ) {
        const errorBoundaryTransition = await runErrorBoundaryTransition(
          stateService,
          transition,
          error,
        );

        if (errorBoundaryTransition) {
          return errorBoundaryTransition;
        }

        const fallbackTransition = await runFallbackTransition(
          stateService,
          transition,
          error,
        );

        if (fallbackTransition) {
          return fallbackTransition;
        }

        return handleTransitionRejection(stateService, transition, error);
      }

      let isRetryAllowed: boolean;

      try {
        isRetryAllowed = await shouldRetryTransition(
          stateService,
          transition,
          retryPolicy,
          attempt,
          error,
        );
      } catch (retryPolicyError) {
        return handleTransitionRejection(
          stateService,
          transition,
          retryPolicyError,
        );
      }

      if (!isRetryAllowed) {
        const errorBoundaryTransition = await runErrorBoundaryTransition(
          stateService,
          transition,
          error,
        );

        if (errorBoundaryTransition) {
          return errorBoundaryTransition;
        }

        const fallbackTransition = await runFallbackTransition(
          stateService,
          transition,
          error,
        );

        if (fallbackTransition) {
          return fallbackTransition;
        }

        return handleTransitionRejection(stateService, transition, error);
      }

      attempt += 1;
      transition = stateService._transitionService.create(
        stateService.getCurrentPath(),
        transition._targetState,
      );
    }
  }
}

async function runRedirectTransition(
  stateService: StateRuntime,
  redirect: Transition,
): Promise<StateTransitionResult> {
  return runTransitionTo(stateService, redirect);
}

async function handleTransitionRejection(
  stateService: StateRuntime,
  trans: Transition,
  error: unknown,
): Promise<StateTransitionResult> {
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

    if (
      error.type === RejectType._SUPERSEDED &&
      error.redirected &&
      isInstanceOf(detail, TargetState)
    ) {
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

  stateService._defaultErrorHandler(error);

  return silentRejection(error);
}
