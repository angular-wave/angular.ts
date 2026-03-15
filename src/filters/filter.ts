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
} from "../shared/utils.ts";

export type FilterFn = (input: any, ...args: any[]) => any;

export type FilterFactory = (...args: any[]) => FilterFn & {
  $$moduleName: string;
};

export type FilterService = (name: string) => FilterFn;

/** Registers the built-in collection filtering function. */
export function filterFilter() {
  /**
   * @param array The source array.
   * @param expression The predicate to be used for selecting items from `array`.
   * @param [comparator] Comparator which is used in determining if values retrieved using `expression`
   * (when it is not a function) should be considered a match based on the expected value (from the filter expression) and actual value (from the object in the array).
   * @param [anyPropertyKey] The special property name that matches against any property.
   * @returns Filtered array
   */
  return function (
    array: Array<any> | ArrayLike<any> | null | undefined,
    expression: any,
    comparator?: boolean | ((actual: any, expected: any) => boolean),
    anyPropertyKey?: string,
  ) {
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

    return Array.from(array as ArrayLike<any>).filter(predicateFn);
  };
}

// Helper functions for `filterFilter`
/**
 * Creates a predicate function that can be used with `Array.prototype.filter`
 * to match items against a given filter expression.
 *
 * The filter expression can be:
 *     - `string`: matched as a case-insensitive substring
 *     - `object`: matched by property values (supports special `anyPropertyKey`)
 *     - `null`: treated as a literal match
 *
 * `comparator` determines equality between actual array values and expected values:
 *     - `true` → uses strict equality (angular.equals)
 *     - `false` (default) → performs case-insensitive substring match for primitives
 *     - `function(actual, expected)` → custom comparator returning boolean
 *
 * `anyPropertyKey` is the special property name that allows matching against any
 * property of an object. It defaults to `$`.
 *
 * `matchAgainstAnyProp` allows matching against any property in the object and
 * is typically enabled when filtering with primitive expressions.
 */
function createPredicateFn(
  expression: string | Record<string, any> | null,
  comparator?: boolean | ((actual: any, expected: any) => boolean),
  anyPropertyKey = "$",
  matchAgainstAnyProp = false,
): (item: any) => boolean {
  const shouldMatchPrimitives =
    expression !== null &&
    typeof expression === "object" &&
    anyPropertyKey in expression;

  if (comparator === true) {
    comparator = equals;
  } else if (!isFunction(comparator)) {
    comparator = function (
      actual: string | any[] | null,
      expected: string | null,
    ): boolean {
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

  const predicateFn = function (item: any): boolean {
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

/** Recursively compares actual and expected values for the filter predicate. */
function deepCompare(
  actual: any,
  expected: any,
  comparator: (arg0: any, arg1: any) => any,
  anyPropertyKey: string,
  matchAgainstAnyProp: boolean,
  dontMatchWholeObject = false,
): boolean {
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
        const actualObj = actual as Record<string, any>;

        for (const key in actualObj) {
          // Under certain, rare, circumstances, key may not be a string and `charAt` will be undefined
          // See: https://github.com/angular/angular.ts/issues/15644
          if (
            key.charAt &&
            key.charAt(0) !== "$" &&
            deepCompare(
              actualObj[key],
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
        const expectedObj = expected as Record<string, any>;
        const actualObj = actual as Record<string, any>;

        for (const key in expectedObj) {
          const expectedVal = expectedObj[key];

          if (isFunction(expectedVal) || isUndefined(expectedVal)) {
            continue;
          }

          const matchAnyProperty = key === anyPropertyKey;

          const actualVal = matchAnyProperty ? actual : actualObj[key];

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
/** Returns the filter classification used by the recursive comparison helpers. */
function getTypeForFilter(val: any): string {
  return val === null ? "null" : typeof val;
}
