import { isInjectable } from "./predicates.js";
import { isArray, isDefined, isString, notNullOrUndefined } from "./utils.js";

export const BADARG = "badarg";
export const BADARGKEY = "badarg: key";
export const BADARGVALUE = "badarg: value";

/** @type {Map<ng.Validator, string>} */
const reasons = new Map([
  [notNullOrUndefined, "required"],
  [isArray, "notarray"],
  [isInjectable, "notinjectable"],
  [isDefined, "required"],
  [isString, "notstring"],
]);

/**
 *
 * @param {ng.Validator} val
 * @returns {string}
 */
function getReason(val) {
  return reasons.get(val) ?? "fail";
}

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
export function validate(fn, arg, name) {
  if (fn(arg)) return arg;

  let v;

  try {
    v = JSON.stringify(arg);
  } catch {
    v = String(arg);
  }

  throw new TypeError(`badarg:${getReason(fn)} ${name}=${v}`);
}

/**
 * @param {*} arg - The value to validate.
 * @param {string} name - Parameter name (included in error message).
 * @returns {*} The validated value.
 * @throws {TypeError} If the value does not satisfy the validator.
 */
export function validateRequired(arg, name) {
  return validate(notNullOrUndefined, arg, name);
}

/**
 * @param {*} arg - The value to validate.
 * @param {string} name - Parameter name (included in error message).
 * @returns {*} The validated value.
 * @throws {TypeError} If the value does not satisfy the validator.
 */
export function validateArray(arg, name) {
  return validate(isArray, arg, name);
}

/**
 * @param {*} arg - The value to validate.
 * @param {string} name - Parameter name (included in error message).
 * @returns {*} The validated value.
 * @throws {TypeError} If the value does not satisfy the validator.
 */
export function validateIsString(arg, name) {
  return validate(isString, arg, name);
}
