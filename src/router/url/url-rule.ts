import { UrlMatcher } from "./url-matcher.ts";
import {
  assert,
  isDefined,
  isFunction,
  isString,
  isUndefined,
} from "../../shared/utils.ts";
import { is, pattern } from "../../shared/hof.ts";
import { StateObject } from "../state/state-object.ts";
import type {
  MatcherUrlRule,
  RegExpRule,
  StateRule,
  UrlParts,
  UrlRule,
  UrlRuleHandlerFn,
  UrlRuleMatchFn,
  UrlRuleType,
} from "./interface.ts";
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
  urlService: ng.UrlService;
  stateService: ng.StateService;
  routerGlobals: ng.RouterService;

  static isUrlRule(obj: unknown): obj is UrlRule {
    return (
      !!obj &&
      ["type", "match", "handler"].every((key) =>
        isDefined((obj as Record<string, unknown>)[key]),
      )
    );
  }

  /**
   * @param {ng.UrlService} urlService
   * @param {ng.StateService} stateService
   * @param {ng.RouterService} routerGlobals
   */
  constructor(
    urlService: ng.UrlService,
    stateService: ng.StateService,
    routerGlobals: ng.RouterService,
  ) {
    this.urlService = urlService;
    this.stateService = stateService;
    this.routerGlobals = routerGlobals;
  }

  /**
   *
   * @param {StateObject} what
   * @param {*} [handler]
   * @returns {import("./url-rules.js").UrlRule}
   */
  create(
    what:
      | StateObject
      | import("../state/interface.ts").StateDeclaration
      | string
      | UrlMatcher
      | RegExp
      | UrlRuleMatchFn,
    handler?: any,
  ): UrlRule {
    const { isState, isStateDeclaration } = StateObject;
    const isStateLike = (
      value: unknown,
    ): value is
      | StateObject
      | import("../state/interface.ts").StateDeclaration =>
      isState(value as any) || isStateDeclaration(value as any);

    const makeRule = pattern([
      [isString, (_what: string) => makeRule(this.urlService.compile(_what))],
      [
        is(UrlMatcher),
        (_what: UrlMatcher) => this.fromUrlMatcher(_what, handler),
      ],
      [
        isStateLike,
        (
          _what: StateObject | import("../state/interface.ts").StateDeclaration,
        ) => this.fromState(_what, this.stateService, this.routerGlobals),
      ],
      [is(RegExp), (_what: RegExp) => this.fromRegExp(_what, handler)],
      [
        isFunction,
        (_what: UrlRuleMatchFn) =>
          new BaseUrlRule(
            _what,
            (handler as UrlRuleHandlerFn) || ((x: any) => x),
          ),
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
  fromUrlMatcher(
    urlMatcher: UrlMatcher,
    handler: string | UrlMatcher | UrlRuleHandlerFn = (x: any) => x,
  ): MatcherUrlRule {
    let resolvedHandler: UrlRuleHandlerFn;

    if (isString(handler)) handler = this.urlService.compile(handler);

    if (is(UrlMatcher)(handler)) {
      const matcher = handler as UrlMatcher;

      resolvedHandler = (match: any) => {
        const url = matcher.format(match); // string | null

        return url === null ? undefined : url; // string | void
      };
    } else {
      resolvedHandler = handler as UrlRuleHandlerFn;
    }
    /**
     * @param {import("./interface.ts").UrlParts} url
     * @returns {import("../params/interface.ts").RawParams | boolean | null}
     */
    function matchUrlParamters(url: UrlParts) {
      const params = urlMatcher.exec(url.path, url.search, url.hash || "");

      return params !== null && urlMatcher.validates(params) && params;
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
    function matchPriority(params: import("../params/interface.ts").RawParams) {
      const optional = urlMatcher
        .parameters()
        .filter((param) => param.isOptional);

      if (!optional.length) return LOWEST;
      const matched = optional.filter((param) => params[param.id]);

      return matched.length / optional.length;
    }
    /** @type {{ urlMatcher: UrlMatcher; matchPriority: (params: import("../params/interface.ts").RawParams) => number; type: "URLMATCHER" }} */
    const details: Pick<
      MatcherUrlRule,
      "urlMatcher" | "matchPriority" | "type"
    > = {
      urlMatcher,
      matchPriority,
      type: "URLMATCHER",
    };

    return Object.assign(
      new BaseUrlRule(matchUrlParamters, resolvedHandler),
      details,
    ) as MatcherUrlRule;
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
   * @param {import("../state/state-service.ts").StateProvider} stateService
   * @param {import("../router.ts").RouterProvider} globals
   * @returns {import("./interface.ts").StateRule}
   */
  fromState(
    stateOrDecl: StateObject | import("../state/interface.ts").StateDeclaration,
    stateService: import("../state/state-service.ts").StateProvider,
    globals: import("../router.ts").RouterProvider,
  ): StateRule {
    const state: StateObject | undefined = StateObject.isStateDeclaration(
      stateOrDecl,
    )
      ? stateOrDecl._state
        ? (stateOrDecl._state() as unknown as StateObject)
        : undefined
      : (stateOrDecl as StateObject);

    if (!state) throw new Error("State rule could not resolve state object");
    if (!(state.url instanceof UrlMatcher))
      throw new Error(`State '${state.name}' does not have a UrlMatcher`);

    /**
     * Handles match by transitioning to matched state
     *
     * First checks if the router should start a new transition.
     * A new transition is not required if the current state's URL
     * and the new URL are already identical
     */
    const handler = (match: import("../params/interface.ts").RawParams) => {
      const $state = stateService;
      const current = globals.current;
      const currentHref = current ? $state.href(current, globals.params) : null;

      if ($state.href(state, match) !== currentHref) {
        $state.transitionTo(state, match, { inherit: true, source: "url" });
      }
    };

    const details: Pick<StateRule, "state" | "type"> = {
      state,
      type: "STATE",
    };

    return Object.assign(
      this.fromUrlMatcher(state.url, handler),
      details,
    ) as StateRule;
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
  fromRegExp(regexp: RegExp, handler: string | UrlRuleHandlerFn): RegExpRule {
    if (regexp.global || regexp.sticky)
      throw new Error("Rule RegExp must not be global or sticky");
    /**
     * If handler is a string, the url will be replaced by the string.
     * If the string has any String.replace() style variables in it (like `$2`),
     * they will be replaced by the captures from [[match]]
     */
    const redirectUrlTo = (match: RegExpExecArray) =>
      // Interpolates matched values into $1 $2, etc using a String.replace()-style pattern
      (handler as string).replace(
        /\$(\$|\d{1,2})/,
        (_: string, what: string) => match[what === "$" ? 0 : Number(what)],
      );

    const _handler = isString(handler) ? redirectUrlTo : handler;

    const matchParamsFromRegexp = (url: UrlParts) => regexp.exec(url.path);

    const details: Pick<RegExpRule, "regexp" | "type"> = {
      regexp,
      type: "REGEXP",
    };

    return Object.assign(
      new BaseUrlRule(matchParamsFromRegexp, _handler),
      details,
    ) as RegExpRule;
  }
}

/**
 * A base rule which calls `match`
 *
 * The value from the `match` function is passed through to the `handler`.
 */
export class BaseUrlRule {
  match: UrlRuleMatchFn;
  type: UrlRuleType;
  $id: number;
  _group: number | undefined;
  handler: UrlRuleHandlerFn;
  priority: number | undefined;
  /**
   * @param {import("./interface.ts").UrlRuleMatchFn} match
   * @param {import("./interface.ts").UrlRuleHandlerFn} handler
   */
  constructor(match: UrlRuleMatchFn, handler: UrlRuleHandlerFn) {
    this.match = match;
    this.type = "RAW";
    this.$id = -1;
    this._group = undefined;
    this.handler = handler || ((x: any) => x);
    this.priority = undefined;
  }

  /**
   * This function should be overridden
   * @param {*} [params]
   * @returns {number}
   */
  matchPriority(params?: any): number {
    assert(isUndefined(params));

    return 0 - this.$id;
  }
}
