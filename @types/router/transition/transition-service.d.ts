/** @typedef {import("./interface.ts").DeregisterFn} DeregisterFn */
/** @typedef {import("./interface.ts").HookFn} HookFn */
/** @typedef {import("./interface.ts").HookMatchCriteria} HookMatchCriteria */
/** @typedef {import("./interface.ts").HookRegOptions} HookRegOptions */
/** @typedef {import("./interface.ts").PathTypes} PathTypes */
/** @typedef {import("./interface.ts").RegisteredHooks} RegisteredHooks */
/**
 * The default [[Transition]] options.
 *
 * Include this object when applying custom defaults:
 * let reloadOpts = { reload: true, notify: true }
 * let options = defaults(theirOpts, customDefaults, defaultOptions);
 * @type {import("./interface.ts").TransitionOptions}
 */
export const defaultTransOpts: import("./interface.ts").TransitionOptions;
/**
 * This class provides services related to Transitions.
 *
 * - Most importantly, it allows global Transition Hooks to be registered.
 * - It allows the default transition error handler to be set.
 * - It also has a factory function for creating new [[Transition]] objects, (used internally by the [[StateService]]).
 *
 * At bootstrap, [[UIRouter]] creates a single instance (singleton) of this class.
 *
 * This API is located at `router.transitionService` ([[UIRouter.transitionService]])
 */
export class TransitionProvider {
  static $inject: string[];
  /**
   * @param {ng.RouterService} globals
   * @param {ng.ViewService} viewService
   * @param {ng.ExceptionHandlerProvider} $exceptionHandler
   */
  constructor(
    globals: ng.RouterService,
    viewService: ng.ViewService,
    $exceptionHandler: ng.ExceptionHandlerProvider,
  );
  _transitionCount: number;
  /**
   * The transition hook types, such as `onEnter`, `onStart`, etc
   * @type {TransitionEventType[]}
   */
  _eventTypes: TransitionEventType[];
  /** @internal The registered transition hooks */
  /** @type {RegisteredHooks} */
  _registeredHooks: RegisteredHooks;
  /** The  paths on a criteria object */
  /** @type {PathTypes} */
  _criteriaPaths: PathTypes;
  globals: import("../router.js").RouterProvider;
  $view: import("../view/view.js").ViewService;
  /** @type {Record<string, DeregisterFn | undefined>} */
  _deregisterHookFns: Record<string, DeregisterFn | undefined>;
  /** @type {ng.ExceptionHandlerService} */
  _exceptionHandler: ng.ExceptionHandlerService;
  $get: (
    | string
    | ((
        stateService: ng.StateService,
        urlService: ng.UrlService,
        stateRegistry: ng.StateRegistryService,
        viewService: ng.ViewService,
      ) => TransitionProvider)
  )[];
  /**
   * Registers a [[TransitionHookFn]], called *while a transition is being constructed*.
   *
   * Registers a transition lifecycle hook, which is invoked during transition construction.
   *
   * This low level hook should only be used by plugins.
   * This can be a useful time for plugins to add resolves or mutate the transition as needed.
   * The Sticky States plugin uses this hook to modify the treechanges.
   *
   * ### Lifecycle
   *
   * `onCreate` hooks are invoked *while a transition is being constructed*.
   *
   * ### Return value
   *
   * The hook's return value is ignored
   *
   * @internal
   * @param criteria defines which Transitions the Hook should be invoked for.
   * @param callback the hook function which will be invoked.
   * @param options the registration options
   * @returns a function which deregisters the hook.
   */
  /**
   * Creates a new [[Transition]] object
   *
   * This is a factory function for creating new Transition objects.
   * It is used internally by the [[StateService]] and should generally not be called by application code.
   *
   * @internal
   * @param fromPath the path to the current state (the from state)
   * @param targetState the target state (destination)
   * @returns a Transition
   */
  /**
   * @param {import("../path/path-node.js").PathNode[]} fromPath
   * @param {import("../state/target-state.js").TargetState} targetState
   */
  create(
    fromPath: import("../path/path-node.js").PathNode[],
    targetState: import("../state/target-state.js").TargetState,
  ): Transition;
  _defineCoreEvents(): void;
  _defineCorePaths(): void;
  /**
   * @param {string} name
   * @param {number} hookPhase
   * @param {number} hookOrder
   * @param {any} criteriaMatchPath
   */
  _defineEvent(
    name: string,
    hookPhase: number,
    hookOrder: number,
    criteriaMatchPath: any,
    reverseSort?: boolean,
    getResultHandler?: (
      hook: TransitionHook,
    ) => (result: import("./transition-hook.js").HookResult) => Promise<any>,
    getErrorHandler?: () => (error: any) => Promise<never>,
    synchronous?: boolean,
  ): void;
  /**
   * @param {TransitionHookPhase} [phase]
   * @return {any[]}
   */
  _getEvents(phase?: TransitionHookPhase): any[];
  /**
   * Adds a Path to be used as a criterion against a TreeChanges path
   *
   * For example: the `exiting` path in [[HookMatchCriteria]] is a STATE scoped path.
   * It was defined by calling `defineTreeChangesCriterion('exiting', TransitionHookScope.STATE)`
   * Each state in the exiting path is checked against the criteria and returned as part of the match.
   *
   * Another example: the `to` path in [[HookMatchCriteria]] is a TRANSITION scoped path.
   * It was defined by calling `defineTreeChangesCriterion('to', TransitionHookScope.TRANSITION)`
   * Only the tail of the `to` path is checked against the criteria and returned as part of the match.
   * @internal
   * @param {string} name
   * @param {number} hookScope
   */
  _definePathType(name: string, hookScope: number): void;
  _getPathTypes(): import("./interface.ts").PathTypes;
  /**
   * @param {string} hookName
   * @returns {import("./hook-registry.js").RegisteredHook[]}
   */
  getHooks(hookName: string): import("./hook-registry.js").RegisteredHook[];
  /**
   * Registers a hook by event name.
   * @param {string} eventName
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  on(
    eventName: string,
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onCreate(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onBefore(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onStart(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onEnter(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onRetain(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onExit(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onFinish(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onError(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  /**
   * @param {string} eventName
   * @returns {TransitionEventType}
   */
  _getEventType(eventName: string): TransitionEventType;
  _registerCoreTransitionHooks(): void;
}
export type DeregisterFn = import("./interface.ts").DeregisterFn;
export type HookFn = import("./interface.ts").HookFn;
export type HookMatchCriteria = import("./interface.ts").HookMatchCriteria;
export type HookRegOptions = import("./interface.ts").HookRegOptions;
export type PathTypes = import("./interface.ts").PathTypes;
export type RegisteredHooks = import("./interface.ts").RegisteredHooks;
import { TransitionEventType } from "./transition-event-type.js";
import { Transition } from "./transition.js";
import { TransitionHook } from "./transition-hook.js";
import { TransitionHookPhase } from "./transition-hook.js";
