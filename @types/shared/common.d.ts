/**
 * @param {unknown} o1
 * @param {unknown} o2
 */
export declare function equals(o1: any, o2: any): boolean;
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
export declare function inherit<T extends object, U extends object>(
  parent: T,
  extra?: U,
): T & U;
/**
 * Given an array, and an item, if the item is found in the array, it removes it (in-place).
 * The same array is returned
 * @param {Array<any>} array
 * @param {any} obj
 * @returns {Array<any>}
 */
export declare function removeFrom<T>(array: T[], obj: T): T[];
export interface PromiseResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}
export declare function withResolvers<T>(): PromiseResolvers<T>;
/**
 * Applies a set of defaults to an options object.  The options object is filtered
 * to only those properties of the objects in the defaultsList.
 * Earlier objects in the defaultsList take precedence when applying defaults.
 * @param {any} opts
 * @param {any} defaultsList
 */
export declare function defaults(opts: any, ...defaultsList: any[]): any;
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
export declare function pick<T extends Record<string, any>>(
  obj: T,
  propNames: string[],
): Partial<T>;
/**
 * Return a copy of the object omitting the blacklisted properties.
 * @example ```

var foo = { a: 1, b: 2, c: 3 };
var ab = omit(foo, ['a', 'b']); // { c: 3 }
```
 * @param {{ [x: string]: any; }} obj the source object
 * @param {string | any[]} propNames an Array of strings, which are the blacklisted property names
 */
export declare function omit<T extends Record<string, any>>(
  obj: T,
  propNames: string[],
): Partial<T>;
/**
 * Filters an Array or an Object's properties based on a predicate
 * @param {Record<string, any> | ArrayLike<any>} collection
 * @param {{ (x: any): boolean; (item: any): boolean; (val: any, key: any): boolean; (arg0: any, arg1: string): any; }} callback
 */
export declare function filter<T>(
  collection: Record<string, T> | ArrayLike<T>,
  callback: (item: T, key: string | number) => boolean,
): Record<string, T> | T[];
/**
 * Finds an object from an array, or a property of an object, that matches a predicate
 * @param {{ [s: string]: any; } | ArrayLike<any>} collection
 * @param {function} callback
 */
export declare function find<T>(
  collection:
    | {
        [s: string]: T;
      }
    | ArrayLike<T>,
  callback: (item: T, key: string | number) => boolean,
): T | undefined;
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
export declare function map<T, R>(
  collection: T[] | Record<string, T>,
  callback: (value: T, key: string | number) => R,
  target?: R[] | Record<string, R>,
): R[] | Record<string, R>;
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
export declare const allTrueR: (memo: any, elem: any) => any;
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
export declare const anyTrueR: (memo: any, elem: any) => any;
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
export declare const unnestR: (memo: any[], elem: any) => any[];
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
export declare const flattenR: (memo: any[], elem: any) => any[];
/**
 * Reduce function that pushes an object to an array, then returns the array.
 * Mostly just for [[flattenR]] and [[uniqR]]
 * @param {any[]} arr
 * @param {unknown} obj
 */
export declare function pushR<T>(arr: T[], obj: T): T[];
/** Reduce function that filters out duplicates */
export declare const uniqR: (acc: any[], token: any) => any[];
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
export declare const unnest: (arr: any[]) => any[];
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
export declare const assertPredicate: typeof assertFn;
/**
 * @param {(arg0: any) => any} predicateOrMap
 * @param {string} errMsg
 * @return {(obj:any) => any}
 */
export declare function assertFn<T>(
  predicateOrMap: (arg0: T) => any,
  errMsg?: string,
): (obj: T) => any;
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
export declare function arrayTuples(...args: any[][]): any[][];
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
export declare function applyPairs(
  memo: Record<string, any>,
  keyValTuple: any[],
): Record<string, any>;
/**
 * Returns the last element of an array, or undefined if the array is empty.
 * @template T
 * @param {any[]|string} arr - The input array.
 * @returns {T | undefined} The last element or undefined.
 */
export declare function tail<T>(arr: T[] | string): T | string | undefined;
/**
 * shallow copy from src to dest
 * @param {any} src
 * @param {any} dest
 */
export declare function copy(
  src: Record<string, any>,
  dest?: Record<string, any>,
): Record<string, any>;
