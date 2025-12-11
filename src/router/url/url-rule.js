import { UrlMatcher } from "./url-matcher.js";
import {
  assert,
  isDefined,
  isFunction,
  isString,
  isUndefined,
} from "../../shared/utils.js";
import { is, pattern } from "../../shared/hof.js";
import { StateObject } from "../state/state-object.js";
/**
 * Creates a [[UrlRule]]
 *
 * Creates a [[UrlRule]] from a:
 *
 * - `string`
 * - [[UrlMatcher]]
 * - `RegExp`
 * - [[StateObject]]
 */

const LOWEST = 0.000001;

export class UrlRuleFactory {
  /**
   * @param {ng.UrlService} urlService
   * @param {ng.StateService} stateService
   * @param {ng.RouterService} routerGlobals
   */
  constructor(urlService, stateService, routerGlobals) {
    /** @type {ng.UrlService} */
    this.urlService = urlService;

    /** @type {ng.StateService} */
    this.stateService = stateService;

    /** @type {ng.RouterService} */
    this.routerGlobals = routerGlobals;
  }

  /**
   *
   * @param {*} what
   * @param {*} handler
   * @returns {BaseUrlRule}
   */
  create(what, handler) {
    const { isState, isStateDeclaration } = StateObject;

    const makeRule = pattern([
      [isString, (_what) => makeRule(this.urlService.compile(_what))],
      [is(UrlMatcher), (_what) => this.fromUrlMatcher(_what, handler)],
      [
        (...args) => isState(...args) || isStateDeclaration(...args),
        (_what) => this.fromState(_what, this.stateService, this.routerGlobals),
      ],
      [is(RegExp), (_what) => this.fromRegExp(_what, handler)],
      [isFunction, (_what) => new BaseUrlRule(_what, handler)],
    ]);

    const rule = makeRule(what);

    if (!rule) throw new Error("invalid 'what' in when()");

    return rule;
  }

  /**
   * A UrlRule which matches based on a UrlMatcher
   *
   * The `handler` may be either a `string`, a [[UrlRuleHandlerFn]] or another [[UrlMatcher]]
   *
   * ## Handler as a function
   *
   * If `handler` is a function, the function is invoked with:
   *
   * - matched parameter values ([[RawParams]] from [[UrlMatcher.exec]])
   * - url: the current Url ([[UrlParts]])
   * - router: the router object ([[UIRouter]])
   *
   * #### Example:
   * ```js
   * var urlMatcher = $umf.compile("/foo/:fooId/:barId");
   * var rule = factory.fromUrlMatcher(urlMatcher, match => "/home/" + match.fooId + "/" + match.barId);
   * var match = rule.match('/foo/123/456'); // results in { fooId: '123', barId: '456' }
   * var result = rule.handler(match); // '/home/123/456'
   * ```
   *
   * ## Handler as UrlMatcher
   *
   * If `handler` is a UrlMatcher, the handler matcher is used to create the new url.
   * The `handler` UrlMatcher is formatted using the matched param from the first matcher.
   * The url is replaced with the result.
   *
   * #### Example:
   * ```js
   * var urlMatcher = $umf.compile("/foo/:fooId/:barId");
   * var handler = $umf.compile("/home/:fooId/:barId");
   * var rule = factory.fromUrlMatcher(urlMatcher, handler);
   * var match = rule.match('/foo/123/456'); // results in { fooId: '123', barId: '456' }
   * var result = rule.handler(match); // '/home/123/456'
   * ```
   */
  fromUrlMatcher(urlMatcher, handler) {
    let _handler = handler;

    if (isString(handler)) handler = this.urlService.compile(handler);

    if (is(UrlMatcher)(handler)) _handler = (match) => handler.format(match);
    function matchUrlParamters(url) {
      const params = urlMatcher.exec(url.path, url.search, url.hash);

      return urlMatcher.validates(params) && params;
    }
    // Prioritize URLs, lowest to highest:
    // - Some optional URL parameters, but none matched
    // - No optional parameters in URL
    // - Some optional parameters, some matched
    // - Some optional parameters, all matched
    function matchPriority(params) {
      const optional = urlMatcher
        .parameters()
        .filter((param) => param.isOptional);

      if (!optional.length) return LOWEST;
      const matched = optional.filter((param) => params[param.id]);

      return matched.length / optional.length;
    }
    const details = { urlMatcher, matchPriority, type: "URLMATCHER" };

    return Object.assign(new BaseUrlRule(matchUrlParamters, _handler), details);
  }

  /**
   * A UrlRule which matches a state by its url
   *
   * #### Example:
   * ```js
   * var rule = factory.fromState($state.get('foo'), router);
   * var match = rule.match('/foo/123/456'); // results in { fooId: '123', barId: '456' }
   * var result = rule.handler(match);
   * // Starts a transition to 'foo' with params: { fooId: '123', barId: '456' }
   * ```
   */
  fromState(stateOrDecl, stateService, globals) {
    const state = StateObject.isStateDeclaration(stateOrDecl)
      ? stateOrDecl.$$state()
      : stateOrDecl;

    /**
     * Handles match by transitioning to matched state
     *
     * First checks if the router should start a new transition.
     * A new transition is not required if the current state's URL
     * and the new URL are already identical
     */
    const handler = (match) => {
      const $state = stateService;

      if (
        $state.href(state, match) !==
        $state.href(globals.current, globals.params)
      ) {
        $state.transitionTo(state, match, { inherit: true, source: "url" });
      }
    };

    const details = { state, type: "STATE" };

    return Object.assign(this.fromUrlMatcher(state.url, handler), details);
  }

  /**
   * A UrlRule which matches based on a regular expression
   *
   * The `handler` may be either a [[UrlRuleHandlerFn]] or a string.
   *
   * ## Handler as a function
   *
   * If `handler` is a function, the function is invoked with:
   *
   * - regexp match array (from `regexp`)
   * - url: the current Url ([[UrlParts]])
   * - router: the router object ([[UIRouter]])
   *
   * #### Example:
   * ```js
   * var rule = factory.fromRegExp(/^\/foo\/(bar|baz)$/, match => "/home/" + match[1])
   * var match = rule.match('/foo/bar'); // results in [ '/foo/bar', 'bar' ]
   * var result = rule.handler(match); // '/home/bar'
   * ```
   *
   * ## Handler as string
   *
   * If `handler` is a string, the url is *replaced by the string* when the Rule is invoked.
   * The string is first interpolated using `string.replace()` style pattern.
   *
   * #### Example:
   * ```js
   * var rule = factory.fromRegExp(/^\/foo\/(bar|baz)$/, "/home/$1")
   * var match = rule.match('/foo/bar'); // results in [ '/foo/bar', 'bar' ]
   * var result = rule.handler(match); // '/home/bar'
   * ```
   */
  fromRegExp(regexp, handler) {
    if (regexp.global || regexp.sticky)
      throw new Error("Rule RegExp must not be global or sticky");
    /**
     * If handler is a string, the url will be replaced by the string.
     * If the string has any String.replace() style variables in it (like `$2`),
     * they will be replaced by the captures from [[match]]
     */
    const redirectUrlTo = (match) =>
      // Interpolates matched values into $1 $2, etc using a String.replace()-style pattern
      handler.replace(
        /\$(\$|\d{1,2})/,
        (_, what) => match[what === "$" ? 0 : Number(what)],
      );

    const _handler = isString(handler) ? redirectUrlTo : handler;

    const matchParamsFromRegexp = (url) => regexp.exec(url.path);

    const details = { regexp, type: "REGEXP" };

    return Object.assign(
      new BaseUrlRule(matchParamsFromRegexp, _handler),
      details,
    );
  }
}
UrlRuleFactory.isUrlRule = (obj) =>
  obj && ["type", "match", "handler"].every((key) => isDefined(obj[key]));

/**
 * A base rule which calls `match`
 *
 * The value from the `match` function is passed through to the `handler`.
 */
export class BaseUrlRule {
  constructor(match, handler) {
    this.match = match;
    this.type = "RAW";
    this.$id = -1;
    this._group = undefined;
    this.handler = handler || ((x) => x);
    this.priority = undefined;
  }

  /**
   * This function should be overridden
   * @param {*} [params]
   * @returns {number}
   */
  matchPriority(params) {
    assert(isUndefined(params));

    return 0 - this.$id;
  }
}
