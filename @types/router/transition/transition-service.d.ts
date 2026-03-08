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
  create(fromPath: PathNode[], targetState: TargetState): Transition;
  _defineCoreEvents(): void;
  _defineCorePaths(): void;
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
  _getEvents(phase?: TransitionHookPhase): TransitionEventType[];
  _definePathType(name: keyof PathTypes, hookScope: number): void;
  _getPathTypes(): PathTypes;
  getHooks(hookName: string): import("./hook-registry.ts").RegisteredHook[];
  on(
    eventName: string,
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  onCreate(
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
  _getEventType(eventName: string): TransitionEventType;
  _registerCoreTransitionHooks(): void;
}
