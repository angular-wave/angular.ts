import { isArray, isFunction, isString } from "./utils.js";

/**
 * Predicate which checks if a value is injectable
 *
 * A value is "injectable" if it is a function, or if it is an ng1 array-notation-style array
 * where all the elements in the array are Strings, except the last one, which is a Function
 * @param {*} val
 * @returns {boolean}
 */
export function isInjectable(val) {
  if (isArray(val) && val.length) {
    const head = val.slice(0, -1),
      tail = val.slice(-1);

    return !(
      head.filter((injectable) => !isString(injectable)).length ||
      tail.filter((injectable) => !isFunction(injectable)).length
    );
  }

  return isFunction(val);
}
/**
 * Predicate which checks if a value looks like a Promise
 *
 * It is probably a Promise if it's an object, and it has a `then` property which is a Function
 * @param {any} obj
 * @returns {boolean}
 */
export function isPromise(obj) {
  return (
    obj !== null && typeof obj === "object" && typeof obj.then === "function"
  );
}
