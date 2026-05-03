import {
  _injector,
  _location,
  _locationProvider,
} from "../injection-tokens.ts";
import { removeFrom } from "../shared/common.ts";
import { getBaseHref } from "../shared/dom.ts";
import { stripLastPathElement } from "../shared/strings.ts";
import { assign, isDefined, isInstanceOf, isNull } from "../shared/utils.ts";
import { ParamFactory } from "./params/param-factory.ts";
import {
  createDefaultParamTypes,
  type ParamTypeMap,
} from "./params/param-types.ts";
import { StateParams } from "./params/state-params.ts";
import {
  compareUrlMatchers,
  UrlMatcher,
  type UrlMatcherCompileConfig,
} from "./url/url-matcher.ts";
import type { RawParams } from "./params/interface.ts";
import type { StateDeclaration } from "./state/interface.ts";
import type { StateObject } from "./state/state-object.ts";
import type { Transition } from "./transition/transition.ts";

const EXACT_ROUTE_MATCH_PRIORITY = Number.EPSILON;

type MatchResult = {
  match: RawParams;
  state: StateObject;
  urlMatcher: UrlMatcher;
  weight: number;
};

/**
 * Mutable router state/config shared across state, URL, and transition services.
 *
 * @internal
 */
export class RouterProvider {
  /* @ignore */ static $inject = [_locationProvider];

  /** @internal */
  _location!: ng.LocationService;
  /** @internal */
  _locationProvider: ng.LocationProvider;
  /** @internal */
  _stateService: ng.StateService | undefined;
  /** @internal */
  _stateRoutes: StateObject[];
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
  _baseHref!: string;
  /** @internal */
  _lastUrl!: string;
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
    this._locationProvider = $locationProvider;
    this._stateService = undefined;
    this._stateRoutes = [];
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
      this._location = $location;
      this._paramFactory._injector = $injector;

      return this;
    },
  ];

  /** @internal */
  _getBaseHref(): string {
    return (
      this._baseHref ||
      (this._baseHref = getBaseHref() || window.location.pathname)
    );
  }

  /** @internal */
  _url(newUrl?: string, state?: unknown): string {
    if (isDefined(newUrl)) {
      this._location.setUrl(decodeURIComponent(newUrl));
    }

    if (state) this._location.setState(state);

    return this._location.getUrl();
  }

  /** @internal */
  _sync(evt?: ng.ScopeEvent): void {
    if (evt && evt.defaultPrevented) return;

    const best = this._match(
      this._location.getPath(),
      this._location.getSearch() as RawParams,
      this._location.getHash(),
    );

    if (!best) return;

    this._transitionToStateRoute(best.state, best.match);
  }

  /** @internal */
  _registerStateRoute(state: StateObject): void {
    if (!this._stateRoutes.includes(state)) {
      this._stateRoutes.push(state);
    }
  }

  /** @internal */
  _removeStateRoute(state: StateObject): void {
    removeFrom(this._stateRoutes, state);
  }

  /** @internal */
  _transitionToStateRoute(state: StateObject, params: RawParams): void {
    const $state = this._stateService;

    if (!$state) return;

    const { current } = $state;

    const currentHref = current ? $state.href(current, $state.params) : null;

    if ($state.href(state, params) !== currentHref) {
      $state.transitionTo(state, params, { inherit: true, source: "url" });
    }
  }

  /** @internal */
  _match(
    path: string,
    search: RawParams,
    hash: string,
  ): MatchResult | undefined {
    let best: MatchResult | undefined;

    this._stateRoutes.forEach((state) => {
      const urlMatcher = state._url;

      if (!isInstanceOf(urlMatcher, UrlMatcher)) return;

      const match = urlMatcher._exec(path, search, hash || "");

      if (match === null) return;

      const weight = stateRouteMatchPriority(urlMatcher, match);

      if (!best) {
        best = { match, state, urlMatcher, weight };

        return;
      }

      const specificity = compareUrlMatchers(urlMatcher, best.urlMatcher);

      if (specificity < 0 || (specificity === 0 && weight > best.weight)) {
        best = { match, state, urlMatcher, weight };
      }
    });

    return best;
  }

  /** @internal */
  _update(read?: boolean | undefined): void {
    if (read) {
      this._lastUrl = this._url();

      return;
    }

    if (this._url() === this._lastUrl) return;
    this._url(this._lastUrl, true);
  }

  /** @internal */
  _push(
    urlMatcher: UrlMatcher,
    params: StateParams,
    options: { replace?: boolean },
  ): void {
    const url = urlMatcher._format(params || {});

    if (!isNull(url)) {
      this._url(url, options && !!options.replace);
    }
  }

  /** @internal */
  _href(
    urlMatcher: UrlMatcher,
    params: RawParams,
    options: { absolute?: boolean },
  ): string | null {
    let url = urlMatcher._format(params);

    if (isNull(url)) return null;
    options = options || { absolute: false };
    const isHtml5 = this._locationProvider.html5ModeConf.enabled;

    if (!isHtml5) {
      url = `#${this._locationProvider.hashPrefixConf}${url}`;
    }
    url = appendBasePath(url, isHtml5, options.absolute, this._getBaseHref());

    if (!options.absolute || !url) {
      return url;
    }
    const slash = !isHtml5 && url ? "/" : "";

    return [
      `${window.location.protocol}//`,
      window.location.host,
      slash,
      url,
    ].join("");
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

function stateRouteMatchPriority(
  urlMatcher: UrlMatcher,
  params: RawParams,
): number {
  const path = urlMatcher._cache._path || [urlMatcher];

  let optionalCount = 0;

  let matched = 0;

  path.forEach((matcher) => {
    matcher._params.forEach((param) => {
      if (!param.isOptional) return;
      optionalCount++;

      if (params[param.id]) matched++;
    });
  });

  return optionalCount ? matched / optionalCount : EXACT_ROUTE_MATCH_PRIORITY;
}

function appendBasePath(
  url: string,
  isHtml5: boolean,
  absolute: boolean | undefined,
  baseHref: string,
): string {
  if (baseHref === "/") return url;

  if (isHtml5) return stripLastPathElement(baseHref) + url;

  if (absolute) return baseHref.slice(1) + url;

  return url;
}
