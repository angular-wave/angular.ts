import {
  isDefined,
  isFunction,
  isNull,
  isObject,
  isString,
} from "../../shared/utils.js";
import { is, pattern } from "../../shared/hof.js";
import { UrlRules } from "./url-rules.js";
import { TargetState } from "../state/target-state.js";
import { removeFrom } from "../../shared/common.js";
import { stripLastPathElement } from "../../shared/strings.js";
import { UrlMatcher } from "./url-matcher.js";
import { ParamFactory } from "../params/param-factory.js";
import { UrlRuleFactory } from "./url-rule.js";
import { getBaseHref } from "../../shared/dom.js";
import { $injectTokens as $t, provider } from "../../injection-tokens.js";

/**
 * API for URL management
 */
export class UrlService {
  /* @ignore */ static $inject = provider([
    $t.$location,
    $t.$state,
    $t.$router,
    $t.$urlConfig,
  ]);

  /** @type {import("../../services/location/location").Location} */
  $location;

  /**
   * @param {import("../../services/location/location").LocationProvider} $locationProvider
   * @param {import("../../router/state/state-service.js").StateProvider} stateService
   * @param {import("../router.js").Router} globals
   * @param {import("../../router/url/url-config.js").UrlConfigProvider} urlConfigProvider
   */
  constructor($locationProvider, stateService, globals, urlConfigProvider) {
    this.$locationProvider = $locationProvider;
    this.stateService = stateService;
    this.stateService.urlService = this; // circular wiring

    /** Provides services related to the URL */
    this.urlRuleFactory = new UrlRuleFactory(this, this.stateService, globals);

    /**
     * The nested [[UrlRules]] API for managing URL rules and rewrites
     * @type {UrlRules}
     */
    this.rules = new UrlRules(this.urlRuleFactory);
    /**
     * The nested [[UrlConfig]] API to configure the URL and retrieve URL information
     * @type {import("./url-config.js").UrlConfigProvider}
     */
    this.config = urlConfigProvider;

    /** Creates a new [[Param]] for a given location (DefType) */
    this.paramFactory = new ParamFactory(this.config);

    this._urlListeners = [];
  }

  /**
   * Gets the path part of the current url
   *
   * If the current URL is `/some/path?query=value#anchor`, this returns `/some/path`
   *
   * @return {string} the path portion of the url
   */
  getPath() {
    return this.$location.getPath();
  }

  /**
   * Gets the search part of the current url as an object
   *
   * If the current URL is `/some/path?query=value#anchor`, this returns `{ query: 'value' }`
   *
   * @return {Object} the search (query) portion of the url, as an object
   */
  getSearch() {
    return this.$location.getSearch();
  }

  /**
   * Gets the hash part of the current url
   *
   * If the current URL is `/some/path?query=value#anchor`, this returns `anchor`
   *
   * @return {string} the hash (anchor) portion of the url
   */
  getHash() {
    return this.$location.getHash();
  }

  $get = [
    $t.$location,
    $t.$rootScope,
    /**
     *
     * @param {ng.LocationService} $location
     * @param {ng.Scope} $rootScope
     * @returns {UrlService}
     */
    ($location, $rootScope) => {
      this.$location = $location;
      $rootScope.$on("$locationChangeSuccess", (evt) => {
        this._urlListeners.forEach((fn) => {
          fn(evt);
        });
      });
      this.listen(true);

      return this;
    },
  ];

  /**
   * @returns {string}
   */
  baseHref() {
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
  url(newUrl, state) {
    if (isDefined(newUrl)) {
      const decodeUri = decodeURIComponent(newUrl);

      this.$location.setUrl(decodeUri);
    }

    if (state) this.$location.setState(state);

    return this.$location.getUrl();
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
   * @param {Function} callback a function that will be called when the url is changing
   * @return {Function} a function that de-registers the callback
   */
  onChange(callback) {
    this._urlListeners.push(callback);

    return () => removeFrom(this._urlListeners, callback);
  }

  /**
   * Gets the current URL parts.
   *
   * Returns an object with the `path`, `search`, and `hash` components
   * of the current browser location.
   *
   * @returns {import("../../services/location/interface.ts").UrlParts} The current URL's path, search, and hash.
   */
  parts() {
    return {
      path: this.$location.getPath(),
      search: this.$location.getSearch(),
      hash: this.$location.getHash(),
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
   */
  sync(evt) {
    if (evt && evt.defaultPrevented) return;
    const { stateService } = this;

    const url = {
      path: this.$location.getPath(),
      search: this.$location.getSearch(),
      hash: this.$location.getHash(),
    };

    /**
     * @type {*}
     */
    const best = this.match(url);

    const applyResult = pattern([
      [isString, (newurl) => this.url(newurl)],
      [
        TargetState.isDef,
        (def) => stateService.go(def.state, def.params, def.options),
      ],
      [
        is(TargetState),
        (target) =>
          stateService.go(target.state(), target.params(), target.options()),
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
  listen(enabled) {
    if (enabled === false) {
      this._stopListeningFn && this._stopListeningFn();
      delete this._stopListeningFn;

      return undefined;
    } else {
      return (this._stopListeningFn =
        this._stopListeningFn || this.onChange((evt) => this.sync(evt)));
    }
  }

  /**
   * Matches a URL
   *
   * Given a URL (as a [[UrlParts]] object), check all rules and determine the best matching rule.
   * Return the result as a [[MatchResult]].
   * @returns {any}
   */
  match(url) {
    url = Object.assign({ path: "", search: {}, hash: "" }, url);
    const rules = this.rules.rules();

    // Checks a single rule. Returns { rule: rule, match: match, weight: weight } if it matched, or undefined
    /**
     *
     * @param {import("./url-rule").BaseUrlRule} rule
     */
    const checkRule = (rule) => {
      const match = rule.match(url);

      return match && { match, rule, weight: rule.matchPriority(match) };
    };

    // The rules are pre-sorted.
    // - Find the first matching rule.
    // - Find any other matching rule that sorted *exactly the same*, according to `.sort()`.
    // - Choose the rule with the highest match weight.
    let best;

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

  update(read) {
    if (read) {
      this.location = this.url();

      return;
    }

    if (this.url() === this.location) return;
    this.url(/** @type {string} */ (this.location), true);
  }

  /**
   * Internal API.
   *
   * Pushes a new location to the browser history.
   *
   * @internal
   * @param urlMatcher
   * @param params
   * @param options
   */
  push(urlMatcher, params, options) {
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
   *
   * @param urlMatcher The [[UrlMatcher]] object which is used as the template of the URL to generate.
   * @param params An object of parameter values to fill the matcher's required parameters.
   * @param options Options object. The options are:
   *
   * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
   *
   * @returns Returns the fully compiled URL, or `null` if `params` fail validation against `urlMatcher`
   */
  href(urlMatcher, params, options) {
    let url = urlMatcher.format(params);

    if (isNull(url)) return null;
    options = options || { absolute: false };
    const isHtml5 = this.$locationProvider.html5ModeConf.enabled;

    if (!isHtml5) {
      url = `#${this.$locationProvider.hashPrefixConf}${url}`;
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
   * @param urlPattern  The URL pattern.
   * @param config  The config object hash.
   * @returns The UrlMatcher.
   */
  compile(urlPattern, config) {
    const urlConfig = this.config;

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
      this.paramFactory,
      Object.assign(globalConfig, config),
    );
  }

  /**
   * Returns true if the specified object is a [[UrlMatcher]], or false otherwise.
   *
   * @param object  The object to perform the type check against.
   * @returns `true` if the object matches the `UrlMatcher` interface, by
   *          implementing all the same methods.
   */
  isMatcher(object) {
    // TODO: typeof?
    if (!isObject(object)) return false;
    let result = true;

    Object.entries(UrlMatcher.prototype).forEach(([name, val]) => {
      if (isFunction(val))
        result = result && isDefined(object[name]) && isFunction(object[name]);
    });

    return result;
  }
}

function appendBasePath(url, isHtml5, absolute, baseHref) {
  if (baseHref === "/") return url;

  if (isHtml5) return stripLastPathElement(baseHref) + url;

  if (absolute) return baseHref.slice(1) + url;

  return url;
}
