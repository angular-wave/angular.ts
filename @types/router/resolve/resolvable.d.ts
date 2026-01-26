export namespace defaultResolvePolicy {
  let when: string;
  let async: string;
}
/**
 * The basic building block for the resolve system.
 *
 * Resolvables encapsulate a state's resolve's resolveFn, the resolveFn's declared dependencies, the wrapped (.promise),
 * and the unwrapped-when-complete (.data) result of the resolveFn.
 *
 * Resolvable.get() either retrieves the Resolvable's existing promise, or else invokes resolve() (which invokes the
 * resolveFn) and returns the resulting promise.
 *
 * Resolvable.get() and Resolvable.resolve() both execute within a context path, which is passed as the first
 * parameter to those fns.
 */
export class Resolvable {
  /**
   * @param {any} arg1
   * @param {Function | undefined} [resolveFn]
   * @param {any[]} [deps]
   * @param {import("./interface.ts").ResolvePolicy | undefined} [policy]
   * @param {any} [data]
   */
  constructor(
    arg1: any,
    resolveFn?: Function | undefined,
    deps?: any[],
    policy?: import("./interface.ts").ResolvePolicy | undefined,
    data?: any,
  );
  resolved: boolean;
  promise: Promise<any>;
  token: any;
  policy: any;
  resolveFn: any;
  deps: any;
  data: any;
  /**
   * @param {ng.BuiltStateDeclaration} state
   * @returns {import("./interface.ts").ResolvePolicy}
   */
  getPolicy(
    state: ng.BuiltStateDeclaration,
  ): import("./interface.ts").ResolvePolicy;
  /**
   * Asynchronously resolve this Resolvable's data
   *
   * Given a ResolveContext that this Resolvable is found in:
   * Wait for this Resolvable's dependencies, then invoke this Resolvable's function
   * and update the Resolvable's state
   * @param {import("./resolve-context.js").ResolveContext} resolveContext
   * @param {ng.Transition} [trans]
   */
  resolve(
    resolveContext: import("./resolve-context.js").ResolveContext,
    trans?: ng.Transition,
  ): Promise<any>;
  /**
   * Gets a promise for this Resolvable's data.
   *
   * Fetches the data and returns a promise.
   * Returns the existing promise if it has already been fetched once.
   * @param {import("./resolve-context.js").ResolveContext} resolveContext
   * @param {ng.Transition | undefined} [trans]
   * @return {Promise<any>}
   */
  get(
    resolveContext: import("./resolve-context.js").ResolveContext,
    trans?: ng.Transition | undefined,
  ): Promise<any>;
  toString(): string;
  clone(): Resolvable;
}
export namespace Resolvable {
  function fromData(token: any, data: any): Resolvable;
}
