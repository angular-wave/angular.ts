/**
 * A value is "injectable" if it is a function, or if it is an ng1
 * array-notation-style array where the head is strings and the tail is a
 * function.
 */
export declare function isInjectable(val: unknown): boolean;
/**
 * Returns true when a value looks like a promise/thenable.
 */
export declare function isPromise(obj: unknown): obj is {
  then: (...args: unknown[]) => unknown;
};
