import {
  _exceptionHandlerProvider,
  _routerProvider,
} from "../../injection-tokens.ts";
import type { TargetState } from "../state/target-state.ts";
import type { RouterProvider } from "../router.ts";
import { Transition } from "./transition.ts";
import type { PathNode } from "../path/path-node.ts";
import { registerHook, type RegisteredHooks } from "./hook-registry.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookRegOptions,
  HookRegistry,
  TransitionOptions,
} from "./interface.ts";
import type { TransitionEventType } from "./transition-event-type.ts";
import type { TransitionHookPhase } from "./transition-hook.ts";
import type { StateProvider } from "../state/state-service.ts";
import type { ViewService } from "../view/view.ts";
import { defineCoreTransitionEvents } from "./transition-events.ts";
import {
  registerCoreTransitionHooks,
  registerRuntimeTransitionHooks,
  treeChangesCleanup,
} from "./transition-hooks.ts";

export const defaultTransOpts: TransitionOptions = {
  location: true,
  relative: undefined,
  inherit: false,
  reload: false,
  current: () => null,
  source: "unknown",
};

/**
 * The runtime service instance returned from `TransitionProvider.$get`.
 *
 * Note: In this codebase, `$get` returns the provider instance (`return this;`),
 * so the "service" surface includes both the public HookRegistry API and
 * a set of internal fields/methods used by built-in hook registrations.
 *
 * @internal
 */
export interface TransitionService extends HookRegistry {
  /**
   * Internal factory used by StateService.
   */
  create(fromPath: PathNode[], targetState: TargetState): Transition;

  /** @internal incremented for each created Transition */
  _transitionCount: number;

  /** @internal hook event types (onBefore/onStart/...) */
  _eventTypes: TransitionEventType[];

  /** @internal hook storage keyed by event name */
  _registeredHooks: RegisteredHooks;

  /** @internal Return event types, optionally filtered by phase. */
  _getEvents(phase?: TransitionHookPhase): TransitionEventType[];

  /** @internal Return hooks registered for a transition event name. */
  _getHooks(hookName: string): RegisteredHooks[string];

  /** @internal Register a transition-construction hook used by built-ins. */
  _onCreate(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;

  /** @internal Wire hooks that require runtime services. */
  _initRuntimeHooks(
    stateService: StateProvider,
    viewService: ViewService,
  ): void;

  /** @internal view service */
  /** @internal */
  _view: ViewService;

  /** @internal */
  _stateService: StateProvider;

  /** @internal */
  _routerState: RouterProvider;

  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;
}

/**
 * Central registry and factory for transition events, hooks, and transition instances.
 *
 * @internal
 */
export class TransitionProvider implements TransitionService {
  static $inject = [_routerProvider, _exceptionHandlerProvider] as const;

  /** @internal */
  _transitionCount: number;
  /** @internal */
  _eventTypes: TransitionEventType[];
  /** @internal */
  _registeredHooks: RegisteredHooks;
  /** @internal */
  _routerState: RouterProvider;
  /** @internal */
  _view!: ViewService;
  /** @internal */
  _stateService!: StateProvider;
  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;

  constructor(
    routerState: RouterProvider,
    $exceptionHandler: ng.ExceptionHandlerProvider,
  ) {
    this._transitionCount = 0;
    this._eventTypes = [];
    this._registeredHooks = {};
    this._routerState = routerState;
    defineCoreTransitionEvents(this);
    this._registerCoreTransitionHooks();
    this._exceptionHandler = $exceptionHandler.handler;
    routerState._successfulTransitionCleanup = treeChangesCleanup;
  }

  /**
   * Wires runtime services into the transition service and registers the
   * hooks that depend on state/url/view services.
   */
  $get(): this {
    return this;
  }

  /** @internal */
  _initRuntimeHooks(
    stateService: StateProvider,
    viewService: ViewService,
  ): void {
    this._view = viewService;
    this._stateService = stateService;
    registerRuntimeTransitionHooks(this);
  }

  /**
   * Creates a new transition from the current path to a target state.
   */
  create(fromPath: PathNode[], targetState: TargetState): Transition {
    return new Transition(fromPath, targetState, this, this._routerState);
  }

  /**
   * Returns known transition event types, optionally filtered by phase.
   */
  /** @internal */
  _getEvents(phase?: TransitionHookPhase): TransitionEventType[] {
    const transitionHookTypes: TransitionEventType[] = [];

    this._eventTypes.forEach((eventType) => {
      if (phase === undefined || eventType._hookPhase === phase) {
        transitionHookTypes.push(eventType);
      }
    });

    return transitionHookTypes;
  }

  /**
   * Returns hooks registered for a specific transition event name.
   */
  /** @internal */
  _getHooks(hookName: string): RegisteredHooks[string] {
    return this._registeredHooks[hookName] ?? [];
  }

  /**
   * Registers a transition hook by event name.
   */
  on(
    eventName: string,
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    const eventType = this._getEventType(eventName);

    return registerHook(
      this,
      this,
      eventType,
      matchCriteria,
      callback,
      options,
    );
  }

  /**
   * Registers an internal hook that runs while a transition is being constructed.
   */
  /** @internal */
  _onCreate(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onCreate", matchCriteria, callback, options);
  }

  /**
   * Registers an `onBefore` transition hook.
   */
  onBefore(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onBefore", matchCriteria, callback, options);
  }

  /**
   * Registers an `onStart` transition hook.
   */
  onStart(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onStart", matchCriteria, callback, options);
  }

  /**
   * Registers an `onEnter` transition hook.
   */
  onEnter(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onEnter", matchCriteria, callback, options);
  }

  /**
   * Registers an `onRetain` transition hook.
   */
  onRetain(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onRetain", matchCriteria, callback, options);
  }

  /**
   * Registers an `onExit` transition hook.
   */
  onExit(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onExit", matchCriteria, callback, options);
  }

  /**
   * Registers an `onFinish` transition hook.
   */
  onFinish(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onFinish", matchCriteria, callback, options);
  }

  /**
   * Registers an `onSuccess` transition hook.
   */
  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onSuccess", matchCriteria, callback, options);
  }

  /**
   * Registers an `onError` transition hook.
   */
  onError(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onError", matchCriteria, callback, options);
  }

  /**
   * Looks up one known transition event type by name.
   */
  /** @internal */
  _getEventType(eventName: string): TransitionEventType {
    for (let i = 0; i < this._eventTypes.length; i++) {
      const eventType = this._eventTypes[i];

      if (eventType._name === eventName) return eventType;
    }

    throw new Error(`Unknown Transition hook event: ${eventName}`);
  }

  /**
   * Installs the built-in transition hooks that power router behavior.
   */
  /** @internal */
  _registerCoreTransitionHooks(): void {
    registerCoreTransitionHooks(this);
  }
}
