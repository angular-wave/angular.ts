import { assign } from "../shared/utils.ts";
import { ParamType } from "./params/param-type.ts";
import { ParamFactory } from "./params/param-factory.ts";
import {
  createDefaultParamTypes,
  type ParamTypeMap,
} from "./params/param-types.ts";
import { StateParams } from "./params/state-params.ts";
import { RouteTable } from "./route-table.ts";
import { RouterUrlRuntime } from "./router-url.ts";
import { UrlMatcher, type UrlMatcherCompileConfig } from "./url/url-matcher.ts";
import type { ParamTypeDefinition, RawParams } from "./params/interface.ts";
import type {
  StateDeclaration,
  StateRetentionPolicyDeclaration,
  StateTransitionPolicyDeclaration,
} from "./state/interface.ts";
import type { Transition } from "./transition/transition.ts";
import type { InternalTransitionOptions } from "./transition/interface.ts";
import type { StateObject } from "./state/state-object.ts";
import type { StateRuntime } from "./state/state-service.ts";
import type { LocationConfig } from "../services/location/location.ts";

export interface RouterScrollOptions {
  behavior?: ScrollBehavior;
  left?: number;
  top?: number;
  selector?: string;
}

export type RouterScrollConfig =
  | boolean
  | "top"
  | "hash"
  | "preserve"
  | RouterScrollOptions;

export interface RouterFocusOptions {
  selector?: string;
  preventScroll?: boolean;
}

export type RouterFocusConfig = boolean | string | RouterFocusOptions;

export interface RouterConfig {
  strict?: boolean;
  caseInsensitive?: boolean;
  defaultSquash?: boolean | string;
  paramTypes?: Record<string, Partial<ParamTypeDefinition>>;
  scroll?: RouterScrollConfig;
  focus?: RouterFocusConfig;
  viewTransitions?: boolean;
  loading?: StateTransitionPolicyDeclaration["loading"];
  retry?: StateTransitionPolicyDeclaration["retry"];
  fallbackTo?: StateTransitionPolicyDeclaration["fallbackTo"];
  error?: StateTransitionPolicyDeclaration["error"];
  errorBoundary?: StateTransitionPolicyDeclaration["errorBoundary"];
  retention?: StateRetentionPolicyDeclaration;
}

/**
 * Mutable router state/config shared across state, URL, and transition services.
 */
export class RouterRuntimeState {
  /** @internal */
  _stateService: StateRuntime | undefined;
  /** @internal */
  _routeTable: RouteTable;
  /** @internal */
  _urlRuntime: RouterUrlRuntime;
  /** @internal */
  _isCaseInsensitive: boolean;
  /** @internal */
  _isStrictMode: boolean;
  /** @internal */
  _defaultSquash: boolean | string;
  /** @internal */
  _paramTypes: ParamTypeMap;
  /** @internal */
  _paramFactory: ParamFactory;
  /** @internal */
  _params: StateParams;
  /** @internal */
  _scroll: RouterScrollConfig | undefined;
  /** @internal */
  _focus: RouterFocusConfig | undefined;
  /** @internal */
  _viewTransitions: boolean | undefined;
  /** @internal */
  _loading: StateTransitionPolicyDeclaration["loading"] | undefined;
  /** @internal */
  _retry: StateTransitionPolicyDeclaration["retry"] | undefined;
  /** @internal */
  _fallbackTo: StateTransitionPolicyDeclaration["fallbackTo"] | undefined;
  /** @internal */
  _error: StateTransitionPolicyDeclaration["error"] | undefined;
  /** @internal */
  _errorBoundary: StateTransitionPolicyDeclaration["errorBoundary"] | undefined;
  /** @internal */
  _retention: StateRetentionPolicyDeclaration | undefined;
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
  constructor(locationConfig: LocationConfig) {
    this._stateService = undefined;
    this._routeTable = new RouteTable();
    this._urlRuntime = new RouterUrlRuntime(locationConfig);
    this._isCaseInsensitive = false;
    this._isStrictMode = true;
    this._defaultSquash = false;
    this._paramTypes = createDefaultParamTypes();
    this._paramFactory = new ParamFactory(this);
    this._params = new StateParams();
    this._scroll = undefined;
    this._focus = undefined;
    this._viewTransitions = undefined;
    this._loading = undefined;
    this._retry = undefined;
    this._fallbackTo = undefined;
    this._error = undefined;
    this._errorBoundary = undefined;
    this._retention = undefined;
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
  _getDefaultSquash(): boolean | string {
    return this._defaultSquash;
  }

  config(config: RouterConfig): void {
    if (config.strict !== undefined) {
      this._isStrictMode = config.strict;
    }

    if (config.caseInsensitive !== undefined) {
      this._isCaseInsensitive = config.caseInsensitive;
    }

    if (config.defaultSquash !== undefined) {
      this._defaultSquash = config.defaultSquash;
    }

    if (config.paramTypes !== undefined) {
      for (const [name, definition] of Object.entries(config.paramTypes)) {
        this._paramTypes[name] = new ParamType({
          name,
          ...definition,
        });
      }
    }

    if (config.scroll !== undefined) {
      this._scroll = config.scroll;
    }

    if (config.focus !== undefined) {
      this._focus = config.focus;
    }

    if (config.viewTransitions !== undefined) {
      this._viewTransitions = config.viewTransitions;
    }

    if (config.loading !== undefined) {
      this._loading = config.loading;
    }

    if (config.retry !== undefined) {
      this._retry = config.retry;
    }

    if (config.fallbackTo !== undefined) {
      this._fallbackTo = config.fallbackTo;
    }

    if (config.error !== undefined) {
      this._error = config.error;
    }

    if (config.errorBoundary !== undefined) {
      this._errorBoundary = config.errorBoundary;
    }

    if (config.retention !== undefined) {
      this._retention = config.retention;
    }
  }

  /** @internal */
  _initRuntime(
    $location: ng.LocationService,
    $injector: ng.InjectorService,
  ): this {
    this._urlRuntime._init($location);
    this._paramFactory._injector = $injector;

    return this;
  }

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
      void $state.transitionTo(state, params, {
        inherit: true,
        source: "url",
      } as InternalTransitionOptions);
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
