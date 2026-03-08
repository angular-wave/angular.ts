import type { StateDeclaration } from "../state/interface.ts";
import type { RegisteredHook } from "./hook-registry.ts";
import type { HookResult, TransitionHookOptions } from "./interface.ts";
import type { Transition } from "./transition.ts";
/**
 * Transition lifecycle phases used to group and order hook execution.
 */
export declare const TransitionHookPhase: {
  readonly _CREATE: 0;
  readonly _BEFORE: 1;
  readonly _RUN: 2;
  readonly _SUCCESS: 3;
  readonly _ERROR: 4;
};
export type TransitionHookPhase = number;
/**
 * Declares whether a hook operates on a whole transition or on individual states.
 */
export declare const TransitionHookScope: {
  readonly _TRANSITION: 0;
  readonly _STATE: 1;
};
export type TransitionHookScope = number;
type HookErrorHandler = (error: any) => any;
type HookResultHandler = (result: HookResult) => any;
/**
 * Runtime wrapper around one registered transition hook invocation.
 */
export declare class TransitionHook {
  static HANDLE_RESULT: (hook: TransitionHook) => HookResultHandler;
  static LOG_REJECTED_RESULT: (hook: TransitionHook) => HookResultHandler;
  static LOG_ERROR: (hook?: {
    logError: (error: any) => any;
  }) => HookErrorHandler;
  static REJECT_ERROR: () => HookErrorHandler;
  static THROW_ERROR: () => HookErrorHandler;
  transition: Transition;
  stateContext: StateDeclaration | null;
  registeredHook: RegisteredHook;
  options: TransitionHookOptions;
  type: import("./transition-event-type.ts").TransitionEventType;
  isSuperseded: () => boolean;
  _exceptionHandler: ng.ExceptionHandlerService;
  /**
   * Runs hooks in sequence, waiting for each async hook before invoking the next.
   */
  static chain(hooks: TransitionHook[], waitFor?: Promise<any>): Promise<any>;
  static invokeHooks(
    hooks: TransitionHook[],
    doneCallback: () => Promise<any>,
  ): Promise<any>;
  static runAllHooks(hooks: TransitionHook[]): void;
  /**
   * Creates one executable hook wrapper bound to a transition and state context.
   */
  constructor(
    transition: Transition,
    stateContext: StateDeclaration | null,
    registeredHook: RegisteredHook,
    options: TransitionHookOptions,
    exceptionHandler: ng.ExceptionHandlerService,
  );
  /**
   * Sends hook execution errors to the configured exception handler.
   */
  logError(err: unknown): void;
  /**
   * Executes the underlying hook callback and normalizes its result into
   * the router's rejection / redirect model.
   */
  invokeHook(): Promise<any> | undefined;
  /**
   * Converts raw hook return values into transition outcomes.
   */
  handleHookResult(result: HookResult): Promise<any> | undefined;
  /**
   * Returns a rejection when the transition was aborted or superseded.
   */
  getNotCurrentRejection(): Promise<any> | undefined;
  /**
   * Returns a readable trace label for this hook invocation.
   */
  toString(): string;
}
export {};
