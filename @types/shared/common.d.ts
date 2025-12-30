/**
 * @param {unknown} o1
 * @param {unknown} o2
 */
export function equals(o1: unknown, o2: unknown): boolean;
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
export function inherit(parent: any, extra?: any): any;
/**
 * Given an array, and an item, if the item is found in the array, it removes it (in-place).
 * The same array is returned
 * @param {Array<any>} array
 * @param {any} obj
 * @returns {Array<any>}
 */
export function removeFrom(array: Array<any>, obj: any): Array<any>;
/**
 * Applies a set of defaults to an options object.  The options object is filtered
 * to only those properties of the objects in the defaultsList.
 * Earlier objects in the defaultsList take precedence when applying defaults.
 * @param {{}} opts
 * @param {{ current?: (() => void) | (() => null); transition?: null; traceData?: {}; bind?: null; inherit?: boolean; matchingKeys?: null; state?: { params: {}; }; strict?: boolean; caseInsensitive?: boolean; relative?: import("../router/state/state-object.js").StateObject | null | undefined; location?: boolean; notify?: boolean; reload?: boolean; supercede?: boolean; custom?: {}; source?: string; lossy?: boolean; absolute?: boolean; }[]} defaultsList
 */
export function defaults(
  opts: {},
  ...defaultsList: {
    current?: (() => void) | (() => null);
    transition?: null;
    traceData?: {};
    bind?: null;
    inherit?: boolean;
    matchingKeys?: null;
    state?: {
      params: {};
    };
    strict?: boolean;
    caseInsensitive?: boolean;
    relative?:
      | import("../router/state/state-object.js").StateObject
      | null
      | undefined;
    location?: boolean;
    notify?: boolean;
    reload?: boolean;
    supercede?: boolean;
    custom?: {};
    source?: string;
    lossy?: boolean;
    absolute?: boolean;
  }[]
): any;
/**
 * Finds the common ancestor path between two states.
 *
 * @param {Object} first The first state.
 * @param {Object} second The second state.
 * @return {Array<any>} Returns an array of state names in descending order, not including the root.
 */
export function ancestors(first: any, second: any): Array<any>;
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
export function pick(obj: any, propNames: any): {};
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
export function omit(obj: any, propNames: any): {};
/** Filters an Array or an Object's properties based on a predicate */
export function filter(collection: any, callback: any): {};
/** Finds an object from an array, or a property of an object, that matches a predicate */
export function find(collection: any, callback: any): undefined;
/** Maps an array or object properties using a callback function */
export function map(collection: any, callback: any, target: any): any;
/**
 * Reduce function that pushes an object to an array, then returns the array.
 * Mostly just for [[flattenR]] and [[uniqR]]
 */
export function pushR(arr: any, obj: any): any;
export function assertFn(
  predicateOrMap: any,
  errMsg?: string,
): (obj: any) => any;
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
export function arrayTuples(...args: any[][]): any[][];
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
export function applyPairs(memo: any, keyValTuple: any): any;
/**
 * Returns the last element of an array, or undefined if the array is empty.
 * @template T
 * @param {any[]|string} arr - The input array.
 * @returns {T | undefined} The last element or undefined.
 */
export function tail<T>(arr: any[] | string): T | undefined;
/**
 * shallow copy from src to dest
 */
export function copy(src: any, dest: any): any;
export function allTrueR(memo: any, elem: any): any;
export function anyTrueR(memo: any, elem: any): any;
export function unnestR(memo: any, elem: any): any;
export function flattenR(memo: any, elem: any): any;
export function uniqR(acc: any, token: any): any;
export function unnest(arr: any): any;
export function assertPredicate(
  predicateOrMap: any,
  errMsg?: string,
): (obj: any) => any;
export function silenceUncaughtInPromise(promise: any): any;
export function silentRejection(error: any): any;
