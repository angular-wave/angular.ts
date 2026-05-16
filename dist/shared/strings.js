import { tail, pushR } from './common.js';
import { isArray, isString, isUndefined, isObject, isNull, isPromiseLike, callFunction, isFunction } from './utils.js';

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
function maxLength(max, str) {
    if (str.length <= max)
        return str;
    return `${str.substring(0, max - DOTS.length)}${DOTS}`;
}
/** Converts a camelCase string into kebab-case. */
function kebobString(camelCase) {
    return camelCase
        .replace(/^([A-Z])/, ($1) => $1.toLowerCase()) // replace first char
        .replace(/([A-Z])/g, ($1) => `-${$1.toLowerCase()}`); // replace rest
}
const FN_LENGTH = 9;
/** Returns a stable string representation for a function. */
function functionToString(fn) {
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
function fnToString(fn) {
    const _fn = isArray(fn) ? fn.slice(-1)[0] : fn;
    return _fn?.toString() || "undefined";
}
/** Converts arbitrary values into short readable debug strings. */
function stringify(value) {
    const seen = [];
    const isRejection = (obj) => {
        return (isObject(obj) &&
            "then" in obj &&
            isFunction(obj.then) &&
            obj.constructor.name === "Rejection");
    };
    const hasToString = (obj) => isObject(obj) &&
        !isArray(obj) &&
        obj.constructor !== Object &&
        isFunction(obj.toString);
    /** Formats a single item while tracking circular references. */
    function format(item) {
        if (isObject(item)) {
            if (seen.includes(item))
                return "[circular ref]";
            seen.push(item);
        }
        if (isUndefined(item))
            return "undefined";
        if (isNull(item))
            return "null";
        if (isPromiseLike(item))
            return "[Promise]";
        if (isRejection(item))
            return String(item._transitionRejection);
        if (hasToString(item))
            return String(callFunction(item.toString, item));
        if (isFunction(item))
            return functionToString(item);
        return item;
    }
    if (isUndefined(value)) {
        // Workaround for IE & Edge Spec incompatibility where replacer function would not be called when JSON.stringify
        // is given `undefined` as value. To work around that, we simply detect `undefined` and bail out early by
        // manually stringifying it.
        return String(format(value));
    }
    const json = JSON.stringify(value, (_key, item) => format(item));
    return isString(json) ? json.replace(/\\"/g, '"') : String(json);
}
function stripLastPathElement(str) {
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
function joinNeighborsR(acc, str) {
    if (isString(tail(acc)) && isString(str))
        return acc.slice(0, -1).concat(tail(acc) + str);
    return pushR(acc, str);
}

export { fnToString, joinNeighborsR, kebobString, maxLength, stringify, stripLastPathElement };
