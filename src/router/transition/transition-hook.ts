import { isPromise } from "../../shared/predicates.ts";
import { fnToString, maxLength } from "../../shared/strings.ts";
import { assign, isInstanceOf } from "../../shared/utils.ts";
import { TargetState } from "../state/target-state.ts";
import { Rejection } from "./reject-factory.ts";
import type { StateDeclaration } from "../state/interface.ts";
import type { RegisteredHook } from "./hook-registry.ts";
import type { HookResult, HookResultValue } from "./interface.ts";
import type { Transition } from "./transition.ts";
import type { TransitionEventType } from "./transition-event-type.ts";

/**
 * Transition lifecycle phases used to group and order hook execution.
 */
export const TransitionHookPhase = {
  _CREATE: 0,
  _BEFORE: 1,
  _RUN: 2,
  _SUCCESS: 3,
  _ERROR: 4,
} as const;

export type TransitionHookPhase = number;

/**
 * Declares whether a hook operates on a whole transition or on individual states.
 */
export const TransitionHookScope = {
  _TRANSITION: 0,
  _STATE: 1,
} as const;

export type TransitionHookScope = number;

type HookErrorHandler = (error: unknown) => unknown;

type HookResultHandler = (result: HookResult) => unknown;

export interface TransitionHookOptions {
  current: () => Transition | void; // path?
  transition?: Transition | null;
  hookType?: string;
  target?: unknown;
  bind?: unknown;
  stateHook?: boolean;
}

const defaultOptions: Partial<TransitionHookOptions> = {
  current: () => undefined,
  transition: null,
  bind: null,
};

/**
 * Runtime wrapper around one registered transition hook invocation.
 */
export class TransitionHook {
  static HANDLE_RESULT: (hook: TransitionHook) => HookResultHandler;
  static LOG_REJECTED_RESULT: (hook: TransitionHook) => HookResultHandler;
  static LOG_ERROR: (hook?: {
    logError: (error: unknown) => unknown;
  }) => HookErrorHandler;

  static REJECT_ERROR: () => HookErrorHandler;
  static THROW_ERROR: () => HookErrorHandler;

  transition: Transition;
  stateContext: StateDeclaration | null;
  registeredHook: RegisteredHook;
  options: TransitionHookOptions;
  /** @internal */
  _type: TransitionEventType;
  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;

  /**
   * Runs hooks in sequence, waiting for each async hook before invoking the next.
   */
  static chain(
    hooks: TransitionHook[],
    waitFor?: Promise<unknown>,
  ): Promise<unknown> {
    let promise = waitFor || Promise.resolve();

    for (let i = 0; i < hooks.length; i++) {
      const hook = hooks[i];

      promise = promise.then(() => hook.invokeHook());
    }

    return promise;
  }

  static invokeHooks(
    hooks: TransitionHook[],
    doneCallback: () => Promise<unknown>,
  ): Promise<unknown> {
    for (let idx = 0; idx < hooks.length; idx++) {
      const hookResult = hooks[idx].invokeHook();

      if (isPromise(hookResult)) {
        const remainingHooks = hooks.slice(idx + 1);

        return TransitionHook.chain(
          remainingHooks,
          Promise.resolve(hookResult),
        ).then(doneCallback);
      }
    }

    return doneCallback();
  }

  static runAllHooks(hooks: TransitionHook[]): void {
    for (let i = 0; i < hooks.length; i++) {
      hooks[i].invokeHook();
    }
  }

  /**
   * Creates one executable hook wrapper bound to a transition and state context.
   */
  constructor(
    transition: Transition,
    stateContext: StateDeclaration | null,
    registeredHook: RegisteredHook,
    options: TransitionHookOptions,
    exceptionHandler: ng.ExceptionHandlerService,
  ) {
    this.transition = transition;
    this.stateContext = stateContext;
    this.registeredHook = registeredHook;
    this.options = assign({}, defaultOptions, options) as TransitionHookOptions;
    this._type = registeredHook._eventType;
    this._exceptionHandler = exceptionHandler;
  }

  /** @internal */
  _isSuperseded(): boolean {
    return (
      this._type.hookPhase === TransitionHookPhase._RUN &&
      !this.options.transition?.isActive()
    );
  }

  /**
   * Sends hook execution errors to the configured exception handler.
   */
  logError(err: unknown): void {
    this._exceptionHandler(err);
  }

  /**
   * Executes the underlying hook callback and normalizes its result into
   * the router's rejection / redirect model.
   */
  invokeHook(): unknown {
    const hook = this.registeredHook;

    if (hook._deregistered) return undefined;

    const notCurrent = this.getNotCurrentRejection();

    if (notCurrent) return notCurrent;

    const { options } = this;

    const invokeCallback = (): HookResult =>
      hook.callback.call(
        options.bind,
        this.transition,
        this.stateContext as StateDeclaration,
      ) as HookResult;

    const normalizeErr = (err: unknown): Promise<never> =>
      Rejection.normalize(err)._toPromise();

    const handleError = (err: Rejection): unknown =>
      hook._eventType.getErrorHandler()(err);

    const handleResult = (result: HookResult): unknown =>
      hook._eventType.getResultHandler(this)(result);

    try {
      const result = invokeCallback();

      if (!this._type.synchronous && isPromise(result)) {
        return Promise.resolve(result)
          .catch(normalizeErr)
          .then(handleResult, handleError);
      }

      return handleResult(result);
    } catch (err) {
      return handleError(Rejection.normalize(err));
    } finally {
      if (hook.invokeLimit && ++hook.invokeCount >= hook.invokeLimit) {
        hook.deregister();
      }
    }
  }

  /**
   * Converts raw hook return values into transition outcomes.
   */
  handleHookResult(result: HookResult): Promise<unknown> | undefined {
    const notCurrent = this.getNotCurrentRejection();

    if (notCurrent) return notCurrent;

    if (isPromise(result)) {
      return Promise.resolve(result).then((val) => this.handleHookResult(val));
    }

    if (result === false) {
      return Rejection.aborted("Hook aborted transition")._toPromise();
    }

    if (isInstanceOf(result, TargetState)) {
      return Rejection.redirected(result)._toPromise();
    }

    return undefined;
  }

  /**
   * Returns a rejection when the transition was aborted or superseded.
   */
  getNotCurrentRejection(): Promise<never> | undefined {
    if (this.transition._aborted) {
      return Rejection.aborted()._toPromise();
    }

    if (this._isSuperseded()) {
      return Rejection.superseded(this.options.current())._toPromise();
    }

    return undefined;
  }

  toString(): string {
    const { options, registeredHook } = this;

    const event = options.hookType || "internal";

    const target = options.target as
      | { state?: { name?: string }; name?: string }
      | undefined;

    const context = target?.state?.name || target?.name || "unknown";

    const name = fnToString(registeredHook.callback);

    return `${event} context: ${context}, ${maxLength(200, name)}`;
  }
}

TransitionHook.HANDLE_RESULT =
  (hook: TransitionHook) =>
  (result: HookResult): unknown =>
    hook.handleHookResult(result);

TransitionHook.LOG_REJECTED_RESULT =
  (hook: TransitionHook) =>
  (result: HookResult): undefined => {
    if (isPromise(result)) {
      Promise.resolve(result as Promise<HookResultValue>).catch((err) =>
        hook.logError(Rejection.normalize(err)),
      );
    }

    return undefined;
  };

TransitionHook.LOG_ERROR =
  (hook?: { logError: (error: unknown) => unknown }) =>
  (error: unknown): unknown =>
    hook?.logError(error);

TransitionHook.REJECT_ERROR =
  () =>
  (error: unknown): Promise<never> => {
    const promise = Promise.reject(error);

    promise.catch(() => 0);

    return promise;
  };

TransitionHook.THROW_ERROR =
  () =>
  (error: unknown): never => {
    throw error;
  };
