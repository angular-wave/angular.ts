import { PREFIX_REGEXP, SPECIAL_CHARS_REGEXP } from './constants.js';
import { NodeType } from './node.js';

const isProxySymbol = Symbol("isProxy");
/**
 * Returns whether a value is one of this scope proxy objects.
 */
function isProxy(value) {
    if (!isObject(value))
        return false;
    return !!value[isProxySymbol];
}
/**
 * Unwraps a proxy if the value is a proxy, otherwise returns the value as-is.
 *
 * @template T
 * @param val - A value that might be a proxy.
 * @returns The unproxied value.
 */
function deProxy(val) {
    return isProxy(val) ? val.$target : val;
}
const ngError = createErrorFactory("ng");
let uid = 0;
const generatedHashKeys = new WeakMap();
/**
 * Returns a unique numeric identifier.
 */
function nextUid() {
    uid += 1;
    return uid;
}
function lowercase(string) {
    return isString(string) ? string.toLowerCase() : string;
}
function uppercase(string) {
    return isString(string) ? string.toUpperCase() : string;
}
/**
 * Returns true if `obj` is an array or array-like object such as `NodeList` or `Arguments`.
 */
function isArrayLike(obj) {
    // `null`, `undefined` and `window` are not array-like
    if (isNullOrUndefined(obj) || isWindow(obj))
        return false;
    // arrays, strings and jQuery/jqLite objects are array like
    // * we have to check the existence of JQLite first as this method is called
    //   via the forEach method when constructing the JQLite object in the first place
    if (isArray(obj) || isInstanceOf(obj, Array) || isString(obj))
        return true;
    const arrayLikeObj = obj;
    const len = arrayLikeObj.length;
    // NodeList objects (with `item` method) and
    // other objects with suitable length characteristics are array-like
    return (isNumber(len) &&
        ((len >= 0 && len - 1 in arrayLikeObj) || isFunction(arrayLikeObj.item)));
}
/**
 * Determines if a reference is undefined.
 *
 * @param value Reference to check.
 * @returns True if `value` is undefined.
 */
function isUndefined(value) {
    return typeof value === "undefined";
}
/**
 * Determines if a reference is defined (not `undefined`).
 *
 * @template T
 * @param value - Reference to check.
 * @returns True if `value` is defined.
 */
function isDefined(value) {
    return typeof value !== "undefined";
}
/**
 * Returns whether a value is a real array.
 */
function isArray(array) {
    return Array.isArray(array);
}
function isInstanceOf(val, type) {
    return val instanceof type;
}
/**
 * Determines if a reference is an `Object`. Unlike `typeof` in JavaScript, `null`s are not
 * considered to be objects. Note that JavaScript arrays are objects.
 *
 * @template T
 * @param value - Reference to check.
 * @returns True if `value` is an `Object` but not `null`.
 */
function isObject(value) {
    // http://jsperf.com/isobject4
    return value !== null && typeof value === "object";
}
/**
 * Determines if a reference is a `string`.
 * @param value - The value to check.
 * @returns True if `value` is a string.
 */
function isString(value) {
    return typeof value === "string";
}
/**
 * Determines if a reference is a null.
 *
 * @param value Reference to check.
 * @returns True if `value` is a null.
 */
function isNull(value) {
    return value === null;
}
/**
 * Determines if a reference is null or undefined.
 *
 * @param obj Reference to check.
 * @returns True if `value` is null or undefined.
 */
function isNullOrUndefined(obj) {
    return obj === null || typeof obj === "undefined";
}
/**
 * Determines if a reference is not null or undefined.
 *
 * @param obj Reference to check.
 * @returns True if `value` is not null or undefined.
 */
function notNullOrUndefined(obj) {
    return !isNullOrUndefined(obj);
}
/**
 * Determines if a reference is a `Number`.
 *
 * This includes the "special" numbers `NaN`, `+Infinity` and `-Infinity`.
 *
 * If you wish to exclude these then you can use the native
 * [`isFinite'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isFinite)
 * method.
 *
 * @param value Reference to check.
 * @returns True if `value` is a `Number`.
 */
function isNumber(value) {
    return typeof value === "number";
}
/**
 *
 * Determines if a value is a date.
 *
 * @param value Reference to check.
 * @returns True if `value` is a `Date`.
 */
function isDate(value) {
    return toString.call(value) === "[object Date]";
}
/**
 * Determines if a reference is an `Error`.
 * Loosely based on https://www.npmjs.com/package/iserror
 *
 * @param value Reference to check.
 * @returns True if `value` is an `Error`.
 */
function isError(value) {
    const tag = toString.call(value);
    switch (tag) {
        case "[object Error]":
            return true;
        case "[object Exception]":
            return true;
        case "[object DOMException]":
            return true;
        default:
            return isInstanceOf(value, Error);
    }
}
/**
 * Determines if a reference is a `Function`.
 *
 * @param value Reference to check.
 * @returns True if `value` is a `Function`.
 */
function isFunction(value) {
    return typeof value === "function";
}
function callFunction(fn, thisArg, ...args) {
    return Reflect.apply(fn, thisArg, args);
}
/**
 * Determines if a value is a regular expression object.
 *
 * @param value Reference to check.
 * @returns True if `value` is a `RegExp`.
 */
function isRegExp(value) {
    return toString.call(value) === "[object RegExp]";
}
function isNodeLike(value) {
    return "nodeName" in value && isFunction(value.cloneNode);
}
/**
 * Checks if `obj` is a window object.
 *
 * @param obj Object to check
 * @returns True if `obj` is a window obj.
 */
function isWindow(obj) {
    return isInstanceOf(obj, Window);
}
/**
 * Returns whether a value looks like an Angular scope object.
 */
function isScope(obj) {
    return isObject(obj) && isFunction(obj.$watch);
}
/**
 * Returns whether a value is a `File`.
 */
function isFile(obj) {
    return toString.call(obj) === "[object File]";
}
/**
 * Returns whether a value is a `FormData` instance.
 */
function isFormData(obj) {
    return toString.call(obj) === "[object FormData]";
}
/**
 * Returns whether a value is a `Blob`.
 */
function isBlob(obj) {
    return toString.call(obj) === "[object Blob]";
}
/**
 * Returns whether a value is boolean.
 */
function isBoolean(value) {
    return typeof value === "boolean";
}
/**
 * Returns whether a value looks promise-like.
 */
function isPromiseLike(obj) {
    return isObject(obj) && isFunction(obj.then);
}
function trim(value) {
    return isString(value) ? value.trim() : value;
}
/**
 * Converts a camelCase or PascalCase name to snake case.
 */
function snakeCase(name, separator) {
    const modseparator = separator || "_";
    return name.replace(/[A-Z]/g, (letter, pos) => (pos ? modseparator : "") + letter.toLowerCase());
}
function getHashKeyTarget(obj) {
    const target = deProxy(obj);
    const objType = typeof target;
    return objType === "function" || (objType === "object" && target !== null)
        ? target
        : undefined;
}
function getGeneratedHashKey(obj) {
    const target = getHashKeyTarget(obj);
    return target ? generatedHashKeys.get(target) : undefined;
}
/**
 * Set or clear the internally generated hash key for an object.
 *
 * This does not write a property onto the object. Explicit user-owned
 * `$hashKey` properties are still read by {@link hashKey}.
 *
 * @param obj object
 * @param hashkey the hashkey (!truthy to delete the hashkey)
 */
function setHashKey(obj, hashkey) {
    const target = getHashKeyTarget(obj);
    if (!target)
        return;
    if (hashkey) {
        generatedHashKeys.set(target, hashkey);
    }
    else {
        generatedHashKeys.delete(target);
    }
}
/**
 * Read an explicit or internally generated hash key without creating one.
 */
function getHashKey(obj) {
    const target = deProxy(obj);
    const key = isObject(target)
        ? target.$hashKey
        : undefined;
    if (key) {
        const hashKey = isFunction(key) ? callFunction(key, target) : key;
        return isString(hashKey) ? hashKey : String(hashKey);
    }
    const hashKeyTarget = getHashKeyTarget(target);
    return hashKeyTarget ? generatedHashKeys.get(hashKeyTarget) : undefined;
}
/**
 * Deeply extends a destination object with one or more source objects.
 * Safely handles Dates, RegExps, DOM nodes, arrays, and nested objects.
 * Ignores the `__proto__` key to prevent prototype pollution.
 *
 * @param dst - The destination object to extend.
 * @param objs - Array of source objects to copy properties from.
 * @param [deep=false] - Whether to perform a deep merge of nested objects.
 * @returns The extended destination object.
 */
function baseExtend(dst, objs, deep = false) {
    const hasInternalKey = getGeneratedHashKey(dst);
    const hadExplicitKey = hasOwn(dst, "$hashKey");
    const explicitKey = dst.$hashKey;
    for (let i = 0, ii = objs.length; i < ii; ++i) {
        const obj = objs[i];
        if (!isObject(obj) && !isFunction(obj))
            continue;
        const keyList = keys(obj);
        for (let j = 0, jj = keyList.length; j < jj; j++) {
            const key = keyList[j];
            if (key === "$hashKey")
                continue;
            const src = obj[key];
            if (deep && isObject(src)) {
                if (isDate(src)) {
                    dst[key] = new Date(src.valueOf());
                }
                else if (isRegExp(src)) {
                    dst[key] = new RegExp(src);
                }
                else if (isNodeLike(src)) {
                    dst[key] = src.cloneNode(true);
                }
                else if (key !== "__proto__") {
                    if (!isObject(dst[key]))
                        dst[key] = isArray(src) ? [] : {};
                    baseExtend(dst[key], [src], true);
                }
            }
            else {
                dst[key] = src;
            }
        }
    }
    if (hadExplicitKey) {
        dst.$hashKey = explicitKey;
    }
    else {
        delete dst.$hashKey;
    }
    setHashKey(dst, hasInternalKey);
    return dst;
}
/**
 * Extends the destination object `dst` by copying own enumerable properties from the `src` object(s)
 * to `dst`. You can specify multiple `src` objects. If you want to preserve original objects, you can do so
 * by passing an empty object as the target: `let object = angular.extend({}, object1, object2)`.
 *
 * **Note:** Keep in mind that `angular.extend` does not support recursive merge (deep copy).
 *
 * @param dst Destination object.
 * @param src Source object(s).
 * @returns Reference to `dst`.
 */
function extend(dst, ...src) {
    return baseExtend(dst, src, false);
}
/**
 * Returns whether a number is `NaN`.
 */
function isNumberNaN(num) {
    return Number.isNaN(num);
}
/**
 * Creates a new object that inherits from `parent` and extends it with `extra`.
 */
function inherit(parent, extra) {
    return extend(createObject(parent), extra);
}
/**
 * Returns whether an object defines its own `toString` implementation.
 */
function hasCustomToString(obj) {
    return isFunction(obj.toString) && obj.toString !== toString;
}
/**
 * Returns a string appropriate for the type of node.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName)
 */
const nodeNameCache = new WeakMap();
function getNodeName(element) {
    let nodeName = nodeNameCache.get(element);
    if (nodeName === undefined) {
        const rawNodeName = element.nodeName;
        if (!rawNodeName)
            return undefined;
        nodeName = rawNodeName.toLowerCase();
        nodeNameCache.set(element, nodeName);
    }
    return nodeName;
}
/**
 * Returns whether an array-like collection contains a given value.
 */
function includes(array, obj) {
    return Array.prototype.indexOf.call(array, obj) !== -1;
}
/**
 * Removes the first occurrence of a specified value from an array.
 *
 * @template T
 * @param array - The array from which to remove the value.
 * @param value - The value to remove.
 * @returns - The index of the removed value, or -1 if the value was not found.
 */
function arrayRemove(array, value) {
    const index = array.indexOf(value);
    if (index >= 0) {
        array.splice(index, 1);
    }
    return index;
}
/**
 * Compares two values, treating `NaN` as equal to `NaN`.
 */
function simpleCompare(val1, val2) {
    return val1 === val2 || (Number.isNaN(val1) && Number.isNaN(val2));
}
/**
 * Determines if two objects or two values are equivalent. Supports value types, regular
 * expressions, arrays and objects.
 *
 * Two objects or values are considered equivalent if at least one of the following is true:
 *
 * * Both objects or values pass `===` comparison.
 * * Both objects or values are of the same type and all of their properties are equal by
 *   comparing them with `angular.equals`.
 * * Both values are NaN. (In JavaScript, NaN == NaN => false. But we consider two NaN as equal)
 * * Both values represent the same regular expression (In JavaScript,
 *   /abc/ == /abc/ => false. But we consider two regular expressions as equal when their textual
 *   representation matches).
 *
 * During a property comparison, properties of `function` type and properties with names
 * that begin with `$` are ignored.
 *
 * Scope and DOMWindow objects are being compared only by identify (`===`).
 *
 * @param o1 Object or value to compare.
 * @param o2 Object or value to compare.
 * @returns True if arguments are equal.
 *
 * @example
   <example module="equalsExample" name="equalsExample">
     <file name="index.html">
      <div ng-controller="ExampleController">
        <form novalidate>
          <h3>User 1</h3>
          Name: <input type="text" ng-model="user1.name">
          Age: <input type="number" ng-model="user1.age">

          <h3>User 2</h3>
          Name: <input type="text" ng-model="user2.name">
          Age: <input type="number" ng-model="user2.age">

          <div>
            <br/>
            <input type="button" value="Compare" ng-click="compare()">
          </div>
          User 1: <pre>{{user1 | json}}</pre>
          User 2: <pre>{{user2 | json}}</pre>
          Equal: <pre>{{result}}</pre>
        </form>
      </div>
    </file>
    <file name="script.js">
        angular.module('equalsExample', []).controller('ExampleController', ['$scope', function($scope) {
          $scope.user1 = {};
          $scope.user2 = {};
          $scope.compare = function() {
            $scope.result = JSON.stringify($scope.user1) === JSON.stringify($scope.user2);
          };
        }]);
    </file>
  </example>
 */
function equals(o1, o2) {
    if (o1 === o2)
        return true;
    if (o1 === null || o2 === null)
        return false;
    if (Number.isNaN(o1) && Number.isNaN(o2))
        return true; // NaN === NaN
    const t1 = typeof o1;
    const t2 = typeof o2;
    if (t1 !== t2 || t1 !== "object")
        return false;
    // Handle arrays
    if (isArray(o1)) {
        if (!isArray(o2))
            return false;
        const { length } = o1;
        if (length !== o2.length)
            return false;
        for (let key = 0; key < length; key++) {
            if (!equals(o1[key], o2[key]))
                return false;
        }
        return true;
    }
    // Handle Dates
    if (isDate(o1)) {
        if (!isDate(o2))
            return false;
        return simpleCompare(o1.getTime(), o2.getTime());
    }
    // Handle RegExps
    if (isRegExp(o1)) {
        if (!isRegExp(o2))
            return false;
        return o1.toString() === o2.toString();
    }
    // Reject unsafe objects
    if (isScope(o1) ||
        isScope(o2) ||
        isWindow(o1) ||
        isWindow(o2) ||
        isArray(o2) ||
        isDate(o2) ||
        isRegExp(o2))
        return false;
    // Handle general objects
    const left = o1;
    const right = o2;
    const keySet = nullObject();
    for (const key in o1) {
        if (!hasOwn(o1, key))
            continue;
        if (key.startsWith("$") || isFunction(left[key]))
            continue;
        if (!equals(left[key], right[key]))
            return false;
        keySet[key] = true;
    }
    for (const key in o2) {
        if (!hasOwn(o2, key))
            continue;
        if (!(key in keySet) &&
            !key.startsWith("$") &&
            isDefined(right[key]) &&
            !isFunction(right[key])) {
            return false;
        }
    }
    return true;
}
/**
 * throw error if the name given is hasOwnProperty
 * @param name the name to test
 * @param context the context in which the name is used, such as module or directive
 * @throws AngularTS error when `name` would shadow `hasOwnProperty`.
 */
function assertNotHasOwnProperty(name, context) {
    if (name === "hasOwnProperty") {
        throw ngError("badname", "hasOwnProperty is not a valid {0} name", context);
    }
}
/**
 * Converts a value to a display string using AngularTS serialization rules.
 */
function stringify(value) {
    if (isNullOrUndefined(value)) {
        return "";
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number") {
        return `${value}`;
    }
    const objectValue = value;
    if (hasCustomToString(objectValue) && !isArray(value) && !isDate(value)) {
        return String(callFunction(objectValue.toString, value));
    }
    return assertDefined(toJson(value));
}
/**
 * Returns whether an object traversal depth limit is valid.
 */
function isValidObjectMaxDepth(maxDepth) {
    return isNumber(maxDepth) && maxDepth > 0;
}
/**
 * Concatenates a real array with an array-like collection.
 */
function concat(array1, array2, index) {
    return array1.concat(Array.prototype.slice.call(array2, index));
}
/**
 * Converts `arguments` or an array-like value into a real array.
 */
function sliceArgs(args, startIndex) {
    return Array.prototype.slice.call(args, startIndex || 0);
}
/**
 * Returns a function which calls function `fn` bound to `self` (`self` becomes the `this` for
 * `fn`). You can supply optional `args` that are prebound to the function. This feature is also
 * known as [partial application](http://en.wikipedia.org/wiki/Partial_application), as
 * distinguished from [function currying](http://en.wikipedia.org/wiki/Currying#Contrast_with_partial_function_application).
 *
 */
function bind(context, fn, ...curryArgs) {
    if (isFunction(fn) && !isInstanceOf(fn, RegExp)) {
        return curryArgs.length
            ? function (...args) {
                return args.length
                    ? callFunction(fn, context, ...curryArgs, ...args)
                    : callFunction(fn, context, ...curryArgs);
            }
            : function (...args) {
                return args.length
                    ? callFunction(fn, context, ...args)
                    : callFunction(fn, context);
            };
    }
    // In IE, native methods are not functions so they cannot be bound (note: they don't need to be).
    return fn;
}
/**
 * JSON replacer that strips AngularTS internals and special-cases window/document/scope values.
 */
function toJsonReplacer(key, value) {
    let val = value;
    if (isString(key) && key.startsWith("$") && key.charAt(1) === "$") {
        val = undefined;
    }
    else if (isWindow(value)) {
        val = "$WINDOW";
    }
    else if (value && window.document === value) {
        val = "$DOCUMENT";
    }
    else if (isScope(value)) {
        val = "$SCOPE";
    }
    return val;
}
/**
 * Serializes input into a JSON-formatted string. Properties with leading `$$` characters
 * will be stripped since AngularTS uses this notation internally.
 *
 */
function toJson(obj, pretty) {
    if (isUndefined(obj))
        return undefined;
    if (!isNumber(pretty)) {
        pretty = pretty ? 2 : undefined;
    }
    return JSON.stringify(obj, toJsonReplacer, pretty);
}
/**
 * Deserializes a JSON string.
 */
function fromJson(json) {
    return isString(json) ? JSON.parse(json) : json;
}
/**
 * Parses an escaped URL query string into key-value pairs.
 */
function parseKeyValue(value) {
    const obj = {};
    const res = value || "";
    const keyValues = res.split("&");
    for (let i = 0; i < keyValues.length; i++) {
        let keyValue = keyValues[i];
        let splitPoint;
        let key;
        let val;
        if (keyValue) {
            key = keyValue = keyValue.replace(/\+/g, "%20");
            splitPoint = keyValue.indexOf("=");
            if (splitPoint !== -1) {
                key = keyValue.substring(0, splitPoint);
                val = keyValue.substring(splitPoint + 1);
            }
            key = tryDecodeURIComponent(key);
            if (isDefined(key)) {
                const decodedKey = key;
                const decodedVal = isDefined(val)
                    ? tryDecodeURIComponent(val)
                    : true;
                if (!hasOwn(obj, decodedKey)) {
                    obj[decodedKey] = decodedVal;
                }
                else if (isArray(obj[decodedKey])) {
                    obj[decodedKey].push(decodedVal);
                }
                else {
                    obj[decodedKey] = [obj[decodedKey], decodedVal];
                }
            }
        }
    }
    return obj;
}
/**
 * Serializes an object or array-like value into a query-string fragment.
 */
function toKeyValue(obj) {
    const parts = [];
    if (obj) {
        const keyValues = entries(obj);
        for (let i = 0; i < keyValues.length; i++) {
            const [key, value] = keyValues[i];
            if (isArray(value)) {
                for (let j = 0; j < value.length; j++) {
                    const arrayValue = value[j];
                    parts.push(encodeUriQuery(key, true) +
                        (arrayValue === true
                            ? ""
                            : `=${encodeUriQuery(arrayValue, true)}`));
                }
            }
            else {
                parts.push(encodeUriQuery(key, true) +
                    (value === true ? "" : `=${encodeUriQuery(value, true)}`));
            }
        }
    }
    return parts.length ? parts.join("&") : "";
}
/**
 * Tries to decode a URI component without throwing.
 */
function tryDecodeURIComponent(value) {
    try {
        return decodeURIComponent(value);
    }
    catch {
        return undefined;
    }
}
/**
 * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
 * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
 * segments:
 *    segment       = *pchar
 *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
 *    pct-encoded   = "%" HEXDIG HEXDIG
 *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
 *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
 *                     / "*" / "+" / "," / ";" / "="
 */
function encodeUriSegment(val) {
    return encodeUriQuery(val, true)
        .replace(/%26/gi, "&")
        .replace(/%3D/gi, "=")
        .replace(/%2B/gi, "+");
}
/**
 * This method is intended for encoding *key* or *value* parts of query component. We need a custom
 * method because encodeURIComponent is too aggressive and encodes stuff that doesn't have to be
 * encoded per http://tools.ietf.org/html/rfc3986:
 *    query         = *( pchar / "/" / "?" )
 *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
 *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
 *    pct-encoded   = "%" HEXDIG HEXDIG
 *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
 *                     / "*" / "+" / "," / ";" / "="
 */
function encodeUriQuery(val, pctEncodeSpaces) {
    return encodeURIComponent(val)
        .replace(/%40/gi, "@")
        .replace(/%3A/gi, ":")
        .replace(/%24/g, "$")
        .replace(/%2C/gi, ",")
        .replace(/%3B/gi, ";")
        .replace(/%20/g, pctEncodeSpaces ? "%20" : "+");
}
const ngAttrPrefixes = ["ng-", "data-ng-"];
/**
 * Creates a shallow copy of an object, an array, or returns primitives as-is.
 *
 * Assumes there are no proto properties.
 *
 */
function shallowCopy(src, dst) {
    if (isArray(src)) {
        const out = dst || [];
        out.push(...src);
        return out;
    }
    if (isObject(src)) {
        const out = dst || {};
        for (const key in src) {
            if (!hasOwn(src, key))
                continue;
            // Copy all properties except $$-prefixed
            if (!key.startsWith("$$")) {
                out[key] = src[key];
            }
        }
        return out;
    }
    return src;
}
/**
 * Throws when the argument is false.
 *
 * @throws Error when `argument` is false.
 */
function assert(argument, errorMsg = "Assertion failed") {
    if (!argument) {
        throw new Error(errorMsg);
    }
}
/**
 * Returns a non-nullish value or throws when the value is absent.
 *
 * @throws Error when `value` is null or undefined.
 */
function assertDefined(value, errorMsg = "Expected value to be defined") {
    assert(notNullOrUndefined(value), errorMsg);
    return value;
}
/**
 * Throws a typed AngularTS argument error when the argument is falsy.
 *
 * @throws AngularTS error when `arg` is falsy.
 */
function assertArg(arg, name, reason) {
    if (!arg) {
        throw ngError("areq", "Argument '{0}' is {1}", name || "?", reason || "required");
    }
    return arg;
}
/**
 * Asserts that a value is a function, optionally unwrapping array-annotation first.
 *
 * @throws AngularTS error when `arg` is not a function.
 */
function assertArgFn(arg, name, acceptArrayAnnotation) {
    if (acceptArrayAnnotation && isArray(arg)) {
        arg = arg[arg.length - 1];
    }
    assertArg(isFunction(arg), name, `not a function, got ${arg && typeof arg === "object"
        ? arg.constructor.name || "Object"
        : typeof arg}`);
    return arg;
}
const errorConfig = {
    objectMaxDepth: 5,
};
/**
 * Gets or updates the global error-handling configuration.
 *
 * Omitted or undefined options leave the corresponding configuration values unchanged.
 */
function errorHandlingConfig(config) {
    if (isObject(config)) {
        if (isDefined(config.objectMaxDepth)) {
            errorConfig.objectMaxDepth = isValidObjectMaxDepth(config.objectMaxDepth)
                ? config.objectMaxDepth
                : NaN;
        }
    }
    return errorConfig;
}
/**
 * Namespaced AngularTS error with structured code metadata.
 */
class AngularTSError extends Error {
    constructor(namespace, code, template, params = []) {
        super(formatErrorMessage(namespace, code, template, params));
        this.name = "AngularTSError";
        this.code = code;
        this.namespace = namespace;
        this.params = params;
    }
}
/**
 * Creates a namespaced AngularTS error factory.
 */
function createErrorFactory(namespace) {
    return (code, template, ...params) => new AngularTSError(namespace, code, template, params);
}
function formatErrorMessage(namespace, code, template, params) {
    let message = `[${namespace ? `${namespace}:` : ""}${code}] `;
    const templateArgs = params.map((arg) => toDebugString(arg));
    message += template.replace(/\{\d+\}/g, (match) => {
        const index = +match.slice(1, -1);
        if (index < templateArgs.length) {
            return templateArgs[index];
        }
        return match;
    });
    return message;
}
/**
 * Converts a value into a simplified debug-friendly string.
 *
 */
function toDebugString(obj) {
    if (isFunction(obj)) {
        return obj.toString().replace(/ \{[\s\S]*$/, "");
    }
    if (isUndefined(obj)) {
        return "undefined";
    }
    if (!isString(obj)) {
        const seen = [];
        const copyObj = structuredClone(isProxy(obj) ? obj.$target : obj);
        return JSON.stringify(copyObj, (key, val) => {
            const replace = toJsonReplacer(key, val);
            if (isObject(replace)) {
                if (seen.includes(replace))
                    return "...";
                seen.push(replace);
            }
            return replace;
        });
    }
    return obj;
}
/**
 * Computes a hash of an 'obj'.
 * Hash of a:
 *  string is string
 *  number is number as string
 *  object is either result of calling $hashKey function on the object or a
 *         uniquely generated id stored in internal metadata.
 */
function hashKey(obj) {
    const key = getHashKey(obj);
    if (key)
        return key;
    const target = deProxy(obj);
    const objType = typeof target;
    if (objType === "function" || (objType === "object" && target !== null)) {
        const generatedKey = `${objType}:${nextUid()}`;
        generatedHashKeys.set(target, generatedKey);
        return generatedKey;
    }
    if (objType === "undefined") {
        return `${objType}:${nextUid()}`;
    }
    // account for primitives
    return `${objType}:${obj}`;
}
/**
 * Merges two class name values into a single space-separated string.
 * Accepts strings, arrays of strings, or null/undefined values.
 *
 * @param firstClass - The first class name(s).
 * @param secondClass - The second class name(s).
 * @returns A single string containing all class names separated by spaces.
 */
function mergeClasses(firstClass, secondClass) {
    if (!firstClass && !secondClass)
        return "";
    if (!firstClass)
        return isArray(secondClass)
            ? secondClass.join(" ").trim()
            : (secondClass ?? "");
    if (!secondClass)
        return isArray(firstClass) ? firstClass.join(" ").trim() : firstClass;
    if (isArray(firstClass))
        firstClass = normalizeStringArray(firstClass);
    if (isArray(secondClass))
        secondClass = normalizeStringArray(secondClass);
    return `${firstClass.trim()} ${secondClass.trim()}`.trim();
}
/**
 * Joins an array of strings into a single string, trimming each
 * element and ignoring empty strings, null, and undefined.
 */
function normalizeStringArray(arr) {
    const cleaned = [];
    for (const item of arr) {
        if (item) {
            const trimmed = item.trim();
            if (trimmed)
                cleaned.push(trimmed);
        }
    }
    return cleaned.join(" ");
}
/**
 * Converts all accepted directive formats into a normalized directive name.
 */
function directiveNormalize(name) {
    return name
        .replace(PREFIX_REGEXP, "")
        .replace(SPECIAL_CHARS_REGEXP, (_name, letter, offset) => offset ? uppercase(letter) : letter);
}
/**
 * Returns whether an element should participate in animation handling.
 */
function hasAnimate(node) {
    return hasCustomOrDataAttribute(node, "animate");
}
/**
 * Returns whether a node exposes a custom or `data-*` attribute set to `"true"`.
 */
function hasCustomOrDataAttribute(node, attr) {
    if (node.nodeType !== NodeType._ELEMENT_NODE)
        return false;
    const element = node;
    const value = element.dataset[attr] ?? element.getAttribute(attr);
    return value !== null && value !== undefined && value !== "false";
}
/**
 * Returns whether an object has no own enumerable keys.
 */
function isObjectEmpty(obj) {
    if (!obj)
        return true;
    return !keys(obj).length;
}
/**
 * Checks whether the given object has the specified property as its own (not inherited).
 *
 * This is a safe version of `hasOwnProperty` that avoids issues with objects
 * that have it overridden or missing from their prototype chain.
 *
 * @param obj - The object to check.
 * @param key - The property key to look for.
 * @returns True if the object has the property as its own; otherwise, false.
 *
 * @example
 * hasOwn({ foo: 123 }, 'foo'); // true
 * hasOwn({}, 'bar'); // false
 */
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
/**
 * Removes a property from an object, equivalent to delete target[propertyKey], except it won't throw if target[propertyKey] is non-configurable.
 */
function deleteProperty(obj, key) {
    return Reflect.deleteProperty(obj, key);
}
/**
 * Returns the object's own enumerable keys.
 */
function keys(obj) {
    return Object.keys(obj);
}
/**
 * Returns the object's own enumerable values.
 */
function values(obj) {
    return Object.values(obj);
}
/**
 * Converts an array-like or iterable value into an array.
 */
function arrayFrom(value) {
    return Array.from(value);
}
function entries(obj) {
    return Object.entries(obj);
}
/**
 * Assigns own enumerable properties from sources to a target object.
 */
const { assign } = Object;
/**
 * Creates a new object with the specified prototype.
 */
const createObject = Object.create;
/**
 * Wraps a function so it can only be called once.
 * Subsequent calls do nothing and return undefined.
 *
 */
function callBackOnce(fn) {
    let called = false;
    return (...args) => {
        if (!called) {
            called = true;
            return fn(...args);
        }
        return undefined; // satisfies consistent-return
    };
}
/**
 * Wraps a function so it will only be called starting from the second invocation.
 * The first call does nothing and returns undefined.
 *
 */
function callBackAfterFirst(fn) {
    let calledOnce = false;
    return (...args) => {
        if (calledOnce) {
            return fn(...args);
        }
        calledOnce = true;
        return undefined;
    };
}
/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param [timeout=0] - The number of milliseconds to wait. Defaults to 0.
 * @returns A promise that resolves after the delay.
 */
function wait(timeout = 0) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}
/**
 * Checks if a given string starts with a specified substring.
 *
 * This is a simple polyfill-like function that mimics the behavior of
 * `String.prototype.startsWith` without using the built-in method.
 *
 * @param str - The full string to evaluate.
 * @param search - The substring to test against the beginning of `str`.
 * @returns `true` if `str` starts with `search`, otherwise `false`.
 *
 * @example
 * startsWith("hello world", "hello");
 * // returns true
 *
 * @example
 * startsWith("hello world", "world");
 * // returns false
 *
 * @example
 * startsWith("test", "");
 * // returns true (empty search string always matches)
 *
 * @example
 * startsWith("abc", "abcd");
 * // returns false
 */
function startsWith(str, search) {
    return str.startsWith(search);
}
/**
 * Loads and instantiates a WebAssembly module.
 * Tries streaming first, then falls back.
 */
async function instantiateWasm(src, imports = {}) {
    const res = await fetch(src);
    if (!res.ok)
        throw new Error("fetch failed");
    try {
        const { instance, module } = await WebAssembly.instantiateStreaming(res.clone(), imports);
        return { instance, exports: instance.exports, module };
    }
    catch {
        /* empty */
    }
    const bytes = await res.arrayBuffer();
    const { instance, module } = await WebAssembly.instantiate(bytes, imports);
    return { instance, exports: instance.exports, module };
}
/**
 * Returns whether a function is an arrow function.
 */
function isArrowFunction(fn) {
    return isFunction(fn) && !fn.prototype;
}
/**
 * Creates an object with no prototype.
 *
 * This is useful for use as a dictionary or map, since the returned object
 * does not inherit from `Object.prototype` and therefore has no built-in
 * properties such as `toString` or `hasOwnProperty`.
 *
 */
function nullObject() {
    return createObject(null);
}

export { AngularTSError, arrayFrom, arrayRemove, assert, assertArg, assertArgFn, assertDefined, assertNotHasOwnProperty, assign, baseExtend, bind, callBackAfterFirst, callBackOnce, callFunction, concat, createErrorFactory, createObject, deProxy, deleteProperty, directiveNormalize, encodeUriQuery, encodeUriSegment, entries, equals, errorHandlingConfig, extend, fromJson, getHashKey, getNodeName, hasAnimate, hasCustomToString, hasOwn, hashKey, includes, inherit, instantiateWasm, isArray, isArrayLike, isArrowFunction, isBlob, isBoolean, isDate, isDefined, isError, isFile, isFormData, isFunction, isInstanceOf, isNull, isNullOrUndefined, isNumber, isNumberNaN, isObject, isObjectEmpty, isPromiseLike, isProxy, isProxySymbol, isRegExp, isScope, isString, isUndefined, isValidObjectMaxDepth, isWindow, keys, lowercase, mergeClasses, nextUid, ngAttrPrefixes, notNullOrUndefined, nullObject, parseKeyValue, setHashKey, shallowCopy, simpleCompare, sliceArgs, snakeCase, startsWith, stringify, toDebugString, toJson, toKeyValue, trim, tryDecodeURIComponent, uppercase, values, wait };
