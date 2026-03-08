import type { BuiltStateDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { Transition } from "../transition/transition.ts";
import type { ResolvePolicy } from "./interface.ts";
import type { ResolveContext } from "./resolve-context.ts";
/**
 * Default policy used when neither the resolvable nor the owning state
 * overrides resolve timing or async handling.
 */
export declare const defaultResolvePolicy: Required<ResolvePolicy>;
/**
 * Represents one dependency that can be resolved for a transition.
 *
 * A resolvable tracks its token, dependency list, policy, cached value,
 * and in-flight promise so router state resolution stays idempotent.
 */
export declare class Resolvable {
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
  );
  /**
   * Returns the effective resolve policy for this token in the given state context.
   */
  getPolicy(
    state: BuiltStateDeclaration | StateObject | undefined,
  ): Required<ResolvePolicy>;
  /**
   * Resolves this token by first resolving its dependencies, then invoking
   * the resolve function and caching the resulting value.
   */
  resolve(resolveContext: ResolveContext, trans?: Transition): Promise<any>;
  /**
   * Returns the cached promise, resolving the token first if necessary.
   */
  get(resolveContext: ResolveContext, trans?: Transition): Promise<any>;
  /**
   * Returns a readable description of the resolvable and its dependencies.
   */
  toString(): string;
  /**
   * Creates a shallow copy of this resolvable.
   */
  clone(): Resolvable;
  /**
   * Creates a resolvable that is already resolved to `data`.
   */
  static fromData(token: any, data: any): Resolvable;
}
