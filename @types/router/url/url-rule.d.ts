export class UrlRuleFactory {
  /**
   * @param {ng.UrlService} urlService
   * @param {ng.StateService} stateService
   * @param {ng.RouterService} routerGlobals
   */
  constructor(
    urlService: ng.UrlService,
    stateService: ng.StateService,
    routerGlobals: ng.RouterService,
  );
  /** @type {ng.UrlService} */
  urlService: ng.UrlService;
  /** @type {ng.StateService} */
  stateService: ng.StateService;
  /** @type {ng.RouterService} */
  routerGlobals: ng.RouterService;
  /**
   *
   * @param {StateObject} what
   * @param {*} [handler]
   * @returns {import("./url-rules.js").UrlRule}
   */
  create(what: StateObject, handler?: any): import("./url-rules.js").UrlRule;
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
    handler: string | UrlMatcher | import("./interface.ts").UrlRuleHandlerFn,
  ): import("./interface.ts").MatcherUrlRule;
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
  fromState(
    stateOrDecl: StateObject | import("../state/interface.ts").StateDeclaration,
    stateService: import("../state/state-service.js").StateProvider,
    globals: import("../router.js").RouterProvider,
  ): import("./interface.ts").StateRule;
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
  fromRegExp(
    regexp: RegExp,
    handler: string | import("./interface.ts").UrlRuleHandlerFn,
  ): import("./interface.ts").RegExpRule;
}
export namespace UrlRuleFactory {
  function isUrlRule(obj: { [x: string]: any }): boolean;
}
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
  constructor(
    match: import("./interface.ts").UrlRuleMatchFn,
    handler: import("./interface.ts").UrlRuleHandlerFn,
  );
  /**
   * @type {import("./interface.ts").UrlRuleMatchFn}
   */
  match: import("./interface.ts").UrlRuleMatchFn;
  /**
   * @type {import("./interface.ts").UrlRuleType}
   */
  type: import("./interface.ts").UrlRuleType;
  /**
   * @type {number}
   */
  $id: number;
  /**
   * @type {number | undefined}
   */
  _group: number | undefined;
  /**
   * @type {import("./interface.ts").UrlRuleHandlerFn}
   */
  handler: import("./interface.ts").UrlRuleHandlerFn;
  /**
   * @type {number | undefined}
   */
  priority: number | undefined;
  /**
   * This function should be overridden
   * @param {*} [params]
   * @returns {number}
   */
  matchPriority(params?: any): number;
}
import { StateObject } from "../state/state-object.js";
import { UrlMatcher } from "./url-matcher.js";
