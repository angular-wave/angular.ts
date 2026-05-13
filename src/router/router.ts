import {
  _injector,
  _location,
  _locationProvider,
} from "../injection-tokens.ts";
import { assign } from "../shared/utils.ts";
import { ParamFactory } from "./params/param-factory.ts";
import {
  createDefaultParamTypes,
  type ParamTypeMap,
} from "./params/param-types.ts";
import { StateParams } from "./params/state-params.ts";
import { RouteTable } from "./route-table.ts";
import { RouterUrlRuntime } from "./router-url.ts";
import { UrlMatcher, type UrlMatcherCompileConfig } from "./url/url-matcher.ts";
import type { RawParams } from "./params/interface.ts";
import type { StateDeclaration } from "./state/interface.ts";
import type { Transition } from "./transition/transition.ts";
import type { StateObject } from "./state/state-object.ts";

/**
 * Mutable router state/config shared across state, URL, and transition services.
 *
 * @internal
 */
export class RouterProvider {
  /* @ignore */ static $inject = [_locationProvider];

  /** @internal */
  _stateService: ng.StateService | undefined;
  /** @internal */
  _routeTable: RouteTable;
  /** @internal */
  _urlRuntime: RouterUrlRuntime;
  /** @internal */
  _isCaseInsensitive: boolean;
  /** @internal */
  _isStrictMode: boolean;
  /** @internal */
  _defaultSquashPolicy: boolean | string;
  /** @internal */
  _paramTypes: ParamTypeMap;
  /** @internal */
  _paramFactory: ParamFactory;
  /** @internal */
  _params: StateParams;
  /** @internal */
  _lastStartedTransitionId: number;
  /** @internal */
  _lastStartedTransition: Transition | undefined;
  /** @internal */
  _lastSuccessfulTransition: Transition | undefined;
  /** @internal */
  _successfulTransitionCleanup: ((trans: Transition) => void) | undefined;
  /** @internal */
  _injector: ng.InjectorService | undefined;
  /** @internal */
  _current: StateDeclaration | undefined;
  /** @internal */
  _currentState: StateObject | undefined;
  /** @internal */
  _transition: Transition | undefined;

  /**
   * Creates the shared mutable router globals container.
   */
  constructor($locationProvider: ng.LocationProvider) {
    this._stateService = undefined;
    this._routeTable = new RouteTable();
    this._urlRuntime = new RouterUrlRuntime($locationProvider);
    this._isCaseInsensitive = false;
    this._isStrictMode = true;
    this._defaultSquashPolicy = false;
    this._paramTypes = createDefaultParamTypes();
    this._paramFactory = new ParamFactory(this);
    this._params = new StateParams();
    this._lastStartedTransitionId = -1;
    this._lastStartedTransition = undefined;
    this._lastSuccessfulTransition = undefined;
    this._successfulTransitionCleanup = undefined;
    this._injector = undefined;
    this._current = undefined;
    this._currentState = undefined;
    this._transition = undefined;
  }

  /** @internal */
  _setSuccessfulTransition(trans: Transition): void {
    if (this._lastSuccessfulTransition && this._successfulTransitionCleanup) {
      this._successfulTransitionCleanup(this._lastSuccessfulTransition);
    }

    this._lastSuccessfulTransition = trans;
  }

  /** @internal */
  _getDefaultSquashPolicy(): boolean | string {
    return this._defaultSquashPolicy;
  }

  $get = [
    _location,
    _injector,
    /**
     * Returns the singleton router internals instance.
     */
    ($location: ng.LocationService, $injector: ng.InjectorService) => {
      this._urlRuntime._init($location);
      this._paramFactory._injector = $injector;

      return this;
    },
  ];

  /** @internal */
  _sync(evt?: ng.ScopeEvent): void {
    if (evt?.defaultPrevented) return;

    const best = this._routeTable._match(
      this._urlRuntime._path(),
      this._urlRuntime._search(),
      this._urlRuntime._hash(),
    );

    if (!best) return;

    this._transitionToStateRoute(best.state, best.match);
  }

  /** @internal */
  _transitionToStateRoute(state: StateObject, params: RawParams): void {
    const $state = this._stateService;

    if (!$state) return;

    const { current } = $state;

    const currentHref = current ? $state.href(current, this._params) : null;

    if ($state.href(state, params) !== currentHref) {
      void $state.transitionTo(state, params, { inherit: true, source: "url" });
    }
  }

  /** @internal */
  _compile(urlPattern: string, config?: UrlMatcherCompileConfig): UrlMatcher {
    const globalConfig = {
      state: { params: {} },
      strict: this._isStrictMode,
      caseInsensitive: this._isCaseInsensitive,
    };

    return new UrlMatcher(
      urlPattern,
      this._paramTypes,
      this._paramFactory,
      assign(globalConfig, config) as UrlMatcherCompileConfig,
    );
  }
}
