import { stringify } from "../../shared/strings.ts";
import {
  assign,
  assert,
  hasOwn,
  isArray,
  isFunction,
  isInstanceOf,
  isNullOrUndefined,
  isObject,
} from "../../shared/utils.ts";
import type { Transition } from "../transition/transition.ts";
import type { ResolveContext } from "./resolve-context.ts";
import type { ResolvableLiteral } from "./interface.ts";
export type { ResolvableLiteral } from "./interface.ts";

/**
 * # The Resolve subsystem
 *
 * This subsystem is an asynchronous, hierarchical Dependency Injection system.
 *
 * Typically, resolve is configured on a state using a [[StateDeclaration.resolve]] declaration.
 */

/**
 * Represents one dependency that can be resolved for a transition.
 *
 * A resolvable tracks its token, dependency list, eager timing, cached value,
 * and in-flight promise so router state resolution stays idempotent.
 */
export class Resolvable {
  token: any;
  resolveFn: Function | null | undefined;
  deps: any[] | string;
  eager: boolean;
  data: any;
  resolved: boolean;
  promise: Promise<any> | undefined;

  /**
   * @throws Error when a resolve function is provided without a token.
   */
  constructor(
    arg1: any,
    resolveFn?: Function | undefined,
    deps?: any[],
    eager?: boolean,
    data?: any,
  ) {
    this.token = undefined;
    this.resolveFn = undefined;
    this.deps = [];
    this.eager = false;
    this.data = undefined;
    this.resolved = false;
    this.promise = undefined;

    if (isInstanceOf(arg1, Resolvable)) {
      assign(this, arg1);
    } else if (isFunction(resolveFn)) {
      assert(!isNullOrUndefined(arg1), "token argument is required");
      this.token = arg1;
      this.eager = !!eager;
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
      this.eager = !!literal.eager;
      this.data = literal.data;
      this.resolved = literal.data !== undefined;
      this.promise = this.resolved ? Promise.resolve(this.data) : undefined;
    }
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

    const applyResolvedValue = (resolvedValue: any): any => {
      this.data = resolvedValue;
      this.resolved = true;
      this.resolveFn = null;

      return this.data;
    };

    this.promise = Promise.resolve()
      .then(getResolvableDependencies)
      .then(invokeResolveFn)
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
    const deps = isArray(this.deps) ? this.deps : [this.deps];

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
