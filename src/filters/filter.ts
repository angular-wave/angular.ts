import {
  equals,
  arrayFrom,
  hasOwn,
  hasCustomToString,
  isArray,
  isArrayLike,
  isFunction,
  isNull,
  isNullOrUndefined,
  isObject,
  isUndefined,
  createErrorFactory,
} from "../shared/utils.ts";

const filterError = createErrorFactory("filter");

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
    array: any[] | ArrayLike<any> | null | undefined,
    expression: any,
    comparator?: boolean | ((actual: any, expected: any) => boolean),
    anyPropertyKey?: string,
  ) {
    if (!isArrayLike(array)) {
      if (isNullOrUndefined(array)) {
        return array;
      }
      throw filterError("notarray", "Expected array but received: {0}", array);
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

    return arrayFrom<unknown>(array as ArrayLike<unknown>).filter(predicateFn);
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
      expected: unknown,
    ): boolean {
      if (isUndefined(actual)) {
        // No substring matching against `undefined`
        return false;
      }

      if (isNull(actual) || isNull(expected)) {
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

      actual = String(actual).toLowerCase();
      const expectedString = stringifyComparable(expected).toLowerCase();

      return actual.includes(expectedString);
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
      matchAgainstAnyProp,
    );
  };

  return predicateFn;
}

function stringifyComparable(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
    case "undefined":
      return String(value);
    case "function":
      return value.toString();
    default:
      return "";
  }
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

  if (expectedType === "string" && (expected as string).startsWith("!")) {
    return !deepCompare(
      actual,
      (expected as string).substring(1),
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
          if (!hasOwn(actualObj, key)) continue;

          if (
            !key.startsWith("$") &&
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
          if (!hasOwn(expectedObj, key)) continue;
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

      return Boolean(comparator(actual, expected));

    case "function":
      return false;
    default:
      return Boolean(comparator(actual, expected));
  }
}

// Used for easily differentiating between `null` and actual `object`
/** Returns the filter classification used by the recursive comparison helpers. */
function getTypeForFilter(val: any): string {
  return isNull(val) ? "null" : typeof val;
}
