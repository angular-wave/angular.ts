import type { StateDeclaration } from "../state/interface.ts";
import type { RegisteredHook } from "./hook-registry.ts";
import type { HookResult, TransitionHookOptions } from "./interface.ts";
import type { Transition } from "./transition.ts";
export declare const TransitionHookPhase: {
  readonly _CREATE: 0;
  readonly _BEFORE: 1;
  readonly _RUN: 2;
  readonly _SUCCESS: 3;
  readonly _ERROR: 4;
};
export type TransitionHookPhase = number;
export declare const TransitionHookScope: {
  readonly _TRANSITION: 0;
  readonly _STATE: 1;
};
export type TransitionHookScope = number;
type HookErrorHandler = (error: any) => any;
type HookResultHandler = (result: HookResult) => any;
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
  static chain(hooks: TransitionHook[], waitFor?: Promise<any>): Promise<any>;
  static invokeHooks(
    hooks: TransitionHook[],
    doneCallback: () => Promise<any>,
  ): Promise<any>;
  static runAllHooks(hooks: TransitionHook[]): void;
  constructor(
    transition: Transition,
    stateContext: StateDeclaration | null,
    registeredHook: RegisteredHook,
    options: TransitionHookOptions,
    exceptionHandler: ng.ExceptionHandlerService,
  );
  logError(err: unknown): void;
  invokeHook(): Promise<any> | undefined;
  handleHookResult(result: HookResult): Promise<any> | undefined;
  getNotCurrentRejection(): Promise<any> | undefined;
  toString(): string;
}
export {};
