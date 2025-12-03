import { isDate, isFunction, isRegExp, isString } from "./utils.js";

export function equals(o1, o2) {
  if (o1 === o2) return true;

  if (o1 === null || o2 === null) return false;

  if (o1 !== o1 && o2 !== o2) return true; // NaN === NaN
  const t1 = typeof o1,
    t2 = typeof o2;

  if (t1 !== t2 || t1 !== "object") return false;
  const tup = [o1, o2];

  if (tup.every(Array.isArray)) return _arraysEq(o1, o2);

  if (tup.every(isDate)) return o1.getTime() === o2.getTime();

  if (tup.every(isRegExp)) return o1.toString() === o2.toString();

  if (tup.every(isFunction)) return true; // meh

  if ([isFunction, Array.isArray, isDate, isRegExp].some((fn) => !!fn(tup))) {
    return false;
  }
  const keys = {};

  for (const key in o1) {
    if (!equals(o1[key], o2[key])) return false;
    keys[key] = true;
  }

  for (const key in o2) {
    if (!keys[key]) return false;
  }

  return true;
}

/**
 * prototypal inheritance helper.
 * Creates a new object which has `parent` object as its prototype, and then copies the properties from `extra` onto it
 */

/**
 * prototypal inheritance helper.
 * Creates a new object which has `parent` object as its prototype, and then copies the properties from `extra` onto it.
 *
 * @param {Object} parent - The object to be used as the prototype.
 * @param {Object} [extra] - The object containing additional properties to be copied.
 * @returns {Object} - A new object with `parent` as its prototype and properties from `extra`.
 */
export function inherit(parent, extra) {
  const newObj = Object.create(parent);

  if (extra) {
    Object.assign(newObj, extra);
  }

  return newObj;
}

/**
 * Given an array, and an item, if the item is found in the array, it removes it (in-place).
 * The same array is returned
 * @param {Array} array
 * @param {any} obj
 * @returns {Array}
 */
export function removeFrom(array, obj) {
  const i = array.indexOf(obj);

  if (i !== -1) array.splice(i, 1);

  return array;
}

/**
 * Applies a set of defaults to an options object.  The options object is filtered
 * to only those properties of the objects in the defaultsList.
 * Earlier objects in the defaultsList take precedence when applying defaults.
 */
export function defaults(opts, ...defaultsList) {
  const defaultVals = Object.assign({}, ...defaultsList.reverse());

  return Object.assign(defaultVals, pick(opts || {}, Object.keys(defaultVals)));
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param {Object} first The first state.
 * @param {Object} second The second state.
 * @return {Array} Returns an array of state names in descending order, not including the root.
 */
export function ancestors(first, second) {
  const path = [];

  for (const n in first.path) {
    if (first.path[n] !== second.path[n]) break;
    path.push(first.path[n]);
  }

  return path;
}
/**
 * Return a copy of the object only containing the whitelisted properties.
 *
 * #### Example:
 * ```
 * var foo = { a: 1, b: 2, c: 3 };
 * var ab = pick(foo, ['a', 'b']); // { a: 1, b: 2 }
 * ```
 * @param obj the source object
 * @param propNames an Array of strings, which are the whitelisted property names
 */
export function pick(obj, propNames) {
  const objCopy = {};

  for (const _prop in obj) {
    if (propNames.indexOf(_prop) !== -1) {
      objCopy[_prop] = obj[_prop];
    }
  }

  return objCopy;
}
/**
 * Return a copy of the object omitting the blacklisted properties.
 *
 * @example
 * ```
 *
 * var foo = { a: 1, b: 2, c: 3 };
 * var ab = omit(foo, ['a', 'b']); // { c: 3 }
 * ```
 * @param obj the source object
 * @param propNames an Array of strings, which are the blacklisted property names
 */
export function omit(obj, propNames) {
  return Object.keys(obj)
    .filter((x) => !propNames.includes(x))
    .reduce((acc, key) => ((acc[key] = obj[key]), acc), {});
}

/** Filters an Array or an Object's properties based on a predicate */
export function filter(collection, callback) {
  const arr = Array.isArray(collection),
    result = arr ? [] : {};

  const accept = arr ? (x) => result.push(x) : (x, key) => (result[key] = x);

  Object.entries(collection).forEach(([i, item]) => {
    if (callback(item, i)) accept(item, i);
  });

  return result;
}

/** Finds an object from an array, or a property of an object, that matches a predicate */
export function find(collection, callback) {
  let result;

  Object.entries(collection).forEach(([i, item]) => {
    if (result) return;

    if (callback(item, i)) result = item;
  });

  return result;
}

/** Maps an array or object properties using a callback function */
export function map(collection, callback, target) {
  target = target || (Array.isArray(collection) ? [] : {});
  Object.entries(collection).forEach(
    ([i, item]) => (target[i] = callback(item, i)),
  );

  return target;
}

/**
 * Reduce function that returns true if all of the values are truthy.
 *
 * @example
 * ```
 *
 * let vals = [ 1, true, {}, "hello world"];
 * vals.reduce(allTrueR, true); // true
 *
 * vals.push(0);
 * vals.reduce(allTrueR, true); // false
 * ```
 */
export const allTrueR = (memo, elem) => memo && elem;
/**
 * Reduce function that returns true if any of the values are truthy.
 *
 *  * @example
 * ```
 *
 * let vals = [ 0, null, undefined ];
 * vals.reduce(anyTrueR, true); // false
 *
 * vals.push("hello world");
 * vals.reduce(anyTrueR, true); // true
 * ```
 */
export const anyTrueR = (memo, elem) => memo || elem;
/**
 * Reduce function which un-nests a single level of arrays
 * @example
 * ```
 *
 * let input = [ [ "a", "b" ], [ "c", "d" ], [ [ "double", "nested" ] ] ];
 * input.reduce(unnestR, []) // [ "a", "b", "c", "d", [ "double, "nested" ] ]
 * ```
 */
export const unnestR = (memo, elem) => memo.concat(elem);
/**
 * Reduce function which recursively un-nests all arrays
 *
 * @example
 * ```
 *
 * let input = [ [ "a", "b" ], [ "c", "d" ], [ [ "double", "nested" ] ] ];
 * input.reduce(unnestR, []) // [ "a", "b", "c", "d", "double, "nested" ]
 * ```
 */
export const flattenR = (memo, elem) =>
  Array.isArray(elem)
    ? memo.concat(elem.reduce(flattenR, []))
    : pushR(memo, elem);
/**
 * Reduce function that pushes an object to an array, then returns the array.
 * Mostly just for [[flattenR]] and [[uniqR]]
 */
export function pushR(arr, obj) {
  arr.push(obj);

  return arr;
}
/** Reduce function that filters out duplicates */
export const uniqR = (acc, token) =>
  acc.includes(token) ? acc : pushR(acc, token);
/**
 * Return a new array with a single level of arrays unnested.
 *
 * @example
 * ```
 *
 * let input = [ [ "a", "b" ], [ "c", "d" ], [ [ "double", "nested" ] ] ];
 * unnest(input) // [ "a", "b", "c", "d", [ "double, "nested" ] ]
 * ```
 */
export const unnest = (arr) => arr.reduce(unnestR, []);

/**
 * Given a .filter Predicate, builds a .filter Predicate which throws an error if any elements do not pass.
 * @example
 * ```
 *
 * let isNumber = (obj) => typeof(obj) === 'number';
 * let allNumbers = [ 1, 2, 3, 4, 5 ];
 * allNumbers.filter(assertPredicate(isNumber)); //OK
 *
 * let oneString = [ 1, 2, 3, 4, "5" ];
 * oneString.filter(assertPredicate(isNumber, "Not all numbers")); // throws Error(""Not all numbers"");
 * ```
 */
export const assertPredicate = assertFn;

export function assertFn(predicateOrMap, errMsg = "assert failure") {
  return (obj) => {
    const result = predicateOrMap(obj);

    if (!result) {
      throw new Error(errMsg);
    }

    return result;
  };
}
/**
 * Like _.pairs: Given an object, returns an array of key/value pairs
 *
 * @example
 * ```
 *
 * pairs({ foo: "FOO", bar: "BAR }) // [ [ "foo", "FOO" ], [ "bar": "BAR" ] ]
 * ```
 */
export const pairs = (obj) => Object.keys(obj).map((key) => [key, obj[key]]);
/**
 * Given two or more parallel arrays, returns an array of tuples where
 * each tuple is composed of [ a[i], b[i], ... z[i] ]
 *
 * @example
 * ```
 *
 * let foo = [ 0, 2, 4, 6 ];
 * let bar = [ 1, 3, 5, 7 ];
 * let baz = [ 10, 30, 50, 70 ];
 * arrayTuples(foo, bar);       // [ [0, 1], [2, 3], [4, 5], [6, 7] ]
 * arrayTuples(foo, bar, baz);  // [ [0, 1, 10], [2, 3, 30], [4, 5, 50], [6, 7, 70] ]
 * ```
 */
export function arrayTuples(...args) {
  if (args.length === 0) return [];
  const maxArrayLen = args.reduce(
    (min, arr) => Math.min(arr.length, min),
    Number.MAX_SAFE_INTEGER,
  );

  const result = [];

  for (let i = 0; i < maxArrayLen; i++) {
    // This is a hot function
    // Unroll when there are 1-4 arguments
    switch (args.length) {
      case 1:
        result.push([args[0][i]]);
        break;
      case 2:
        result.push([args[0][i], args[1][i]]);
        break;
      case 3:
        result.push([args[0][i], args[1][i], args[2][i]]);
        break;
      case 4:
        result.push([args[0][i], args[1][i], args[2][i], args[3][i]]);
        break;
      default:
        result.push(args.map((array) => array[i]));
        break;
    }
  }

  return result;
}
/**
 * Reduce function which builds an object from an array of [key, value] pairs.
 *
 * Each iteration sets the key/val pair on the memo object, then returns the memo for the next iteration.
 *
 * Each keyValueTuple should be an array with values [ key: string, value: any ]
 *
 * @example
 * ```
 *
 * var pairs = [ ["fookey", "fooval"], ["barkey", "barval"] ]
 *
 * var pairsToObj = pairs.reduce((memo, pair) => applyPairs(memo, pair), {})
 * // pairsToObj == { fookey: "fooval", barkey: "barval" }
 *
 * // Or, more simply:
 * var pairsToObj = pairs.reduce(applyPairs, {})
 * // pairsToObj == { fookey: "fooval", barkey: "barval" }
 * ```
 */
export function applyPairs(memo, keyValTuple) {
  let key, value;

  if (Array.isArray(keyValTuple)) [key, value] = keyValTuple;

  if (!isString(key)) throw new Error("invalid parameters to applyPairs");
  memo[key] = value;

  return memo;
}

/**
 * Returns the last element of an array, or undefined if the array is empty.
 * @template T
 * @param {T[]} arr - The input array.
 * @returns {T | undefined} The last element or undefined.
 */
export function tail(arr) {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

/**
 * shallow copy from src to dest
 */
export function copy(src, dest) {
  if (dest) Object.keys(dest).forEach((key) => delete dest[key]);

  if (!dest) dest = {};

  return Object.assign(dest, src);
}

function _arraysEq(a1, a2) {
  if (a1.length !== a2.length) return false;

  return arrayTuples(a1, a2).reduce((b, t) => b && equals(t[0], t[1]), true);
}
// issue #2676
export const silenceUncaughtInPromise = (promise) =>
  promise.catch(() => 0) && promise;
export const silentRejection = (error) =>
  silenceUncaughtInPromise(Promise.reject(error));
