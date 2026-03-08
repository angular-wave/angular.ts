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
/**
 * Represents a single router transition from one path of states to another.
 *
 * It owns hook execution, resolvable resolution, path/tree change metadata,
 * redirect handling, and the completion promise observed by router consumers.
 */
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
  /**
   * Returns hooks registered directly on this transition for the given event name.
   */
  getHooks(hookName: string): RegisteredHook[];
  /**
   * Registers a hook on this transition instance.
   */
  on(
    eventName: string,
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onBefore` hook on this transition.
   */
  onBefore(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onStart` hook on this transition.
   */
  onStart(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onEnter` hook on this transition.
   */
  onEnter(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onRetain` hook on this transition.
   */
  onRetain(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onExit` hook on this transition.
   */
  onExit(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onFinish` hook on this transition.
   */
  onFinish(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onSuccess` hook on this transition.
   */
  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onError` hook on this transition.
   */
  onError(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  _getEventType(
    eventName: string,
  ): import("./transition-event-type.ts").TransitionEventType;
  /**
   * Applies the entering path's view configs before the transition runs.
   */
  applyViewConfigs(): void;
  /**
   * Returns the leaf `from` state object.
   */
  $from(): StateObject;
  /**
   * Returns the leaf `to` state object.
   */
  $to(): StateObject;
  /**
   * Returns the public `from` state declaration.
   */
  from(): StateDeclaration;
  /**
   * Returns the public `to` state declaration.
   */
  to(): StateDeclaration;
  /**
   * Returns the target state that seeded this transition.
   */
  targetState(): TargetState;
  /**
   * Returns parameter values for one transition path (`to` by default).
   */
  params(pathname?: keyof TreeChanges | string): RawParams;
  /**
   * Returns the resolve tokens visible on one transition path (`to` by default).
   */
  getResolveTokens(pathname?: keyof TreeChanges | string): any[];
  /**
   * Adds a new resolvable to the target path, optionally scoped to one state.
   */
  addResolvable(
    resolvable:
      | Resolvable
      | import("../resolve/interface.ts").ResolvableLiteral,
    state?: StateOrName,
  ): void;
  /**
   * Returns the transition that redirected to this transition, if any.
   */
  redirectedFrom(): Transition | null;
  /**
   * Returns the first transition in a redirect chain.
   */
  originalTransition(): Transition;
  /**
   * Returns the transition options.
   */
  options(): TransitionOptions;
  /**
   * Returns declarations for states being entered.
   */
  entering(): StateDeclaration[];
  /**
   * Returns declarations for states being exited.
   */
  exiting(): StateDeclaration[];
  /**
   * Returns declarations for states being retained.
   */
  retained(): StateDeclaration[];
  /**
   * Returns view configs for the selected path, optionally filtered to one state.
   */
  views(
    pathname?: keyof TreeChanges | string,
    state?: StateObject,
  ): ViewConfig[];
  /**
   * Returns either the full tree changes object or one named path within it.
   */
  treeChanges(pathname?: keyof TreeChanges | string): PathNode[] | TreeChanges;
  /**
   * Creates a redirected transition to a new target state.
   */
  redirect(targetState: TargetState): Transition;
  /**
   * Returns the changed non-dynamic and dynamic params for this transition,
   * or `undefined` when the transition structure changed in a larger way.
   */
  _changedParams(): Param[] | undefined;
  dynamic(): boolean;
  /**
   * Returns true when this transition would be ignored by the router.
   */
  ignored(): boolean;
  _ignoredReason(): string | undefined;
  run(): Promise<any>;
  /**
   * Returns true when the transition is valid or already completed.
   */
  valid(): boolean;
  /**
   * Aborts the transition before completion.
   */
  abort(): void;
  /**
   * Returns the computed rejection, if any, that makes this transition invalid.
   */
  error(): Rejection | undefined;
  toString(): string;
}
