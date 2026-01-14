export type Predicate<X> = (x?: X) => boolean;
export type PredicateBinary<X, Y> = (x?: X, y?: Y) => boolean;
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
export type Validator = (value: unknown) => boolean;
/**
 * A dictionary of string keys and values of type T.
 */
export type Dict<T> = Record<string, T>;
