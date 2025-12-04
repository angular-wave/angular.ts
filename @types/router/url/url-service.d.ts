/**
 * API for URL management
 */
export class UrlService {
  static $inject: string[];
  /**
   * @param {import("../../services/location/location").LocationProvider} $locationProvider
   * @param {import("../../router/state/state-service.js").StateProvider} stateService
   * @param {import("../router.js").Router} globals
   * @param {import("../../router/url/url-config.js").UrlConfigProvider} urlConfigProvider
   */
  constructor(
    $locationProvider: any,
    stateService: import("../../router/state/state-service.js").StateProvider,
    globals: import("../router.js").Router,
    urlConfigProvider: import("../../router/url/url-config.js").UrlConfigProvider,
  );
  /** @type {import("../../services/location/location").Location} */
  $location: any;
  $locationProvider: any;
  stateService: import("../../router/state/state-service.js").StateProvider;
  /** Provides services related to the URL */
  urlRuleFactory: UrlRuleFactory;
  /**
   * The nested [[UrlRules]] API for managing URL rules and rewrites
   * @type {UrlRules}
   */
  rules: UrlRules;
  /**
   * The nested [[UrlConfig]] API to configure the URL and retrieve URL information
   * @type {import("./url-config.js").UrlConfigProvider}
   */
  config: import("./url-config.js").UrlConfigProvider;
  /** Creates a new [[Param]] for a given location (DefType) */
  paramFactory: ParamFactory;
  _urlListeners: any[];
  /**
   * Gets the path part of the current url
   *
   * If the current URL is `/some/path?query=value#anchor`, this returns `/some/path`
   *
   * @return {string} the path portion of the url
   */
  getPath(): string;
  /**
   * Gets the search part of the current url as an object
   *
   * If the current URL is `/some/path?query=value#anchor`, this returns `{ query: 'value' }`
   *
   * @return {Object} the search (query) portion of the url, as an object
   */
  getSearch(): any;
  /**
   * Gets the hash part of the current url
   *
   * If the current URL is `/some/path?query=value#anchor`, this returns `anchor`
   *
   * @return {string} the hash (anchor) portion of the url
   */
  getHash(): string;
  $get: (
    | string
    | (($location: ng.LocationService, $rootScope: ng.Scope) => UrlService)
  )[];
  /**
   * @returns {string}
   */
  baseHref(): string;
  _baseHref: string;
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
  url(newUrl?: string, state?: any): any;
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
  private onChange;
  /**
   * Gets the current URL parts.
   *
   * Returns an object with the `path`, `search`, and `hash` components
   * of the current browser location.
   *
   * @returns {import("../../services/location/interface.ts").UrlParts} The current URL's path, search, and hash.
   */
  parts(): import("../../services/location/interface.ts").UrlParts;
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
  sync(evt: any): void;
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
  listen(enabled: boolean): any;
  _stopListeningFn: any;
  /**
   * Matches a URL
   *
   * Given a URL (as a [[UrlParts]] object), check all rules and determine the best matching rule.
   * Return the result as a [[MatchResult]].
   * @returns {any}
   */
  match(url: any): any;
  update(read: any): void;
  location: any;
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
  push(urlMatcher: any, params: any, options: any): void;
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
  href(urlMatcher: any, params: any, options: any): any;
  /**
   * Creates a [[UrlMatcher]] for the specified pattern.
   *
   * @param urlPattern  The URL pattern.
   * @param config  The config object hash.
   * @returns The UrlMatcher.
   */
  compile(urlPattern: any, config: any): UrlMatcher;
  /**
   * Returns true if the specified object is a [[UrlMatcher]], or false otherwise.
   *
   * @param object  The object to perform the type check against.
   * @returns `true` if the object matches the `UrlMatcher` interface, by
   *          implementing all the same methods.
   */
  isMatcher(object: any): boolean;
}
import { UrlRuleFactory } from "./url-rule.js";
import { UrlRules } from "./url-rules.js";
import { ParamFactory } from "../params/param-factory.js";
import { UrlMatcher } from "./url-matcher.js";
