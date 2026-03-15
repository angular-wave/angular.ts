import {
  entries,
  isDefined,
  isFunction,
  isNull,
  isObject,
  isString,
} from "../../shared/utils.js";
import { is, pattern } from "../../shared/hof.js";
import { UrlRules } from "./url-rules.ts";
import { TargetState } from "../state/target-state.ts";
import { removeFrom } from "../../shared/common.js";
import { stripLastPathElement } from "../../shared/strings.js";
import { UrlMatcher } from "./url-matcher.ts";
import { ParamFactory } from "../params/param-factory.ts";
import { UrlRuleFactory } from "./url-rule.ts";
import { getBaseHref } from "../../shared/dom.js";
import { $injectTokens as $t } from "../../injection-tokens.js";
import type { MatchResult, UrlParts } from "./interface.ts";

/**
 * API for URL management
 */
export class UrlService {
  /* @ignore */ static $inject = [
    $t._locationProvider,
    $t._stateProvider,
    $t._routerProvider,
    $t._urlConfigProvider,
  ];

  $location: ng.LocationService | undefined;
  _locationProvider: ng.LocationProvider;
  stateService: import("../../router/state/state-service.ts").StateProvider;
  _urlRuleFactory: UrlRuleFactory;
  _rules: UrlRules;
  _config: import("./url-config.ts").UrlConfigProvider;
  _paramFactory: ParamFactory;
  _urlListeners: ((evt: ng.ScopeEvent) => void)[];
  _baseHref!: string;
  _stopListeningFn: any;
  location!: string;

  /**
   * The runtime location service is only available after `$get` runs.
   * Guard access here so the rest of the methods can use a non-optional type.
   */
  _getLocation(): ng.LocationService {
    if (!this.$location) {
      throw new Error("UrlService location is not initialized");
    }

    return this.$location;
  }

  /**
   * @param {ng.LocationProvider} $locationProvider
   * @param {import("../../router/state/state-service.ts").StateProvider} stateProvider
   * @param {import("../router.ts").RouterProvider} globals
   * @param {import("../../router/url/url-config.ts").UrlConfigProvider} urlConfigProvider
   */
  constructor(
    $locationProvider: ng.LocationProvider,
    stateProvider: import("../../router/state/state-service.ts").StateProvider,
    globals: import("../router.ts").RouterProvider,
    urlConfigProvider: import("../../router/url/url-config.ts").UrlConfigProvider,
  ) {
    this._locationProvider = $locationProvider;
    this.stateService = stateProvider;

    /**
     * @type {UrlRuleFactory} Provides services related to the URL
     * @ignore
     */
    this._urlRuleFactory = new UrlRuleFactory(this, stateProvider, globals);

    /**
     * The nested [[UrlRules]] API for managing URL rules and rewrites
     * @ignore
     * @type {UrlRules}
     */
    this._rules = new UrlRules(this._urlRuleFactory);
    /**
     * The nested [[UrlConfig]] API to configure the URL and retrieve URL information
     * @ignore
     * @type {import("./url-config.js").UrlConfigProvider}
     */
    this._config = urlConfigProvider;

    /**
     * @type {ParamFactory} Creates a new [[Param]] for a given location (DefType)
     * @ignore
     */
    this._paramFactory = new ParamFactory(this._config);

    /**
     * @type {((evt: ng.ScopeEvent) => void)[]}
     * @ignore
     */
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
    $t._location,
    $t._rootScope,
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
   * @param {any} [state] The history's state object, i.e., pushState (if the LocationServices implementation supports it)
   *
   * @return the url (after potentially being processed)
   */
  url(newUrl?: string, state?: any): string {
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

    return () => removeFrom(this._urlListeners, callback);
  }

  /**
   * Gets the current URL parts.
   *
   * Returns an object with the `path`, `search`, and `hash` components
   * of the current browser location.
   *
   * @returns {import("../../services/location/location.ts").UrlParts} The current URL's path, search, and hash.
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
   * Checks the current URL for a matching [[UrlRule]], then invokes that rule's handler.
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
   * @param {import("../../core/scope/scope.ts").ScopeEvent | undefined} [evt]
   */
  sync(evt?: ng.ScopeEvent): void {
    if (evt && evt.defaultPrevented) return;
    const { stateService } = this;
    const url = this.parts();

    /**
     * @type {*}
     */
    const best = this.match(url);

    const applyResult = pattern([
      [isString, (newurl: string | undefined) => this.url(newurl)],
      [
        TargetState.isDef,
        (def: import("../state/interface.ts").TargetStateDef) =>
          stateService.go(
            /** @type {string} */ def.state,
            def.params,
            def.options,
          ),
      ],
      [
        is(TargetState),
        (target: TargetState) => {
          const targetState = target.state();

          return targetState
            ? stateService.go(targetState, target.params(), target.options())
            : undefined;
        },
      ],
    ]);

    applyResult(best && best.rule.handler(best.match, url));
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
   * Given a URL (as a [[UrlParts]] object), check all rules and determine the best matching rule.
   * Return the result as a [[MatchResult]].
   * @param {import("../../docs.ts").UrlParts} url
   * @returns {any}
   */
  match(url: UrlParts): MatchResult | undefined {
    url = Object.assign({ path: "", search: {}, hash: "" }, url);
    const rules = this._rules.rules();

    // Checks a single rule. Returns { rule: rule, match: match, weight: weight } if it matched, or undefined
    /**
     *
     * @param {import("./interface.ts").UrlRule} rule
     */
    const checkRule = (rule: import("./interface.ts").UrlRule) => {
      const match = rule.match(url);

      return match && { match, rule, weight: rule.matchPriority(match) };
    };

    // The rules are pre-sorted.
    // - Find the first matching rule.
    // - Find any other matching rule that sorted *exactly the same*, according to `.sort()`.
    // - Choose the rule with the highest match weight.
    let best: MatchResult | undefined;

    for (let i = 0; i < rules.length; i++) {
      // Stop when there is a 'best' rule and the next rule sorts differently than it.
      if (best && best.rule._group !== rules[i]._group) break;
      const current = checkRule(rules[i]);

      // Pick the best MatchResult
      best =
        !best || (current && current.weight > best.weight) ? current : best;
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
    this.url(/** @type {string} */ this.location, true);
  }

  /**
   * Internal API.
   *
   * Pushes a new location to the browser history.
   * @internal
   * @param {{ format: (arg0: any) => string | undefined; }} urlMatcher
   * @param {import("../params/state-params.ts").StateParams} params
   * @param {string} options
   */
  push(
    urlMatcher: { format: (arg0: any) => string | undefined },
    params: import("../params/state-params.ts").StateParams,
    options: { replace?: boolean },
  ): void {
    const replace = options && !!options.replace;

    this.url(urlMatcher.format(params || {}), replace);
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
     * @param {{ format: (arg0: any) => any; }} urlMatcher The [[UrlMatcher]] object which is used as the template of the URL to generate.
     * @param {Object} params An object of parameter values to fill the matcher's required parameters.
     * @param {{ absolute: any; }} options Options object. The options are:

    - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
     * @returns Returns the fully compiled URL, or `null` if `params` fail validation against `urlMatcher`
     */
  href(
    urlMatcher: { format: (arg0: any) => any },
    params: object,
    options: { absolute: any },
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
  compile(urlPattern: string, config?: any) {
    const urlConfig = this._config;

    // backward-compatible support for config.params -> config.state.params
    const params = config && !config.state && config.params;

    config = params ? Object.assign({ state: { params } }, config) : config;
    const globalConfig = {
      strict: urlConfig._isStrictMode,
      caseInsensitive: urlConfig._isCaseInsensitive,
    };

    return new UrlMatcher(
      urlPattern,
      urlConfig.paramTypes,
      this._paramFactory,
      Object.assign(globalConfig, config),
    );
  }

  /**
   * Returns true if the specified object is a [[UrlMatcher]], or false otherwise.
   *
   * @param {UrlMatcher & Record<string, any>} object  The object to perform the type check against.
   * @returns `true` if the object matches the `UrlMatcher` interface, by
   *          implementing all the same methods.
   */
  isMatcher(object: UrlMatcher & Record<string, any>): boolean {
    if (!isObject(object)) return false;
    let result = true;

    entries(UrlMatcher.prototype as unknown as Record<string, unknown>).forEach(
      ([name, val]) => {
        if (isFunction(val))
          result =
            result && isDefined(object[name]) && isFunction(object[name]);
      },
    );

    return result;
  }
}

/**
 * @param {string} url
 * @param {boolean} isHtml5
 * @param {any} absolute
 * @param {string} baseHref
 */
function appendBasePath(
  url: string,
  isHtml5: boolean,
  absolute: any,
  baseHref: string,
) {
  if (baseHref === "/") return url;

  if (isHtml5) return stripLastPathElement(baseHref) + url;

  if (absolute) return baseHref.slice(1) + url;

  return url;
}
