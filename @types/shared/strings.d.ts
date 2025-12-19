/**
 * Returns a string shortened to a maximum length
 *
 * If the string is already less than the `max` length, return the string.
 * Else return the string, shortened to `max - 3` and append three dots ("...").
 *
 * @param {number} max the maximum length of the string to return
 * @param {string} str the input string
 * @returns {string}
 */
export function maxLength(max: number, str: string): string;
/**
 * Returns a string, with spaces added to the end, up to a desired str length
 *
 * If the string is already longer than the desired length, return the string.
 * Else returns the string, with extra spaces on the end, such that it reaches `length` characters.
 *
 * @param {number} length the desired length of the string to return
 * @param {string} str the input string
 */
export function padString(length: number, str: string): string;
/**
 * @param {string} camelCase
 * @returns {string}
 */
export function kebobString(camelCase: string): string;
/**
 * @param {Function} fn
 * @returns {string}
 */
export function functionToString(fn: Function): string;
/**
 * @param {[]|Function} fn
 * @returns {string}
 */
export function fnToString(fn: [] | Function): string;
/**
 * @param {any} value
 * @returns {string|*|string}
 */
export function stringify(value: any): string | any | string;
/**
 * Splits on a delimiter, but returns the delimiters in the array
 *
 * #### Example:
 * ```js
 * var splitOnSlashes = splitOnDelim('/');
 * splitOnSlashes("/foo"); // ["/", "foo"]
 * splitOnSlashes("/foo/"); // ["/", "foo", "/"]
 * ```
 * @param {string} delim
 */
export function splitOnDelim(
  delim: string,
): (/** @type {string} */ str: string) => string[];
/**
 * Reduce fn that joins neighboring strings
 *
 * Given an array of strings, returns a new array
 * where all neighboring strings have been joined.
 *
 * #### Example:
 * ```js
 * let arr = ["foo", "bar", 1, "baz", "", "qux" ];
 * arr.reduce(joinNeighborsR, []) // ["foobar", 1, "bazqux" ]
 * ```
 * @param {string | any[]} acc
 * @param {unknown} str
 */
export function joinNeighborsR(acc: string | any[], str: unknown): any;
export function stripLastPathElement(str: string): string;
