import { UrlMatcher } from "./url-matcher.js";
import { isDefined } from "../../shared/utils.js";
import { removeFrom } from "../../shared/common.js";
import { UrlRuleFactory } from "./url-rule.js";

/** @typedef {import("./interface.ts").UrlRule} UrlRule */
/** @typedef {import("./interface.ts").MatcherUrlRule} MatcherUrlRule */
/** @typedef {import("./url-rule.js").BaseUrlRule} BaseUrlRule */

/**
 * @param {{ priority: any; }} a
 * @param {{ priority: any; }} b
 */
function prioritySort(a, b) {
  return (b.priority || 0) - (a.priority || 0);
}

const typeSort = (
  /** @type {{ type: string | number; }} */ a,
  /** @type {{ type: string | number; }} */ b,
) => {
  const weights = /** @type {Record<string, any>} */ ({
    STATE: 4,
    URLMATCHER: 4,
    REGEXP: 3,
    RAW: 2,
    OTHER: 1,
  });

  return (weights[a.type] || 0) - (weights[b.type] || 0);
};

const urlMatcherSort = (
  /** @type {MatcherUrlRule} */ a,
  /** @type {MatcherUrlRule} */ b,
) =>
  !a.urlMatcher || !b.urlMatcher
    ? 0
    : UrlMatcher.compare(a.urlMatcher, b.urlMatcher);

const idSort = (
  /** @type {{ type: string | number; $id: any; }} */ a,
  /** @type {{ type: string | number; $id: any; }} */ b,
) => {
  // Identically sorted STATE and URLMATCHER best rule will be chosen by `matchPriority` after each rule matches the URL
  const useMatchPriority = /** @type {Record<string, any>} */ ({
    STATE: true,
    URLMATCHER: true,
  });

  const equal = useMatchPriority[a.type] && useMatchPriority[b.type];

  return equal ? 0 : (a.$id || 0) - (b.$id || 0);
};

/**
 * Default rule priority sorting function.
 *
 * Sorts rules by:
 *
 * - Explicit priority (set rule priority using [[UrlRules.when]])
 * - Rule type (STATE: 4, URLMATCHER: 4, REGEXP: 3, RAW: 2, OTHER: 1)
 * - `UrlMatcher` specificity ([[UrlMatcher.compare]]): works for STATE and URLMATCHER types to pick the most specific rule.
 * - Rule registration order (for rule types other than STATE and URLMATCHER)
 *   - Equally sorted State and UrlMatcher rules will each match the URL.
 *     Then, the *best* match is chosen based on how many parameter values were matched.
 * @param {UrlRule} a
 * @param {UrlRule} b
 */
function defaultRuleSortFn(a, b) {
  let cmp = prioritySort(a, b);

  if (cmp !== 0) return cmp;
  cmp = typeSort(a, b);

  if (cmp !== 0) return cmp;
  cmp = urlMatcherSort(
    /** @type {MatcherUrlRule} */ (a),
    /** @type {MatcherUrlRule} */ (b),
  );

  if (cmp !== 0) return cmp;

  return idSort(a, b);
}

/**
 * API for managing URL rules
 *
 * This API is used to create and manage URL rules.
 * URL rules are a mechanism to respond to specific URL patterns.
 *
 * The most commonly used methods are [[otherwise]] and [[when]].
 *
 * This API is found at `$url.rules` (see: [[UIRouter.urlService]], [[URLService.rules]])
 */
export class UrlRules {
  /** @param {UrlRuleFactory} urlRuleFactory */
  constructor(urlRuleFactory) {
    this._sortFn = defaultRuleSortFn;
    /**
     * @type {UrlRule[]}
     */
    this._rules = [];
    this._id = 0;
    this._urlRuleFactory = urlRuleFactory;
  }

  /**
   * Remove a rule previously registered
   * @param {BaseUrlRule} rule the matcher rule that was previously registered using [[rule]]
   */
  removeRule(rule) {
    removeFrom(this._rules, rule);
  }

  /**
   * Manually adds a URL Rule.
   *
   * Usually, a url rule is added using [[StateDeclaration.url]] or [[when]].
   * This api can be used directly for more control (to register a [[BaseUrlRule]], for example).
   * Rules can be created using [[urlRuleFactory]], or created manually as simple objects.
   *
   * A rule should have a `match` function which returns truthy if the rule matched.
   * It should also have a `handler` function which is invoked if the rule is the best match.
   *
   * @param {UrlRule} rule the rule to register
   * @returns {() => void } a function that deregisters the rule
   */
  rule(rule) {
    if (!UrlRuleFactory.isUrlRule(rule)) throw new Error("invalid rule");
    rule.$id = this._id++;
    rule.priority = rule.priority || 0;
    this._rules.push(rule);
    this._sorted = false;

    return () => this.removeRule(rule);
  }

  /**
   * Gets all registered rules
   *
   * @returns {import("./interface.ts").UrlRule[]} an array of all the registered rules
   */
  rules() {
    this.ensureSorted();

    return this._rules;
  }

  /**
   * Defines URL Rule priorities
   *
   * More than one rule ([[UrlRule]]) might match a given URL.
   * This `compareFn` is used to sort the rules by priority.
   * Higher priority rules should sort earlier.
   *
   * The [[defaultRuleSortFn]] is used by default.
   *
   * You only need to call this function once.
   * The `compareFn` will be used to sort the rules as each is registered.
   *
   * If called without any parameter, it will re-sort the rules.
   *
   * ---
   *
   * Url rules may come from multiple sources: states's urls ([[StateDeclaration.url]]), [[when]], and [[rule]].
   * Each rule has a (user-provided) [[UrlRule.priority]], a [[UrlRule.type]], and a [[UrlRule.$id]]
   * The `$id` is is the order in which the rule was registered.
   *
   * The sort function should use these data, or data found on a specific type
   * of [[UrlRule]] (such as [[StateRule.state]]), to order the rules as desired.
   *
   * #### Example:
   * This compare function prioritizes rules by the order in which the rules were registered.
   * A rule registered earlier has higher priority.
   *
   * ```js
   * function compareFn(a, b) {
   *   return a.$id - b.$id;
   * }
   * ```
   * @param {((a: UrlRule, b: UrlRule) => number) | undefined} [compareFn] a function that compares to [[UrlRule]] objects.
   * The `compareFn` should abide by the `Array.sort` compare function rules.
   * Given two rules, `a` and `b`, return a negative number if `a` should be higher priority.
   * Return a positive number if `b` should be higher priority.
   * Return `0` if the rules are identical.
   * See the [mozilla reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description)
   * for details.
   */
  sort(compareFn) {
    const sorted = this.stableSort(
      this._rules,
      (this._sortFn = compareFn || this._sortFn),
    );

    // precompute _sortGroup values and apply to each rule
    let group = 0;

    for (let i = 0; i < sorted.length; i++) {
      sorted[i]._group = group;

      if (
        i < sorted.length - 1 &&
        this._sortFn(sorted[i], sorted[i + 1]) !== 0
      ) {
        group++;
      }
    }
    this._rules = sorted;
    this._sorted = true;
  }

  ensureSorted() {
    this._sorted || this.sort();
  }

  /**
   * @param {any[]} arr
   * @param {(arg0: any, arg1: any) => any} compareFn
   */
  stableSort(arr, compareFn) {
    const arrOfWrapper = arr.map((elem, idx) => ({ elem, idx }));

    arrOfWrapper.sort((wrapperA, wrapperB) => {
      const cmpDiff = compareFn(wrapperA.elem, wrapperB.elem);

      return cmpDiff === 0 ? wrapperA.idx - wrapperB.idx : cmpDiff;
    });

    return arrOfWrapper.map((wrapper) => wrapper.elem);
  }

  /**
   * Registers a `matcher` and `handler` for custom URLs handling.
   *
   * The `matcher` can be:
   *
   * - a [[UrlMatcher]]: See: [[UrlMatcherFactory.compile]]
   * - a `string`: The string is compiled to a [[UrlMatcher]]
   * - a `RegExp`: The regexp is used to match the url.
   *
   * The `handler` can be:
   *
   * - a string: The url is redirected to the value of the string.
   * - a function: The url is redirected to the return value of the function.
   *
   * ---
   *
   * When the `handler` is a `string` and the `matcher` is a `UrlMatcher` (or string), the redirect
   * string is interpolated with parameter values.
   *
   * #### Example:
   * When the URL is `/foo/123` the rule will redirect to `/bar/123`.
   * ```js
   * .when("/foo/:param1", "/bar/:param1")
   * ```
   *
   * ---
   *
   * When the `handler` is a string and the `matcher` is a `RegExp`, the redirect string is
   * interpolated with capture groups from the RegExp.
   *
   * #### Example:
   * When the URL is `/foo/123` the rule will redirect to `/bar/123`.
   * ```js
   * .when(new RegExp("^/foo/(.*)$"), "/bar/$1");
   * ```
   *
   * ---
   *
   * When the handler is a function, it receives the matched value, the current URL, and the `UIRouter` object (See [[UrlRuleHandlerFn]]).
   * The "matched value" differs based on the `matcher`.
   * For [[UrlMatcher]]s, it will be the matched state params.
   * For `RegExp`, it will be the match array from `regexp.exec()`.
   *
   * If the handler returns a string, the URL is redirected to the string.
   *
   * #### Example:
   * When the URL is `/foo/123` the rule will redirect to `/bar/123`.
   * ```js
   * .when(new RegExp("^/foo/(.*)$"), match => "/bar/" + match[1]);
   * ```
   *
   * Note: the `handler` may also invoke arbitrary code, such as `$state.go()`
   * @param {import("../state/state-object.js").StateObject} matcher A pattern `string` to match, compiled as a [[UrlMatcher]], or a `RegExp`.
   * @param {any} handler The path to redirect to, or a function that returns the path.
   * @param {{ priority: any; }} options `{ priority: number }`
   * @return the registered [[UrlRule]]
   */
  when(matcher, handler, options) {
    const rule = /** @type {UrlRule} */ (
      this._urlRuleFactory.create(matcher, handler)
    );

    if (isDefined(options && options.priority))
      rule.priority = options.priority;
    this.rule(rule);

    return rule;
  }
}
