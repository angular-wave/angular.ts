/**
 * @param {Function} fn
 * @returns {string}
 */
export function stringifyFn(fn: Function): string;
/**
 * @param {Function} fn
 * @returns {Array<any>}
 */
export function extractArgs(fn: Function): Array<any>;
/**
 * @param {Function} func
 * @returns {boolean}
 */
export function isClass(func: Function): boolean;
/**
 * @param {any} fn
 * @param {boolean} [strictDi]
 * @param {string} [name]
 * @returns {Array<string>}
 */
export function annotate(
  fn: any,
  strictDi?: boolean,
  name?: string,
): Array<string>;
