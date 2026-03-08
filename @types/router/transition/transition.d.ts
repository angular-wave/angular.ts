import type { RegisteredHook } from "./hook-registry.ts";
import { HookBuilder } from "./hook-builder.ts";
import type { PathNode } from "../path/path-node.ts";
import { Param } from "../params/param.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { Rejection } from "./reject-factory.ts";
import type { RouterProvider } from "../router.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookRegOptions,
  RegisteredHooks,
  TransitionOptions,
  TreeChanges,
} from "./interface.ts";
import type { StateDeclaration, StateOrName } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TargetState } from "../state/target-state.ts";
import type { TransitionProvider } from "./transition-service.ts";
import type { ViewConfig } from "../state/views.ts";
import type { RawParams } from "../params/interface.ts";
export type { PathNode } from "../path/path-node.ts";
export declare class Transition {
  static diToken: typeof Transition;
  _globals: RouterProvider;
  _transitionService: TransitionProvider;
  _deferred: import("../../shared/common.ts").PromiseResolvers<any>;
  promise: Promise<any>;
  _registeredHooks: RegisteredHooks;
  _hookBuilder: HookBuilder;
  isActive: () => boolean;
  _targetState: TargetState;
  _options: TransitionOptions;
  $id: number;
  _treeChanges: TreeChanges;
  success: boolean | undefined;
  _error: Rejection | undefined;
  _aborted: boolean | undefined;
  constructor(
    fromPath: PathNode[],
    targetState: TargetState,
    transitionService: TransitionProvider,
    globals: RouterProvider,
  );
  getHooks(hookName: string): RegisteredHook[];
  on(
    eventName: string,
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  onBefore(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  onStart(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  onEnter(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  onRetain(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  onExit(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  onFinish(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  onError(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  _getEventType(
    eventName: string,
  ): import("./transition-event-type.ts").TransitionEventType;
  applyViewConfigs(): void;
  $from(): StateObject;
  $to(): StateObject;
  from(): StateDeclaration;
  to(): StateDeclaration;
  targetState(): TargetState;
  params(pathname?: keyof TreeChanges | string): RawParams;
  getResolveTokens(pathname?: keyof TreeChanges | string): any[];
  addResolvable(
    resolvable:
      | Resolvable
      | import("../resolve/interface.ts").ResolvableLiteral,
    state?: StateOrName,
  ): void;
  redirectedFrom(): Transition | null;
  originalTransition(): Transition;
  options(): TransitionOptions;
  entering(): StateDeclaration[];
  exiting(): StateDeclaration[];
  retained(): StateDeclaration[];
  views(
    pathname?: keyof TreeChanges | string,
    state?: StateObject,
  ): ViewConfig[];
  treeChanges(pathname?: keyof TreeChanges | string): PathNode[] | TreeChanges;
  redirect(targetState: TargetState): Transition;
  _changedParams(): Param[] | undefined;
  dynamic(): boolean;
  ignored(): boolean;
  _ignoredReason(): string | undefined;
  run(): Promise<any>;
  valid(): boolean;
  abort(): void;
  error(): Rejection | undefined;
  toString(): string;
}
