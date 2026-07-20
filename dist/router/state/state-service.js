import { defaults } from '../../shared/common.js';
import { isString, isObject, isInstanceOf, isDefined, assertDefined, isNullOrUndefined, isArray, createErrorFactory } from '../../shared/utils.js';
import { isInjectable } from '../../core/di/injectable.js';
import { PathNode } from '../path/path-node.js';
import { defaultTransOpts } from '../transition/transition-service.js';
import { Rejection } from '../transition/reject-factory.js';
import { TargetState } from './target-state.js';
import { createTransitionErrorPolicyInvocationLocals, createTransitionPolicyInvocationLocals } from '../invocation-context.js';
import { Param } from '../params/param.js';
import { Glob } from '../glob/glob.js';
import { getTransitionRetryPolicyFromStateName, transitionToState } from './state-transition.js';

const stateRuntimeError = createErrorFactory("$state");
function diagnosticStateName(stateOrName) {
    return isString(stateOrName) ? stateOrName : stateOrName.name;
}
/** @internal */
class StateRuntime {
    /** @internal */
    _getRegistry() {
        return this._stateRegistry;
    }
    /**
     * The latest successful state parameters
     *
     * @deprecated This is a passthrough through to [[Router.params]]
     */
    get params() {
        return this._routerState._params;
    }
    /**
     * The current [[StateDeclaration]]
     */
    get current() {
        return this._routerState._current;
    }
    /**
     * The current [[StateObject]] (an internal API)
     */
    get $current() {
        return this._routerState._currentState;
    }
    constructor(stateRegistry, routerState, transitionService, exceptionHandler) {
        this._routerState = routerState;
        this._transitionService = transitionService;
        this._stateRegistry = stateRegistry;
        this._$injector = undefined;
        this._lazyStates = [];
        this._policyDiagnostics = [];
        this._defaultErrorHandler = exceptionHandler;
    }
    /** @internal */
    _recordPolicyDiagnostic(diagnostic) {
        this._policyDiagnostics.push(diagnostic);
    }
    /** @internal */
    _initRuntime($injector, $location, $stateRegistry, $rootScope, viewService) {
        this._routerState._initRuntime($location, $injector);
        this._stateRegistry = $stateRegistry;
        this._viewService = viewService;
        this._routerState._stateService = this;
        $rootScope.$on("$locationChangeSuccess", (evt) => {
            this._routerState._sync(evt);
        });
        this._transitionService._initRuntimeHooks(this, viewService);
        this._$injector = $injector;
        this._routerState._injector = $injector;
        return this;
    }
    state(nameOrDefinition, definition) {
        const stateDefinition = normalizeStateDeclaration(nameOrDefinition, definition);
        if (!stateDefinition.name) {
            throw stateRuntimeError("stateinvalid", `'name' required`);
        }
        try {
            this._getRegistry().register(stateDefinition);
        }
        catch (err) {
            throw stateRuntimeError("stateinvalid", err.message);
        }
        return this;
    }
    /** @internal */
    _registerLazyResult(result) {
        if (!result)
            return;
        const states = isArray(result) ? result : [result];
        states.forEach((state) => {
            this.state(state);
        });
    }
    /** @internal */
    _findLazyState(target) {
        const name = target.name();
        if (!isString(name))
            return undefined;
        for (let i = 0; i < this._lazyStates.length; i++) {
            const lazy = this._lazyStates[i];
            if (name === lazy.prefix || name.startsWith(`${lazy.prefix}.`)) {
                return lazy;
            }
        }
        return undefined;
    }
    /** @internal */
    async _loadLazyTargetState(toState) {
        const routerState = this._routerState;
        const latest = routerState._lastStartedTransition;
        const retryPolicy = this._getTransitionRetryPolicyFromStateName(toState.name());
        const lazy = this._findLazyState(toState);
        if (!lazy) {
            return Rejection.invalid(toState.error())._toPromise();
        }
        let attempts = 1;
        for (;;) {
            lazy.promise ?? (lazy.promise = this._loadLazyRegistration(lazy, toState));
            try {
                await lazy.promise;
                break;
            }
            catch (error) {
                const shouldRetry = await this._shouldRetryLazyLoad(retryPolicy, attempts, error, toState.name());
                lazy.promise = undefined;
                if (!shouldRetry) {
                    const recovered = await this._recoverLazyLoadFailure(toState, error);
                    if (recovered) {
                        return recovered;
                    }
                    throw error;
                }
                attempts += 1;
            }
        }
        if (routerState._lastStartedTransition !== latest) {
            return Rejection.superseded()._toPromise();
        }
        const target = this.target(toState.identifier(), toState.params(), toState.options());
        if (!target.valid()) {
            return Rejection.invalid(target.error())._toPromise();
        }
        return this.transitionTo(target.identifier(), target.params(), target.options());
    }
    _getStatePolicyFromStateName(stateName, readPolicy) {
        const stateNameString = diagnosticStateName(stateName);
        if (stateNameString) {
            const tokens = stateNameString.split(".");
            for (let i = tokens.length; i > 0; i--) {
                const candidateName = tokens.slice(0, i).join(".");
                const state = this._stateRegistry.get(candidateName);
                if (!state)
                    continue;
                const policy = readPolicy(state);
                if (policy !== undefined) {
                    return {
                        state,
                        policy,
                    };
                }
            }
        }
        return undefined;
    }
    _getTransitionFallbackFromStateName(stateName) {
        const routeFallback = this._getStatePolicyFromStateName(stateName, (state) => state.policy?.transition?.fallbackTo);
        if (routeFallback) {
            return {
                state: routeFallback.state,
                target: routeFallback.policy,
            };
        }
        return this._routerState._fallbackTo !== undefined
            ? {
                state: this._stateRegistry._root.self,
                target: this._routerState._fallbackTo,
            }
            : undefined;
    }
    _getTransitionErrorBoundaryPolicyFromStateName(stateName) {
        const routePolicy = this._getStatePolicyFromStateName(stateName, (state) => {
            return (state.policy?.transition?.error ??
                state.policy?.transition?.errorBoundary);
        });
        if (routePolicy)
            return routePolicy;
        const routerPolicy = this._routerState._error ?? this._routerState._errorBoundary;
        return routerPolicy !== undefined
            ? {
                state: this._stateRegistry._root.self,
                policy: routerPolicy,
            }
            : undefined;
    }
    _buildLazyFallbackTarget(toState, target) {
        if (isString(target)) {
            return this.target(target, toState.params(), toState.options());
        }
        if (isObject(target) &&
            (Object.hasOwn(target, "state") || Object.hasOwn(target, "params"))) {
            const redirect = target;
            return this.target(redirect.state ?? toState.name(), redirect.params ?? toState.params(), toState.options());
        }
        return undefined;
    }
    async _buildLazyErrorBoundaryTarget(toState, policyState, policy, error) {
        if (isString(policy)) {
            return this.target(policy, toState.params(), toState.options());
        }
        if (isInstanceOf(policy, TargetState)) {
            return policy;
        }
        if (isObject(policy) &&
            (Object.hasOwn(policy, "state") || Object.hasOwn(policy, "params"))) {
            const redirect = policy;
            return this.target(redirect.state ?? toState.name(), redirect.params ?? toState.params(), toState.options());
        }
        if (!isInjectable(policy)) {
            return undefined;
        }
        const from = this._routerState._current ?? this._stateRegistry._root.self;
        const to = this._routerState._currentState?.self ?? this._stateRegistry._root.self;
        const context = {
            operation: "error",
            transition: undefined,
            from,
            to,
            state: policyState,
            error,
        };
        const result = await Promise.resolve(this._routerState._injector?.invoke(policy, undefined, createTransitionErrorPolicyInvocationLocals(context), "route error boundary policy"));
        if (isInstanceOf(result, TargetState)) {
            return result;
        }
        if (isString(result)) {
            return this.target(result, toState.params(), toState.options());
        }
        if (isObject(result) &&
            (Object.hasOwn(result, "state") || Object.hasOwn(result, "params"))) {
            const redirect = result;
            return this.target(redirect.state ?? toState.name(), redirect.params ?? toState.params(), toState.options());
        }
        if (result === undefined) {
            return undefined;
        }
        throw new Error("Route error boundary policy must return TargetState, redirect target, or undefined.");
    }
    async _recoverLazyLoadFailure(toState, error) {
        const errorPolicy = this._getTransitionErrorBoundaryPolicyFromStateName(toState.name());
        if (errorPolicy) {
            const errorTarget = await this._buildLazyErrorBoundaryTarget(toState, errorPolicy.state, errorPolicy.policy, error);
            if (errorTarget?.valid() && errorTarget.name() !== toState.name()) {
                return this.transitionTo(errorTarget.identifier(), errorTarget.params(), errorTarget.options());
            }
        }
        const fallback = this._getTransitionFallbackFromStateName(toState.name());
        if (!fallback)
            return undefined;
        const fallbackTarget = this._buildLazyFallbackTarget(toState, fallback.target);
        if (!fallbackTarget?.valid()) {
            this._recordPolicyDiagnostic({
                _kind: "fallback",
                _decision: "skipped",
                _from: this._routerState._current?.name,
                _to: toState.name(),
                _policyState: fallback.state.name,
                _reason: "invalid-target",
            });
            return undefined;
        }
        if (fallbackTarget.name() === toState.name()) {
            this._recordPolicyDiagnostic({
                _kind: "fallback",
                _decision: "skipped",
                _from: this._routerState._current?.name,
                _to: toState.name(),
                _policyState: fallback.state.name,
                _target: fallbackTarget.name(),
                _reason: "same-target",
            });
            return undefined;
        }
        this._recordPolicyDiagnostic({
            _kind: "fallback",
            _decision: "redirected",
            _from: this._routerState._current?.name,
            _to: toState.name(),
            _policyState: fallback.state.name,
            _target: fallbackTarget.name(),
        });
        return this.transitionTo(fallbackTarget.identifier(), fallbackTarget.params(), fallbackTarget.options());
    }
    _getTransitionRetryPolicyFromStateName(stateName) {
        return getTransitionRetryPolicyFromStateName(this, stateName);
    }
    async _shouldRetryLazyLoad(retryPolicy, attempt, error, targetName) {
        if (!retryPolicy)
            return false;
        let decision = retryPolicy.policy;
        if (typeof decision !== "boolean" && typeof decision !== "number") {
            if (isInjectable(retryPolicy.policy)) {
                const from = this._routerState._current ?? this._stateRegistry._root.self;
                const to = this._routerState._currentState?.self ??
                    this._stateRegistry._root.self;
                const context = {
                    operation: "retry",
                    attempt,
                    from,
                    to,
                    state: retryPolicy.state,
                    transition: undefined,
                    error,
                };
                const resolved = this._routerState._injector?.invoke(retryPolicy.policy, undefined, createTransitionPolicyInvocationLocals(context), "route retry policy");
                decision = await Promise.resolve(resolved);
            }
        }
        if (typeof decision !== "boolean" && typeof decision !== "number") {
            throw new Error("Route retry policy must return boolean or number.");
        }
        const maxAttempts = this._normalizeRetryPolicy(decision);
        const allowed = !!maxAttempts && attempt < maxAttempts;
        this._recordPolicyDiagnostic({
            _kind: "retry",
            _decision: allowed ? "retry" : "blocked",
            _from: this._routerState._current?.name,
            _to: diagnosticStateName(targetName),
            _policyState: retryPolicy.state.name,
            _attempt: attempt,
        });
        return allowed;
    }
    _normalizeRetryPolicy(value) {
        if (value === true)
            return 2;
        if (value === false)
            return 0;
        if (!Number.isFinite(value) || value < 1)
            return 0;
        return Math.trunc(value);
    }
    /** @internal */
    async _loadLazyRegistration(lazy, toState) {
        try {
            this._registerLazyResult(await lazy.loader(toState, this._$injector));
            lazy.loaded = true;
        }
        catch (error) {
            lazy.promise = undefined;
            throw error;
        }
    }
    /**
     * Registers a lazy state namespace.
     * The loader is invoked the first time navigation targets this prefix.
     */
    lazy(prefix, loader) {
        this._lazyStates.push({
            prefix: prefix.replace(/\.\*\*$/, ""),
            loader,
            loaded: false,
        });
        return this;
    }
    /**
     * Transition to a different state and/or parameters
     *
     * Convenience method for transitioning to a new state.
     *
     * `$state.go` calls `$state.transitionTo` internally but automatically sets options to
     * `{ location: true, inherit: true, relative: $state.$current }`.
     * This allows you to use either an absolute or relative `to` argument (because of `relative: $state.$current`).
     * It also allows you to specify * only the parameters you'd like to update, while letting unspecified parameters
     * inherit from the current parameter values (because of `inherit: true`).
     *
     * #### Example:
     * ```js
     * let app = angular.module('app', []);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.go('contact.detail');
     *   };
     * });
     * ```
     *
     * @param {StateOrName} to Absolute state name, state object, or relative state path (relative to current state).
     *
     * Some examples:
     *
     * - `$state.go('contact.detail')` - will go to the `contact.detail` state
     * - `$state.go('^')` - will go to the parent state
     * - `$state.go('^.sibling')` - if current state is `home.child`, will go to the `home.sibling` state
     * - `$state.go('.child.grandchild')` - if current state is home, will go to the `home.child.grandchild` state
     *
     * @param {*} [params] A map of the parameters that will be sent to the state and exposed on `$state.params`.
     *
     *    Any parameters that are not specified will be inherited from current parameter values (because of `inherit: true`).
     *    This allows, for example, going to a sibling state that shares parameters defined by a parent state.
     *
     * @param {*} [options] Transition options
     *
     * @returns A promise representing the state of the new transition.
     */
    go(to, params, options) {
        const defautGoOpts = { relative: this.$current, inherit: true };
        const transOpts = defaults(options, defautGoOpts, defaultTransOpts);
        return this.transitionTo(to, params, transOpts);
    }
    /**
     * Creates a [[TargetState]]
     *
     * This is a factory method for creating a TargetState
     *
     * This may be returned from a Transition Hook to redirect a transition, for example.
     * @param {string | StateDeclaration | StateObject} identifier
     * @param {{}} params
     * @param {TransitionOptions} [options]
     */
    target(identifier, params = {}, options = {}) {
        const internalOptions = { ...options };
        // If we're reloading, find the state object to reload from
        if (isObject(internalOptions.reload) && !internalOptions.reload.name)
            throw new Error("Invalid reload state object");
        const reg = this._getRegistry();
        internalOptions.reloadState =
            internalOptions.reload === true
                ? reg._root
                : internalOptions.reload
                    ? reg._matcher.find(internalOptions.reload, internalOptions.relative)
                    : undefined;
        if (internalOptions.reload && !internalOptions.reloadState)
            throw new Error(`No such reload state '${isString(internalOptions.reload)
                ? internalOptions.reload
                : isObject(internalOptions.reload) &&
                    "name" in internalOptions.reload
                    ? internalOptions.reload.name
                    : String(internalOptions.reload)}'`);
        return new TargetState(this._getRegistry(), identifier, params, internalOptions);
    }
    getCurrentPath() {
        const routerState = this._routerState;
        const latestSuccess = routerState._lastSuccessfulTransition;
        return latestSuccess
            ? latestSuccess._treeChanges.to
            : [new PathNode(this._getRegistry()._root)];
    }
    /** @internal */
    transitionTo(to, toParams = {}, options = {}) {
        return transitionToState(this, to, toParams, options);
    }
    /**
     * Checks whether the current state matches a state, ancestor, or glob.
     * Set `exact` to require the current state itself instead of an ancestor.
     */
    matches(stateOrName, params, options) {
        const relative = options?.relative ?? this.$current;
        const glob = !options?.exact && isString(stateOrName)
            ? Glob.fromString(stateOrName)
            : undefined;
        if (glob) {
            const currentName = this.$current?.name;
            if (!currentName || !glob.matches(currentName))
                return false;
            stateOrName = currentName;
        }
        const state = this._stateRegistry._matcher.find(stateOrName, relative);
        if (!isDefined(state))
            return false;
        if (options?.exact) {
            if (this.$current !== state)
                return false;
        }
        else {
            const include = this.$current?.includes;
            if (!include || !isDefined(include[state.name]))
                return false;
        }
        if (!params)
            return true;
        const schema = state.parameters({
            inherit: true,
            matchingKeys: params,
        });
        return Param.equals(schema, Param.values(schema, params), this._routerState._params);
    }
    /**
     * Generates a URL for a state and parameters
     *
     * Returns the url for the given state populated with the given params.
     *
     * #### Example:
     * ```js
     * expect($state.href("about.person", { person: "bob" })).toEqual("/about/bob");
     * ```
     * @param {StateOrName} stateOrName The state name or state object you'd like to generate a url from.
     * @param {RawParams} params An object of parameter values to fill the state's required parameters.
     * @param {HrefOptions} [options] Options object. The options are:
     * @returns {string | null} compiled state url
     */
    href(stateOrName, params, options) {
        params = params ?? {};
        const relative = options?.relative ?? this.$current;
        const state = this._stateRegistry._matcher.find(stateOrName, relative);
        if (!isDefined(state))
            return null;
        if (options?.inherit !== false)
            params = this._routerState._params.$inherit(params, assertDefined(this.$current), state);
        const nav = options?.lossy !== false ? state.navigable : state;
        if (!nav || isNullOrUndefined(nav._url)) {
            return null;
        }
        return this._routerState._urlRuntime._href(nav._url, params, {
            absolute: options?.absolute,
        });
    }
    get(stateOrName, base) {
        const reg = this._stateRegistry;
        if (arguments.length === 0)
            return reg.get();
        if (stateOrName === undefined)
            return undefined;
        return reg.get(stateOrName, base ?? this.$current);
    }
}
function normalizeStateDeclaration(nameOrDefinition, definition) {
    if (isString(nameOrDefinition)) {
        if (!isObject(definition)) {
            throw stateRuntimeError("stateinvalid", `'definition' required`);
        }
        const namedDefinition = definition;
        if (isDefined(namedDefinition.name) &&
            namedDefinition.name !== nameOrDefinition) {
            throw stateRuntimeError("stateinvalid", `State name '${namedDefinition.name}' does not match '${nameOrDefinition}'`);
        }
        return { ...namedDefinition, name: nameOrDefinition };
    }
    return nameOrDefinition;
}

export { StateRuntime };
