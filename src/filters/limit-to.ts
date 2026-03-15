import {
  isArrayLike,
  isFunction,
  isNumber,
  isNumberNaN,
  isString,
} from "../shared/utils.ts";

/** Creates the `limitTo` filter implementation. */
export function limitToFilter() {
  /**
   * Limits the size of an array, array-like object, string, or number.
   *
   * - If `input` is a function, it will be invoked and its return value used.
   * - If `input` is a number, it will be converted to a string.
   * - Non–array-like values are returned unchanged.
   *
   * `begin` defaults to `0` and negative values are treated as offsets from the end.
   */
  return function (
    input: Array<any> | ArrayLike<any> | string | number | Function,
    limit: string | number,
    begin?: string | number,
  ) {
    if (isFunction(input)) {
      input = input();
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
 * Returns a sliced string if `input` is a string, otherwise an array.
 */
function sliceFn(
  input: string | ArrayLike<any>,
  begin?: number,
  end?: number,
): string | Array<any> {
  if (isString(input)) return input.slice(begin, end);

  return [].slice.call(input, begin, end);
}
