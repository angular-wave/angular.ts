import { PREFIX_REGEXP, SPECIAL_CHARS_REGEXP } from "./constants.js";
import { NodeType } from "./node.js";

export const isProxySymbol = Symbol("isProxy");

/**
 * @param {any} value
 * @returns {value is Proxy<ng.Scope> | ng.Scope}
 */
export function isProxy(value) {
  return !!(value && value[isProxySymbol]);
}

/**
 * Unwraps a proxy if the value is a proxy, otherwise returns the value as-is.
 *
 * @template T
 * @param {T | (T & { $target: T })} val - A value that might be a proxy.
 * @returns {T} The unproxied value.
 */
export function deProxy(val) {
  return isProxy(val) ? /** @type {ng.Scope} */ (val).$target : val;
}

const ngMinErr = minErr("ng");

/**
 * @type {number}
 */
let uid = 0;

/**
 * @returns {number} an unique alpha-numeric string
 */
export function nextUid() {
  uid += 1;

  return uid;
}

/**
 *
 * @description Converts the specified string to lowercase.
 * @param {string} string String to be converted to lowercase.
 * @returns {string} Lowercased string.
 */
export function lowercase(string) {
  return isString(string) ? string.toLowerCase() : string;
}

/**
 *
 * @description Converts the specified string to uppercase.
 * @param {string} string String to be converted to uppercase.
 * @returns {string} Uppercased string.
 */
export function uppercase(string) {
  return isString(string) ? string.toUpperCase() : string;
}

/**
 * @param {unknown} obj Reference to check.
 * @return {boolean} Returns true if `obj` is an array or array-like object (NodeList, Arguments,
 *                   String ...)
 */
export function isArrayLike(obj) {
  // `null`, `undefined` and `window` are not array-like
  if (isNullOrUndefined(obj) || isWindow(obj)) return false;

  // arrays, strings and jQuery/jqLite objects are array like
  // * we have to check the existence of JQLite first as this method is called
  //   via the forEach method when constructing the JQLite object in the first place
  if (isArray(obj) || obj instanceof Array || isString(obj)) return true;

  const len = /** @type {Object} */ (obj).length;

  // NodeList objects (with `item` method) and
  // other objects with suitable length characteristics are array-like
  return (
    isNumber(len) &&
    ((len >= 0 && len - 1 in /** @type {Object} */ (obj)) ||
      typeof (/** @type {Object} */ (obj).item) === "function")
  );
}

/**
 * Determines if a reference is undefined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is undefined.
 */
export function isUndefined(value) {
  return typeof value === "undefined";
}

/**
 * Determines if a reference is defined (not `undefined`).
 *
 * @template T
 * @param {T | undefined} value - Reference to check.
 * @returns {value is T} True if `value` is defined.
 */
export function isDefined(value) {
  return typeof value !== "undefined";
}

/**
 * @template T
 * @param {any} array
 * @returns {array is T[]} true if array is an Array
 */
export function isArray(array) {
  return Array.isArray(array);
}

/**
 * @template T
 * @param {any} val
 * @param {new (...args: any[]) => T} type  The constructor to test against
 * @returns {val is T}
 */
export function isIntanceOf(val, type) {
  return val instanceof type;
}

/**
 * Determines if a reference is an `Object`. Unlike `typeof` in JavaScript, `null`s are not
 * considered to be objects. Note that JavaScript arrays are objects.
 *
 * @template T
 * @param {T} value - Reference to check.
 * @returns {value is T & object} True if `value` is an `Object` but not `null`.
 */
export function isObject(value) {
  // http://jsperf.com/isobject4
  return value !== null && typeof value === "object";
}

/**
 * Determines if a value is an object with a null prototype
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Object` with a null prototype
 */
export function isBlankObject(value) {
  return (
    value !== null && typeof value === "object" && !Object.getPrototypeOf(value)
  );
}

/**
 * Determines if a reference is a `string`.
 * @param {unknown} value - The value to check.
 * @returns {value is string} True if `value` is a string.
 */
export function isString(value) {
  return typeof value === "string";
}

/**
 * Determines if a reference is a null.
 *
 * @param {unknown} value Reference to check.
 * @returns {value is null} True if `value` is a null.
 */
export function isNull(value) {
  return value === null;
}

/**
 * Determines if a reference is null or undefined.
 *
 * @param {unknown} obj Reference to check.
 * @returns {obj is null | undefined} True if `value` is null or undefined.
 */
export function isNullOrUndefined(obj) {
  return obj === null || typeof obj === "undefined";
}

/**
 * Determines if a reference is not null or undefined.
 *
 * @param {*} obj Reference to check.
 * @returns {boolean} True if `value` is null or undefined.
 */
export function notNullOrUndefined(obj) {
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
 * @param {unknown} value Reference to check.
 * @returns {value is number} True if `value` is a `Number`.
 */
export function isNumber(value) {
  return typeof value === "number";
}

/**
 *
 * Determines if a value is a date.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Date`.
 */
export function isDate(value) {
  return toString.call(value) === "[object Date]";
}

/**
 * Determines if a reference is an `Error`.
 * Loosely based on https://www.npmjs.com/package/iserror
 *
 * @param {*} value Reference to check.
 * @returns {value is Error} True if `value` is an `Error`.
 */
export function isError(value) {
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
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Function`.
 */
export function isFunction(value) {
  return typeof value === "function";
}

/**
 * Determines if a value is a regular expression object.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `RegExp`.
 */
export function isRegExp(value) {
  return toString.call(value) === "[object RegExp]";
}

/**
 * Checks if `obj` is a window object.
 *
 * @param {unknown} obj Object to check
 * @returns {obj is Window} True if `obj` is a window obj.
 */
export function isWindow(obj) {
  return obj && isIntanceOf(obj, Window);
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isScope(obj) {
  return obj && obj.$watch;
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isFile(obj) {
  return toString.call(obj) === "[object File]";
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isFormData(obj) {
  return toString.call(obj) === "[object FormData]";
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isBlob(obj) {
  return toString.call(obj) === "[object Blob]";
}

/**
 * @param {*} value
 * @returns {boolean}
 */
export function isBoolean(value) {
  return typeof value === "boolean";
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isPromiseLike(obj) {
  return obj && isFunction(obj.then);
}

/**
 * @param {*} value
 * @returns {boolean}
 */
export function isTypedArray(value) {
  return (
    value &&
    isNumber(value.length) &&
    /^\[object (?:Uint8|Uint8Clamped|Uint16|Uint32|Int8|Int16|Int32|Float32|Float64)Array]$/.test(
      toString.call(value),
    )
  );
}

/**
 * @param {*} obj
 * @returns {boolean}
 */
export function isArrayBuffer(obj) {
  return toString.call(obj) === "[object ArrayBuffer]";
}

/**
 * @param {*} value
 * @returns {string | *}
 */
export function trim(value) {
  return isString(value) ? value.trim() : value;
}

/**
 * @param {string} name
 * @param {string} separator
 */
export function snakeCase(name, separator) {
  const modseparator = separator || "_";

  return name.replace(
    /[A-Z]/g,
    (/** @type {string} */ letter, /** @type {any} */ pos) =>
      (pos ? modseparator : "") + letter.toLowerCase(),
  );
}

/**
 * Set or clear the hashkey for an object.
 * @param {{ [x: string]: any; $$hashKey?: any; }} obj object
 * @param {any} hashkey the hashkey (!truthy to delete the hashkey)
 */
export function setHashKey(obj, hashkey) {
  if (hashkey) {
    obj.$$hashKey = hashkey;
  } else {
    delete obj.$$hashKey;
  }
}

/**
 * Deeply extends a destination object with one or more source objects.
 * Safely handles Dates, RegExps, DOM nodes, arrays, and nested objects.
 * Ignores the `__proto__` key to prevent prototype pollution.
 *
 * @param {Object<string, any>} dst - The destination object to extend.
 * @param {Array<Object<string, any>>} objs - Array of source objects to copy properties from.
 * @param {boolean} [deep=false] - Whether to perform a deep merge of nested objects.
 * @returns {Object<string, any>} The extended destination object.
 */
export function baseExtend(dst, objs, deep = false) {
  const hasKey = dst.$$hashKey;

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
 * @param {Object} dst Destination object.
 * @param {...Object} src Source object(s).
 * @returns {Object} Reference to `dst`.
 */
export function extend(dst, ...src) {
  return baseExtend(dst, src, false);
}

/**
 * @param {any} num
 * @returns {boolean}
 */
export function isNumberNaN(num) {
  return Number.isNaN(num);
}

/**
 * @param {Object} parent
 * @param {Object} extra
 * @returns {Object}
 */
export function inherit(parent, extra) {
  return extend(Object.create(parent), extra);
}

/**
 * @param {{ toString: () => string; }} obj
 */
export function hasCustomToString(obj) {
  return isFunction(obj.toString) && obj.toString !== toString;
}

/**
 * Returns a string appropriate for the type of node.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName)
 *
 * @param {Element} element
 * @returns
 */
export function getNodeName(element) {
  return lowercase(element.nodeName);
}

/**
 * @param {any} array
 * @param {string} obj
 */
export function includes(array, obj) {
  return Array.prototype.indexOf.call(array, obj) !== -1;
}

/**
 * Removes the first occurrence of a specified value from an array.
 *
 * @template T
 * @param {Array<T>} array - The array from which to remove the value.
 * @param {T} value - The value to remove.
 * @returns {number} - The index of the removed value, or -1 if the value was not found.
 */
export function arrayRemove(array, value) {
  const index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
  }

  return index;
}

/**
 * @param {unknown} val1
 * @param {unknown} val2
 */
export function simpleCompare(val1, val2) {
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
 * @param {*} o1 Object or value to compare.
 * @param {*} o2 Object or value to compare.
 * @returns {boolean} True if arguments are equal.
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
export function equals(o1, o2) {
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
  const keySet = Object.create(null);

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
 * @param  {string} name    the name to test
 * @param  {string} context the context in which the name is used, such as module or directive
 */
export function assertNotHasOwnProperty(name, context) {
  if (name === "hasOwnProperty") {
    throw ngMinErr(
      "badname",
      "hasOwnProperty is not a valid {0} name",
      context,
    );
  }
}

/**
 * @param {unknown} value
 * @returns {string | unknown}
 */
export function stringify(value) {
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
      if (hasCustomToString(value) && !isArray(value) && !isDate(value)) {
        value = value.toString();
      } else {
        value = toJson(value);
      }
  }

  return value;
}

/**
 * @param {Number} maxDepth
 * @return {boolean}
 */
export function isValidObjectMaxDepth(maxDepth) {
  return isNumber(maxDepth) && maxDepth > 0;
}

/**
 * @param {any[]} array1
 * @param {IArguments | any[] | NodeListOf<ChildNode>} array2
 * @param {number | undefined} [index]
 */
export function concat(array1, array2, index) {
  return array1.concat(Array.prototype.slice.call(array2, index));
}

/**
 * @param {IArguments | [string, ...any[]]} args
 * @param {number} startIndex
 */
export function sliceArgs(args, startIndex) {
  return Array.prototype.slice.call(args, startIndex || 0);
}

/**
 * Returns a function which calls function `fn` bound to `self` (`self` becomes the `this` for
 * `fn`). You can supply optional `args` that are prebound to the function. This feature is also
 * known as [partial application](http://en.wikipedia.org/wiki/Partial_application), as
 * distinguished from [function currying](http://en.wikipedia.org/wiki/Currying#Contrast_with_partial_function_application).
 *
 * @param {Object} context Context which `fn` should be evaluated in.
 * @param {*} fn Function to be bound.
 * @returns {Function} Function that wraps the `fn` with all the specified bindings.
 */
export function bind(context, fn) {
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
 * @param {string} key
 * @param {unknown} value
 */
function toJsonReplacer(key, value) {
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
 * Serializes input into a JSON-formatted string. Properties with leading $$ characters will be
 * stripped since AngularTS uses this notation internally.
 *
 * @param {Object|Array|Date|string|number|boolean} obj Input to be serialized into JSON.
 * @param {boolean|number} [pretty=2] If set to true, the JSON output will contain newlines and whitespace.
 *    If set to an integer, the JSON output will contain that many spaces per indentation.
 * @returns {string|undefined} JSON-ified string representing `obj`.
 * @knownIssue
 *
 * The Safari browser throws a `RangeError` instead of returning `null` when it tries to stringify a `Date`
 * object with an invalid date value. The only reliable way to prevent this is to monkeypatch the
 * `Date.prototype.toJSON` method as follows:
 *
 * ```
 * let _DatetoJSON = Date.prototype.toJSON;
 * Date.prototype.toJSON = function() {
 *   try {
 *     return _DatetoJSON.call(this);
 *   } catch(e) {
 *     if (e instanceof RangeError) {
 *       return null;
 *     }
 *     throw e;
 *   }
 * };
 * ```
 *
 * See https://github.com/angular/angular.js/pull/14221 for more information.
 */
export function toJson(obj, pretty) {
  if (isUndefined(obj)) return undefined;

  if (!isNumber(pretty)) {
    pretty = pretty ? 2 : null;
  }

  return JSON.stringify(obj, toJsonReplacer, /** @type {Number} */ (pretty));
}

/**
 * Deserializes a JSON string.
 *
 * @param {string} json JSON string to deserialize.
 * @returns {Object|Array|string|number} Deserialized JSON string.
 */
export function fromJson(json) {
  return isString(json) ? JSON.parse(json) : json;
}

const MS_PER_MINUTE = 60_000; // 60,000 ms in a minute

/**
 * @param {any} timezone
 * @param {number} [fallback]
 */
export function timezoneToOffset(timezone, fallback) {
  const requestedTimezoneOffset =
    Date.parse(`Jan 01, 1970 00:00:00 ${timezone}`) / MS_PER_MINUTE;

  return isNumberNaN(requestedTimezoneOffset)
    ? fallback
    : requestedTimezoneOffset;
}

/**
 * @param {Date} date
 * @param {number} minutes
 */
export function addDateMinutes(date, minutes) {
  const newDate = new Date(date.getTime());

  newDate.setMinutes(newDate.getMinutes() + minutes);

  return newDate;
}

/**
 * @param {Date} date
 * @param {any} timezone
 * @param {undefined} [reverse]
 */
export function convertTimezoneToLocal(date, timezone, reverse) {
  const doReverse = reverse ? -1 : 1;

  const dateTimezoneOffset = date.getTimezoneOffset();

  const timezoneOffset = timezoneToOffset(timezone, dateTimezoneOffset);

  return addDateMinutes(
    date,
    doReverse * (timezoneOffset - dateTimezoneOffset),
  );
}

/**
 * Parses an escaped url query string into key-value pairs.
 * @param {string} keyValue
 * @returns {Object.<string,boolean|Array<any>>}
 */
export function parseKeyValue(keyValue) {
  const obj = {};

  (keyValue || "").split("&").forEach((item) => {
    let splitPoint;

    let key;

    let val;

    if (item) {
      key = keyValue = item.replace(/\+/g, "%20");
      splitPoint = item.indexOf("=");

      if (splitPoint !== -1) {
        key = item.substring(0, splitPoint);
        val = item.substring(splitPoint + 1);
      }
      key = tryDecodeURIComponent(key);

      if (isDefined(key)) {
        val = isDefined(val) ? tryDecodeURIComponent(val) : true;

        if (!hasOwn(obj, /** @type {string} */ (key))) {
          obj[key] = val;
        } else if (isArray(obj[key])) {
          obj[key].push(val);
        } else {
          obj[key] = [obj[key], val];
        }
      }
    }
  });

  return /** @type {Object.<string,boolean|Array<any>>} */ (obj);
}

/**
 * @param {string | { [s: string]: any; } | ArrayLike<any> | null} obj
 */
export function toKeyValue(obj) {
  /**
   * @type {string[]}
   */
  const parts = [];

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
 * Tries to decode the URI component without throwing an exception.
 *
 * @param  {string} value potential URI component to check.
 * @returns {string|undefined}
 */
export function tryDecodeURIComponent(value) {
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
 * @param {string} val
 */
export function encodeUriSegment(val) {
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
 * @param {string | number | boolean} val
 * @param {boolean | undefined} [pctEncodeSpaces]
 */
export function encodeUriQuery(val, pctEncodeSpaces) {
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
 * @template T
 * @param {T} src
 * @param {T extends any[] ? T : undefined} [dst]
 * @returns {T}
 */
export function shallowCopy(src, dst) {
  if (isArray(src)) {
    /** @type {any[]} */
    const out = dst || [];

    for (let i = 0, ii = src.length; i < ii; i++) {
      out[i] = src[i];
    }

    return /** @type {T} */ (out);
  }

  if (isObject(src)) {
    /** @type {Record<string, unknown>} */
    const out = {};

    for (const key in src) {
      if (!(key.startsWith("$") && key.charAt(1) === "$")) {
        out[key] = src[key];
      }
    }

    return /** @type {T} */ (out);
  }

  return src;
}

/**
 * Throw error if the argument is false
 * @param {boolean} argument
 * @param {string} errorMsg
 */
export function assert(argument, errorMsg = "Assertion failed") {
  if (!argument) {
    throw new Error(errorMsg);
  }
}

/**
 * Throw error if the argument is falsy.
 * @param {string | boolean | Object} arg
 * @param {string} name
 * @param {string | undefined} [reason]
 */
export function assertArg(arg, name, reason) {
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
 * @param {string | Function | any[]} arg
 * @param {string} name
 * @param {boolean | undefined} [acceptArrayAnnotation]
 */
export function assertArgFn(arg, name, acceptArrayAnnotation) {
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

/** @type {ng.ErrorHandlingConfig} */
const minErrConfig = {
  objectMaxDepth: 5,
  urlErrorParamsEnabled: true,
};

/**
 * Configure several aspects of error handling if used as a setter or return the
 * current configuration if used as a getter.
 *
 * Omitted or undefined options will leave the corresponding configuration values unchanged.
 *
 * @param {ng.ErrorHandlingConfig} [config]
 * @returns {ng.ErrorHandlingConfig}
 */
export function errorHandlingConfig(config) {
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
 * @param {string} module The namespace to use for the new minErr instance.
 * @returns {function(string, ...*): Error} minErr instance
 */
export function minErr(module) {
  return function (...args) {
    const code = args[0];

    const template = args[1];

    let message = `[${module ? `${module}:` : ""}${code}] `;

    const templateArgs = sliceArgs(args, 2).map((arg) => toDebugString(arg));

    message += template.replace(/\{\d+\}/g, (/** @type {string} */ match) => {
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
 * @template T
 * @param {T|ng.Scope} obj
 * @returns {string}
 */
export function toDebugString(obj) {
  if (typeof obj === "function") {
    return obj.toString().replace(/ \{[\s\S]*$/, "");
  }

  if (isUndefined(obj)) {
    return "undefined";
  }

  if (typeof obj !== "string") {
    /** @type {object[]} */
    const seen = [];

    const copyObj = structuredClone(
      isProxy(obj) ? /** @type {ng.Scope} */ (obj).$target : obj,
    );

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
 *  object is either result of calling $$hashKey function on the object or uniquely generated id,
 *         that is also assigned to the $$hashKey property of the object.
 *
 * @param {*} obj
 * @returns {string} hash string such that the same input will have the same hash string.
 *         The resulting string key is in 'type:hashKey' format.
 */
export function hashKey(obj) {
  const key = obj && obj.$$hashKey;

  if (key) {
    if (typeof key === "function") {
      return obj.$$hashKey();
    }

    return key;
  }

  const objType = typeof obj;

  if (objType === "function" || (objType === "object" && obj !== null)) {
    obj.$$hashKey = `${objType}:${nextUid()}`;

    return obj.$$hashKey;
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
 * @param {string | string[] | null | undefined} firstClass - The first class name(s).
 * @param {string | string[] | null | undefined} secondClass - The second class name(s).
 * @returns {string} A single string containing all class names separated by spaces.
 */
export function mergeClasses(firstClass, secondClass) {
  if (!firstClass && !secondClass) return "";

  if (!firstClass)
    // @ts-ignore
    return isArray(secondClass) ? secondClass.join(" ").trim() : secondClass;

  if (!secondClass)
    // @ts-ignore
    return isArray(firstClass) ? firstClass.join(" ").trim() : firstClass;

  // @ts-ignore
  if (isArray(firstClass)) firstClass = normalizeStringArray(firstClass);

  // @ts-ignore
  if (isArray(secondClass)) secondClass = normalizeStringArray(secondClass);

  // @ts-ignore
  return `${firstClass.trim()} ${secondClass.trim()}`.trim();
}

/**
 * Joins an array of strings into a single string, trimming each
 * element and ignoring empty strings, null, and undefined
 * @param {any[]} arr
 * @returns {string}
 */
function normalizeStringArray(arr) {
  const cleaned = [];

  for (const item of arr) {
    if (item) {
      const trimmed = item.trim();

      if (trimmed) cleaned.push(trimmed);
    }
  }

  return cleaned.join(" ");
}

/**
 * Converts all accepted directives format into proper directive name.
 * @param {string} name Name to normalize
 * @returns {string}
 */

export function directiveNormalize(name) {
  return name
    .replace(PREFIX_REGEXP, "")
    .replace(SPECIAL_CHARS_REGEXP, (_name, letter, offset) =>
      offset ? letter.toUpperCase() : letter,
    );
}

/**
 * Whether element should be animated
 * @param {Node} node
 * @returns {boolean}
 */
export function hasAnimate(node) {
  return hasCustomOrDataAttribute(node, "animate");
}

/**
 * @param {Node} node
 * @param {string} attr
 * @returns {boolean}
 */
function hasCustomOrDataAttribute(node, attr) {
  if (node.nodeType !== NodeType._ELEMENT_NODE) return false;
  const element = /** @type {HTMLElement} */ (node);

  return (
    element.dataset[attr] === "true" || element.getAttribute(attr) === "true"
  );
}

/**
 * @param {Object|null|undefined} obj
 * @returns {boolean}
 */
export function isObjectEmpty(obj) {
  if (!obj) return true;

  return !keys(obj).length;
}

/**
 * Checks whether the given object has the specified property as its own (not inherited).
 *
 * This is a safe version of `hasOwnProperty` that avoids issues with objects
 * that have it overridden or missing from their prototype chain.
 *
 * @param {object} obj - The object to check.
 * @param {string|number|symbol} key - The property key to look for.
 * @returns {boolean} True if the object has the property as its own; otherwise, false.
 *
 * @example
 * hasOwn({ foo: 123 }, 'foo'); // true
 * hasOwn({}, 'bar'); // false
 */
export function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * @param {Object} obj
 * @returns {string[]}
 */
export function keys(obj) {
  return Object.keys(obj);
}

/**
 * @template T
 * @param {{ [s: string]: T; } | ArrayLike<T>} obj
 * @returns {[string, T][]}
 */
export function entries(obj) {
  return Object.entries(obj);
}

/**
 * Wraps a function so it can only be called once.
 * Subsequent calls do nothing and return undefined.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn - The function to wrap.
 * @returns {(this: ThisParameterType<F>, ...args: Parameters<F>) => ReturnType<F> | undefined}
 */
export function callBackOnce(fn) {
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
 * @template {(...args: any[]) => any} F
 * @param {F} fn - The function to wrap.
 * @returns {(this: ThisParameterType<F>, ...args: Parameters<F>) => ReturnType<F> | undefined}
 */
export function callBackAfterFirst(fn) {
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
 * @param {number} [timeout=0] - The number of milliseconds to wait. Defaults to 0.
 * @returns {Promise<void>} A promise that resolves after the delay.
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
 * @param {string} str - The full string to evaluate.
 * @param {string} search - The substring to test against the beginning of `str`.
 * @returns {boolean} `true` if `str` starts with `search`, otherwise `false`.
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
export function startsWith(str, search) {
  return str.slice(0, search.length) === search;
}

/**
 * Loads and instantiates a WebAssembly module.
 * Tries streaming first, then falls back.
 * @param {string} src
 * @param {WebAssembly.Imports} imports
 */
export async function instantiateWasm(src, imports = {}) {
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
 * @param {*} fn
 * @returns {boolean}
 */
export function isArrowFunction(fn) {
  return typeof fn === "function" && !fn.prototype;
}
