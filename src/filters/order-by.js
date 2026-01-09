import {
  hasCustomToString,
  isArray,
  isArrayLike,
  isFunction,
  isNullOrUndefined,
  isObject,
  isString,
  minErr,
} from "../shared/utils.js";
import { $injectTokens } from "../injection-tokens.js";

/**
 * @typedef {Object} ComparisonObject
 * @property {*} value
 * @property {{ value: number, type: string, index: number }} tieBreaker
 * @property {Array<{ value: any, type: string, index: number }>} predicateValues
 */

orderByFilter.$inject = [$injectTokens._parse];

/**
 * @param {ng.ParseService} $parse
 * @returns {ng.FilterFn}
 */
export function orderByFilter($parse) {
  /**
   * Sorts an array or array-like collection based on one or more predicates.
   *
   * The collection can be:
   * - An array
   * - An array-like object
   * - A function returning an array
   *
   * Predicates can be:
   * - Property names (strings)
   * - Getter functions
   * - Strings with "+" or "-" prefix to indicate ascending/descending order
   *
   * @param {Array<any>|ArrayLike<any>|Function} array
   *   The collection to be sorted.
   * @param {string|Function|Array<string|Function>} [sortPredicate]
   *   A single predicate or array of predicates used for sorting.
   * @param {boolean} [reverseOrder=false]
   *   If true, reverses the sort order.
   * @param {Function} [compareFn]
   *   Optional comparator function. Defaults to a type-aware comparison function.
   * @returns {Array<any>|ArrayLike<any>}
   *   A new array containing the sorted values.
   *
   * @throws {Error} Throws if `array` is not array-like.
   */
  return function (array, sortPredicate, reverseOrder, compareFn) {
    if (isNullOrUndefined(array)) return array;

    if (isFunction(array)) return array();

    if (!isArrayLike(array)) {
      throw minErr("orderBy")(
        "notarray",
        "Expected array but received: {0}",
        array,
      );
    }

    if (!isArray(sortPredicate)) {
      sortPredicate = [sortPredicate ?? "+"]; // if undefined, default to "+"
    }

    if (sortPredicate.length === 0) {
      sortPredicate = ["+"];
    }

    const predicates = processPredicates(sortPredicate);

    const descending = reverseOrder ? -1 : 1;

    // Define the `compare()` function. Use a default comparator if none is specified.
    const compare = isFunction(compareFn) ? compareFn : defaultCompare;

    // The next three lines are a version of a Swartzian Transform idiom from Perl
    // (sometimes called the Decorate-Sort-Undecorate idiom)
    // See https://en.wikipedia.org/wiki/Schwartzian_transform
    const compareValues = /** @type {ComparisonObject[]} */ (
      Array.prototype.map.call(array, getComparisonObject)
    );

    compareValues.sort(doComparison);
    array = compareValues.map((item) => item.value);

    return array;

    /**
     * Creates a comparison object for a given value in the array.
     * This object is used to perform stable sorting with multiple predicates.
     *
     * @param {*} value - The value from the array to wrap for comparison.
     * @param {number} index - The index of the value in the original array.
     * @returns {{
     *   value: *,
     *   tieBreaker: { value: number, type: string, index: number },
     *   predicateValues: Array<{ value: *, type: string, index: number }>
     * }}
     *   An object containing:
     *     - `value`: the original value,
     *     - `tieBreaker`: a stable sort fallback using the original index,
     *     - `predicateValues`: an array of values derived from each sort predicate.
     */
    function getComparisonObject(value, index) {
      // NOTE: We are adding an extra `tieBreaker` value based on the element's index.
      // This will be used to keep the sort stable when none of the input predicates can
      // distinguish between two elements.
      return {
        value,
        tieBreaker: { value: index, type: "number", index },
        predicateValues: predicates.map((predicate) =>
          getPredicateValue(predicate.get(value), index),
        ),
      };
    }

    /**
     * Comparator used to sort decorated collection items.
     *
     * Iterates over all sort predicates and compares their corresponding
     * predicate values. The first non-zero comparison result determines
     * the ordering.
     *
     * If all predicate comparisons are equal, a tie-breaker based on the
     * original index is used to guarantee a stable sort.
     *
     * @param {ComparisonObject} v1 First decorated comparison object
     * @param {ComparisonObject} v2 Second decorated comparison object
     * @returns {number} -1 if v1 < v2, 1 if v1 > v2, 0 if equivalent
     */
    function doComparison(v1, v2) {
      for (let i = 0, ii = predicates.length; i < ii; i++) {
        const result = compare(v1.predicateValues[i], v2.predicateValues[i]);

        if (result) {
          return result * predicates[i].descending * descending;
        }
      }

      return (
        (compare(v1.tieBreaker, v2.tieBreaker) ||
          defaultCompare(v1.tieBreaker, v2.tieBreaker)) * descending
      );
    }
  };

  /**
   * Processes an array of sort predicates into getter functions and sort directions.
   *
   * Each predicate can be:
   * - A function: used directly to extract values for comparison.
   * - A string starting with `+` or `-` to indicate ascending or descending order.
   *   The remainder of the string is interpreted as a property path.
   *
   * @param {(string|Function)[]} sortPredicates - Array of predicates to process. Each predicate
   *   can be a string (property name, optionally prefixed with "+" or "-") or a function.
   * @return {Array<{get: Function, descending: number}>} Array of objects, each containing:
   *   - `get`: Function to extract the value from an item.
   *   - `descending`: `1` for ascending, `-1` for descending.
   */
  function processPredicates(sortPredicates) {
    return sortPredicates.map((predicate) => {
      let descending = 1;

      /**
       * @type {function(*): *}
       */
      let get = (x) => x;

      if (isFunction(predicate)) {
        get = /** @type {function(*): *} */ (predicate);
      } else if (isString(predicate)) {
        if (predicate.charAt(0) === "+" || predicate.charAt(0) === "-") {
          descending = predicate.charAt(0) === "-" ? -1 : 1;
          predicate = predicate.substring(1);
        }

        if (predicate !== "") {
          const parsed = $parse(predicate);

          if (parsed.constant) {
            const key = parsed();

            get = /** @type {Record<string, any>} value */ (value) =>
              value[key];
          } else {
            get = parsed;
          }
        }
      }

      return { get, descending };
    });
  }

  /**
   * @param {any} value
   * @return {boolean}
   */
  function isPrimitive(value) {
    switch (typeof value) {
      case "number": /* falls through */
      case "boolean": /* falls through */
      case "string":
        return true;
      default:
        return false;
    }
  }

  /**
   * Converts an object to a primitive value for comparison purposes.
   *
   * - If the object has a valid `valueOf()` method that returns a primitive, it uses that.
   * - Otherwise, if the object has a custom `toString()` method, it uses that.
   * - If neither yields a primitive, returns the original object.
   *
   * @param {*} value - The object to convert.
   * @returns {*} The primitive representation of the object if possible; otherwise, the original object.
   */
  function objectValue(value) {
    // If `valueOf` is a valid function use that
    if (isFunction(value.valueOf)) {
      value = value.valueOf();

      if (isPrimitive(value)) return value;
    }

    // If `toString` is a valid function and not the one from `Object.prototype` use that
    if (hasCustomToString(value)) {
      value = value.toString();

      if (isPrimitive(value)) return value;
    }

    return value;
  }

  /**
   * Normalizes a value for sorting by determining its type and
   * converting objects to primitive representations when possible.
   *
   * @param {*} value - The value to normalize for comparison.
   * @param {number} index - The original index of the value in the array.
   * @returns {{
   *   value: *,
   *   type: string,
   *   index: number
   * }}
   *   An object containing:
   *     - `value`: the normalized value (primitive if possible),
   *     - `type`: a string representing the type of the value (`number`, `string`, `boolean`, `null`, etc.),
   *     - `index`: the original index to maintain stable sorting.
   */
  function getPredicateValue(value, index) {
    /** @type {String} */ let type = typeof value;

    if (value === null) {
      type = "null";
    } else if (type === "object") {
      value = objectValue(value);
    }

    return { value, type, index };
  }

  /**
   * Default comparison function used by the `orderBy` filter.
   *
   * Compares two wrapped predicate values and returns a sort order indicator.
   * Comparison rules:
   * - Values of the same type are compared directly
   * - Strings are compared case-insensitively
   * - Objects fall back to their original index to preserve stability
   * - `undefined` and `null` are ordered last
   *
   * @param {{ value: any, type: string, index: number }} v1
   *   First comparison object.
   * @param {{ value: any, type: string, index: number }} v2
   *   Second comparison object.
   * @returns {number}
   *   Returns `-1` if `v1 < v2`, `1` if `v1 > v2`, or `0` if equal.
   */
  function defaultCompare(v1, v2) {
    let result = 0;

    const type1 = v1.type;

    const type2 = v2.type;

    if (type1 === type2) {
      let value1 = v1.value;

      let value2 = v2.value;

      if (type1 === "string") {
        // Compare strings case-insensitively
        value1 = value1.toLowerCase();
        value2 = value2.toLowerCase();
      } else if (type1 === "object") {
        // For basic objects, use the position of the object
        // in the collection instead of the value
        if (isObject(value1)) value1 = v1.index;

        if (isObject(value2)) value2 = v2.index;
      }

      if (value1 !== value2) {
        result = value1 < value2 ? -1 : 1;
      }
    } else {
      result =
        type1 === "undefined"
          ? 1
          : type2 === "undefined"
            ? -1
            : type1 === "null"
              ? 1
              : type2 === "null"
                ? -1
                : type1 < type2
                  ? -1
                  : 1;
    }

    return result;
  }
}
