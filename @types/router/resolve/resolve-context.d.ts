import type { PathNode } from "../path/path-node.ts";
import type { BuiltStateDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { Transition } from "../transition/transition.ts";
import { Resolvable } from "./resolvable.ts";
import type {
  PolicyWhen,
  ResolvePolicy,
  ResolvableLiteral,
} from "./interface.ts";
export declare const resolvePolicies: {
  readonly when: {
    readonly LAZY: "LAZY";
    readonly EAGER: "EAGER";
  };
  readonly async: {
    readonly WAIT: "WAIT";
    readonly NOWAIT: "NOWAIT";
  };
};
/**
 * Provides resolve lookup and execution helpers for a specific transition path.
 */
export declare class ResolveContext {
  _path: PathNode[];
  /**
   * @param _path path of nodes whose resolvables are visible in this context
   */
  constructor(_path: PathNode[]);
  /**
   * Returns the unique tokens available from all resolvables in this path.
   */
  getTokens(): any[];
  /**
   * Returns the most local resolvable registered for the specified token.
   */
  getResolvable(token: string): Resolvable;
  /**
   * Computes the effective resolve policy for a resolvable in this context.
   */
  getPolicy(resolvable: Resolvable): Required<ResolvePolicy>;
  /**
   * Returns a child resolve context scoped to the specified state.
   */
  subContext(state: StateObject | BuiltStateDeclaration): ResolveContext;
  /**
   * Adds or replaces resolvables for a specific state in this path.
   */
  addResolvables(
    newResolvables: Array<Resolvable | ResolvableLiteral>,
    state: StateObject,
  ): void;
  /**
   * Resolves the path's resolvables for the requested policy timing.
   */
  resolvePath(when: PolicyWhen, trans: Transition): Promise<any> | any;
  /**
   * Finds the path node that owns the provided resolvable.
   */
  findNode(resolvable: Resolvable): PathNode | undefined;
  /**
   * Resolves the dependency tokens required by a resolvable from either
   * the current path or the injector fallback.
   */
  getDependencies(resolvable: Resolvable): Resolvable[];
}
