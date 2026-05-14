import { pushR, tail } from "./common.ts";
import { isInjectable, isPromise } from "./predicates.ts";
import {
  isArray,
  isFunction,
  isNull,
  isObject,
  isUndefined,
  isString,
  callFunction,
} from "./utils.ts";

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
 * `max` is the maximum length of the returned string.
 */
export function maxLength(max: number, str: string): string {
  if (str.length <= max) return str;

  return `${str.substring(0, max - DOTS.length)}${DOTS}`;
}
/** Converts a camelCase string into kebab-case. */
export function kebobString(camelCase: string): string {
  return camelCase
    .replace(/^([A-Z])/, ($1: string) => $1.toLowerCase()) // replace first char
    .replace(/([A-Z])/g, ($1: string) => `-${$1.toLowerCase()}`); // replace rest
}

const FN_LENGTH = 9;

/** Returns a stable string representation for a function. */
function functionToString(fn: Function): string {
  const fnStr = fnToString(fn);

  const namedFunctionMatch = /^(function [^ ]+\([^)]*\))/.exec(fnStr);

  const toStr = namedFunctionMatch ? namedFunctionMatch[1] : fnStr;

  const fnName = fn.name || "";

  if (fnName && /function \(/.exec(toStr)) {
    return `function ${fnName}${toStr.substring(FN_LENGTH)}`;
  }

  return toStr;
}

/** Returns the raw `toString()` value for a function or injectable array. */
export function fnToString(fn: [] | Function): string {
  const _fn = isArray(fn) ? fn.slice(-1)[0] : fn;

  return _fn?.toString() || "undefined";
}

/** Converts arbitrary values into short readable debug strings. */
export function stringify(value: unknown): string {
  const seen: object[] = [];

  const isRejection = (
    obj: unknown,
  ): obj is { _transitionRejection: unknown } => {
    return (
      isObject(obj) &&
      "then" in obj &&
      isFunction(obj.then) &&
      obj.constructor.name === "Rejection"
    );
  };

  const hasToString = (obj: unknown): obj is { toString: () => string } =>
    isObject(obj) &&
    !isArray(obj) &&
    obj.constructor !== Object &&
    isFunction(obj.toString);

  /** Formats a single item while tracking circular references. */
  function format(item: unknown): unknown {
    if (isObject(item)) {
      if (seen.includes(item)) return "[circular ref]";
      seen.push(item);
    }

    if (isUndefined(item)) return "undefined";

    if (isNull(item)) return "null";

    if (isPromise(item)) return "[Promise]";

    if (isRejection(item)) return String(item._transitionRejection);

    if (hasToString(item)) return String(callFunction(item.toString, item));

    if (isInjectable(item)) return functionToString(item);

    return item;
  }

  if (isUndefined(value)) {
    // Workaround for IE & Edge Spec incompatibility where replacer function would not be called when JSON.stringify
    // is given `undefined` as value. To work around that, we simply detect `undefined` and bail out early by
    // manually stringifying it.
    return String(format(value));
  }

  const json = JSON.stringify(value, (_key, item: unknown) => format(item));

  return isString(json) ? json.replace(/\\"/g, '"') : String(json);
}

export function stripLastPathElement(str: string): string {
  return str.replace(/\/[^/]*$/, "");
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
 * Joins neighboring string entries while leaving other values untouched.
 */
export function joinNeighborsR(acc: any[], str: unknown): any[] {
  if (isString(tail(acc)) && isString(str))
    return acc.slice(0, -1).concat(tail(acc) + str);

  return pushR(acc, str);
}
