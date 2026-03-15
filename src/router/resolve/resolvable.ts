import { trace } from "../common/trace.ts";
import { stringify } from "../../shared/strings.ts";
import {
  assert,
  hasOwn,
  isFunction,
  isNullOrUndefined,
  isObject,
} from "../../shared/utils.ts";
import type { BuiltStateDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { Transition } from "../transition/transition.ts";
import type { ResolveContext } from "./resolve-context.ts";

/**
 * # The Resolve subsystem
 *
 * This subsystem is an asynchronous, hierarchical Dependency Injection system.
 *
 * Typically, resolve is configured on a state using a [[StateDeclaration.resolve]] declaration.
 */

/**
 * An interface which is similar to an Angular 2 `Provider`
 */
export interface ProviderLike {
  provide: any;
  useClass?: any;
  useFactory?: Function;
  useValue?: any;
  useExisting?: any;
  deps?: any[];
}

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
  token: any;

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
  resolveFn: Function;

  /**
   * Defines the Resolve Policy
   *
   * A policy that defines when to invoke the resolve,
   * and whether to wait for async and unwrap the data
   */
  policy?: ResolvePolicy;

  /**
   * The Dependency Injection tokens
   *
   * This is an array of Dependency Injection tokens for the dependencies of the [[resolveFn]].
   *
   * The DI tokens are references to other `Resolvables`, or to other
   * services from the native DI system.
   */
  deps?: any[];

  /** Pre-resolved data. */
  data?: any;
}

/**
 * Defines how a resolve is processed during a transition
 *
 * This object is the [[StateDeclaration.resolvePolicy]] property.
 *
 * #### Example:
 * ```js
 * // Fetched when the resolve's state is being entered.
 * // Wait for the promise to resolve.
 * var policy1 = { when: "LAZY", async: "WAIT" }
 *
 * // Fetched when the Transition is starting.
 * // Do not wait for the returned promise to resolve.
 * // Inject the raw promise/value
 * var policy2 = { when: "EAGER", async: "NOWAIT" }
 * ```
 *
 * The policy for a given Resolvable is merged from three sources (highest priority first):
 *
 * - 1) Individual resolve definition
 * - 2) State definition
 * - 3) Global default
 */
export interface ResolvePolicy {
  /**
   * Defines when a Resolvable is resolved (fetched) during a transition
   *
   * - `LAZY` (default)
   *   - Resolved as the resolve's state is being entered
   * - `EAGER`
   *   - Resolved as the transition is starting
   */
  when?: PolicyWhen;

  /**
   * Determines the unwrapping behavior of asynchronous resolve values.
   *
   * - `WAIT` (default)
   * - `NOWAIT`
   * - {@link CustomAsyncPolicy}
   */
  async?: PolicyAsync;
}

export type PolicyWhen = "LAZY" | "EAGER";
export type PolicyAsync = "WAIT" | "NOWAIT" | CustomAsyncPolicy;
export interface CustomAsyncPolicy {
  (data: any): Promise<any>;
}

/**
 * Default policy used when neither the resolvable nor the owning state
 * overrides resolve timing or async handling.
 */
export const defaultResolvePolicy: Required<ResolvePolicy> = {
  when: "LAZY",
  async: "WAIT",
};

/**
 * Represents one dependency that can be resolved for a transition.
 *
 * A resolvable tracks its token, dependency list, policy, cached value,
 * and in-flight promise so router state resolution stays idempotent.
 */
export class Resolvable {
  token: any;
  resolveFn: Function | null | undefined;
  deps: any[] | string;
  policy: ResolvePolicy | undefined;
  data: any;
  resolved: boolean;
  promise: Promise<any> | undefined;

  constructor(
    arg1: any,
    resolveFn?: Function | undefined,
    deps?: any[],
    policy?: ResolvePolicy,
    data?: any,
  ) {
    this.token = undefined;
    this.resolveFn = undefined;
    this.deps = [];
    this.policy = undefined;
    this.data = undefined;
    this.resolved = false;
    this.promise = undefined;

    if (arg1 instanceof Resolvable) {
      Object.assign(this, arg1);
    } else if (isFunction(resolveFn)) {
      assert(!isNullOrUndefined(arg1), "token argument is required");
      this.token = arg1;
      this.policy = policy;
      this.resolveFn = resolveFn;
      this.deps = deps || [];
      this.data = data;
      this.resolved = data !== undefined;
      this.promise = this.resolved ? Promise.resolve(this.data) : undefined;
    } else if (
      isObject(arg1) &&
      arg1.token &&
      (hasOwn(arg1, "resolveFn") || hasOwn(arg1, "data"))
    ) {
      const literal = arg1 as ResolvableLiteral;
      this.token = literal.token;
      this.resolveFn = literal.resolveFn;
      this.deps = literal.deps || [];
      this.policy = literal.policy;
      this.data = literal.data;
      this.resolved = literal.data !== undefined;
      this.promise = this.resolved ? Promise.resolve(this.data) : undefined;
    }
  }

  /**
   * Returns the effective resolve policy for this token in the given state context.
   */
  getPolicy(
    state: BuiltStateDeclaration | StateObject | undefined,
  ): Required<ResolvePolicy> {
    const thisPolicy = this.policy || {};
    const statePolicy =
      (state && "resolvePolicy" in state && state.resolvePolicy) || {};

    return {
      when: thisPolicy.when || statePolicy.when || defaultResolvePolicy.when,
      async:
        thisPolicy.async || statePolicy.async || defaultResolvePolicy.async,
    };
  }

  /**
   * Resolves this token by first resolving its dependencies, then invoking
   * the resolve function and caching the resulting value.
   */
  resolve(resolveContext: ResolveContext, trans?: Transition): Promise<any> {
    const getResolvableDependencies = (): Promise<any[]> =>
      Promise.all(
        resolveContext
          .getDependencies(this)
          .map((resolvable) => resolvable.get(resolveContext, trans)),
      );

    const invokeResolveFn = (resolvedDeps: any[]): any =>
      this.resolveFn?.apply(null, resolvedDeps);

    const node = resolveContext.findNode(this);
    const state = node && node.state;
    const asyncPolicy = this.getPolicy(state).async;
    const customAsyncPolicy = isFunction(asyncPolicy)
      ? asyncPolicy
      : (x: any) => x;

    const applyResolvedValue = (resolvedValue: any): any => {
      this.data = resolvedValue;
      this.resolved = true;
      this.resolveFn = null;
      trace.traceResolvableResolved(this, trans as Transition);

      return this.data;
    };

    this.promise = Promise.resolve()
      .then(getResolvableDependencies)
      .then(invokeResolveFn)
      .then(customAsyncPolicy)
      .then(applyResolvedValue);

    return this.promise;
  }

  /**
   * Returns the cached promise, resolving the token first if necessary.
   */
  get(resolveContext: ResolveContext, trans?: Transition): Promise<any> {
    return this.promise || this.resolve(resolveContext, trans);
  }

  /**
   * Returns a readable description of the resolvable and its dependencies.
   */
  toString(): string {
    const deps = Array.isArray(this.deps) ? this.deps : [this.deps];

    return `Resolvable(token: ${stringify(this.token)}, requires: [${deps.map(stringify)}])`;
  }

  /**
   * Creates a shallow copy of this resolvable.
   */
  clone(): Resolvable {
    return new Resolvable(this);
  }

  /**
   * Creates a resolvable that is already resolved to `data`.
   */
  static fromData(token: any, data: any): Resolvable {
    return new Resolvable(token, () => data, undefined, undefined, data);
  }
}
