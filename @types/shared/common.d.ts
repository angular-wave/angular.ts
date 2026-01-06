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
export function pick(obj: any, propNames: string | any[]): Record<string, any>;
/**
 * Return a copy of the object omitting the blacklisted properties.
 * @example ```

var foo = { a: 1, b: 2, c: 3 };
var ab = omit(foo, ['a', 'b']); // { c: 3 }
```
 * @param {{ [x: string]: any; }} obj the source object
 * @param {string | any[]} propNames an Array of strings, which are the blacklisted property names
 */
export function omit(
  obj: {
    [x: string]: any;
  },
  propNames: string | any[],
): Record<string, any>;
/**
 * Filters an Array or an Object's properties based on a predicate
 * @param {Record<string, any> | ArrayLike<any>} collection
 * @param {{ (x: any): boolean; (item: any): boolean; (val: any, key: any): boolean; (arg0: any, arg1: string): any; }} callback
 */
export function filter(
  collection: Record<string, any> | ArrayLike<any>,
  callback: {
    (x: any): boolean;
    (item: any): boolean;
    (val: any, key: any): boolean;
    (arg0: any, arg1: string): any;
  },
): Record<string, any>;
/**
 * Finds an object from an array, or a property of an object, that matches a predicate
 * @param {{ [s: string]: any; } | ArrayLike<any>} collection
 * @param {function} callback
 */
export function find(
  collection:
    | {
        [s: string]: any;
      }
    | ArrayLike<any>,
  callback: Function,
): any;
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
): R[] | Record<string, R>;
/**
 * Reduce function that pushes an object to an array, then returns the array.
 * Mostly just for [[flattenR]] and [[uniqR]]
 * @param {any[]} arr
 * @param {unknown} obj
 */
export function pushR(arr: any[], obj: unknown): any[];
/**
 * @param {(arg0: any) => any} predicateOrMap
 * @param {string} errMsg
 * @return {(obj:any) => any}
 */
export function assertFn(
  predicateOrMap: (arg0: any) => any,
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
  memo: {
    [x: string]: any;
  },
  keyValTuple: any[],
): {
  [x: string]: any;
};
/**
 * Returns the last element of an array, or undefined if the array is empty.
 * @template T
 * @param {any[]|string} arr - The input array.
 * @returns {T | undefined} The last element or undefined.
 */
export function tail<T>(arr: any[] | string): T | undefined;
/**
 * shallow copy from src to dest
 * @param {any} src
 * @param {any} dest
 */
export function copy(src: any, dest: any): any;
export function allTrueR(memo: any, elem: any): any;
export function anyTrueR(memo: any, elem: any): any;
export function unnestR<T>(memo: T[], elem: T | T[]): T[];
export function flattenR<T>(memo: T[], elem: any): T[];
export function uniqR(acc: any[], token: any): any[];
export function unnest(arr: any[]): any;
/**
 * @param {(arg0: any) => any} predicateOrMap
 * @param {string} errMsg
 * @return {(obj:any) => any}
 */
export function assertPredicate(
  predicateOrMap: (arg0: any) => any,
  errMsg?: string,
): (obj: any) => any;
