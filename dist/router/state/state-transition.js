import { defaults } from '../../shared/common.js';
import { isString, isObject, assign, isInstanceOf } from '../../shared/utils.js';
import { isInjectable } from '../../core/di/injectable.js';
import { defaultTransOpts } from '../transition/transition-service.js';
import { createTransitionPolicyInvocationLocals, createTransitionErrorPolicyInvocationLocals } from '../invocation-context.js';
import { Rejection, RejectType } from '../transition/reject-factory.js';
import { TargetState } from './target-state.js';

function isRedirectToObject(value) {
    return (isObject(value) &&
        (Object.hasOwn(value, "state") || Object.hasOwn(value, "params")));
}
function normalizeRetryPolicy(value) {
    if (value === true)
        return 2;
    if (value === false)
        return 0;
    if (!Number.isFinite(value) || value < 1)
        return 0;
    return Math.trunc(value);
}
function toRetryContext(transition, policyState, attempt, error) {
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
function toErrorContext(transition, policyState, error) {
    return {
        operation: "error",
        transition,
        from: transition.from(),
        to: transition.to(),
        state: policyState,
        error,
    };
}
function getTransitionFallback(transition) {
    const path = transition._treeChanges.to;
    let effective = transition._routerState._fallbackTo !== undefined
        ? {
            state: transition.to(),
            target: transition._routerState._fallbackTo,
        }
        : undefined;
    for (let i = 0; i < path.length; i++) {
        const state = path[i].state.self;
        const target = state.policy?.transition?.fallbackTo;
        if (target !== undefined) {
            effective = {
                state,
                target,
            };
        }
    }
    return effective;
}
function buildFallbackTarget(stateService, transition, target) {
    if (isString(target)) {
        return stateService.target(target, transition.params(), transition._options);
    }
    if (isFallbackTarget(target)) {
        return stateService.target(target.state ?? transition.to().name, target.params ?? transition.params(), transition._options);
    }
    return undefined;
}
function buildErrorBoundaryTarget(stateService, transition, policyState, policy, error) {
    if (isString(policy)) {
        return Promise.resolve(buildFallbackTarget(stateService, transition, policy));
    }
    if (isRedirectToObject(policy)) {
        const targetState = policy.state ?? transition.to().name;
        const targetParams = policy.params ?? transition.params();
        return Promise.resolve(buildFallbackTarget(stateService, transition, {
            state: targetState,
            params: targetParams,
        }));
    }
    if (isInstanceOf(policy, TargetState)) {
        return Promise.resolve(policy);
    }
    if (!isInjectable(policy)) {
        return Promise.resolve(undefined);
    }
    const context = toErrorContext(transition, policyState, error);
    const value = stateService._routerState._injector?.invoke(policy, undefined, createTransitionErrorPolicyInvocationLocals(context), "route error boundary policy");
    return Promise.resolve(value).then((result) => {
        if (isInstanceOf(result, TargetState)) {
            return result;
        }
        if (isString(result)) {
            return stateService.target(result, transition.params(), transition._options);
        }
        if (isRedirectToObject(result)) {
            const targetState = result.state ?? transition.to().name;
            const targetParams = result.params ?? transition.params();
            return stateService.target(targetState, targetParams, transition._options);
        }
        throw new Error("Route error boundary policy must return TargetState, redirect target, or undefined.");
    });
}
function isFallbackTarget(target) {
    return isObject(target) && ("state" in target || "params" in target);
}
function getTransitionErrorBoundaryPolicy(transition) {
    const path = transition._treeChanges.to;
    const routerPolicy = transition._routerState._error ?? transition._routerState._errorBoundary;
    let effective = routerPolicy !== undefined
        ? {
            state: transition.to(),
            policy: routerPolicy,
        }
        : undefined;
    for (let i = 0; i < path.length; i++) {
        const state = path[i].state.self;
        const policy = state.policy?.transition?.error ??
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
async function runFallbackTransition(stateService, trans, error) {
    if (isInstanceOf(error, Rejection) && error.type !== RejectType._ERROR) {
        return undefined;
    }
    const fallback = getTransitionFallback(trans);
    if (!fallback) {
        return undefined;
    }
    const fallbackTarget = buildFallbackTarget(stateService, trans, fallback.target);
    if (!fallbackTarget?.valid()) {
        stateService._recordPolicyDiagnostic({
            _kind: "fallback",
            _decision: "skipped",
            _from: trans.from().name,
            _to: trans.to().name,
            _policyState: fallback.state.name,
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
            _policyState: fallback.state.name,
            _target: fallbackTarget.name(),
            _reason: "same-target",
        });
        return undefined;
    }
    stateService._recordPolicyDiagnostic({
        _kind: "fallback",
        _decision: "redirected",
        _from: trans.from().name,
        _to: trans.to().name,
        _policyState: fallback.state.name,
        _target: fallbackTarget.name(),
    });
    const redirected = trans.redirect(fallbackTarget);
    return runRedirectTransition(stateService, redirected);
}
async function runErrorBoundaryTransition(stateService, trans, error) {
    if (isInstanceOf(error, Rejection) && error.type !== RejectType._ERROR) {
        return undefined;
    }
    const errorBoundaryPolicy = getTransitionErrorBoundaryPolicy(trans);
    if (!errorBoundaryPolicy) {
        return undefined;
    }
    const boundaryTarget = await buildErrorBoundaryTarget(stateService, trans, errorBoundaryPolicy.state, errorBoundaryPolicy.policy, error);
    if (!boundaryTarget?.valid()) {
        return undefined;
    }
    if (boundaryTarget.name() === trans.to().name) {
        return undefined;
    }
    const redirected = trans.redirect(boundaryTarget);
    return runRedirectTransition(stateService, redirected);
}
function getTransitionRetryPolicy(transition) {
    const path = transition._treeChanges.to;
    let effective = transition._routerState._retry !== undefined
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
function getTransitionRetryPolicyFromStateName(stateProvider, stateName) {
    if (!stateName)
        return undefined;
    const stateNameString = isString(stateName)
        ? stateName
        : isObject(stateName) && isString(stateName.name)
            ? stateName.name
            : "";
    if (!stateNameString)
        return undefined;
    const tokens = stateNameString.split(".");
    for (let i = tokens.length; i > 0; i--) {
        const candidateName = tokens.slice(0, i).join(".");
        const state = stateProvider._stateRegistry.get(candidateName);
        if (!state)
            continue;
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
async function shouldRetryTransition(stateService, transition, retryPolicy, attempt, error) {
    let decision = retryPolicy.policy;
    if (typeof decision !== "boolean" && typeof decision !== "number") {
        if (isInjectable(retryPolicy.policy)) {
            const context = toRetryContext(transition, retryPolicy.state, attempt, error);
            const result = stateService._routerState._injector?.invoke(retryPolicy.policy, undefined, createTransitionPolicyInvocationLocals(context), "route retry policy");
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
function silenceUncaughtInPromise(promise) {
    promise.catch(() => undefined);
    return promise;
}
/**
 * Creates a rejected promise whose rejection is intentionally silenced.
 */
async function silentRejection(reason) {
    const promise = Promise.reject(reason instanceof Error ? reason : Rejection.errored(reason));
    return silenceUncaughtInPromise(promise);
}
/** @internal */
function transitionToState(stateService, to, toParams = {}, options = {}) {
    const getCurrent = () => stateService._routerState._transition;
    const transitionOptions = assign(defaults(options, defaultTransOpts), { current: getCurrent });
    const ref = stateService.target(to, toParams, transitionOptions);
    const currentPath = stateService.getCurrentPath();
    if (!ref.exists()) {
        return stateService._loadLazyTargetState(ref);
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
async function runTransitionTo(stateService, trans) {
    const resumeFromLoading = (transitionToResume) => {
        const loadingFor = transitionToResume._options._loadingFor;
        if (!loadingFor)
            return undefined;
        const resumeOptions = {
            ...loadingFor.options,
            _loadingFor: undefined,
            _skipLoadingPolicy: true,
        };
        const resumeTarget = stateService.target(loadingFor.identifier, loadingFor.params, resumeOptions);
        const resumeTransition = stateService._transitionService.create(stateService.getCurrentPath(), resumeTarget);
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
        }
        catch (error) {
            const retryPolicy = getTransitionRetryPolicy(transition);
            if (!retryPolicy ||
                !isInstanceOf(error, Rejection) ||
                error.type !== RejectType._ERROR ||
                stateService._routerState._lastStartedTransition !== transition) {
                const errorBoundaryTransition = await runErrorBoundaryTransition(stateService, transition, error);
                if (errorBoundaryTransition) {
                    return errorBoundaryTransition;
                }
                const fallbackTransition = await runFallbackTransition(stateService, transition, error);
                if (fallbackTransition) {
                    return fallbackTransition;
                }
                return handleTransitionRejection(stateService, transition, error);
            }
            let isRetryAllowed;
            try {
                isRetryAllowed = await shouldRetryTransition(stateService, transition, retryPolicy, attempt, error);
            }
            catch (retryPolicyError) {
                return handleTransitionRejection(stateService, transition, retryPolicyError);
            }
            if (!isRetryAllowed) {
                const errorBoundaryTransition = await runErrorBoundaryTransition(stateService, transition, error);
                if (errorBoundaryTransition) {
                    return errorBoundaryTransition;
                }
                const fallbackTransition = await runFallbackTransition(stateService, transition, error);
                if (fallbackTransition) {
                    return fallbackTransition;
                }
                return handleTransitionRejection(stateService, transition, error);
            }
            attempt += 1;
            transition = stateService._transitionService.create(stateService.getCurrentPath(), transition._targetState);
        }
    }
}
async function runRedirectTransition(stateService, redirect) {
    return runTransitionTo(stateService, redirect);
}
async function handleTransitionRejection(stateService, trans, error) {
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
    stateService._defaultErrorHandler(error);
    return silentRejection(error);
}

export { getTransitionRetryPolicy, getTransitionRetryPolicyFromStateName, silenceUncaughtInPromise, silentRejection, transitionToState };
