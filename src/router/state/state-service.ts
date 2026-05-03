import {
  _exceptionHandlerProvider,
  _injector,
  _router,
  _routerProvider,
  _rootScope,
  _stateRegistry,
  _stateRegistryProvider,
  _transitionsProvider,
  _view,
} from "../../injection-tokens.ts";
import { defaults } from "../../shared/common.ts";
import {
  assign,
  isDefined,
  isInstanceOf,
  isArray,
  isNullOrUndefined,
  isObject,
  minErr,
  isString,
} from "../../shared/utils.ts";
import { PathNode } from "../path/path-node.ts";
import { defaultTransOpts } from "../transition/transition-service.ts";
import { RejectType, Rejection } from "../transition/reject-factory.ts";
import { TargetState } from "./target-state.ts";
import { Param } from "../params/param.ts";
import { Glob } from "../glob/glob.ts";
import type { RawParams } from "../params/interface.ts";
import type { Transition } from "../transition/transition.ts";
import type { ViewService } from "../view/view.ts";
import type { TransitionOptions } from "../transition/interface.ts";
import type {
  HrefOptions,
  LazyStateLoader,
  LazyStateLoadResult,
  StateDeclaration,
  StateOrName,
  StateTransitionResult,
  TransitionPromise,
} from "./interface.ts";
import type { StateObject } from "./state-object.ts";
import type { StateRegistryProvider } from "./state-registry.ts";
import type { RouterProvider } from "../router.ts";

const stdErr = minErr("$stateProvider");

type LazyStateRegistration = {
  prefix: string;
  loader: LazyStateLoader;
  promise?: Promise<void>;
  loaded: boolean;
};

/**
 * Attaches a catch handler to silence unhandled rejection warnings,
 * while preserving the original promise.
 *
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
function silenceUncaughtInPromise<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);

  return promise;
}

/**
 * Creates a rejected promise whose rejection is intentionally silenced.
 *
 * @template [E=unknown]
 * @param {E} error
 * @returns {Promise<never>}
 */
export function silentRejection<E = unknown>(error: E): Promise<never> {
  return silenceUncaughtInPromise(Promise.reject(error));
}

/**
 * Provides services related to ng-router states.
 *
 * This API is located at `$state`.
 */
export class StateProvider {
  /** @internal */
  _routerState: RouterProvider;
  /** @internal */
  _transitionService: ng.TransitionProvider;
  /** @internal */
  _stateRegistry: StateRegistryProvider;
  /** @internal */
  _$injector: ng.InjectorService | undefined;
  /** @internal */
  _lazyStates: LazyStateRegistration[];
  /** @internal */
  _defaultErrorHandler: ng.ExceptionHandlerService;

  /** @internal */
  _getRegistry(): StateRegistryProvider {
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

  /* @ignore */
  static $inject = [
    _stateRegistryProvider,
    _routerProvider,
    _transitionsProvider,
    _exceptionHandlerProvider,
  ];

  constructor(
    stateRegistry: StateRegistryProvider,
    routerState: RouterProvider,
    transitionService: ng.TransitionProvider,
    exceptionHandlerProvider: ng.ExceptionHandlerProvider,
  ) {
    this._routerState = routerState;
    this._transitionService = transitionService;
    this._stateRegistry = stateRegistry;
    this._$injector = undefined;
    this._lazyStates = [];

    this._defaultErrorHandler = exceptionHandlerProvider.handler;
  }

  $get = [
    _injector,
    _stateRegistry,
    _router,
    _rootScope,
    _view,
    /**
     * @param {ng.InjectorService} $injector
     * @param {StateRegistryProvider} $stateRegistry
     * @param {RouterProvider} routerState
     * @param {ng.RootScopeService} $rootScope
     * @param viewService
     * @returns {StateProvider}
     */
    (
      $injector: ng.InjectorService,
      $stateRegistry: StateRegistryProvider,
      routerState: RouterProvider,
      $rootScope: ng.RootScopeService,
      viewService: ViewService,
    ) => {
      this._stateRegistry = $stateRegistry;
      this._routerState = routerState;
      routerState._stateService = this;
      $rootScope.$on("$locationChangeSuccess", (evt: ng.ScopeEvent) =>
        routerState._sync(evt),
      );
      this._transitionService._initRuntimeHooks(this, viewService);
      this._$injector = $injector;
      this._routerState._injector = $injector;

      return this;
    },
  ];

  /**
   *
   * @param {StateDeclaration} definition
   */
  state(definition: StateDeclaration): this {
    if (!definition.name) {
      throw stdErr("stateinvalid", `'name' required`);
    }

    try {
      this._getRegistry().register(definition);
    } catch (err) {
      throw stdErr("stateinvalid", (err as Error).message);
    }

    return this;
  }

  /** @internal */
  _registerLazyResult(result: LazyStateLoadResult): void {
    if (!result) return;

    const states = isArray(result) ? result : [result];

    states.forEach((state) => this.state(state));
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

    const lazy = this._findLazyState(toState);

    if (!lazy) {
      return Rejection.invalid(toState.error())._toPromise();
    }

    if (!lazy.promise) {
      lazy.promise = this._loadLazyRegistration(lazy, toState);
    }

    await lazy.promise;

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
   * Reloads the current state
   *
   * A method that force reloads the current state, or a partial state hierarchy.
   * All resolves are re-resolved, and components reinstantiated.
   *
   * #### Example:
   * ```js
   * let app = angular.module('app', []);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.reload = function(){
   *     $state.reload();
   *   }
   * });
   * ```
   *
   * Note: `reload()` is just an alias for:
   *
   * ```js
   * $state.transitionTo($state.current, $state.params, {
   *   reload: true, inherit: false
   * });
   * ```
   *
   * @param {string | StateDeclaration | StateObject} [reloadState] A state name or a state object.
   *    If present, this state and all its children will be reloaded, but ancestors will not reload.
   *
   * #### Example:
   * ```js
   * //assuming app application consists of 3 states: 'contacts', 'contacts.detail', 'contacts.detail.item'
   * //and current state is 'contacts.detail.item'
   * let app = angular.module('app', []);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.reload = function(){
   *     //will reload 'contact.detail' and nested 'contact.detail.item' states
   *     $state.reload('contact.detail');
   *   }
   * });
   * ```
   *
   * @returns A promise representing the state of the new transition. See [[StateService.go]]
   */
  reload(reloadState?: string | StateDeclaration | StateObject) {
    const current = this._routerState._current;

    if (!current) throw new Error("No current state");

    return this.transitionTo(current, this._routerState._params, {
      reload: isDefined(reloadState) ? reloadState : true,
      inherit: false,
      notify: false,
    });
  }

  /**
   * Transition to a different state and/or parameters
   *
   * Convenience method for transitioning to a new state.
   *
   * `$state.go` calls `$state.transitionTo` internally but automatically sets options to
   * `{ location: true, inherit: true, relative: $state.$current, notify: true }`.
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
   * @param {*} [params] A map of the parameters that will be sent to the state, will populate $stateParams.
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
  ): TransitionPromise | Promise<StateTransitionResult> {
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
  target(
    identifier: StateOrName,
    params: RawParams = {},
    options: TransitionOptions = {},
  ): TargetState {
    // If we're reloading, find the state object to reload from
    if (isObject(options.reload) && !options.reload.name)
      throw new Error("Invalid reload state object");
    const reg = this._getRegistry();

    options.reloadState =
      options.reload === true
        ? reg.root()
        : options.reload
          ? reg._matcher.find(options.reload, options.relative)
          : undefined;

    if (options.reload && !options.reloadState)
      throw new Error(
        `No such reload state '${
          isString(options.reload)
            ? options.reload
            : isObject(options.reload) && "name" in options.reload
              ? String(options.reload.name)
              : String(options.reload)
        }'`,
      );

    return new TargetState(this._getRegistry(), identifier, params, options);
  }

  getCurrentPath(): PathNode[] {
    const routerState = this._routerState;

    const latestSuccess = routerState._lastSuccessfulTransition;

    return latestSuccess
      ? latestSuccess._treeChanges.to
      : [new PathNode(this._getRegistry().root())];
  }

  /** @internal */
  _handleTransitionRejection(
    trans: Transition,
    error: unknown,
  ): Promise<StateTransitionResult> {
    if (isInstanceOf(error, Rejection)) {
      const isLatest = this._routerState._lastStartedTransitionId <= trans.$id;

      if (error.type === RejectType._IGNORED) {
        isLatest && this._routerState._update();

        // Consider ignored `Transition.run()` as a successful `transitionTo`.
        return Promise.resolve(this._routerState._current);
      }

      const { detail } = error;

      if (
        error.type === RejectType._SUPERSEDED &&
        error.redirected &&
        isInstanceOf(detail, TargetState)
      ) {
        const redirect = trans.redirect(detail);

        return this._runRedirectTransition(redirect);
      }

      if (error.type === RejectType._ABORTED) {
        isLatest && this._routerState._update();

        return Promise.reject(error);
      }
    }

    this.defaultErrorHandler()(error);

    return Promise.reject(error);
  }

  /** @internal */
  async _runRedirectTransition(
    redirect: Transition,
  ): Promise<StateTransitionResult> {
    try {
      return await redirect.run();
    } catch (reason) {
      return this._handleTransitionRejection(redirect, reason);
    }
  }

  /** @internal */
  async _runTransitionTo(trans: Transition): Promise<StateTransitionResult> {
    try {
      return await trans.run();
    } catch (error) {
      return this._handleTransitionRejection(trans, error);
    }
  }

  /**
   * Low-level method for transitioning to a new state.
   *
   * The [[go]] method (which uses `transitionTo` internally) is recommended in most situations.
   *
   * #### Example:
   * ```js
   * let app = angular.module('app', []);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.changeState = function () {
   *     $state.transitionTo('contact.detail');
   *   };
   * });
   * ```
   *
   * @param {StateOrName} to State name or state object.
   * @param {RawParams} toParams A map of the parameters that will be sent to the state,
   *      will populate $stateParams.
   * @param {TransitionOptions} options Transition options
   *
   * @returns A promise representing the state of the new transition. See [[go]]
   */
  transitionTo(
    to: StateOrName,
    toParams: RawParams = {},
    options: TransitionOptions = {},
  ): TransitionPromise | Promise<StateTransitionResult> {
    options = defaults(options, defaultTransOpts);
    const getCurrent = () => this._routerState._transition;

    options = assign(options, { current: getCurrent });
    const ref = this.target(to, toParams, options);

    const currentPath = this.getCurrentPath();

    if (!ref.exists()) return this._loadLazyTargetState(ref);

    if (!ref.valid()) return silentRejection(ref.error());

    if (options.supercede === false && getCurrent()) {
      return Rejection.ignored(
        "Another transition is in progress and supercede has been set to false in TransitionOptions for the transition. So the transition was ignored in favour of the existing one in progress.",
      )._toPromise();
    }
    /**
     * Special handling for Ignored, Aborted, and Redirected transitions
     *
     * The semantics for the transition.run() promise and the StateService.transitionTo()
     * promise differ. For instance, the run() promise may be rejected because it was
     * IGNORED, but the transitionTo() promise is resolved because from the user perspective
     * no error occurred.  Likewise, the transition.run() promise may be rejected because of
     * a Redirect, but the transitionTo() promise is chained to the new Transition's promise.
     */
    const transition = this._transitionService.create(currentPath, ref);

    const transitionToPromise = this._runTransitionTo(transition);

    silenceUncaughtInPromise(transitionToPromise); // issue #2676

    // Return a promise for the transition, which also has the transition object on it.
    return assign(transitionToPromise, { transition });
  }

  /**
     * Checks if the current state *is* the provided state
     *
     * Similar to [[includes]] but only checks for the full state name.
     * If params is supplied then it will be tested for strict equality against the current
     * active params object, so all params must match with none missing and no extras.
     *
     * #### Example:
     * ```js
     * $state.$current.name = 'contacts.details.item';
     *
     * // absolute name
     * $state.is('contact.details.item'); // returns true
     * $state.is(contactDetailItemStateObject); // returns true
     * ```
     *
     * // relative name (. and ^), typically from a template
     * // E.g. from the 'contacts.details' template
     * ```html
     * <div ng-class="{highlighted: $state.is('.item')}">Item</div>
     * ```
     * @param {StateOrName} stateOrName The state name (absolute or relative) or state object you'd like to check.
     * @param {RawParams} [params] A param object, e.g. `{sectionId: section.id}`, that you'd like
    to test against the current active state.
     * @param {{ relative: StateOrName | undefined; } | undefined} [options] An options object. The options are:
    - `relative`: If `stateOrName` is a relative state name and `options.relative` is set, .is will
    test relative to `options.relative` state (or name).
     * @returns {boolean | undefined} Returns true if it is the state.
     */
  is(
    stateOrName: StateOrName,
    params?: RawParams,
    options?: { relative: StateOrName | undefined },
  ): boolean | undefined {
    const relative =
      options?.relative === undefined ? this.$current : options.relative;

    const state = this._stateRegistry?._matcher.find(stateOrName, relative);

    if (!isDefined(state)) return undefined;

    if (this.$current !== state) return false;

    if (!params) return true;
    const schema = state.parameters({ inherit: true, matchingKeys: params });

    return Param.equals(
      schema,
      Param.values(schema, params),
      this._routerState._params,
    );
  }

  /**
     * Checks if the current state *includes* the provided state
     *
     * A method to determine if the current active state is equal to or is the child of the
     * state stateName. If any params are passed then they will be tested for a match as well.
     * Not all the parameters need to be passed, just the ones you'd like to test for equality.
     *
     * #### Example when `$state.$current.name === 'contacts.details.item'`
     * ```js
     * // Using partial names
     * $state.includes("contacts"); // returns true
     * $state.includes("contacts.details"); // returns true
     * $state.includes("contacts.details.item"); // returns true
     * $state.includes("contacts.list"); // returns false
     * $state.includes("about"); // returns false
     * ```
     *
     * #### Glob Examples when `* $state.$current.name === 'contacts.details.item.url'`:
     * ```js
     * $state.includes("*.details.*.*"); // returns true
     * $state.includes("*.details.**"); // returns true
     * $state.includes("**.item.**"); // returns true
     * $state.includes("*.details.item.url"); // returns true
     * $state.includes("*.details.*.url"); // returns true
     * $state.includes("*.details.*"); // returns false
     * $state.includes("item.**"); // returns false
     * ```
     * @param {StateOrName} stateOrName A partial name, relative name, glob pattern,
    or state object to be searched for within the current state name.
     * @param {RawParams} [params] A param object, e.g. `{sectionId: section.id}`,
    that you'd like to test against the current active state.
     * @param {TransitionOptions} [options] An options object. The options are:
    - `relative`: If `stateOrName` is a relative state name and `options.relative` is set, .is will
    test relative to `options.relative` state (or name).
     * @returns {boolean | undefined} Returns true if it does include the state
     */
  includes(
    stateOrName: StateOrName,
    params?: RawParams,
    options?: TransitionOptions,
  ): boolean | undefined {
    const relative =
      options?.relative === undefined ? this.$current : options.relative;

    const glob = isString(stateOrName) && Glob.fromString(stateOrName);

    if (glob) {
      const currentName = this.$current?.name;

      if (!currentName || !glob.matches(currentName)) return false;
      stateOrName = currentName;
    }
    const state = this._stateRegistry?._matcher.find(stateOrName, relative);

    const include = this.$current?.includes;

    if (!isDefined(state) || !include) return undefined;

    if (!isDefined(include[state.name])) return false;

    if (!params) return true;
    const schema = (state as StateObject).parameters({
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
    params = params || {};
    const relative =
      options?.relative === undefined ? this.$current : options.relative;

    const state = this._stateRegistry?._matcher.find(stateOrName, relative);

    if (!isDefined(state)) return null;

    if (options?.inherit !== false)
      params = this._routerState._params.$inherit(
        params,
        this.$current as StateObject,
        state,
      );
    const nav = state && options?.lossy !== false ? state.navigable : state;

    if (!nav || isNullOrUndefined(nav._url)) {
      return null;
    }

    return this._routerState._href(nav._url, params, {
      absolute: options?.absolute,
    });
  }

  /**
   * Sets or gets the default [[transitionTo]] error handler.
   *
   * The error handler is called when a [[Transition]] is rejected or when any error occurred during the Transition.
   * This includes errors caused by resolves and transition hooks.
   *
   * Note:
   * This handler does not receive certain Transition rejections.
   * Redirected and Ignored Transitions are not considered to be errors by [[StateService.transitionTo]].
   *
   * The built-in default error handler logs the error to the console.
   *
   * You can provide your own custom handler.
   *
   * #### Example:
   * ```js
   * stateService.defaultErrorHandler(function() {
   *   // Do not log transitionTo errors
   * });
   * ```
   * @param {ng.ExceptionHandlerService | undefined} [handler] a global error handler function
   * @returns the current global error handler
   */
  defaultErrorHandler(handler?: ng.ExceptionHandlerService) {
    return (this._defaultErrorHandler = handler || this._defaultErrorHandler);
  }

  /**
   * @param {StateOrName} stateOrName
   * @param {undefined} [base]
   */
  get(stateOrName?: StateOrName, base?: StateOrName) {
    const reg = this._stateRegistry;

    if (arguments.length === 0) return reg?.get();

    return reg?.get(stateOrName, base || this.$current);
  }
}
