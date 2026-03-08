/**
 * Returns true when the function source appears to be an ES class.
 */
export declare function isClass(func: Function): boolean;
/**
 * Returns the dependency injection annotation for a function or array-annotated factory.
 *
 * In non-strict mode this will infer argument names when explicit `$inject`
 * metadata is absent, then cache the result on `fn.$inject`.
 *
 * @param fn function or array-annotated factory to inspect
 * @param strictDi when true, throws if explicit annotation is missing
 * @param name optional name used in strict-di error messages
 * @returns ordered dependency token names
 */
export declare function annotate(
  fn: unknown,
  strictDi?: boolean,
  name?: string,
): string[];
