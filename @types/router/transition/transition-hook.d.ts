/**
 * Enum representing the different phases of a transition hook.
 */
export type TransitionHookPhase = number;
export namespace TransitionHookPhase {
  let _CREATE: number;
  let _BEFORE: number;
  let _RUN: number;
  let _SUCCESS: number;
  let _ERROR: number;
}
/**
 * Enum representing the scope in which a transition hook operates.
 */
export type TransitionHookScope = number;
export namespace TransitionHookScope {
  let _TRANSITION: number;
  let _STATE: number;
}
export class TransitionHook {
  /**
   * Chains together an array of TransitionHooks.
   *
   * Given a list of [[TransitionHook]] objects, chains them together.
   * Each hook is invoked after the previous one completes.
   *
   * #### Example:
   * ```js
   * var hooks: TransitionHook[] = getHooks();
   * let promise: Promise<any> = TransitionHook.chain(hooks);
   *
   * promise.then(handleSuccess, handleError);
   * ```
   *
   * @param {TransitionHook[]} hooks the list of hooks to chain together
   * @param {Promise<any>} [waitFor] if provided, the chain is `.then()`'ed off this promise
   * @returns a `Promise` for sequentially invoking the hooks (in order)
   */
  static chain(hooks: TransitionHook[], waitFor?: Promise<any>): Promise<any>;
  /**
   * Invokes all the provided TransitionHooks, in order.
   * Each hook's return value is checked.
   * If any hook returns a promise, then the rest of the hooks are chained off that promise, and the promise is returned.
   * If no hook returns a promise, then all hooks are processed synchronously.
   *
   * @param {TransitionHook[]} hooks the list of TransitionHooks to invoke
   * @param {() => Promise<any>} doneCallback a callback that is invoked after all the hooks have successfully completed
   *
   * @returns {Promise<any>} a promise for the async result, or the result of the callback
   */
  static invokeHooks(
    hooks: TransitionHook[],
    doneCallback: () => Promise<any>,
  ): Promise<any>;
  /**
   * Run all TransitionHooks, ignoring their return value.
   * @param {TransitionHook[]} hooks
   */
  static runAllHooks(hooks: TransitionHook[]): void;
  /**
   *
   * @param {Transition} transition
   * @param {import("../state/interface.ts").StateDeclaration | null} stateContext
   * @param {RegisteredHook} registeredHook
   * @param {TransitionHookOptions} options
   * @param {ng.ExceptionHandlerService} exceptionHandler
   */
  constructor(
    transition: Transition,
    stateContext: import("../state/interface.ts").StateDeclaration | null,
    registeredHook: RegisteredHook,
    options: TransitionHookOptions,
    exceptionHandler: ng.ExceptionHandlerService,
  );
  transition: import("./transition.js").Transition;
  stateContext: import("../state/interface.ts").StateDeclaration;
  registeredHook: import("./hook-registry.js").RegisteredHook;
  /** @type {TransitionHookOptions} */
  options: TransitionHookOptions;
  type: import("./transition-event-type.js").TransitionEventType;
  isSuperseded: () => boolean;
  /** @type {ng.ExceptionHandlerService} */
  _exceptionHandler: ng.ExceptionHandlerService;
  /**
   * @param {unknown} err
   */
  logError(err: unknown): void;
  invokeHook(): Promise<any>;
  /**
   * This method handles the return value of a Transition Hook.
   *
   * A hook can return false (cancel), a TargetState (redirect),
   * or a promise (which may later resolve to false or a redirect)
   *
   * This also handles "transition superseded" -- when a new transition
   * was started while the hook was still running
   * @param {HookResult} result
   * @returns {Promise<any> | undefined}
   */
  handleHookResult(result: HookResult): Promise<any> | undefined;
  /**
   * Return a Rejection promise if the transition is no longer current due
   * a new transition has started and superseded this one.
   */
  getNotCurrentRejection(): Promise<any> & {
    _transitionRejection: Rejection;
  };
  toString(): string;
}
export namespace TransitionHook {
  /**
   * These GetResultHandler(s) are used by [[invokeHook]] below
   * Each HookType chooses a GetResultHandler (See: [[TransitionService._defineCoreEvents]])
   */
  function HANDLE_RESULT(
    hook: TransitionHook,
  ): (/** @type {HookResult} */ result: HookResult) => Promise<any>;
  /**
   * If the result is a promise rejection, log it.
   * Otherwise, ignore the result.
   */
  function LOG_REJECTED_RESULT(hook: {
    logError: (arg0: Rejection) => any;
  }): (/** @type {Promise<any>} */ result: Promise<any>) => any;
  /**
   * These GetErrorHandler(s) are used by [[invokeHook]] below
   * Each HookType chooses a GetErrorHandler (See: [[TransitionService._defineCoreEvents]])
   */
  function LOG_ERROR(hook: {
    logError: (arg0: any) => any;
  }): (/** @type {any} */ error: any) => any;
  function REJECT_ERROR(): (/** @type {any} */ error: any) => Promise<never>;
  function THROW_ERROR(): (/** @type {any} */ error: any) => never;
}
export type TransitionHookOptions =
  import("./interface.ts").TransitionHookOptions;
export type HookResult = import("./interface.ts").HookResult;
export type Transition = import("./transition.js").Transition;
export type RegisteredHook = import("./hook-registry.js").RegisteredHook;
import { Rejection } from "./reject-factory.js";
