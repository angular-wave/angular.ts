/**
 * Returns a new function for [Partial Application](https://en.wikipedia.org/wiki/Partial_application) of the original function.
 *
 * Given a function with N parameters, returns a new function that supports partial application.
 * The new function accepts anywhere from 1 to N parameters.  When that function is called with M parameters,
 * where M is less than N, it returns a new function that accepts the remaining parameters.  It continues to
 * accept more parameters until all N parameters have been supplied.
 *
 *
 * This contrived example uses a partially applied function as an predicate, which returns true
 * if an object is found in both arrays.
 * @example
 * ```
 * // returns true if an object is in both of the two arrays
 * function inBoth(array1, array2, object) {
 *   return array1.indexOf(object) !== -1 &&
 *          array2.indexOf(object) !== 1;
 * }
 * let obj1, obj2, obj3, obj4, obj5, obj6, obj7
 * let foos = [obj1, obj3]
 * let bars = [obj3, obj4, obj5]
 *
 * // A curried "copy" of inBoth
 * let curriedInBoth = curry(inBoth);
 * // Partially apply both the array1 and array2
 * let inFoosAndBars = curriedInBoth(foos, bars);
 *
 * // Supply the final argument; since all arguments are
 * // supplied, the original inBoth function is then called.
 * let obj1InBoth = inFoosAndBars(obj1); // false
 *
 * // Use the inFoosAndBars as a predicate.
 * // Filter, on each iteration, supplies the final argument
 * let allObjs = [ obj1, obj2, obj3, obj4, obj5, obj6, obj7 ];
 * let foundInBoth = allObjs.filter(inFoosAndBars); // [ obj3 ]
 *
 * ```
 *
 * @param {Function} fn
 * @returns {*|function(): (*|any)}
 */
export function curry(fn: Function): any | (() => any | any);
/**
 * Given a class constructor, returns a predicate function that checks
 * whether a given object is an instance of that class.
 *
 * @param {new (...args: any[]) => any} ctor - The class constructor to check against.
 * @returns {(obj: any) => boolean} A predicate function that returns true if the object is of the given class.
 */
export function is(ctor: new (...args: any[]) => any): (obj: any) => boolean;
/**
 * Sorta like Pattern Matching (a functional programming conditional construct)
 *
 * See http://c2.com/cgi/wiki?PatternMatching
 *
 * This is a conditional construct which allows a series of predicates and output functions
 * to be checked and then applied.  Each predicate receives the input.  If the predicate
 * returns truthy, then its matching output function (mapping function) is provided with
 * the input and, then the result is returned.
 *
 * Each combination (2-tuple) of predicate + output function should be placed in an array
 * of size 2: [ predicate, mapFn ]
 *
 * These 2-tuples should be put in an outer array.
 * @example ```

// Here's a 2-tuple where the first element is the isString predicate
// and the second element is a function that returns a description of the input
let firstTuple = [ angular.isString, (input) => `Heres your string ${input}` ];

// Second tuple: predicate "isNumber", mapfn returns a description
let secondTuple = [ angular.isNumber, (input) => `(${input}) That's a number!` ];

let third = [ (input) => input === null,  (input) => `Oh, null...` ];

let fourth = [ (input) => input === undefined,  (input) => `notdefined` ];

let descriptionOf = pattern([ firstTuple, secondTuple, third, fourth ]);

console.log(descriptionOf(undefined)); // 'notdefined'
console.log(descriptionOf(55)); // '(55) That's a number!'
console.log(descriptionOf("foo")); // 'Here's your string foo'
```
 * @param {string | any[]} struct A 2D array.  Each element of the array should be an array, a 2-tuple,
with a Predicate and a mapping/output function
 * @returns {function(any):*}
 */
export function pattern(struct: string | any[]): (arg0: any) => any;
/**
 * Given a property name and a value, returns a function that returns a boolean based on whether
 * the passed object has a property that matches the value
 * let obj = { foo: 1, name: "blarg" };
 * let getName = propEq("name", "blarg");
 * getName(obj) === true
 */
export const propEq: any;
export function parse(path: string): (/** @type {any} */ obj: any) => any;
export function val<T>(value: T): () => T;
