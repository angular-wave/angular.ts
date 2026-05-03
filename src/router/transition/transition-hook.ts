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
 *
 * @internal
 */
export const TransitionHookPhase = {
  _CREATE: 0,
  _BEFORE: 1,
  _RUN: 2,
  _SUCCESS: 3,
  _ERROR: 4,
} as const;

/** @internal */
export type TransitionHookPhase = number;

/** @internal */
export interface TransitionHookOptions {
  _current: () => Transition | void;
  _transition?: Transition | null;
  _hookType?: string;
  _target?: unknown;
  _bind?: unknown;
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
  _current: () => undefined,
  _transition: null,
  _bind: null,
};

/**
 * Runtime wrapper around one registered transition hook invocation.
 *
 * @internal
 */
export class TransitionHook {
  /** @internal */
  _transition: Transition;
  /** @internal */
  _stateContext: StateDeclaration | null;
  /** @internal */
  _registeredHook: RegisteredHook;
  /** @internal */
  _options: TransitionHookOptions;
  /** @internal */
  _type: TransitionEventType;
  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;

  /**
   * Runs hooks in sequence, waiting for each async hook before invoking the next.
   */
  /** @internal */
  static _chain(
    hooks: TransitionHook[],
    waitFor?: Promise<unknown>,
  ): Promise<void> {
    return TransitionHook._chainFrom(hooks, 0, waitFor);
  }

  /** @internal */
  static async _chainFrom(
    hooks: TransitionHook[],
    start: number,
    waitFor?: Promise<unknown>,
  ): Promise<void> {
    if (waitFor) await waitFor;

    for (let i = start; i < hooks.length; i++) {
      await hooks[i]._invokeHook();
    }
  }

  /** @internal */
  static _invokeHooks(
    hooks: TransitionHook[],
    doneCallback: TransitionHookDoneCallback,
  ): Promise<unknown> {
    for (let idx = 0; idx < hooks.length; idx++) {
      const hookResult = hooks[idx]._invokeHook();

      if (isPromise(hookResult)) {
        return TransitionHook._chainThenDone(
          hooks,
          idx + 1,
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
    start: number,
    waitFor: Promise<unknown>,
    doneCallback: TransitionHookDoneCallback,
  ): Promise<unknown> {
    await TransitionHook._chainFrom(hooks, start, waitFor);

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
    return hook._handleHookResult(result);
  }

  /** @internal */
  static _logRejectedResult(
    hook: TransitionHook,
    result: HookResult,
  ): undefined {
    if (isPromise(result)) {
      Promise.resolve(result as Promise<HookResultValue>).catch((err) => {
        hook._logError(Rejection.normalize(err));
      });
    }

    return undefined;
  }

  /** @internal */
  static _logError(
    hook: { _logError: (error: unknown) => unknown } | undefined,
    error: unknown,
  ): unknown {
    return hook?._logError(error);
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

  /** @internal */
  static _runAllHooks(hooks: TransitionHook[]): void {
    for (let i = 0; i < hooks.length; i++) {
      hooks[i]._invokeHook();
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
    this._transition = transition;
    this._stateContext = stateContext;
    this._registeredHook = registeredHook;
    this._options = assign(
      {},
      defaultOptions,
      options,
    ) as TransitionHookOptions;
    this._type = registeredHook._eventType;
    this._exceptionHandler = exceptionHandler;
  }

  /** @internal */
  _isSuperseded(): boolean {
    return (
      this._type._hookPhase === TransitionHookPhase._RUN &&
      !this._options._transition?.isActive()
    );
  }

  /** @internal */
  _logError(err: unknown): void {
    this._exceptionHandler(err);
  }

  /** @internal */
  _invokeCallback(hook: RegisteredHook): HookResult {
    const { _options } = this;

    return hook._callback.call(
      _options._bind,
      this._transition,
      this._stateContext as StateDeclaration,
    ) as HookResult;
  }

  /** @internal */
  _handleError(err: Rejection): unknown {
    return this._registeredHook._eventType._handleError(this, err);
  }

  /** @internal */
  _handleResult(result: HookResult): unknown {
    return this._registeredHook._eventType._handleResult(this, result);
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
  _invokeHook(): unknown {
    const hook = this._registeredHook;

    if (hook._deregistered) return undefined;

    const notCurrent = this._getNotCurrentRejection();

    if (notCurrent) return notCurrent;

    try {
      const result = this._invokeCallback(hook);

      if (!this._type._synchronous && isPromise(result)) {
        return this._handleAsyncResult(result);
      }

      return this._handleResult(result);
    } catch (err) {
      return this._handleError(Rejection.normalize(err));
    } finally {
      if (hook._invokeLimit && ++hook._invokeCount >= hook._invokeLimit) {
        hook._deregister();
      }
    }
  }

  /**
   * Converts raw hook return values into transition outcomes.
   */
  _handleHookResult(result: HookResult): Promise<unknown> | undefined {
    const notCurrent = this._getNotCurrentRejection();

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
    return this._handleHookResult(await result);
  }

  /** @internal */
  _getNotCurrentRejection(): Promise<never> | undefined {
    if (this._transition._aborted) {
      return Rejection.aborted()._toPromise();
    }

    if (this._isSuperseded()) {
      return Rejection.superseded(this._options._current())._toPromise();
    }

    return undefined;
  }

  toString(): string {
    const { _options, _registeredHook } = this;

    const event = _options._hookType || "internal";

    const target = _options._target as
      | { state?: { name?: string }; name?: string }
      | undefined;

    const context = target?.state?.name || target?.name || "unknown";

    const name = fnToString(_registeredHook._callback);

    return `${event} context: ${context}, ${maxLength(200, name)}`;
  }
}
