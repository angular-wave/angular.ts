import {
  _location,
  _locationProvider,
  _rootScope,
  _routerProvider,
  _urlConfigProvider,
} from "../../injection-tokens.ts";
import {
  assign,
  isDefined,
  isFunction,
  isInstanceOf,
  isNull,
  isObject,
} from "../../shared/utils.ts";
import { removeFrom } from "../../shared/common.ts";
import { stripLastPathElement } from "../../shared/strings.ts";
import { UrlMatcher } from "./url-matcher.ts";
import { ParamFactory } from "../params/param-factory.ts";
import { getBaseHref } from "../../shared/dom.ts";
import type {
  MatchResult,
  UrlMatcherCompileConfig,
  UrlParts,
} from "./interface.ts";
import type { StateProvider } from "../../router/state/state-service.ts";
import type { UrlConfigProvider } from "./url-config.ts";
import type { UrlConfigProvider as UrlConfigProviderType } from "../../router/url/url-config.ts";
import type { StateObject } from "../state/state-object.ts";
import type { RawParams } from "../params/interface.ts";
import type { StateParams } from "../params/state-params.ts";

const EXACT_ROUTE_MATCH_PRIORITY = Number.EPSILON;

/**
 * API for URL management
 */
export class UrlService {
  /* @ignore */ static $inject = [
    _locationProvider,
    _routerProvider,
    _urlConfigProvider,
  ];

  $location: ng.LocationService | undefined;
  /** @internal */
  _locationProvider: ng.LocationProvider;
  /** @internal */
  _stateService: StateProvider | undefined;
  /** @internal */
  _stateRoutes: StateObject[];
  /** @internal */
  _markConfiguredRouting: () => void;
  /** @internal */
  _config: UrlConfigProvider;
  /** @internal */
  _paramFactory: ParamFactory;
  /** @internal */
  _urlListeners: ((evt: ng.ScopeEvent) => void)[];
  /** @internal */
  _baseHref!: string;
  /** @internal */
  _stopListeningFn?: () => void;
  location!: string;

  /**
   * The runtime location service is only available after `$get` runs.
   * Guard access here so the rest of the methods can use a non-optional type.
   */
  /** @internal */
  _getLocation(): ng.LocationService {
    if (!this.$location) {
      throw new Error("UrlService location is not initialized");
    }

    return this.$location;
  }

  /** @internal */
  _getStateService(): StateProvider {
    if (!this._stateService) {
      throw new Error("UrlService state service is not initialized");
    }

    return this._stateService;
  }

  constructor(
    $locationProvider: ng.LocationProvider,
    router: Pick<ng._RouterProvider, "_markConfiguredRouting">,
    urlConfigProvider: UrlConfigProviderType,
  ) {
    this._locationProvider = $locationProvider;
    this._stateService = undefined;
    this._stateRoutes = [];
    this._markConfiguredRouting = () => router._markConfiguredRouting();
    this._config = urlConfigProvider;
    this._paramFactory = new ParamFactory(this._config);
    this._urlListeners = [];
  }

  /**
   * Gets the path part of the current url
   *
   * If the current URL is `/some/path?query=value#anchor`, this returns `/some/path`
   *
   * @return {string} the path portion of the url
   */
  getPath(): string {
    return this._getLocation().getPath();
  }

  /**
   * Gets the search part of the current url as an object
   *
   * If the current URL is `/some/path?query=value#anchor`, this returns `{ query: 'value' }`
   *
   * @return {Object} the search (query) portion of the url, as an object
   */
  getSearch(): object {
    return this._getLocation().getSearch();
  }

  /**
   * Gets the hash part of the current url
   *
   * If the current URL is `/some/path?query=value#anchor`, this returns `anchor`
   *
   * @return {string} the hash (anchor) portion of the url
   */
  getHash(): string {
    return this._getLocation().getHash();
  }

  $get = [
    _location,
    _rootScope,
    /**
     *
     * @param {ng.LocationService} $location
     * @param {ng.RootScopeService} $rootScope
     * @returns {ng.UrlService}
     */
    ($location: ng.LocationService, $rootScope: ng.RootScopeService) => {
      this.$location = $location;
      $rootScope.$on("$locationChangeSuccess", (evt: ng.ScopeEvent) => {
        for (let i = 0, j = this._urlListeners.length; i < j; i++) {
          this._urlListeners[i](evt);
        }
      });
      this.listen(true);

      return this;
    },
  ];

  /**
   * @returns {string}
   */
  baseHref(): string {
    return (
      this._baseHref ||
      (this._baseHref = getBaseHref() || window.location.pathname)
    );
  }

  /**
   * Gets the current url, or updates the url
   *
   * ### Getting the current URL
   *
   * When no arguments are passed, returns the current URL.
   * The URL is normalized using the internal [[path]]/[[search]]/[[hash]] values.
   *
   * For example, the URL may be stored in the hash ([[HashLocationServices]]) or
   * have a base HREF prepended ([[PushStateLocationServices]]).
   *
   * The raw URL in the browser might be:
   *
   * ```
   * http://mysite.com/somepath/index.html#/internal/path/123?param1=foo#anchor
   * ```
   *
   * or
   *
   * ```
   * http://mysite.com/basepath/internal/path/123?param1=foo#anchor
   * ```
   *
   * then this method returns:
   *
   * ```
   * /internal/path/123?param1=foo#anchor
   * ```
   *
   *
   * #### Example:
   * ```js
   * locationServices.url(); // "/some/path?query=value#anchor"
   * ```
   *
   * ### Updating the URL
   *
   * When `newurl` arguments is provided, changes the URL to reflect `newurl`
   *
   * #### Example:
   * ```js
   * locationServices.url("/some/path?query=value#anchor", true);
   * ```
   *
   * @param {string} [newUrl] The new value for the URL.
   *               This url should reflect only the new internal [[path]], [[search]], and [[hash]] values.
   *               It should not include the protocol, site, port, or base path of an absolute HREF.
   * @param {unknown} [state] The history's state object, i.e., pushState (if the LocationServices implementation supports it)
   *
   * @return the url (after potentially being processed)
   */
  url(newUrl?: string, state?: unknown): string {
    const location = this._getLocation();

    if (isDefined(newUrl)) {
      const decodeUri = decodeURIComponent(newUrl);

      location.setUrl(decodeUri);
    }

    if (state) location.setState(state);

    return location.getUrl();
  }

  /**
   * @private
   *
   * Registers a low level url change handler
   *
   * Note: Because this is a low level handler, it's not recommended for general use.
   *
   * #### Example:
   * ```js
   * let deregisterFn = locationServices.onChange((evt) => console.log("url change", evt));
   * ```
   *
   * @param {(evt: ng.ScopeEvent) => void} callback a function that will be called when the url is changing
   * @return {() => void} a function that de-registers the callback
   */
  onChange(callback: (evt: ng.ScopeEvent) => void): () => void {
    this._urlListeners.push(callback);

    return () => {
      removeFrom(this._urlListeners, callback);
    };
  }

  /**
   * Gets the current URL parts.
   *
   * Returns an object with the `path`, `search`, and `hash` components
   * of the current browser location.
   *
   * @returns {UrlParts} The current URL's path, search, and hash.
   */
  parts(): UrlParts {
    const location = this._getLocation();

    return {
      path: location.getPath(),
      search: location.getSearch(),
      hash: location.getHash(),
    };
  }

  /**
   * Activates the best rule for the current URL
   *
   * Checks the current URL for a matching state URL, then activates that state.
   * This method is called internally any time the URL has changed.
   *
   * This effectively activates the state (or redirect, etc) which matches the current URL.
   *
   * #### Example:
   * ```js
   *
   * fetch('/states.json').then(resp => resp.json()).then(data => {
   *   data.forEach(state => $stateRegistry.register(state));
   *   urlService.listen();
   *   // Find the matching URL and invoke the handler.
   *   urlService.sync();
   * });
   * ```
   * @param {ng.ScopeEvent | undefined} [evt]
   */
  sync(evt?: ng.ScopeEvent): void {
    if (evt && evt.defaultPrevented) return;

    const url = this.parts();

    const best = this.match(url);

    if (!best) return;

    this._transitionToStateRoute(best.state, best.match);
  }

  /** @internal */
  _registerStateRoute(state: StateObject): void {
    if (!this._stateRoutes.includes(state)) {
      this._stateRoutes.push(state);
      this._markConfiguredRouting();
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

  /**
   * Starts or stops listening for URL changes
   *
   * Call this sometime after calling [[deferIntercept]] to start monitoring the url.
   * This causes ng-router to start listening for changes to the URL, if it wasn't already listening.
   *
   * If called with `false`, ng-router will stop listening (call listen(true) to start listening again).
   *
   * #### Example:
   * ```js
   *
   * fetch('/states.json').then(resp => resp.json()).then(data => {
   *   data.forEach(state => $stateRegistry.register(state));
   *   // Start responding to URL changes
   *   urlService.listen();
   *   urlService.sync();
   * });
   * ```
   *
   * @param {boolean} enabled `true` or `false` to start or stop listening to URL changes
   */
  listen(enabled: boolean): (() => void) | undefined {
    if (enabled === false) {
      this._stopListeningFn && this._stopListeningFn();
      delete this._stopListeningFn;

      return undefined;
    } else {
      return (this._stopListeningFn =
        this._stopListeningFn ||
        this.onChange((evt: ng.ScopeEvent) => this.sync(evt)));
    }
  }

  /**
   * Given a URL (as a [[UrlParts]] object), check all state routes and determine the best match.
   * Return the result as a [[MatchResult]].
   * @param {UrlParts} url
   * @returns {MatchResult | undefined}
   */
  match(url: UrlParts): MatchResult | undefined {
    url = assign({ path: "", search: {}, hash: "" }, url);

    let best: MatchResult | undefined;

    for (let i = 0; i < this._stateRoutes.length; i++) {
      const state = this._stateRoutes[i];

      const urlMatcher = state.url;

      if (!isInstanceOf(urlMatcher, UrlMatcher)) continue;

      const match = urlMatcher.exec(url.path, url.search, url.hash || "");

      if (match === null || !urlMatcher.validates(match)) continue;

      const weight = stateRouteMatchPriority(urlMatcher, match);

      if (
        !best ||
        UrlMatcher.compare(urlMatcher, best.urlMatcher) < 0 ||
        (UrlMatcher.compare(urlMatcher, best.urlMatcher) === 0 &&
          weight > best.weight)
      ) {
        best = { match, state, urlMatcher, weight };
      }
    }

    return best;
  }

  /**
   * @param {boolean | undefined} [read]
   */
  update(read?: boolean | undefined): void {
    if (read) {
      this.location = this.url();

      return;
    }

    if (this.url() === this.location) return;
    this.url(this.location, true);
  }

  /**
   * Internal API.
   *
   * Pushes a new location to the browser history.
   * @internal
   * @param {{ format: (arg0: StateParams) => string | null; }} urlMatcher
   * @param {StateParams} params
   * @param {string} options
   */
  push(
    urlMatcher: { format: (arg0: StateParams) => string | null },
    params: StateParams,
    options: { replace?: boolean },
  ): void {
    const replace = options && !!options.replace;

    const url = urlMatcher.format(params || {});

    if (!isNull(url)) {
      this.url(url, replace);
    }
  }

  /**
     * Builds and returns a URL with interpolated parameters
     *
     * #### Example:
     * ```js
     * matcher = $umf.compile("/about/:person");
     * params = { person: "bob" };
     * $bob = $url.href(matcher, params);
     * // $bob == "/about/bob";
     * ```
     * @param {{ format: (arg0: RawParams) => string | null; }} urlMatcher The [[UrlMatcher]] object which is used as the template of the URL to generate.
     * @param {RawParams} params An object of parameter values to fill the matcher's required parameters.
     * @param {{ absolute?: boolean; }} options Options object. The options are:

    - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
     * @returns Returns the fully compiled URL, or `null` if `params` fail validation against `urlMatcher`
     */
  href(
    urlMatcher: { format: (arg0: RawParams) => string | null },
    params: RawParams,
    options: { absolute?: boolean },
  ): string | null {
    let url = urlMatcher.format(params);

    if (isNull(url)) return null;
    options = options || { absolute: false };
    const isHtml5 = this._locationProvider.html5ModeConf.enabled;

    if (!isHtml5) {
      url = `#${this._locationProvider.hashPrefixConf}${url}`;
    }
    url = appendBasePath(url, isHtml5, options.absolute, this.baseHref());

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

  /**
   * Creates a [[UrlMatcher]] for the specified pattern.
   *
   * @param {string} urlPattern  The URL pattern.
   * @param {*} [config]  The config object hash.
   * @returns The UrlMatcher.
   */
  compile(
    urlPattern: string,
    config?: UrlMatcherCompileConfig & { params?: RawParams },
  ) {
    const urlConfig = this._config;

    // backward-compatible support for config.params -> config.state.params
    const params = config && !config.state && config.params;

    config = params ? assign({ state: { params } }, config) : config;
    const globalConfig = {
      strict: urlConfig._isStrictMode,
      caseInsensitive: urlConfig._isCaseInsensitive,
    };

    return new UrlMatcher(
      urlPattern,
      urlConfig.paramTypes,
      this._paramFactory,
      assign(globalConfig, config) as UrlMatcherCompileConfig,
    );
  }

  /**
   * Returns true if the specified object is a [[UrlMatcher]], or false otherwise.
   *
   * @param {unknown} object  The object to perform the type check against.
   * @returns `true` if the object matches the `UrlMatcher` interface, by
   *          implementing all the same methods.
   */
  isMatcher(object: unknown): object is UrlMatcher {
    if (!isObject(object)) return false;
    const candidate = object as Record<string, unknown>;

    const { prototype } = UrlMatcher;

    const methodNames = Object.keys(prototype);

    for (let i = 0; i < methodNames.length; i++) {
      const { [i]: name } = methodNames;

      const val = Object.getOwnPropertyDescriptor(prototype, name)?.value;

      if (
        isFunction(val) &&
        (!isDefined(candidate[name]) || !isFunction(candidate[name]))
      ) {
        return false;
      }
    }

    return true;
  }
}

function stateRouteMatchPriority(
  urlMatcher: UrlMatcher,
  params: RawParams,
): number {
  const parameters = urlMatcher.parameters();

  let optionalCount = 0;

  let matched = 0;

  for (let i = 0; i < parameters.length; i++) {
    const param = parameters[i];

    if (!param.isOptional) continue;
    optionalCount++;

    if (params[param.id]) matched++;
  }

  return optionalCount ? matched / optionalCount : EXACT_ROUTE_MATCH_PRIORITY;
}

/**
 * @param {string} url
 * @param {boolean} isHtml5
 * @param {boolean | undefined} absolute
 * @param {string} baseHref
 */
function appendBasePath(
  url: string,
  isHtml5: boolean,
  absolute: boolean | undefined,
  baseHref: string,
) {
  if (baseHref === "/") return url;

  if (isHtml5) return stripLastPathElement(baseHref) + url;

  if (absolute) return baseHref.slice(1) + url;

  return url;
}
