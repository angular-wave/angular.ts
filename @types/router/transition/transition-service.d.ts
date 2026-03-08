import type { PathNode } from "../path/path-node.ts";
import type { TargetState } from "../state/target-state.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookRegOptions,
  PathType,
  PathTypes,
  RegisteredHooks,
  TransitionOptions,
  TransitionService,
} from "./interface.ts";
import { TransitionEventType } from "./transition-event-type.ts";
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import { Transition } from "./transition.ts";
export declare const defaultTransOpts: TransitionOptions;
/**
 * Central registry and factory for transition events, hooks, and transition instances.
 */
export declare class TransitionProvider implements TransitionService {
  static $inject: readonly [
    "$routerProvider",
    "$viewProvider",
    "$exceptionHandlerProvider",
  ];
  _transitionCount: number;
  _eventTypes: TransitionEventType[];
  _registeredHooks: RegisteredHooks;
  _criteriaPaths: PathTypes;
  globals: ng.RouterProvider;
  $view: ng.ViewService;
  _deregisterHookFns: Record<string, DeregisterFn | undefined>;
  _exceptionHandler: ng.ExceptionHandlerService;
  constructor(
    globals: ng.RouterProvider,
    viewService: ng.ViewService,
    $exceptionHandler: ng.ExceptionHandlerProvider,
  );
  /**
   * Wires runtime services into the transition service and registers the
   * hooks that depend on state/url/view services.
   */
  $get: readonly [
    "$state",
    "$url",
    "$stateRegistry",
    "$view",
    (
      stateService: ng.StateService,
      urlService: ng.UrlService,
      stateRegistry: ng.StateRegistryService,
      viewService: ng.ViewService,
    ) => TransitionProvider,
  ];
  /**
   * Creates a new transition from the current path to a target state.
   */
  create(fromPath: PathNode[], targetState: TargetState): Transition;
  /**
   * Defines the built-in transition lifecycle events and their execution order.
   */
  _defineCoreEvents(): void;
  _defineCorePaths(): void;
  /**
   * Defines one transition event type and exposes its registration helper.
   */
  _defineEvent(
    name: string,
    hookPhase: TransitionHookPhase,
    hookOrder: number,
    criteriaMatchPath: PathType,
    reverseSort?: boolean,
    getResultHandler?: (
      hook: TransitionHook,
    ) => (result: import("./interface.ts").HookResult) => any,
    getErrorHandler?: () => (error: any) => any,
    synchronous?: boolean,
  ): void;
  /**
   * Returns known transition event types, optionally filtered by phase.
   */
  _getEvents(phase?: TransitionHookPhase): TransitionEventType[];
  /**
   * Defines one path selector used by transition hook matching.
   */
  _definePathType(name: keyof PathTypes, hookScope: number): void;
  /**
   * Returns the configured transition hook path selectors.
   */
  _getPathTypes(): PathTypes;
  /**
   * Returns hooks registered for a specific transition event name.
   */
  getHooks(hookName: string): import("./hook-registry.ts").RegisteredHook[];
  /**
   * Registers a transition hook by event name.
   */
  on(
    eventName: string,
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onCreate` transition hook.
   */
  onCreate(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onBefore` transition hook.
   */
  onBefore(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onStart` transition hook.
   */
  onStart(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onEnter` transition hook.
   */
  onEnter(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onRetain` transition hook.
   */
  onRetain(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onExit` transition hook.
   */
  onExit(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onFinish` transition hook.
   */
  onFinish(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onSuccess` transition hook.
   */
  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Registers an `onError` transition hook.
   */
  onError(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * Looks up one known transition event type by name.
   */
  _getEventType(eventName: string): TransitionEventType;
  /**
   * Installs the built-in transition hooks that power router behavior.
   */
  _registerCoreTransitionHooks(): void;
}
