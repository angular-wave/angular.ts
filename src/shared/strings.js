import { pushR, tail } from "./common.js";
import { pattern, val } from "./hof.js";
import { isInjectable, isPromise } from "./predicates.js";
import {
  isFunction,
  isNull,
  isObject,
  isString,
  isUndefined,
} from "./utils.js";

/**
 * Functions that manipulate strings
 */

const DOTS = "...";

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
export function maxLength(max, str) {
  if (str.length <= max) return str;

  return `${str.substring(0, max - DOTS.length)}${DOTS}`;
}
/**
 * Returns a string, with spaces added to the end, up to a desired str length
 *
 * If the string is already longer than the desired length, return the string.
 * Else returns the string, with extra spaces on the end, such that it reaches `length` characters.
 *
 * @param length the desired length of the string to return
 * @param str the input string
 */
export function padString(length, str) {
  while (str.length < length) str += " ";

  return str;
}
export function kebobString(camelCase) {
  return camelCase
    .replace(/^([A-Z])/, ($1) => $1.toLowerCase()) // replace first char
    .replace(/([A-Z])/g, ($1) => `-${$1.toLowerCase()}`); // replace rest
}

const FN_LENGTH = 9;

export function functionToString(fn) {
  const fnStr = fnToString(fn);

  const namedFunctionMatch = fnStr.match(/^(function [^ ]+\([^)]*\))/);

  const toStr = namedFunctionMatch ? namedFunctionMatch[1] : fnStr;

  const fnName = fn.name || "";

  if (fnName && toStr.match(/function \(/)) {
    return `function ${fnName}${toStr.substring(FN_LENGTH)}`;
  }

  return toStr;
}
export function fnToString(fn) {
  const _fn = Array.isArray(fn) ? fn.slice(-1)[0] : fn;

  return (_fn && _fn.toString()) || "undefined";
}

export function stringify(value) {
  const seen = [];

  const isRejection = (obj) => {
    return (
      obj &&
      typeof obj.then === "function" &&
      obj.constructor.name === "Rejection"
    );
  };

  const hasToString = (obj) =>
    isObject(obj) &&
    !Array.isArray(obj) &&
    obj.constructor !== Object &&
    isFunction(obj.toString);

  const stringifyPattern = pattern([
    [isUndefined, val("undefined")],
    [isNull, val("null")],
    [isPromise, val("[Promise]")],
    [isRejection, (reg) => reg._transitionRejection.toString()],
    [hasToString, (str) => str.toString()],
    [isInjectable, functionToString],
    [val(true), (bool) => bool],
  ]);

  function format(item) {
    if (isObject(item)) {
      if (seen.indexOf(item) !== -1) return "[circular ref]";
      seen.push(item);
    }

    return stringifyPattern(item);
  }

  if (isUndefined(value)) {
    // Workaround for IE & Edge Spec incompatibility where replacer function would not be called when JSON.stringify
    // is given `undefined` as value. To work around that, we simply detect `undefined` and bail out early by
    // manually stringifying it.
    return format(value);
  }

  return JSON.stringify(value, (_key, item) => format(item)).replace(
    /\\"/g,
    '"',
  );
}

export const stripLastPathElement = (str) => str.replace(/\/[^/]*$/, "");
/**
 * Splits on a delimiter, but returns the delimiters in the array
 *
 * #### Example:
 * ```js
 * var splitOnSlashes = splitOnDelim('/');
 * splitOnSlashes("/foo"); // ["/", "foo"]
 * splitOnSlashes("/foo/"); // ["/", "foo", "/"]
 * ```
 */
export function splitOnDelim(delim) {
  const re = new RegExp(`(${delim})`, "g");

  return (str) => str.split(re).filter(Boolean);
}
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
 */
export function joinNeighborsR(acc, str) {
  if (isString(tail(acc)) && isString(str))
    return acc.slice(0, -1).concat(tail(acc) + str);

  return pushR(acc, str);
}
