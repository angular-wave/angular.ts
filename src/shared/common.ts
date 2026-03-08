import {
  entries,
  isArray,
  isDate,
  isFunction,
  isRegExp,
  isString,
} from "./utils.js";

/**
 * @param {unknown} o1
 * @param {unknown} o2
 */
export function equals(o1: any, o2: any): boolean {
  if (o1 === o2) return true;

  if (o1 === null || o2 === null) return false;

  if (Number.isNaN(o1) && Number.isNaN(o2)) return true; // NaN === NaN
  const t1 = typeof o1,
    t2 = typeof o2;

  if (t1 !== t2 || t1 !== "object") return false;
  const tup = [o1, o2];

  if (tup.every(isArray))
    return _arraysEq(
      /** @type {Array<any>} */ o1,
      /** @type {Array<any>} */ o2,
    );

  if (tup.every(isDate))
    return (
      /** @type {Date} */ o1.getTime() === /** @type {Date} */ o2.getTime()
    );

  if (tup.every(isRegExp))
    return (
      /** @type {RegExp} */ o1.toString() ===
      /** @type {RegExp} */ o2.toString()
    );

  if (tup.every(isFunction)) return true; // meh

  if ([isFunction, isArray, isDate, isRegExp].some((fn) => !!fn(tup))) {
    return false;
  }
  /** @type {Record<string, any>} */
  const keys: Record<string, boolean> = {};

  for (const key in /** @type {Record<string, any>} */ o1) {
    if (
      !equals(
        /** @type {Record<string, any>} */ o1[key],
        /** @type {Record<string, any>} */ o2[key],
      )
    )
      return false;
    keys[key] = true;
  }

  for (const key in /** @type {Record<string, any>} */ o2) {
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
export function inherit<T extends object, U extends object>(
  parent: T,
  extra?: U,
): T & U {
  const newObj = Object.create(parent) as T & U;

  if (extra) {
    Object.assign(newObj, extra);
  }

  return newObj;
}

/**
 * Given an array, and an item, if the item is found in the array, it removes it (in-place).
 * The same array is returned
 * @param {Array<any>} array
 * @param {any} obj
 * @returns {Array<any>}
 */
export function removeFrom<T>(array: T[], obj: T): T[] {
  const i = array.indexOf(obj);

  if (i !== -1) array.splice(i, 1);

  return array;
}

export interface PromiseResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export function withResolvers<T>(): PromiseResolvers<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((resolveParam, rejectParam) => {
    resolve = resolveParam;
    reject = rejectParam;
  });

  return { promise, resolve, reject };
}

/**
 * Applies a set of defaults to an options object.  The options object is filtered
 * to only those properties of the objects in the defaultsList.
 * Earlier objects in the defaultsList take precedence when applying defaults.
 * @param {any} opts
 * @param {any} defaultsList
 */
export function defaults(opts: any, ...defaultsList: any[]): any {
  const defaultVals = Object.assign({}, ...defaultsList.reverse());

  return Object.assign(
    defaultVals,
    pick((opts || {}) as Record<string, any>, Object.keys(defaultVals)),
  );
}

/**
 * Return a copy of the object only containing the whitelisted properties.
 *
 * #### Example:
 * ```
 * var foo = { a: 1, b: 2, c: 3 };
 * var ab = pick(foo, ['a', 'b']); // { a: 1, b: 2 }
 * ```
 * @param {any} obj the source object
 * @param {string | any[]} propNames an Array of strings, which are the whitelisted property names
 */
export function pick<T extends Record<string, any>>(
  obj: T,
  propNames: string[],
): Partial<T> {
  const objCopy: Partial<T> = {};

  for (const _prop in obj) {
    if (propNames.indexOf(_prop) !== -1) {
      objCopy[_prop as keyof T] = obj[_prop];
    }
  }

  return objCopy;
}

/**
 * Return a copy of the object omitting the blacklisted properties.
 * @example ```

var foo = { a: 1, b: 2, c: 3 };
var ab = omit(foo, ['a', 'b']); // { c: 3 }
```
 * @param {{ [x: string]: any; }} obj the source object
 * @param {string | any[]} propNames an Array of strings, which are the blacklisted property names
 */
export function omit<T extends Record<string, any>>(
  obj: T,
  propNames: string[],
): Partial<T> {
  return Object.keys(obj)
    .filter((x) => !propNames.includes(x))
    .reduce(
      /**
       * @param {Record<string, any>} acc
       * @param {string} key
       * */ (acc, key) => ((acc[key] = obj[key]), acc),
      {} as Record<string, any>,
    ) as Partial<T>;
}

/**
 * Filters an Array or an Object's properties based on a predicate
 * @param {Record<string, any> | ArrayLike<any>} collection
 * @param {{ (x: any): boolean; (item: any): boolean; (val: any, key: any): boolean; (arg0: any, arg1: string): any; }} callback
 */
export function filter<T>(
  collection: Record<string, T> | ArrayLike<T>,
  callback: (item: T, key: string | number) => boolean,
): Record<string, T> | T[] {
  const arr = isArray(collection);

  const result: Record<string, T> | T[] = arr ? [] : {};

  const accept = arr
    ? (x: T) => (result as T[]).push(x)
    : (x: T, key: string | number) =>
        ((result as Record<string, T>)[String(key)] = x);

  entries(collection).forEach(([i, item]) => {
    if (callback(item, i)) accept(item, i);
  });

  return result;
}

/**
 * Finds an object from an array, or a property of an object, that matches a predicate
 * @param {{ [s: string]: any; } | ArrayLike<any>} collection
 * @param {function} callback
 */
export function find<T>(
  collection: { [s: string]: T } | ArrayLike<T>,
  callback: (item: T, key: string | number) => boolean,
): T | undefined {
  let result: T | undefined;

  entries(collection).forEach(([i, item]) => {
    if (result) return;

    if (callback(item, i)) result = item;
  });

  return result;
}

/**
 * Maps over an array or object and returns a new collection
 * with the same shape.
 *
 * @template T
 * @template R
 * @param {T[] | Record<string, T>} collection
 * @param {(value: T, key: string | number) => R} callback
 * @param {R[] | Record<string, R>} [target]
 * @returns {R[] | Record<string, R>}
 */
export function map<T, R>(
  collection: T[] | Record<string, T>,
  callback: (value: T, key: string | number) => R,
  target?: R[] | Record<string, R>,
): R[] | Record<string, R> {
  target = target || (isArray(collection) ? [] : {});

  entries(collection).forEach(([i, item]) => {
    if (isArray(target)) {
      // Convert string key to number safely
      const index = Number(i);

      target[index] = callback(item, index);
    } else {
      target[i] = callback(item, i);
    }
  });

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
export const allTrueR = (memo: any, elem: any) => memo && elem;
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
export const anyTrueR = (memo: any, elem: any) => memo || elem;

/**
 * Reduce function which un-nests a single level of arrays
 *
 * @param {any} memo
 * @param {any} elem
 * @returns {any}
 *
 * @example
 * let input = [ [ "a", "b" ], [ "c", "d" ], [ [ "double", "nested" ] ] ];
 * input.reduce(unnestR, []) // [ "a", "b", "c", "d", [ "double", "nested" ] ]
 */
export const unnestR = (memo: any[], elem: any): any[] => memo.concat(elem);

/**
 * Reduce function which recursively un-nests all arrays
 *
 * @template T
 * @param {T[]} memo
 * @param {any} elem
 * @returns {T[]}
 *
 * @example
 * let input = [ [ "a", "b" ], [ "c", "d" ], [ [ "double", "nested" ] ] ];
 * input.reduce(flattenR, []) // [ "a", "b", "c", "d", "double", "nested" ]
 */
export const flattenR = (memo: any[], elem: any): any[] =>
  Array.isArray(elem)
    ? memo.concat(elem.reduce(flattenR, []))
    : pushR(memo, elem);

/**
 * Reduce function that pushes an object to an array, then returns the array.
 * Mostly just for [[flattenR]] and [[uniqR]]
 * @param {any[]} arr
 * @param {unknown} obj
 */
export function pushR<T>(arr: T[], obj: T): T[] {
  arr.push(obj);

  return arr;
}

/** Reduce function that filters out duplicates */
export const uniqR = (acc: any[], token: any): any[] =>
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
export const unnest = (arr: any[]): any[] => arr.reduce(unnestR, []);

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

/**
 * @param {(arg0: any) => any} predicateOrMap
 * @param {string} errMsg
 * @return {(obj:any) => any}
 */
export function assertFn<T>(
  predicateOrMap: (arg0: T) => any,
  errMsg = "assert failure",
): (obj: T) => any {
  return (obj: T) => {
    const result = predicateOrMap(obj);

    if (!result) {
      throw new Error(errMsg);
    }

    return result;
  };
}

/**
 * Given two or more parallel arrays, returns an array of tuples where
 * each tuple is composed of [ a[i], b[i], ... z[i] ]
 * @example ```

let foo = [ 0, 2, 4, 6 ];
let bar = [ 1, 3, 5, 7 ];
let baz = [ 10, 30, 50, 70 ];
arrayTuples(foo, bar);       // [ [0, 1], [2, 3], [4, 5], [6, 7] ]
arrayTuples(foo, bar, baz);  // [ [0, 1, 10], [2, 3, 30], [4, 5, 50], [6, 7, 70] ]
```
 * @param {any[][]} args
 */
export function arrayTuples(...args: any[][]): any[][] {
  if (args.length === 0) return [];
  const maxArrayLen = args.reduce(
    (min, arr) => Math.min(arr.length, min),
    Number.MAX_SAFE_INTEGER,
  );

  const result: any[][] = [];

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
 * @example ```

    var pairs = [ ["fookey", "fooval"], ["barkey", "barval"] ]

    var pairsToObj = pairs.reduce((memo, pair) => applyPairs(memo, pair), {})
    // pairsToObj == { fookey: "fooval", barkey: "barval" }

    // Or, more simply:
    var pairsToObj = pairs.reduce(applyPairs, {})
    // pairsToObj == { fookey: "fooval", barkey: "barval" }
```
 * @param {{ [x: string]: any; }} memo
 * @param {any[]} keyValTuple
 */
export function applyPairs(
  memo: Record<string, any>,
  keyValTuple: any[],
): Record<string, any> {
  let key: string | undefined;
  let value: any = undefined;

  if (isArray(keyValTuple)) [key, value] = keyValTuple as [string, any];

  if (!isString(key)) throw new Error("invalid parameters to applyPairs");
  memo[key] = value;

  return memo;
}

/**
 * Returns the last element of an array, or undefined if the array is empty.
 * @template T
 * @param {any[]|string} arr - The input array.
 * @returns {T | undefined} The last element or undefined.
 */
export function tail<T>(arr: T[] | string): T | string | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

/**
 * shallow copy from src to dest
 * @param {any} src
 * @param {any} dest
 */
export function copy(
  src: Record<string, any>,
  dest?: Record<string, any>,
): Record<string, any> {
  const target = dest || {};

  Object.keys(target).forEach((key) => delete target[key]);

  return Object.assign(target, src);
}

/**
 * @param {Array<any>} a1
 * @param {Array<any>} a2
 */
function _arraysEq(a1: any[], a2: any[]): boolean {
  if (a1.length !== a2.length) return false;

  for (let i = 0; i < a1.length; i++) {
    if (!equals(a1[i], a2[i])) return false;
  }

  return true;
}
