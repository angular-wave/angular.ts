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
  _registeredHooks: {};
  /** The  paths on a criteria object */
  _criteriaPaths: {};
  globals: import("../router.js").RouterProvider;
  $view: import("../view/view.js").ViewService;
  _deregisterHookFns: {};
  /** @type {ng.ExceptionHandlerService} */
  _exceptionHandler: ng.ExceptionHandlerService;
  $get: (
    | string
    | ((
        stateService: ng.StateService,
        urlService: ng.UrlService,
        stateRegistry: ng.StateRegistryService,
        viewService: ng.ViewService,
      ) => ng.TransitionService)
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
  create(fromPath: any, targetState: any): Transition;
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
  _getPathTypes(): {};
  getHooks(hookName: any): any;
  _registerCoreTransitionHooks(): void;
}
import { TransitionEventType } from "./transition-event-type.js";
import { Transition } from "./transition.js";
import { TransitionHook } from "./transition-hook.js";
import { TransitionHookPhase } from "./transition-hook.js";
