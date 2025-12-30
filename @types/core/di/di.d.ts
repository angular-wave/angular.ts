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
