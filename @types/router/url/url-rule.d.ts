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
   * @param {string | UrlMatcher | import("./interface.js").UrlRuleHandlerFn} handler
   * @returns {import("./interface.js").MatcherUrlRule}
   */
  fromUrlMatcher(
    urlMatcher: UrlMatcher,
    handler: string | UrlMatcher | import("./interface.js").UrlRuleHandlerFn,
  ): import("./interface.js").MatcherUrlRule;
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
   * @param {StateObject | import("../state/interface.js").StateDeclaration} stateOrDecl
   * @param {import("../state/state-service.js").StateProvider} stateService
   * @param {import("../router.js").RouterProvider} globals
   * @returns {import("./interface.js").StateRule}
   */
  fromState(
    stateOrDecl: StateObject | import("../state/interface.js").StateDeclaration,
    stateService: import("../state/state-service.js").StateProvider,
    globals: import("../router.js").RouterProvider,
  ): import("./interface.js").StateRule;
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
  fromRegExp(
    regexp: any,
    handler: any,
  ): BaseUrlRule & {
    regexp: any;
    type: string;
  };
}
export namespace UrlRuleFactory {
  function isUrlRule(obj: any): boolean;
}
/**
 * A base rule which calls `match`
 *
 * The value from the `match` function is passed through to the `handler`.
 */
export class BaseUrlRule {
  /**
   * @param {import("./interface.js").UrlRuleMatchFn} match
   * @param {import("./interface.js").UrlRuleHandlerFn} handler
   */
  constructor(
    match: import("./interface.js").UrlRuleMatchFn,
    handler: import("./interface.js").UrlRuleHandlerFn,
  );
  /**
   * @type {import("./interface.js").UrlRuleMatchFn}
   */
  match: import("./interface.js").UrlRuleMatchFn;
  /**
   * @type {import("./interface.js").UrlRuleType}
   */
  type: import("./interface.js").UrlRuleType;
  /**
   * @type {number}
   */
  $id: number;
  /**
   * @type {string | undefined}
   */
  _group: string | undefined;
  /**
   * @type {import("./interface.js").UrlRuleHandlerFn}
   */
  handler: import("./interface.js").UrlRuleHandlerFn;
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
