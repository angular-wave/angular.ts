import {
  equals,
  hasCustomToString,
  isArray,
  isArrayLike,
  isFunction,
  isNullOrUndefined,
  isObject,
  isUndefined,
  minErr,
} from "../shared/utils.js";

/**
 * @returns {ng.FilterFn}
 */
export function filterFilter() {
  /**
   * @param {Array} array The source array.
   * @param {string|Object|function(any, number, []):[]} expression The predicate to be used for selecting items from `array`.
   * @param {function(any, any):boolean|boolean} [comparator] Comparator which is used in determining if values retrieved using `expression`
   * (when it is not a function) should be considered a match based on the expected value (from the filter expression) and actual value (from the object in the array).
   * @param {string} [anyPropertyKey] The special property name that matches against any property.
   * @return {Array} Filtered array
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

    let matchAgainstAnyProp = false;

    switch (getTypeForFilter(expression)) {
      case "function":
        predicateFn = expression;
        break;
      case "boolean":
      case "null":
      case "number":
      case "string":
        matchAgainstAnyProp = true;
      // falls through
      case "object":
        predicateFn = createPredicateFn(
          expression,
          comparator,
          anyPropertyKey,
          matchAgainstAnyProp,
        );
        break;
      default:
        return array;
    }

    return Array.prototype.filter.call(array, predicateFn);
  };
}

// Helper functions for `filterFilter`
function createPredicateFn(
  expression,
  comparator,
  anyPropertyKey,
  matchAgainstAnyProp,
) {
  const shouldMatchPrimitives =
    isObject(expression) && anyPropertyKey in expression;

  if (comparator === true) {
    comparator = equals;
  } else if (!isFunction(comparator)) {
    comparator = function (actual, expected) {
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

  const predicateFn = function (item) {
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
      matchAgainstAnyProp,
    );
  };

  return predicateFn;
}

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

  if (expectedType === "string" && expected.charAt(0) === "!") {
    return !deepCompare(
      actual,
      expected.substring(1),
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
        for (const key in actual) {
          // Under certain, rare, circumstances, key may not be a string and `charAt` will be undefined
          // See: https://github.com/angular/angular.js/issues/15644
          if (
            key.charAt &&
            key.charAt(0) !== "$" &&
            deepCompare(actual[key], expected, comparator, anyPropertyKey, true)
          ) {
            return true;
          }
        }

        return dontMatchWholeObject
          ? false
          : deepCompare(actual, expected, comparator, anyPropertyKey, false);
      }

      if (expectedType === "object") {
        for (const key in expected) {
          const expectedVal = expected[key];

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
function getTypeForFilter(val) {
  return val === null ? "null" : typeof val;
}
