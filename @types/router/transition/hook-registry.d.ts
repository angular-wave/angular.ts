import type { PathNode } from "../path/path-node.ts";
import type { StateObject } from "../state/state-object.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookMatchCriterion,
  IMatchingNodes,
  RegisteredHooks,
  TransitionService,
  TreeChanges,
} from "./interface.ts";
import type { Transition } from "./transition.ts";
import type { TransitionEventType } from "./transition-event-type.ts";
export declare function matchState(
  state: StateObject,
  criterion: HookMatchCriterion,
  transition: Transition,
): boolean;
export declare class RegisteredHook {
  tranSvc: TransitionService;
  eventType: TransitionEventType;
  callback: HookFn;
  matchCriteria: HookMatchCriteria;
  removeHookFromRegistry: (hook: RegisteredHook) => void;
  invokeCount: number;
  _deregistered: boolean;
  priority: number;
  bind: unknown;
  invokeLimit: number | undefined;
  constructor(
    tranSvc: TransitionService,
    eventType: TransitionEventType,
    callback: HookFn,
    matchCriteria: HookMatchCriteria,
    removeHookFromRegistry: (hook: RegisteredHook) => void,
    options?: import("./interface.ts").HookRegOptions,
  );
  _matchingNodes(
    nodes: PathNode[],
    criterion: HookMatchCriterion,
    transition: Transition,
  ): PathNode[] | null;
  _getDefaultMatchCriteria(): HookMatchCriteria;
  _getMatchingNodes(
    treeChanges: TreeChanges,
    transition: Transition,
  ): IMatchingNodes;
  matches(
    treeChanges: TreeChanges,
    transition: Transition,
  ): IMatchingNodes | null;
  deregister(): void;
}
type HookSource = {
  _registeredHooks?: RegisteredHooks;
} & Record<string, any>;
export declare function registerHook(
  hookSource: HookSource,
  transitionService: TransitionService,
  eventType: TransitionEventType,
  matchCriteria: HookMatchCriteria,
  callback: HookFn,
  options?: import("./interface.ts").HookRegOptions,
): DeregisterFn;
export declare function makeEvent(
  hookSource: HookSource,
  transitionService: TransitionService,
  eventType: TransitionEventType,
): (
  matchObject: HookMatchCriteria,
  callback: HookFn,
  options?: import("./interface.ts").HookRegOptions,
) => DeregisterFn;
export {};
