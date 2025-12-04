import {
  isArrayLike,
  isFunction,
  isNumber,
  isNumberNaN,
  isString,
} from "../shared/utils.js";

/**
 * @returns {ng.FilterFn}
 */
export function limitToFilter() {
  /**
   * @param {Array|ArrayLike|string|number|Function} input Array/array-like, string, or number to be limited.
   * @param {string|number} limit The length of the returned array or string.
   * @param {string|number} [begin] Index at which to begin limitation. As a negative index, `begin` indicates an offset from the end of `input`. Defaults to `0`.
   */
  return function (input, limit, begin) {
    if (isFunction(input)) {
      input = /** @type {Function} */ (input)();
    }

    if (Math.abs(Number(limit)) === Infinity) {
      limit = Number(limit);
    } else {
      limit = parseInt(/** @type {string} */ (limit), 10);
    }

    if (isNumberNaN(limit)) return input;

    if (isNumber(input)) input = input.toString();

    if (!isArrayLike(input)) return input;

    begin =
      !begin || isNaN(/** @type {any} */ (begin))
        ? 0
        : parseInt(/** @type {string} */ (begin), 10);
    begin =
      begin < 0 ? Math.max(0, /** @type {[]} */ (input).length + begin) : begin;

    if (limit >= 0) {
      return sliceFn(input, begin, begin + limit);
    } else {
      if (begin === 0) {
        return sliceFn(input, limit, /** @type {[]} */ (input).length);
      } else {
        return sliceFn(input, Math.max(0, begin + limit), begin);
      }
    }
  };
}

function sliceFn(input, begin, end) {
  if (isString(input)) return input.slice(begin, end);

  return [].slice.call(input, begin, end);
}
