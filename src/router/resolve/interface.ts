/**
 * # The Resolve subsystem
 *
 * This subsystem is an asynchronous, hierarchical Dependency Injection system.
 *
 * Typically, resolve is configured on a state using a [[StateDeclaration.resolve]] declaration.
 *
 * @packageDocumentation
 */
export type ResolvableToken = unknown;

export type ResolvableData = unknown;

export type ResolveFn = (
  ...dependencies: ResolvableData[]
) => ResolvableData | Promise<ResolvableData>;

/**
 * A plain object used to describe a [[Resolvable]]
 *
 * These objects may be used in the [[StateDeclaration.resolve]] array to declare
 * async data that the state or substates require.
 *
 * #### Example:
 * ```js
 *
 * var state = {
 *   name: 'main',
 *   resolve: [
 *     { token: 'myData', deps: [MyDataApi], resolveFn: (myDataApi) => myDataApi.getData() },
 *   ],
 * }
 * ```
 */
export interface ResolvableLiteral {
  /**
   * A Dependency Injection token
   *
   * This Resolvable's DI token.
   * The Resolvable will be injectable elsewhere using the token.
   */
  token: ResolvableToken;

  /**
   * A function which fetches the Resolvable's data
   *
   * A function which returns one of:
   *
   * - The resolved value (synchronously)
   * - A promise for the resolved value
   * - An Observable of the resolved value(s)
   *
   * This function will be provided the dependencies listed in [[deps]] as its arguments.
   * The resolve system will asynchronously fetch the dependencies before invoking this function.
   */
  resolveFn?: ResolveFn;

  /**
   * Starts resolving at transition start instead of waiting until the state is entered.
   *
   * Default: `false`
   */
  eager?: boolean;

  /**
   * The Dependency Injection tokens
   *
   * This is an array of Dependency Injection tokens for the dependencies of the [[resolveFn]].
   *
   * The DI tokens are references to other `Resolvables`, or to other
   * services from the native DI system.
   */
  deps?: ResolvableToken[];

  /** Pre-resolved data. */
  data?: ResolvableData;
}
