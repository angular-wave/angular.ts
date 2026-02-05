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
   * @param {StateObject} what
   * @param {*} [handler]
   * @returns {import("./url-rules.js").UrlRule}
   */
  create(what, handler) {
    const { isState, isStateDeclaration } = StateObject;

    const makeRule = pattern([
      [
        isString,
        (/** @type {string} */ _what) =>
          makeRule(this.urlService.compile(_what)),
      ],
      [
        is(UrlMatcher),
        (/** @type {any} */ _what) => this.fromUrlMatcher(_what, handler),
      ],
      [
        (/** @type {any} */ _what) =>
          isState(_what) || isStateDeclaration(_what),
        (/** @type {any} */ _what) =>
          this.fromState(_what, this.stateService, this.routerGlobals),
      ],
      [
        is(RegExp),
        (/** @type {any} */ _what) => this.fromRegExp(_what, handler),
      ],
      [
        isFunction,
        (/** @type {import("./interface.ts").UrlRuleMatchFn} */ _what) =>
          new BaseUrlRule(_what, handler),
      ],
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
   * @param {UrlMatcher} urlMatcher
   * @param {string | UrlMatcher | import("./interface.ts").UrlRuleHandlerFn} handler
   * @returns {import("./interface.ts").MatcherUrlRule}
   */
  fromUrlMatcher(urlMatcher, handler) {
    let _handler = handler;

    if (isString(handler)) handler = this.urlService.compile(handler);

    if (is(UrlMatcher)(handler)) {
      const matcher = /** @type {UrlMatcher} */ (handler);

      _handler = (match) => {
        const url = matcher.format(match); // string | null

        return url === null ? undefined : url; // string | void
      };
    }
    /**
     * @param {import("./interface.ts").UrlParts} url
     * @returns {import("../params/interface.ts").RawParams | boolean | null}
     */
    function matchUrlParamters(url) {
      const params = urlMatcher.exec(
        url.path,
        url.search,
        /** @type {string} */ (url.hash),
      );

      return (
        urlMatcher.validates(
          /** @type {import("../params/interface.ts").RawParams} */ (params),
        ) && params
      );
    }
    // Prioritize URLs, lowest to highest:
    // - Some optional URL parameters, but none matched
    // - No optional parameters in URL
    // - Some optional parameters, some matched
    // - Some optional parameters, all matched
    /**
     * @param {import("../params/interface.ts").RawParams} params
     * @returns {number}
     */
    function matchPriority(params) {
      const optional = urlMatcher
        .parameters()
        .filter((param) => param.isOptional);

      if (!optional.length) return LOWEST;
      const matched = optional.filter((param) => params[param.id]);

      return matched.length / optional.length;
    }
    /** @type {{ urlMatcher: UrlMatcher; matchPriority: (params: import("../params/interface.ts").RawParams) => number; type: "URLMATCHER" }} */
    const details = { urlMatcher, matchPriority, type: "URLMATCHER" };

    return /** @type {import("./interface.ts").MatcherUrlRule} */ (
      Object.assign(
        new BaseUrlRule(
          matchUrlParamters,
          /** @type {import("./interface.ts").UrlRuleHandlerFn} */ (_handler),
        ),
        details,
      )
    );
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
   * @param {StateObject | import("../state/interface.ts").StateDeclaration} stateOrDecl
   * @param {import("../state/state-service.js").StateProvider} stateService
   * @param {import("../router.js").RouterProvider} globals
   * @returns {import("./interface.ts").StateRule}
   */
  fromState(stateOrDecl, stateService, globals) {
    const state = StateObject.isStateDeclaration(stateOrDecl)
      ? /** @type {StateObject} */ (stateOrDecl)?._state()
      : stateOrDecl;

    /**
     * Handles match by transitioning to matched state
     *
     * First checks if the router should start a new transition.
     * A new transition is not required if the current state's URL
     * and the new URL are already identical
     */
    const handler = (
      /** @type {import("../params/interface.ts").RawParams} */ match,
    ) => {
      const $state = stateService;

      if (
        $state.href(state, match) !==
        $state.href(
          /** @type {import("../state/interface.ts").StateDeclaration} */ (
            globals.current
          ),
          globals.params,
        )
      ) {
        $state.transitionTo(state, match, { inherit: true, source: "url" });
      }
    };

    const details = { state, type: "STATE" };

    return /** @type {import("./interface.ts").StateRule} */ (
      Object.assign(
        this.fromUrlMatcher(/** @type {UrlMatcher} */ (state.url), handler),
        details,
      )
    );
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
   * @param {RegExp} regexp
   * @param {string | import("./interface.ts").UrlRuleHandlerFn} handler
   * @returns {import("./interface.ts").RegExpRule}
   */
  fromRegExp(regexp, handler) {
    if (regexp.global || regexp.sticky)
      throw new Error("Rule RegExp must not be global or sticky");
    /**
     * If handler is a string, the url will be replaced by the string.
     * If the string has any String.replace() style variables in it (like `$2`),
     * they will be replaced by the captures from [[match]]
     */
    const redirectUrlTo = (/** @type {RegExpExecArray} */ match) =>
      // Interpolates matched values into $1 $2, etc using a String.replace()-style pattern
      /** @type {string} */ (handler).replace(
        /\$(\$|\d{1,2})/,
        (_, what) => match[what === "$" ? 0 : Number(what)],
      );

    const _handler = isString(handler) ? redirectUrlTo : handler;

    const matchParamsFromRegexp = (
      /** @type {import("./interface.ts").UrlParts} */ url,
    ) => regexp.exec(url.path);

    const details = { regexp, type: "REGEXP" };

    return /** @type {import("./interface.ts").RegExpRule} */ (
      Object.assign(
        new BaseUrlRule(
          /** @type  {import("./interface.ts").UrlRuleMatchFn} */ (
            matchParamsFromRegexp
          ),
          _handler,
        ),
        details,
      )
    );
  }
}

UrlRuleFactory.isUrlRule = (/** @type {{ [x: string]: any; }} */ obj) =>
  obj && ["type", "match", "handler"].every((key) => isDefined(obj[key]));

/**
 * A base rule which calls `match`
 *
 * The value from the `match` function is passed through to the `handler`.
 */
export class BaseUrlRule {
  /**
   * @param {import("./interface.ts").UrlRuleMatchFn} match
   * @param {import("./interface.ts").UrlRuleHandlerFn} handler
   */
  constructor(match, handler) {
    /**
     * @type {import("./interface.ts").UrlRuleMatchFn}
     */
    this.match = match;

    /**
     * @type {import("./interface.ts").UrlRuleType}
     */
    this.type = "RAW";

    /**
     * @type {number}
     */
    this.$id = -1;

    /**
     * @type {number | undefined}
     */
    this._group = undefined;

    /**
     * @type {import("./interface.ts").UrlRuleHandlerFn}
     */
    this.handler = handler || ((x) => x);

    /**
     * @type {number | undefined}
     */
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
