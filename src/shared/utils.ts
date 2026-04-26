import { PREFIX_REGEXP, SPECIAL_CHARS_REGEXP } from "./constants.ts";
import { NodeType } from "./node.ts";

export const isProxySymbol = Symbol("isProxy");

/**
 * Returns whether a value is one of this scope proxy objects.
 */
export function isProxy(value: any): value is ng.Scope {
  return !!(value && value[isProxySymbol]);
}

/**
 * Unwraps a proxy if the value is a proxy, otherwise returns the value as-is.
 *
 * @template T
 * @param val - A value that might be a proxy.
 * @returns The unproxied value.
 */
export function deProxy<T>(val: T | (T & { $target: T })): T {
  return isProxy(val) ? (val as T & { $target: T }).$target : val;
}

const ngMinErr = minErr("ng");

let uid = 0;

/**
 * Returns a unique numeric identifier.
 */
export function nextUid() {
  uid += 1;

  return uid;
}

/**
 * Converts the specified string to lowercase.
 */
export function lowercase(string: any): any {
  return isString(string) ? string.toLowerCase() : string;
}

/**
 * Converts the specified string to uppercase.
 */
export function uppercase(string: any): any {
  return isString(string) ? string.toUpperCase() : string;
}

/**
 * Returns true if `obj` is an array or array-like object such as `NodeList` or `Arguments`.
 */
export function isArrayLike(obj: any): boolean {
  // `null`, `undefined` and `window` are not array-like
  if (isNullOrUndefined(obj) || isWindow(obj)) return false;

  // arrays, strings and jQuery/jqLite objects are array like
  // * we have to check the existence of JQLite first as this method is called
  //   via the forEach method when constructing the JQLite object in the first place
  if (isArray(obj) || obj instanceof Array || isString(obj)) return true;

  const arrayLikeObj = obj as ArrayLike<any> & Object & Partial<NodeList>;

  const len = arrayLikeObj.length;

  // NodeList objects (with `item` method) and
  // other objects with suitable length characteristics are array-like
  return (
    isNumber(len) &&
    ((len >= 0 && len - 1 in arrayLikeObj) ||
      typeof arrayLikeObj.item === "function")
  );
}

/**
 * Determines if a reference is undefined.
 *
 * @param value Reference to check.
 * @returns True if `value` is undefined.
 */
export function isUndefined(value: any): value is undefined {
  return typeof value === "undefined";
}

/**
 * Determines if a reference is defined (not `undefined`).
 *
 * @template T
 * @param value - Reference to check.
 * @returns True if `value` is defined.
 */
export function isDefined<T>(value: T | undefined): value is T {
  return typeof value !== "undefined";
}

/**
 * Returns whether a value is a real array.
 */
export function isArray<T = any>(array: any): array is T[] {
  return Array.isArray(array);
}

/**
 * Returns whether a value is an instance of the provided constructor.
 */
export function isInstanceOf<T>(
  val: any,
  type: new (...args: any[]) => T,
): val is T {
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
export function isObject<T>(value: T): value is T & object {
  // http://jsperf.com/isobject4
  return value !== null && typeof value === "object";
}

/**
 * Determines if a value is an object with a null prototype
 *
 * @param value Reference to check.
 * @returns True if `value` is an `Object` with a null prototype
 */
export function isBlankObject(value: any): boolean {
  return (
    value !== null && typeof value === "object" && !Object.getPrototypeOf(value)
  );
}

/**
 * Determines if a reference is a `string`.
 * @param value - The value to check.
 * @returns True if `value` is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Determines if a reference is a null.
 *
 * @param value Reference to check.
 * @returns True if `value` is a null.
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Determines if a reference is null or undefined.
 *
 * @param obj Reference to check.
 * @returns True if `value` is null or undefined.
 */
export function isNullOrUndefined(obj: unknown): obj is null | undefined {
  return obj === null || typeof obj === "undefined";
}

/**
 * Determines if a reference is not null or undefined.
 *
 * @param obj Reference to check.
 * @returns True if `value` is null or undefined.
 */
export function notNullOrUndefined(obj: any): boolean {
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
export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

/**
 *
 * Determines if a value is a date.
 *
 * @param value Reference to check.
 * @returns True if `value` is a `Date`.
 */
export function isDate(value: any): value is Date {
  return toString.call(value) === "[object Date]";
}

/**
 * Determines if a reference is an `Error`.
 * Loosely based on https://www.npmjs.com/package/iserror
 *
 * @param value Reference to check.
 * @returns True if `value` is an `Error`.
 */
export function isError(value: any): value is Error {
  const tag = toString.call(value);

  switch (tag) {
    case "[object Error]":
      return true;
    case "[object Exception]":
      return true;
    case "[object DOMException]":
      return true;
    default:
      return value instanceof Error;
  }
}

/**
 * Determines if a reference is a `Function`.
 *
 * @param value Reference to check.
 * @returns True if `value` is a `Function`.
 */
export function isFunction<T extends Function = Function>(
  value: any,
): value is T {
  return typeof value === "function";
}

/**
 * Determines if a value is a regular expression object.
 *
 * @param value Reference to check.
 * @returns True if `value` is a `RegExp`.
 */
export function isRegExp(value: any): value is RegExp {
  return toString.call(value) === "[object RegExp]";
}

/**
 * Checks if `obj` is a window object.
 *
 * @param obj Object to check
 * @returns True if `obj` is a window obj.
 */
export function isWindow(obj: any): obj is Window {
  return isInstanceOf(obj, Window);
}

/**
 * Returns whether a value looks like an Angular scope object.
 */
export function isScope(obj: any): boolean {
  return obj && obj.$watch;
}

/**
 * Returns whether a value is a `File`.
 */
export function isFile(obj: any): boolean {
  return toString.call(obj) === "[object File]";
}

/**
 * Returns whether a value is a `FormData` instance.
 */
export function isFormData(obj: any): boolean {
  return toString.call(obj) === "[object FormData]";
}

/**
 * Returns whether a value is a `Blob`.
 */
export function isBlob(obj: any): boolean {
  return toString.call(obj) === "[object Blob]";
}

/**
 * Returns whether a value is boolean.
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === "boolean";
}

/**
 * Returns whether a value looks promise-like.
 */
export function isPromiseLike(obj: any): boolean {
  return obj && isFunction(obj.then);
}

/**
 * Trims a string value and leaves non-strings unchanged.
 */
export function trim(value: any): any {
  return isString(value) ? value.trim() : value;
}

/**
 * Converts a camelCase or PascalCase name to snake case.
 */
export function snakeCase(name: string, separator?: string): string {
  const modseparator = separator || "_";

  return name.replace(
    /[A-Z]/g,
    (letter: string, pos: number) =>
      (pos ? modseparator : "") + letter.toLowerCase(),
  );
}

/**
 * Set or clear the hashkey for an object.
 * @param obj object
 * @param hashkey the hashkey (!truthy to delete the hashkey)
 */
export function setHashKey(obj: { [x: string]: any }, hashkey: any): void {
  const hashable = obj as { [x: string]: any; _hashKey?: any };

  if (hashkey) {
    hashable._hashKey = hashkey;
  } else {
    delete hashable._hashKey;
  }
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
export function baseExtend(
  dst: Record<string, any>,
  objs: Array<Record<string, any>>,
  deep = false,
): Record<string, any> {
  const hasKey = dst._hashKey;

  for (let i = 0, ii = objs.length; i < ii; ++i) {
    const obj = objs[i];

    if (!isObject(obj) && !isFunction(obj)) continue;
    const keyList = keys(obj);

    for (let j = 0, jj = keyList.length; j < jj; j++) {
      const key = keyList[j];

      const src = obj[key];

      if (deep && isObject(src)) {
        if (isDate(src)) {
          dst[key] = new Date(src.valueOf());
        } else if (isRegExp(src)) {
          dst[key] = new RegExp(src);
        } else if (src.nodeName) {
          dst[key] = src.cloneNode(true);
        } else if (key !== "__proto__") {
          if (!isObject(dst[key])) dst[key] = isArray(src) ? [] : {};
          baseExtend(dst[key], [src], true);
        }
      } else {
        dst[key] = src;
      }
    }
  }

  setHashKey(dst, hasKey);

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
export function extend(dst: any, ...src: any[]): any {
  return baseExtend(dst, src, false);
}

/**
 * Returns whether a number is `NaN`.
 */
export function isNumberNaN(num: any): boolean {
  return Number.isNaN(num);
}

/**
 * Creates a new object that inherits from `parent` and extends it with `extra`.
 */
export function inherit(parent: any, extra: any): any {
  return extend(createObject(parent), extra);
}

/**
 * Returns whether an object defines its own `toString` implementation.
 */
export function hasCustomToString(obj: { toString: () => string }): boolean {
  return isFunction(obj.toString) && obj.toString !== toString;
}

/**
 * Returns a string appropriate for the type of node.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName)
 */
export function getNodeName(element: Element): string {
  return lowercase(element.nodeName);
}

/**
 * Returns whether an array-like collection contains a given value.
 */
export function includes(array: any, obj: any): boolean {
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
export function arrayRemove<T>(array: T[], value: T): number {
  const index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
  }

  return index;
}

/**
 * Compares two values, treating `NaN` as equal to `NaN`.
 */
export function simpleCompare(val1: unknown, val2: unknown): boolean {
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
            $scope.result = angular.equals($scope.user1, $scope.user2);
          };
        }]);
    </file>
  </example>
 */
export function equals(o1: any, o2: any): boolean {
  if (o1 === o2) return true;

  if (o1 === null || o2 === null) return false;

  if (Number.isNaN(o1) && Number.isNaN(o2)) return true; // NaN === NaN

  const t1 = typeof o1;

  const t2 = typeof o2;

  if (t1 !== t2 || t1 !== "object") return false;

  // Handle arrays
  if (isArray(o1)) {
    if (!isArray(o2)) return false;

    const { length } = o1;

    if (length !== o2.length) return false;

    for (let key = 0; key < length; key++) {
      if (!equals(o1[key], o2[key])) return false;
    }

    return true;
  }

  // Handle Dates
  if (isDate(o1)) {
    if (!isDate(o2)) return false;

    return simpleCompare(o1.getTime(), o2.getTime());
  }

  // Handle RegExps
  if (isRegExp(o1)) {
    if (!isRegExp(o2)) return false;

    return o1.toString() === o2.toString();
  }

  // Reject unsafe objects
  if (
    isScope(o1) ||
    isScope(o2) ||
    isWindow(o1) ||
    isWindow(o2) ||
    isArray(o2) ||
    isDate(o2) ||
    isRegExp(o2)
  )
    return false;

  // Handle general objects
  const keySet: Record<string, boolean> = nullObject();

  for (const key in o1) {
    if (key.charAt(0) === "$" || isFunction(o1[key])) continue;

    if (!equals(o1[key], o2[key])) return false;
    keySet[key] = true;
  }

  for (const key in o2) {
    if (
      !(key in keySet) &&
      key.charAt(0) !== "$" &&
      isDefined(o2[key]) &&
      !isFunction(o2[key])
    ) {
      return false;
    }
  }

  return true;
}

/**
 * throw error if the name given is hasOwnProperty
 * @param name the name to test
 * @param context the context in which the name is used, such as module or directive
 */
export function assertNotHasOwnProperty(name: string, context: string): void {
  if (name === "hasOwnProperty") {
    throw ngMinErr(
      "badname",
      "hasOwnProperty is not a valid {0} name",
      context,
    );
  }
}

/**
 * Converts a value to a display string using AngularTS serialization rules.
 */
export function stringify(value: unknown): string | unknown {
  if (isNull(value) || isUndefined(value)) {
    return "";
  }
  switch (typeof value) {
    case "string":
      break;
    case "number":
      value = `${value}`;
      break;
    default:
      const objectValue = value as Object;

      if (hasCustomToString(objectValue) && !isArray(value) && !isDate(value)) {
        value = objectValue.toString();
      } else {
        value = toJson(value);
      }
  }

  return value;
}

/**
 * Returns whether an object traversal depth limit is valid.
 */
export function isValidObjectMaxDepth(maxDepth: any): boolean {
  return isNumber(maxDepth) && maxDepth > 0;
}

/**
 * Concatenates a real array with an array-like collection.
 */
export function concat(array1: any[], array2: any, index?: number) {
  return array1.concat(Array.prototype.slice.call(array2, index));
}

/**
 * Converts `arguments` or an array-like value into a real array.
 */
export function sliceArgs(args: IArguments | any[], startIndex?: number) {
  return Array.prototype.slice.call(args, startIndex || 0);
}

/**
 * Returns a function which calls function `fn` bound to `self` (`self` becomes the `this` for
 * `fn`). You can supply optional `args` that are prebound to the function. This feature is also
 * known as [partial application](http://en.wikipedia.org/wiki/Partial_application), as
 * distinguished from [function currying](http://en.wikipedia.org/wiki/Currying#Contrast_with_partial_function_application).
 *
 */
export function bind(context: any, fn: any) {
  const curryArgs = arguments.length > 2 ? sliceArgs(arguments, 2) : [];

  if (isFunction(fn) && !(fn instanceof RegExp)) {
    return curryArgs.length
      ? function () {
          return arguments.length
            ? fn.apply(context, concat(curryArgs, arguments, 0))
            : fn.apply(context, curryArgs);
        }
      : function () {
          return arguments.length
            ? fn.apply(context, arguments)
            : fn.call(context);
        };
  }

  // In IE, native methods are not functions so they cannot be bound (note: they don't need to be).
  return fn;
}

/**
 * JSON replacer that strips AngularTS internals and special-cases window/document/scope values.
 */
function toJsonReplacer(key: string, value: any): any {
  let val = value;

  if (
    typeof key === "string" &&
    key.charAt(0) === "$" &&
    key.charAt(1) === "$"
  ) {
    val = undefined;
  } else if (isWindow(value)) {
    val = "$WINDOW";
  } else if (value && window.document === value) {
    val = "$DOCUMENT";
  } else if (isScope(value)) {
    val = "$SCOPE";
  }

  return val;
}

/**
 * Serializes input into a JSON-formatted string. Properties with leading `$$` characters
 * will be stripped since AngularTS uses this notation internally.
 *
 */
export function toJson(obj: any, pretty?: boolean | number) {
  if (isUndefined(obj)) return undefined;

  if (!isNumber(pretty)) {
    pretty = pretty ? 2 : undefined;
  }

  return JSON.stringify(obj, toJsonReplacer, pretty);
}

/**
 * Deserializes a JSON string.
 */
export function fromJson(json: any): any {
  return isString(json) ? JSON.parse(json) : json;
}

/**
 * Returns a new date offset by the specified number of minutes.
 */
export function addDateMinutes(date: Date, minutes: number): Date {
  const newDate = new Date(date.getTime());

  newDate.setMinutes(newDate.getMinutes() + minutes);

  return newDate;
}

/**
 * Parses an escaped URL query string into key-value pairs.
 */
export function parseKeyValue(value: string) {
  const obj: Record<string, boolean | string | undefined | Array<any>> = {};

  const res = value || "";

  res.split("&").forEach((keyValue: string) => {
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

        const decodedVal: string | boolean | undefined = isDefined(val)
          ? tryDecodeURIComponent(val)
          : true;

        if (!hasOwn(obj, decodedKey)) {
          obj[decodedKey] = decodedVal;
        } else if (isArray(obj[decodedKey])) {
          (obj[decodedKey] as Array<any>).push(decodedVal);
        } else {
          obj[decodedKey] = [obj[decodedKey], decodedVal];
        }
      }
    }
  });

  return obj;
}

/**
 * Serializes an object or array-like value into a query-string fragment.
 */
export function toKeyValue(
  obj: string | { [s: string]: any } | ArrayLike<any> | null,
): string {
  const parts: string[] = [];

  obj &&
    entries(obj).forEach(([key, value]) => {
      if (isArray(value)) {
        value.forEach((arrayValue) => {
          parts.push(
            encodeUriQuery(key, true) +
              (arrayValue === true
                ? ""
                : `=${encodeUriQuery(arrayValue, true)}`),
          );
        });
      } else {
        parts.push(
          encodeUriQuery(key, true) +
            (value === true ? "" : `=${encodeUriQuery(value, true)}`),
        );
      }
    });

  return parts.length ? parts.join("&") : "";
}

/**
 * Tries to decode a URI component without throwing.
 */
export function tryDecodeURIComponent(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
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
export function encodeUriSegment(val: string): string {
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
export function encodeUriQuery(
  val: string | number | boolean,
  pctEncodeSpaces?: boolean,
): string {
  return encodeURIComponent(val)
    .replace(/%40/gi, "@")
    .replace(/%3A/gi, ":")
    .replace(/%24/g, "$")
    .replace(/%2C/gi, ",")
    .replace(/%3B/gi, ";")
    .replace(/%20/g, pctEncodeSpaces ? "%20" : "+");
}

export const ngAttrPrefixes = ["ng-", "data-ng-"];

/**
 * Creates a shallow copy of an object, an array, or returns primitives as-is.
 *
 * Assumes there are no proto properties.
 *
 */
export function shallowCopy<T>(src: T, dst?: any): T {
  if (isArray(src)) {
    const out: any[] = dst || [];

    out.push(...src);

    return out as T;
  }

  if (isObject(src)) {
    const out: Record<string, unknown> = dst || {};

    for (const key in src) {
      // Copy all properties except $$-prefixed
      if (!key.startsWith("$$")) {
        out[key] = src[key];
      }
    }

    return out as T;
  }

  return src;
}

/**
 * Throws when the argument is false.
 */
export function assert(argument: boolean, errorMsg = "Assertion failed"): void {
  if (!argument) {
    throw new Error(errorMsg);
  }
}

/**
 * Throws a typed AngularTS argument error when the argument is falsy.
 */
export function assertArg<T>(arg: T, name: string, reason?: string): T {
  if (!arg) {
    throw ngMinErr(
      "areq",
      "Argument '{0}' is {1}",
      name || "?",
      reason || "required",
    );
  }

  return arg;
}

/**
 * Asserts that a value is a function, optionally unwrapping array-annotation first.
 */
export function assertArgFn(
  arg: string | Function | any[],
  name: string,
  acceptArrayAnnotation?: boolean,
) {
  if (acceptArrayAnnotation && isArray(arg)) {
    arg = arg[arg.length - 1];
  }

  assertArg(
    isFunction(arg),
    name,
    `not a function, got ${
      arg && typeof arg === "object"
        ? arg.constructor.name || "Object"
        : typeof arg
    }`,
  );

  return arg;
}

const minErrConfig = {
  objectMaxDepth: 5,
  urlErrorParamsEnabled: true,
};

/**
 * Error configuration object. May only contain the options that need to be updated.
 */
export interface ErrorHandlingConfig {
  /**
   * The max depth for stringifying objects.
   * Setting to a non-positive or non-numeric value removes the max depth limit.
   * Default: 5.
   */
  objectMaxDepth?: number;

  /**
   * Specifies whether the generated error URL will contain the parameters
   * of the thrown error. Default: true.
   * When used without argument, it returns the current value.
   */
  urlErrorParamsEnabled?: boolean;
}

/**
 * Gets or updates the global error-handling configuration.
 *
 * Omitted or undefined options leave the corresponding configuration values unchanged.
 */
export function errorHandlingConfig(
  config?: ErrorHandlingConfig,
): ErrorHandlingConfig {
  if (isObject(config)) {
    if (isDefined(config.objectMaxDepth)) {
      minErrConfig.objectMaxDepth = isValidObjectMaxDepth(config.objectMaxDepth)
        ? config.objectMaxDepth
        : NaN;
    }

    if (
      isDefined(config.urlErrorParamsEnabled) &&
      isBoolean(config.urlErrorParamsEnabled)
    ) {
      minErrConfig.urlErrorParamsEnabled = config.urlErrorParamsEnabled;
    }
  }

  return minErrConfig;
}

/**
 * This object provides a utility for producing rich Error messages within
 * AngularTS. It can be called as follows:
 *
 * let exampleMinErr = minErr('example');
 * throw exampleMinErr('one', 'This {0} is {1}', foo, bar);
 *
 * The above creates an instance of minErr in the example namespace. The
 * resulting error will have a namespaced error code of example.one.  The
 * resulting error will replace {0} with the value of foo, and {1} with the
 * value of bar. The object is not restricted in the number of arguments it can
 * take.
 *
 * If fewer arguments are specified than necessary for interpolation, the extra
 * interpolation markers will be preserved in the final string.
 *
 * Since data will be parsed statically during a build step, some restrictions
 * are applied with respect to how minErr instances are created and called.
 * Instances should have names of the form namespaceMinErr for a minErr created
 * using minErr('namespace'). Error codes, namespaces and template strings
 * should all be static strings, not variables or general expressions.
 *
 * @param module The namespace to use for the new minErr instance.
 * @returns minErr instance
 */
export function minErr(module: string): (...args: any[]) => Error {
  return function (...args: any[]) {
    const code = args[0];

    const template = args[1];

    let message = `[${module ? `${module}:` : ""}${code}] `;

    const templateArgs = sliceArgs(args, 2).map((arg) => toDebugString(arg));

    message += template.replace(/\{\d+\}/g, (match: string) => {
      const index = +match.slice(1, -1);

      if (index < templateArgs.length) {
        return templateArgs[index];
      }

      return match;
    });

    return new Error(message);
  };
}

/**
 * Converts a value into a simplified debug-friendly string.
 *
 */
export function toDebugString(obj: any): string {
  if (typeof obj === "function") {
    return obj.toString().replace(/ \{[\s\S]*$/, "");
  }

  if (isUndefined(obj)) {
    return "undefined";
  }

  if (typeof obj !== "string") {
    const seen: object[] = [];

    const copyObj = structuredClone(isProxy(obj) ? obj.$target : obj);

    return JSON.stringify(copyObj, (key, val) => {
      const replace = toJsonReplacer(key, val);

      if (isObject(replace)) {
        if (seen.indexOf(replace) >= 0) return "...";

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
 *  object is either result of calling _hashKey function on the object or uniquely generated id,
 *         that is also assigned to the _hashKey property of the object.
 */
export function hashKey(obj: any): string {
  const key = obj && obj._hashKey;

  if (key) {
    if (typeof key === "function") {
      return obj._hashKey();
    }

    return key;
  }

  const objType = typeof obj;

  if (objType === "function" || (objType === "object" && obj !== null)) {
    obj._hashKey = `${objType}:${nextUid()}`;

    return obj._hashKey;
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
export function mergeClasses(
  firstClass: string | string[] | null | undefined,
  secondClass: string | string[] | null | undefined,
): string {
  if (!firstClass && !secondClass) return "";

  if (!firstClass)
    return isArray(secondClass)
      ? secondClass.join(" ").trim()
      : (secondClass ?? "");

  if (!secondClass)
    return isArray(firstClass) ? firstClass.join(" ").trim() : firstClass;

  if (isArray(firstClass)) firstClass = normalizeStringArray(firstClass);

  if (isArray(secondClass)) secondClass = normalizeStringArray(secondClass);

  return `${firstClass.trim()} ${secondClass.trim()}`.trim();
}

/**
 * Joins an array of strings into a single string, trimming each
 * element and ignoring empty strings, null, and undefined.
 */
function normalizeStringArray(arr: any[]): string {
  const cleaned: string[] = [];

  for (const item of arr) {
    if (item) {
      const trimmed = item.trim();

      if (trimmed) cleaned.push(trimmed);
    }
  }

  return cleaned.join(" ");
}

/**
 * Converts all accepted directive formats into a normalized directive name.
 */
export function directiveNormalize(name: string): string {
  return name
    .replace(PREFIX_REGEXP, "")
    .replace(
      SPECIAL_CHARS_REGEXP,
      (_name: string, letter: string, offset: number) =>
        offset ? letter.toUpperCase() : letter,
    );
}

/**
 * Returns whether an element should participate in animation handling.
 */
export function hasAnimate(node: Node): boolean {
  return hasCustomOrDataAttribute(node, "animate");
}

/**
 * Returns whether a node exposes a custom or `data-*` attribute set to `"true"`.
 */
function hasCustomOrDataAttribute(node: Node, attr: string): boolean {
  if (node.nodeType !== NodeType._ELEMENT_NODE) return false;
  const element = node as HTMLElement;

  return (
    element.dataset[attr] === "true" || element.getAttribute(attr) === "true"
  );
}

/**
 * Returns whether an object has no own enumerable keys.
 */
export function isObjectEmpty(obj: Object | null | undefined): boolean {
  if (!obj) return true;

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
export function hasOwn(obj: any, key: string | number | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Returns the object's own enumerable keys.
 */
export function keys(obj: any): string[] {
  return Object.keys(obj);
}

/**
 * Returns the object's own enumerable values.
 */
export function values(obj: any): any[] {
  return Object.values(obj);
}

/**
 * Returns the object's own enumerable entries.
 */
export function entries(obj: any): [string, any][] {
  return Object.entries(obj);
}

/**
 * Assigns own enumerable properties from sources to a target object.
 */
export const { assign } = Object;

/**
 * Creates a new object with the specified prototype.
 */
export const createObject: typeof Object.create = Object.create;

/**
 * Wraps a function so it can only be called once.
 * Subsequent calls do nothing and return undefined.
 *
 */
export function callBackOnce<F extends (...args: any[]) => any>(fn: F) {
  let called = false;

  return (...args: Parameters<F>): ReturnType<F> | undefined => {
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
export function callBackAfterFirst<F extends (...args: any[]) => any>(fn: F) {
  let calledOnce = false;

  return (...args: Parameters<F>): ReturnType<F> | undefined => {
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
export function wait(timeout = 0) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
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
export function startsWith(str: string, search: string): boolean {
  return str.slice(0, search.length) === search;
}

/**
 * Loads and instantiates a WebAssembly module.
 * Tries streaming first, then falls back.
 */
export async function instantiateWasm(
  src: string,
  imports: WebAssembly.Imports = {},
) {
  const res = await fetch(src);

  if (!res.ok) throw new Error("fetch failed");

  try {
    const { instance, module } = await WebAssembly.instantiateStreaming(
      res.clone(),
      imports,
    );

    return { instance, exports: instance.exports, module };
  } catch {
    /* empty */
  }

  const bytes = await res.arrayBuffer();

  const { instance, module } = await WebAssembly.instantiate(bytes, imports);

  return { instance, exports: instance.exports, module };
}

/**
 * Returns whether a function is an arrow function.
 */
export function isArrowFunction(fn: any): boolean {
  return typeof fn === "function" && !fn.prototype;
}

/**
 * Creates an object with no prototype.
 *
 * This is useful for use as a dictionary or map, since the returned object
 * does not inherit from `Object.prototype` and therefore has no built-in
 * properties such as `toString` or `hasOwnProperty`.
 *
 */
export function nullObject<T = any>(): Record<string, T> {
  return createObject(null);
}
