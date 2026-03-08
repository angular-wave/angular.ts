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
export declare class ResolveContext {
  _path: PathNode[];
  constructor(_path: PathNode[]);
  getTokens(): any[];
  getResolvable(token: string): Resolvable;
  getPolicy(resolvable: Resolvable): Required<ResolvePolicy>;
  subContext(state: StateObject | BuiltStateDeclaration): ResolveContext;
  addResolvables(
    newResolvables: Array<Resolvable | ResolvableLiteral>,
    state: StateObject,
  ): void;
  resolvePath(when: PolicyWhen, trans: Transition): Promise<any> | any;
  findNode(resolvable: Resolvable): PathNode | undefined;
  getDependencies(resolvable: Resolvable): Resolvable[];
}
