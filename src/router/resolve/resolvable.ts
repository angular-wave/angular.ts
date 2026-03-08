import { trace } from "../common/trace.ts";
import { stringify } from "../../shared/strings.ts";
import {
  assert,
  hasOwn,
  isFunction,
  isNullOrUndefined,
  isObject,
} from "../../shared/utils.js";
import type { BuiltStateDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { Transition } from "../transition/transition.ts";
import type { ResolvePolicy, ResolvableLiteral } from "./interface.ts";
import type { ResolveContext } from "./resolve-context.ts";

export const defaultResolvePolicy: Required<ResolvePolicy> = {
  when: "LAZY",
  async: "WAIT",
};

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

  get(resolveContext: ResolveContext, trans?: Transition): Promise<any> {
    return this.promise || this.resolve(resolveContext, trans);
  }

  toString(): string {
    const deps = Array.isArray(this.deps) ? this.deps : [this.deps];

    return `Resolvable(token: ${stringify(this.token)}, requires: [${deps.map(stringify)}])`;
  }

  clone(): Resolvable {
    return new Resolvable(this);
  }

  static fromData(token: any, data: any): Resolvable {
    return new Resolvable(token, () => data, undefined, undefined, data);
  }
}
