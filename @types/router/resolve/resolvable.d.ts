import type { BuiltStateDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { Transition } from "../transition/transition.ts";
import type { ResolvePolicy } from "./interface.ts";
import type { ResolveContext } from "./resolve-context.ts";
export declare const defaultResolvePolicy: Required<ResolvePolicy>;
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
  getPolicy(
    state: BuiltStateDeclaration | StateObject | undefined,
  ): Required<ResolvePolicy>;
  resolve(resolveContext: ResolveContext, trans?: Transition): Promise<any>;
  get(resolveContext: ResolveContext, trans?: Transition): Promise<any>;
  toString(): string;
  clone(): Resolvable;
  static fromData(token: any, data: any): Resolvable;
}
