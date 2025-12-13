/**
 * Validate a value using a predicate function.
 * Throws if the predicate returns false.
 * IMPORTANT: use this function only for developper errors and not for user/data errors
 *
 * @param {ng.Validator} fn - Predicate validator function.
 * @param {*} arg - The value to validate.
 * @param {string} name - Parameter name (included in error message).
 * @returns {*} The validated value.
 * @throws {TypeError} If the value does not satisfy the validator.
 */
export function validate(fn: ng.Validator, arg: any, name: string): any;
/**
 * @param {*} arg - The value to validate.
 * @param {string} name - Parameter name (included in error message).
 * @returns {*} The validated value.
 * @throws {TypeError} If the value does not satisfy the validator.
 */
export function validateRequired(arg: any, name: string): any;
/**
 * @param {*} arg - The value to validate.
 * @param {string} name - Parameter name (included in error message).
 * @returns {*} The validated value.
 * @throws {TypeError} If the value does not satisfy the validator.
 */
export function validateArray(arg: any, name: string): any;
/**
 * @param {*} arg - The value to validate.
 * @param {string} name - Parameter name (included in error message).
 * @returns {*} The validated value.
 * @throws {TypeError} If the value does not satisfy the validator.
 */
export function validateIsString(arg: any, name: string): any;
/**
 * @template T
 * @param {unknown} arg - The value to validate.
 * @param {new (...args: any[]) => T} type - The constructor to check against.
 * @param {string} name - Parameter name (included in error message).
 * @returns {T} The validated instance.
 * @throws {TypeError} If the value is not an instance of the specified type.
 */
export function validateInstanceOf<T>(
  arg: unknown,
  type: new (...args: any[]) => T,
  name: string,
): T;
export const BADARG: "badarg";
export const BADARGKEY: "badarg: key";
export const BADARGVALUE: "badarg: value";
