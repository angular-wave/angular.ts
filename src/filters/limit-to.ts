import {
  isArrayLike,
  isFunction,
  isNumber,
  isNumberNaN,
  isString,
} from "../shared/utils.ts";

/**
 * @returns {ng.FilterFn}
 */
export function limitToFilter() {
  /**
   * Limits the size of an array, array-like object, string, or number.
   *
   * - If `input` is a function, it will be invoked and its return value used.
   * - If `input` is a number, it will be converted to a string.
   * - Non–array-like values are returned unchanged.
   *
   * @param {Array<any>|ArrayLike<any>|string|number} input
   *   The value to limit.
   * @param {string|number} limit
   *   The maximum length of the returned value. Negative values limit from the end.
   * @param {string|number} [begin]
   *   Index at which to begin the limitation. A negative value is an offset from the end.
   *   Defaults to `0`.
   * @returns {Array<any>|ArrayLike<any>|string|number}
   *   A limited array or string, or the original input if it cannot be limited.
   */
  return function (
    input: Array<any> | ArrayLike<any> | string | number | Function,
    limit: string | number,
    begin?: string | number,
  ) {
    if (isFunction(input)) {
      input = /** @type {Function} */ input();
    }

    let numericLimit: number;

    if (Math.abs(Number(limit)) === Infinity) {
      numericLimit = Number(limit);
    } else {
      numericLimit = parseInt(String(limit), 10);
    }

    if (isNumberNaN(numericLimit)) return input;

    if (isNumber(input)) input = input.toString();

    if (!isArrayLike(input)) return input;

    const numericBegin =
      !begin || isNaN(begin as any) ? 0 : parseInt(String(begin), 10);
    const normalizedBegin =
      numericBegin < 0
        ? Math.max(0, (input as ArrayLike<any>).length + numericBegin)
        : numericBegin;

    if (numericLimit >= 0) {
      return sliceFn(
        input as string | ArrayLike<any>,
        normalizedBegin,
        normalizedBegin + numericLimit,
      );
    } else {
      if (normalizedBegin === 0) {
        return sliceFn(
          input as string | ArrayLike<any>,
          numericLimit,
          (input as ArrayLike<any>).length,
        );
      } else {
        return sliceFn(
          input as string | ArrayLike<any>,
          Math.max(0, normalizedBegin + numericLimit),
          normalizedBegin,
        );
      }
    }
  };
}

/**
 * Returns a shallow copy of a portion of an array-like or string.
 *
 * - For strings, this delegates to `String.prototype.slice`
 * - For array-like objects, this delegates to `Array.prototype.slice`
 *
 * @param {string|ArrayLike<any>} input
 *   The value to slice. Must be a string or array-like object.
 * @param {number} [begin]
 *   Zero-based index at which to begin extraction.
 * @param {number} [end]
 *   Zero-based index before which to end extraction.
 * @returns {string|Array<any>}
 *   A sliced string if input is a string, otherwise an array.
 */
function sliceFn(
  input: string | ArrayLike<any>,
  begin?: number,
  end?: number,
): string | Array<any> {
  if (isString(input)) return input.slice(begin, end);

  return [].slice.call(input, begin, end);
}
