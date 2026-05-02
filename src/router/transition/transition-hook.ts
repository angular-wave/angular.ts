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

export interface TransitionHookOptions {
  current: () => Transition | void; // path?
  transition?: Transition | null;
  hookType?: string;
  target?: unknown;
  bind?: unknown;
  stateHook?: boolean;
}

interface TransitionHookDoneTask {
  _startTransition(): Promise<void>;
}

type TransitionHookDoneCallback =
  | (() => Promise<unknown>)
  | TransitionHookDoneTask;

function isDoneTask(
  doneCallback: TransitionHookDoneCallback,
): doneCallback is TransitionHookDoneTask {
  return "_startTransition" in doneCallback;
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
  ): Promise<void> {
    return TransitionHook._chain(hooks, waitFor);
  }

  /** @internal */
  static async _chain(
    hooks: TransitionHook[],
    waitFor?: Promise<unknown>,
  ): Promise<void> {
    if (waitFor) await waitFor;

    for (let i = 0; i < hooks.length; i++) {
      await hooks[i].invokeHook();
    }
  }

  static invokeHooks(
    hooks: TransitionHook[],
    doneCallback: TransitionHookDoneCallback,
  ): Promise<unknown> {
    for (let idx = 0; idx < hooks.length; idx++) {
      const hookResult = hooks[idx].invokeHook();

      if (isPromise(hookResult)) {
        const remainingHooks = hooks.slice(idx + 1);

        return TransitionHook._chainThenDone(
          remainingHooks,
          Promise.resolve(hookResult),
          doneCallback,
        );
      }
    }

    return TransitionHook._runDoneCallback(doneCallback);
  }

  /** @internal */
  static async _chainThenDone(
    hooks: TransitionHook[],
    waitFor: Promise<unknown>,
    doneCallback: TransitionHookDoneCallback,
  ): Promise<unknown> {
    await TransitionHook.chain(hooks, waitFor);

    return TransitionHook._runDoneCallback(doneCallback);
  }

  /** @internal */
  static _runDoneCallback(
    doneCallback: TransitionHookDoneCallback,
  ): Promise<unknown> {
    return isDoneTask(doneCallback)
      ? doneCallback._startTransition()
      : doneCallback();
  }

  /** @internal */
  static _handleResult(
    hook: TransitionHook,
    result: HookResult,
  ): Promise<unknown> | undefined {
    return hook.handleHookResult(result);
  }

  /** @internal */
  static _logRejectedResult(
    hook: TransitionHook,
    result: HookResult,
  ): undefined {
    if (isPromise(result)) {
      Promise.resolve(result as Promise<HookResultValue>).catch((err) => {
        hook.logError(Rejection.normalize(err));
      });
    }

    return undefined;
  }

  /** @internal */
  static _logError(
    hook: { logError: (error: unknown) => unknown } | undefined,
    error: unknown,
  ): unknown {
    return hook?.logError(error);
  }

  /** @internal */
  static _rejectError(
    _hook: TransitionHook | undefined,
    error: unknown,
  ): Promise<never> {
    const promise = Promise.reject(error);

    promise.catch(() => 0);

    return promise;
  }

  /** @internal */
  static _throwError(_hook: TransitionHook | undefined, error: unknown): never {
    throw error;
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

  /** @internal */
  _invokeCallback(hook: RegisteredHook): HookResult {
    const { options } = this;

    return hook.callback.call(
      options.bind,
      this.transition,
      this.stateContext as StateDeclaration,
    ) as HookResult;
  }

  /** @internal */
  _handleError(err: Rejection): unknown {
    return this.registeredHook._eventType._handleError(this, err);
  }

  /** @internal */
  _handleResult(result: HookResult): unknown {
    return this.registeredHook._eventType._handleResult(this, result);
  }

  /** @internal */
  async _handleAsyncResult(result: HookResult): Promise<unknown> {
    try {
      return this._handleResult(await result);
    } catch (err) {
      return this._handleError(Rejection.normalize(err));
    }
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

    try {
      const result = this._invokeCallback(hook);

      if (!this._type.synchronous && isPromise(result)) {
        return this._handleAsyncResult(result);
      }

      return this._handleResult(result);
    } catch (err) {
      return this._handleError(Rejection.normalize(err));
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
      return this._handleAsyncHookResult(
        Promise.resolve(result as Promise<HookResultValue>),
      );
    }

    if (result === false) {
      return Rejection.aborted("Hook aborted transition")._toPromise();
    }

    if (isInstanceOf(result, TargetState)) {
      return Rejection.redirected(result)._toPromise();
    }

    return undefined;
  }

  /** @internal */
  async _handleAsyncHookResult(
    result: Promise<HookResultValue>,
  ): Promise<unknown> {
    return this.handleHookResult(await result);
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
