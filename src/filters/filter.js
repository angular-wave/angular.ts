import {
  equals,
  hasCustomToString,
  isArray,
  isArrayLike,
  isFunction,
  isNullOrUndefined,
  isObject,
  isString,
  isUndefined,
  minErr,
} from "../shared/utils.js";

/**
 * @returns {ng.FilterFn}
 */
export function filterFilter() {
  /**
   * @param {Array<any>} array The source array.
   * @param {string|Object|function(any, number, []):[]} expression The predicate to be used for selecting items from `array`.
   * @param {function(any, any):boolean|boolean} [comparator] Comparator which is used in determining if values retrieved using `expression`
   * (when it is not a function) should be considered a match based on the expected value (from the filter expression) and actual value (from the object in the array).
   * @param {string} [anyPropertyKey] The special property name that matches against any property.
   * @return {Array<any>} Filtered array
   */
  return function (array, expression, comparator, anyPropertyKey) {
    if (!isArrayLike(array)) {
      if (isNullOrUndefined(array)) {
        return array;
      }
      throw minErr("filter")(
        "notarray",
        "Expected array but received: {0}",
        array,
      );
    }

    anyPropertyKey = anyPropertyKey || "$";
    let predicateFn;

    switch (getTypeForFilter(expression)) {
      case "function":
        predicateFn = expression;
        break;
      case "boolean":
      case "null":
      case "number":
      case "string":
        predicateFn = createPredicateFn(
          expression,
          comparator,
          anyPropertyKey,
          true,
        );
        break;

      case "object":
        predicateFn = createPredicateFn(
          expression,
          comparator,
          anyPropertyKey,
          false,
        );
        break;

      default:
        return array;
    }

    return Array.from(array).filter(
      /** @type {(item: any) => boolean} */ (predicateFn),
    );
  };
}

// Helper functions for `filterFilter`
/**
 * Creates a predicate function that can be used with `Array.prototype.filter`
 * to match items against a given filter expression.
 *
 * @param {string | Object & Record<string, any> | null} expression
 *   The filter expression to match items against. Can be:
 *     - `string`: matched as a case-insensitive substring
 *     - `object`: matched by property values (supports special `anyPropertyKey`)
 *     - `null`: treated as a literal match
 *
 * @param {boolean | ((actual: any, expected: any) => boolean)} [comparator=false]
 *   Comparator to determine equality between actual array values and expected values:
 *     - `true` → uses strict equality (angular.equals)
 *     - `false` (default) → performs case-insensitive substring match for primitives
 *     - `function(actual, expected)` → custom comparator returning boolean
 *
 * @param {string} [anyPropertyKey="$"]
 *   Special property key that allows matching against any property of an object.
 *   Defaults to `$`.
 *
 * @param {boolean} [matchAgainstAnyProp=false]
 *   If true, allows matching against any property in the object.
 *   Typically true when filtering with primitive expressions.
 *
 * @returns {(item: any) => boolean}
 *   Predicate function that returns `true` if `item` matches the expression.
 */
function createPredicateFn(
  expression,
  comparator,
  anyPropertyKey,
  matchAgainstAnyProp,
) {
  anyPropertyKey = anyPropertyKey ?? "$";
  const shouldMatchPrimitives =
    isObject(expression) && anyPropertyKey in expression;

  if (comparator === true) {
    comparator = equals;
  } else if (!isFunction(comparator)) {
    comparator = function (
      /** @type {string | any[] | null} */ actual,
      /** @type {string | null} */ expected,
    ) {
      if (isUndefined(actual)) {
        // No substring matching against `undefined`
        return false;
      }

      if (actual === null || expected === null) {
        // No substring matching against `null`; only match against `null`
        return actual === expected;
      }

      if (
        isObject(expected) ||
        (isObject(actual) && !hasCustomToString(actual))
      ) {
        // Should not compare primitives against objects, unless they have custom `toString` method
        return false;
      }

      actual = `${actual}`.toLowerCase();
      expected = `${expected}`.toLowerCase();

      return actual.indexOf(expected) !== -1;
    };
  }

  const predicateFn = function (/** @type {string | Object | null} */ item) {
    if (shouldMatchPrimitives && !isObject(item)) {
      return deepCompare(
        item,
        expression[anyPropertyKey],
        comparator,
        anyPropertyKey,
        false,
      );
    }

    return deepCompare(
      item,
      expression,
      comparator,
      anyPropertyKey,
      !!matchAgainstAnyProp, // coerce undefined → false
    );
  };

  return predicateFn;
}

/**
 * @param {string | Object | null} actual
 * @param {string | Object | null} expected
 * @param {(arg0: any, arg1: any) => any} comparator
 * @param {string} anyPropertyKey
 * @param {boolean} matchAgainstAnyProp
 * @param {boolean | undefined} [dontMatchWholeObject]
 * @returns {boolean}
 */
function deepCompare(
  actual,
  expected,
  comparator,
  anyPropertyKey,
  matchAgainstAnyProp,
  dontMatchWholeObject,
) {
  const actualType = getTypeForFilter(actual);

  const expectedType = getTypeForFilter(expected);

  if (
    isString(expectedType) &&
    /** @type {string} */ (expected).charAt(0) === "!"
  ) {
    return !deepCompare(
      actual,
      /** @type {string} */ (expected).substring(1),
      comparator,
      anyPropertyKey,
      matchAgainstAnyProp,
    );
  }

  if (isArray(actual)) {
    // In case `actual` is an array, consider it a match
    // if ANY of it's items matches `expected`
    return actual.some((item) =>
      deepCompare(
        item,
        expected,
        comparator,
        anyPropertyKey,
        matchAgainstAnyProp,
      ),
    );
  }

  switch (actualType) {
    case "object":
      if (matchAgainstAnyProp) {
        for (const key in /** @type {Record<string, any>} */ (actual)) {
          // Under certain, rare, circumstances, key may not be a string and `charAt` will be undefined
          // See: https://github.com/angular/angular.js/issues/15644
          if (
            key.charAt &&
            key.charAt(0) !== "$" &&
            deepCompare(
              /** @type {Record<string, any>} */ (actual)[key],
              expected,
              comparator,
              anyPropertyKey,
              true,
            )
          ) {
            return true;
          }
        }

        return dontMatchWholeObject
          ? false
          : deepCompare(actual, expected, comparator, anyPropertyKey, false);
      }

      if (expectedType === "object") {
        for (const key in /** @type {Record<string, any>} */ (expected)) {
          const expectedVal = /** @type {Record<string, any>} */ (expected)[
            key
          ];

          if (isFunction(expectedVal) || isUndefined(expectedVal)) {
            continue;
          }

          const matchAnyProperty = key === anyPropertyKey;

          const actualVal = matchAnyProperty ? actual : actual[key];

          if (
            !deepCompare(
              actualVal,
              expectedVal,
              comparator,
              anyPropertyKey,
              matchAnyProperty,
              matchAnyProperty,
            )
          ) {
            return false;
          }
        }

        return true;
      }

      return comparator(actual, expected);

    case "function":
      return false;
    default:
      return comparator(actual, expected);
  }
}

// Used for easily differentiating between `null` and actual `object`
/**
 * @param {string | Object | null} val
 */
function getTypeForFilter(val) {
  return val === null ? "null" : typeof val;
}
