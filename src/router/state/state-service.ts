import { defaults } from "../../shared/common.ts";
import {
  isDefined,
  isArray,
  isNullOrUndefined,
  isObject,
  isFunction,
  isInstanceOf,
  createErrorFactory,
  isString,
  assertDefined,
} from "../../shared/utils.ts";
import { PathNode } from "../path/path-node.ts";
import {
  defaultTransOpts,
  type TransitionRuntime,
} from "../transition/transition-service.ts";
import { Rejection } from "../transition/reject-factory.ts";
import { TargetState } from "./target-state.ts";
import {
  createTransitionErrorPolicyInvocationLocals,
  createTransitionPolicyInvocationLocals,
} from "../invocation-context.ts";
import { Param } from "../params/param.ts";
import { Glob } from "../glob/glob.ts";
import {
  getTransitionRetryPolicyFromStateName,
  transitionToState,
} from "./state-transition.ts";
import type { RawParams } from "../params/interface.ts";
import type { ViewService } from "../view/view.ts";
import type {
  InternalTransitionOptions,
  TransitionOptions,
} from "../transition/interface.ts";
import type {
  HrefOptions,
  LazyStateLoader,
  LazyStateLoadResult,
  RouteMap,
  ParamsOf,
  StateRetryPolicy,
  StateDeclaration,
  StateOrName,
  StateTransitionFallbackTarget,
  StateTransitionResult,
  TransitionPromise,
  StateErrorBoundaryPolicy,
  StateTransitionErrorPolicyContext,
} from "./interface.ts";
import type { StateObject } from "./state-object.ts";
import type { StateRegistryRuntime } from "./state-registry.ts";
import type { RouterRuntimeState } from "../router.ts";

const stateRuntimeError = createErrorFactory("$state");

export interface LazyStateRegistration {
  prefix: string;
  loader: LazyStateLoader;
  promise?: Promise<void>;
  loaded: boolean;
}

function diagnosticStateName(stateOrName: StateOrName): string {
  return isString(stateOrName) ? stateOrName : stateOrName.name;
}

/** @internal */
export type StateTransitionPolicyDiagnosticKind = "retry" | "fallback";

/** @internal */
export type StateTransitionPolicyDiagnosticDecision =
  | "retry"
  | "blocked"
  | "redirected"
  | "skipped";

/** @internal */
export interface StateTransitionPolicyDiagnostic {
  _kind: StateTransitionPolicyDiagnosticKind;
  _decision: StateTransitionPolicyDiagnosticDecision;
  _from: string | undefined;
  _to: string | undefined;
  _policyState: string | undefined;
  _attempt?: number;
  _target?: string;
  _reason?: string;
}

/** @internal */
export class StateRuntime {
  /** @internal */
  _routerState: RouterRuntimeState;
  /** @internal */
  _transitionService: TransitionRuntime;
  /** @internal */
  _stateRegistry: StateRegistryRuntime;
  /** @internal */
  _$injector: ng.InjectorService | undefined;
  /** @internal */
  _lazyStates: LazyStateRegistration[];
  /** @internal */
  _defaultErrorHandler: ng.ExceptionHandlerService;
  /** @internal */
  _policyDiagnostics: StateTransitionPolicyDiagnostic[];
  /** @internal */
  _viewService!: ViewService;

  /** @internal */
  _getRegistry(): StateRegistryRuntime {
    return this._stateRegistry;
  }

  /**
   * The latest successful state parameters
   *
   * @deprecated This is a passthrough through to [[Router.params]]
   */
  get params(): RawParams {
    return this._routerState._params;
  }

  /**
   * The current [[StateDeclaration]]
   */
  get current(): StateDeclaration | undefined {
    return this._routerState._current;
  }

  /**
   * The current [[StateObject]] (an internal API)
   */
  get $current(): StateObject | undefined {
    return this._routerState._currentState;
  }

  constructor(
    stateRegistry: StateRegistryRuntime,
    routerState: RouterRuntimeState,
    transitionService: TransitionRuntime,
    exceptionHandler: ng.ExceptionHandlerService,
  ) {
    this._routerState = routerState;
    this._transitionService = transitionService;
    this._stateRegistry = stateRegistry;
    this._$injector = undefined;
    this._lazyStates = [];
    this._policyDiagnostics = [];

    this._defaultErrorHandler = exceptionHandler;
  }

  /** @internal */
  _recordPolicyDiagnostic(diagnostic: StateTransitionPolicyDiagnostic): void {
    this._policyDiagnostics.push(diagnostic);
  }

  /** @internal */
  _initRuntime(
    $injector: ng.InjectorService,
    $location: ng.LocationService,
    $stateRegistry: StateRegistryRuntime,
    $rootScope: ng.Scope,
    viewService: ViewService,
  ): this {
    this._routerState._initRuntime($location, $injector);
    this._stateRegistry = $stateRegistry;
    this._viewService = viewService;
    this._routerState._stateService = this;
    $rootScope.$on("$locationChangeSuccess", (evt: ng.ScopeEvent) => {
      this._routerState._sync(evt);
    });
    this._transitionService._initRuntimeHooks(this, viewService);
    this._$injector = $injector;
    this._routerState._injector = $injector;

    return this;
  }

  /**
   * Register a router state.
   *
   * @param {StateDeclaration} definition - State declaration with a `name`.
   * @returns {this}
   */
  state(definition: StateDeclaration): this;
  /**
   * Register a named router state.
   *
   * @param {string} name - State name.
   * @param {StateDeclaration} definition - State declaration without a required `name`.
   * @returns {this}
   */
  state(name: string, definition: Omit<StateDeclaration, "name">): this;
  state(
    nameOrDefinition: string | StateDeclaration,
    definition?: Omit<StateDeclaration, "name">,
  ): this {
    const stateDefinition = normalizeStateDeclaration(
      nameOrDefinition,
      definition,
    );

    if (!stateDefinition.name) {
      throw stateRuntimeError("stateinvalid", `'name' required`);
    }

    try {
      this._getRegistry().register(stateDefinition);
    } catch (err) {
      throw stateRuntimeError("stateinvalid", (err as Error).message);
    }

    return this;
  }

  /** @internal */
  _registerLazyResult(result: LazyStateLoadResult): void {
    if (!result) return;

    const states = isArray(result) ? result : [result];

    states.forEach((state) => {
      this.state(state);
    });
  }

  /** @internal */
  _findLazyState(target: TargetState): LazyStateRegistration | undefined {
    const name = target.name();

    if (!isString(name)) return undefined;

    for (let i = 0; i < this._lazyStates.length; i++) {
      const lazy = this._lazyStates[i];

      if (name === lazy.prefix || name.startsWith(`${lazy.prefix}.`)) {
        return lazy;
      }
    }

    return undefined;
  }

  /** @internal */
  async _loadLazyTargetState(
    toState: TargetState,
  ): Promise<StateTransitionResult> {
    const routerState = this._routerState;

    const latest = routerState._lastStartedTransition;
    const retryPolicy = this._getTransitionRetryPolicyFromStateName(
      toState.name(),
    );

    const lazy = this._findLazyState(toState);

    if (!lazy) {
      return Rejection.invalid(toState.error())._toPromise();
    }

    let attempts = 1;

    for (;;) {
      lazy.promise ??= this._loadLazyRegistration(lazy, toState);

      try {
        await lazy.promise;
        break;
      } catch (error) {
        const shouldRetry = await this._shouldRetryLazyLoad(
          retryPolicy,
          attempts,
          error,
          toState.name(),
        );

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

    const target = this.target(
      toState.identifier(),
      toState.params(),
      toState.options(),
    );

    if (!target.valid()) {
      return Rejection.invalid(target.error())._toPromise();
    }

    return this.transitionTo(
      target.identifier(),
      target.params(),
      target.options(),
    );
  }

  _getStatePolicyFromStateName<TPolicy>(
    stateName: StateOrName,
    readPolicy: (state: StateDeclaration) => TPolicy | undefined,
  ):
    | {
        state: StateDeclaration;
        policy: TPolicy;
      }
    | undefined {
    const stateNameString = diagnosticStateName(stateName);

    if (stateNameString) {
      const tokens = stateNameString.split(".");

      for (let i = tokens.length; i > 0; i--) {
        const candidateName = tokens.slice(0, i).join(".");
        const state = this._stateRegistry.get(candidateName);

        if (!state) continue;

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

  _getTransitionFallbackFromStateName(stateName: StateOrName):
    | {
        state: StateDeclaration;
        target: StateTransitionFallbackTarget;
      }
    | undefined {
    const routeFallback = this._getStatePolicyFromStateName(
      stateName,
      (state) => state.policy?.transition?.fallbackTo,
    );

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

  _getTransitionErrorBoundaryPolicyFromStateName(stateName: StateOrName):
    | {
        state: StateDeclaration;
        policy:
          | string
          | { state?: string; params?: RawParams }
          | TargetState
          | StateErrorBoundaryPolicy
          | undefined;
      }
    | undefined {
    const routePolicy = this._getStatePolicyFromStateName(
      stateName,
      (state) => {
        return (
          state.policy?.transition?.error ??
          state.policy?.transition?.errorBoundary
        );
      },
    );

    if (routePolicy) return routePolicy;

    const routerPolicy =
      this._routerState._error ?? this._routerState._errorBoundary;

    return routerPolicy !== undefined
      ? {
          state: this._stateRegistry._root.self,
          policy: routerPolicy,
        }
      : undefined;
  }

  _buildLazyFallbackTarget(
    toState: TargetState,
    target: StateTransitionFallbackTarget,
  ): TargetState | undefined {
    if (isString(target)) {
      return this.target(target, toState.params(), toState.options());
    }

    if (
      isObject(target) &&
      (Object.hasOwn(target, "state") || Object.hasOwn(target, "params"))
    ) {
      const redirect = target as { state?: string; params?: RawParams };

      return this.target(
        redirect.state ?? toState.name(),
        redirect.params ?? toState.params(),
        toState.options(),
      );
    }

    return undefined;
  }

  async _buildLazyErrorBoundaryTarget(
    toState: TargetState,
    policyState: StateDeclaration,
    policy:
      | string
      | { state?: string; params?: RawParams }
      | TargetState
      | StateErrorBoundaryPolicy
      | undefined,
    error: unknown,
  ): Promise<TargetState | undefined> {
    if (isString(policy)) {
      return this.target(policy, toState.params(), toState.options());
    }

    if (isInstanceOf(policy, TargetState)) {
      return policy;
    }

    if (
      isObject(policy) &&
      (Object.hasOwn(policy, "state") || Object.hasOwn(policy, "params"))
    ) {
      const redirect = policy as { state?: string; params?: RawParams };

      return this.target(
        redirect.state ?? toState.name(),
        redirect.params ?? toState.params(),
        toState.options(),
      );
    }

    if (!isFunction(policy)) {
      return undefined;
    }

    const from = this._routerState._current ?? this._stateRegistry._root.self;
    const to =
      this._routerState._currentState?.self ?? this._stateRegistry._root.self;
    const context: StateTransitionErrorPolicyContext = {
      operation: "error",
      transition: undefined,
      from,
      to,
      state: policyState,
      error,
    };

    const result = await Promise.resolve(
      this._routerState._injector?.invoke(
        policy,
        undefined,
        createTransitionErrorPolicyInvocationLocals(context),
        "route error boundary policy",
      ),
    );

    if (isInstanceOf(result, TargetState)) {
      return result;
    }

    if (isString(result)) {
      return this.target(result, toState.params(), toState.options());
    }

    if (
      isObject(result) &&
      (Object.hasOwn(result, "state") || Object.hasOwn(result, "params"))
    ) {
      const redirect = result as { state?: string; params?: RawParams };

      return this.target(
        redirect.state ?? toState.name(),
        redirect.params ?? toState.params(),
        toState.options(),
      );
    }

    if (result === undefined) {
      return undefined;
    }

    throw new Error(
      "Route error boundary policy must return TargetState, redirect target, or undefined.",
    );
  }

  async _recoverLazyLoadFailure(
    toState: TargetState,
    error: unknown,
  ): Promise<StateTransitionResult | undefined> {
    const errorPolicy = this._getTransitionErrorBoundaryPolicyFromStateName(
      toState.name(),
    );

    if (errorPolicy) {
      const errorTarget = await this._buildLazyErrorBoundaryTarget(
        toState,
        errorPolicy.state,
        errorPolicy.policy,
        error,
      );

      if (errorTarget?.valid() && errorTarget.name() !== toState.name()) {
        return this.transitionTo(
          errorTarget.identifier(),
          errorTarget.params(),
          errorTarget.options(),
        );
      }
    }

    const fallback = this._getTransitionFallbackFromStateName(toState.name());

    if (!fallback) return undefined;

    const fallbackTarget = this._buildLazyFallbackTarget(
      toState,
      fallback.target,
    );

    if (!fallbackTarget?.valid()) {
      this._recordPolicyDiagnostic({
        _kind: "fallback",
        _decision: "skipped",
        _from: this._routerState._current?.name,
        _to: toState.name() as string | undefined,
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
        _to: toState.name() as string | undefined,
        _policyState: fallback.state.name,
        _target: fallbackTarget.name() as string,
        _reason: "same-target",
      });

      return undefined;
    }

    this._recordPolicyDiagnostic({
      _kind: "fallback",
      _decision: "redirected",
      _from: this._routerState._current?.name,
      _to: toState.name() as string | undefined,
      _policyState: fallback.state.name,
      _target: fallbackTarget.name() as string,
    });

    return this.transitionTo(
      fallbackTarget.identifier(),
      fallbackTarget.params(),
      fallbackTarget.options(),
    );
  }

  _getTransitionRetryPolicyFromStateName(stateName: StateOrName):
    | {
        state: StateDeclaration;
        policy: boolean | number | StateRetryPolicy;
      }
    | undefined {
    return getTransitionRetryPolicyFromStateName(this, stateName);
  }

  async _shouldRetryLazyLoad(
    retryPolicy:
      | {
          state: StateDeclaration;
          policy: boolean | number | StateRetryPolicy;
        }
      | undefined,
    attempt: number,
    error: unknown,
    targetName: StateOrName,
  ): Promise<boolean> {
    if (!retryPolicy) return false;

    let decision: unknown = retryPolicy.policy;

    if (typeof decision !== "boolean" && typeof decision !== "number") {
      if (isFunction(retryPolicy.policy)) {
        const from =
          this._routerState._current ?? this._stateRegistry._root.self;
        const to =
          this._routerState._currentState?.self ??
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

        const resolved = this._routerState._injector?.invoke(
          retryPolicy.policy,
          undefined,
          createTransitionPolicyInvocationLocals(context),
          "route retry policy",
        );
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

  _normalizeRetryPolicy(value: boolean | number): number | undefined {
    if (value === true) return 2;
    if (value === false) return 0;

    if (!Number.isFinite(value) || value < 1) return 0;

    return Math.trunc(value);
  }

  /** @internal */
  async _loadLazyRegistration(
    lazy: LazyStateRegistration,
    toState: TargetState,
  ): Promise<void> {
    try {
      this._registerLazyResult(await lazy.loader(toState, this._$injector));
      lazy.loaded = true;
    } catch (error) {
      lazy.promise = undefined;
      throw error;
    }
  }

  /**
   * Registers a lazy state namespace.
   * The loader is invoked the first time navigation targets this prefix.
   */
  lazy(prefix: string, loader: LazyStateLoader): this {
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

  go(
    to: StateOrName,
    params?: RawParams,
    options?: TransitionOptions,
  ): TransitionPromise {
    const defautGoOpts = { relative: this.$current, inherit: true };

    const transOpts = defaults(
      options,
      defautGoOpts,
      defaultTransOpts,
    ) as InternalTransitionOptions;

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
  target(
    identifier: StateOrName,
    params: RawParams = {},
    options: TransitionOptions = {},
  ): TargetState {
    const internalOptions: InternalTransitionOptions = { ...options };

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
      throw new Error(
        `No such reload state '${
          isString(internalOptions.reload)
            ? internalOptions.reload
            : isObject(internalOptions.reload) &&
                "name" in internalOptions.reload
              ? internalOptions.reload.name
              : String(internalOptions.reload)
        }'`,
      );

    return new TargetState(
      this._getRegistry(),
      identifier,
      params,
      internalOptions,
    );
  }

  getCurrentPath(): PathNode[] {
    const routerState = this._routerState;

    const latestSuccess = routerState._lastSuccessfulTransition;

    return latestSuccess
      ? latestSuccess._treeChanges.to
      : [new PathNode(this._getRegistry()._root)];
  }

  /** @internal */
  transitionTo(
    to: StateOrName,
    toParams: RawParams = {},
    options: TransitionOptions = {},
  ): TransitionPromise {
    return transitionToState(this, to, toParams, options);
  }

  /**
   * Checks whether the current state matches a state, ancestor, or glob.
   * Set `exact` to require the current state itself instead of an ancestor.
   */
  matches(
    stateOrName: StateOrName,
    params?: RawParams,
    options?: { exact?: boolean; relative?: StateOrName },
  ): boolean {
    const relative = options?.relative ?? this.$current;

    const glob =
      !options?.exact && isString(stateOrName)
        ? Glob.fromString(stateOrName)
        : undefined;

    if (glob) {
      const currentName = this.$current?.name;

      if (!currentName || !glob.matches(currentName)) return false;
      stateOrName = currentName;
    }
    const state = this._stateRegistry._matcher.find(stateOrName, relative);

    if (!isDefined(state)) return false;

    if (options?.exact) {
      if (this.$current !== state) return false;
    } else {
      const include = this.$current?.includes;

      if (!include || !isDefined(include[state.name])) return false;
    }

    if (!params) return true;
    const schema = state.parameters({
      inherit: true,
      matchingKeys: params,
    });

    return Param.equals(
      schema,
      Param.values(schema, params),
      this._routerState._params,
    );
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
  href(
    stateOrName: StateOrName,
    params?: RawParams,
    options?: HrefOptions,
  ): string | null {
    params = params ?? {};
    const relative = options?.relative ?? this.$current;

    const state = this._stateRegistry._matcher.find(stateOrName, relative);

    if (!isDefined(state)) return null;

    if (options?.inherit !== false)
      params = this._routerState._params.$inherit(
        params,
        assertDefined(this.$current),
        state,
      );
    const nav = options?.lossy !== false ? state.navigable : state;

    if (!nav || isNullOrUndefined(nav._url)) {
      return null;
    }

    return this._routerState._urlRuntime._href(nav._url, params, {
      absolute: options?.absolute,
    });
  }

  /**
   * @param {StateOrName} stateOrName
   * @param {undefined} [base]
   */
  get(): StateDeclaration[];
  get(
    stateOrName: StateOrName,
    base?: StateOrName,
  ): StateDeclaration | undefined;
  get(stateOrName?: StateOrName, base?: StateOrName) {
    const reg = this._stateRegistry;

    if (arguments.length === 0) return reg.get();
    if (stateOrName === undefined) return undefined;

    return reg.get(stateOrName, base ?? this.$current);
  }
}

/**
 * `$state` facade with an optional public route map. Supplying the route map
 * narrows route names and params without exposing internal router state
 * records.
 */
type RequiredRouteParamKeys<TParams extends Record<string, unknown>> =
  string extends keyof TParams
    ? never
    : {
        [TKey in keyof TParams]-?: Record<never, never> extends Pick<
          TParams,
          TKey
        >
          ? never
          : TKey;
      }[keyof TParams];

type RouteParamArgs<
  TRouteMap extends RouteMap,
  TRouteName extends Extract<keyof TRouteMap, string>,
  TOptions,
> =
  RequiredRouteParamKeys<ParamsOf<TRouteMap, TRouteName>> extends never
    ? [params?: ParamsOf<TRouteMap, TRouteName>, options?: TOptions]
    : [params: ParamsOf<TRouteMap, TRouteName>, options?: TOptions];

export type StateService<TRouteMap extends RouteMap = Record<string, never>> = {
  /** The latest successful state parameters. */
  readonly params: RawParams;

  /** The current state declaration, when navigation has selected one. */
  readonly current: StateDeclaration | undefined;

  /** Overload for typed route names and params. */
  go<TRouteName extends Extract<keyof TRouteMap, string>>(
    to: TRouteName,
    ...args: RouteParamArgs<TRouteMap, TRouteName, TransitionOptions>
  ): TransitionPromise;

  /** Untyped overload used when no route map is supplied. */
  go(
    to: TRouteMap extends Record<string, never>
      ? StateOrName
      : Exclude<StateOrName, string>,
    params?: RawParams,
    options?: TransitionOptions,
  ): TransitionPromise;

  /** Overload for typed route names and params. */
  href<TRouteName extends Extract<keyof TRouteMap, string>>(
    stateOrName: TRouteName,
    ...args: RouteParamArgs<TRouteMap, TRouteName, HrefOptions>
  ): string | null;

  /** Untyped overload used when no route map is supplied. */
  href(
    stateOrName: TRouteMap extends Record<string, never>
      ? StateOrName
      : Exclude<StateOrName, string>,
    params?: RawParams,
    options?: HrefOptions,
  ): string | null;

  /** Build a target that can be returned from a transition hook. */
  target(
    identifier: StateOrName,
    params?: RawParams,
    options?: TransitionOptions,
  ): TargetState;

  /** Get all states or a matching public state declaration. */
  get(): StateDeclaration[];
  get(
    stateOrName?: StateOrName,
    base?: StateOrName,
  ): StateDeclaration | undefined;

  /** Check whether the current state matches a state, ancestor, or glob. */
  matches(
    stateOrName: StateOrName,
    params?: RawParams,
    options?: { exact?: boolean; relative?: StateOrName },
  ): boolean;
};

function normalizeStateDeclaration(
  nameOrDefinition: string | StateDeclaration,
  definition?: Omit<StateDeclaration, "name">,
): StateDeclaration {
  if (isString(nameOrDefinition)) {
    if (!isObject(definition)) {
      throw stateRuntimeError("stateinvalid", `'definition' required`);
    }

    const namedDefinition = definition as StateDeclaration;

    if (
      isDefined(namedDefinition.name) &&
      namedDefinition.name !== nameOrDefinition
    ) {
      throw stateRuntimeError(
        "stateinvalid",
        `State name '${namedDefinition.name}' does not match '${nameOrDefinition}'`,
      );
    }

    return { ...namedDefinition, name: nameOrDefinition };
  }

  return nameOrDefinition;
}
