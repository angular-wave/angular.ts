import { defaults } from "../../shared/common.ts";
import { parse } from "../../shared/hof.ts";
import { isPromise } from "../../shared/predicates.ts";
import { fnToString, maxLength } from "../../shared/strings.ts";
import { trace } from "../common/trace.ts";
import { TargetState } from "../state/target-state.ts";
import { Rejection } from "./reject-factory.ts";
import type { StateDeclaration } from "../state/interface.ts";
import type { RegisteredHook } from "./hook-registry.ts";
import type { HookResult } from "./interface.ts";
import type { Transition } from "./transition.ts";

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

type HookErrorHandler = (error: any) => any;
type HookResultHandler = (result: HookResult) => any;

export interface TransitionHookOptions {
  current: () => Transition | void; // path?
  transition?: Transition | null;
  hookType?: string;
  target?: unknown;
  traceData?: {
    hookType?: string;
    context?: any;
  };
  bind?: unknown;
  stateHook?: boolean;
}

const defaultOptions: Partial<TransitionHookOptions> = {
  current: () => undefined,
  transition: null,
  traceData: {},
  bind: null,
};

/**
 * Runtime wrapper around one registered transition hook invocation.
 */
export class TransitionHook {
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
  static chain(hooks: TransitionHook[], waitFor?: Promise<any>): Promise<any> {
    const createHookChainR = (
      prev: Promise<any>,
      nextHook: TransitionHook,
    ): Promise<any> => prev.then(() => nextHook.invokeHook());

    return hooks.reduce(createHookChainR, waitFor || Promise.resolve());
  }

  static invokeHooks(
    hooks: TransitionHook[],
    doneCallback: () => Promise<any>,
  ): Promise<any> {
    for (let idx = 0; idx < hooks.length; idx++) {
      const hookResult = hooks[idx].invokeHook();

      if (isPromise(hookResult)) {
        const remainingHooks = hooks.slice(idx + 1);

        return TransitionHook.chain(
          remainingHooks,
          hookResult as Promise<any>,
        ).then(() => {
          doneCallback();
        });
      }
    }

    return doneCallback();
  }

  static runAllHooks(hooks: TransitionHook[]): void {
    hooks.forEach((hook) => hook.invokeHook());
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
    this.options = defaults(options, defaultOptions) as TransitionHookOptions;
    this.type = registeredHook.eventType;
    this.isSuperseded = () =>
      this.type.hookPhase === TransitionHookPhase._RUN &&
      !this.options.transition?.isActive();
    this._exceptionHandler = exceptionHandler;
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
  invokeHook(): Promise<any> | undefined {
    const hook = this.registeredHook;

    if (hook._deregistered) return undefined;

    const notCurrent = this.getNotCurrentRejection();
    if (notCurrent) return notCurrent;

    const { options } = this;
    trace.traceHookInvocation(this, this.transition, options);

    const invokeCallback = (): HookResult =>
      hook.callback.call(
        options.bind,
        this.transition,
        this.stateContext as StateDeclaration,
      ) as HookResult;

    const normalizeErr = (err: any): Promise<any> =>
      Rejection.normalize(err).toPromise();

    const handleError = (err: Rejection): any =>
      hook.eventType.getErrorHandler()(err);

    const handleResult = (result: HookResult): any =>
      hook.eventType.getResultHandler(this)(result);

    try {
      const result = invokeCallback();

      if (!this.type.synchronous && isPromise(result)) {
        return (result as Promise<any>)
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
  handleHookResult(result: HookResult): Promise<any> | undefined {
    const notCurrent = this.getNotCurrentRejection();

    if (notCurrent) return notCurrent;

    if (isPromise(result)) {
      return (result as Promise<any>).then((val) => this.handleHookResult(val));
    }

    trace.traceHookResult(result, this.transition);

    if (result === false) {
      return Rejection.aborted("Hook aborted transition").toPromise();
    }

    if (result instanceof TargetState) {
      return Rejection.redirected(result).toPromise();
    }

    return undefined;
  }

  /**
   * Returns a rejection when the transition was aborted or superseded.
   */
  getNotCurrentRejection(): Promise<any> | undefined {
    if (this.transition._aborted) {
      return Rejection.aborted().toPromise();
    }

    if (this.isSuperseded()) {
      return Rejection.superseded(this.options.current()).toPromise();
    }

    return undefined;
  }

  /**
   * Returns a readable trace label for this hook invocation.
   */
  toString(): string {
    const { options, registeredHook } = this;
    const event = parse("traceData.hookType")(options) || "internal";
    const context =
      parse("traceData.context.state.name")(options) ||
      parse("traceData.context")(options) ||
      "unknown";
    const name = fnToString(registeredHook.callback);

    return `${event} context: ${context}, ${maxLength(200, name)}`;
  }
}

TransitionHook.HANDLE_RESULT =
  (hook: TransitionHook) =>
  (result: HookResult): any =>
    hook.handleHookResult(result);

TransitionHook.LOG_REJECTED_RESULT =
  (hook: TransitionHook) =>
  (result: HookResult): undefined => {
    if (isPromise(result)) {
      (result as Promise<any>).catch((err: any) =>
        hook.logError(Rejection.normalize(err)),
      );
    }

    return undefined;
  };

TransitionHook.LOG_ERROR =
  (hook?: { logError: (error: any) => any }) =>
  (error: any): any =>
    hook?.logError(error);

TransitionHook.REJECT_ERROR =
  () =>
  (error: any): Promise<any> => {
    const promise = Promise.reject(error);
    promise.catch(() => 0);

    return promise;
  };

TransitionHook.THROW_ERROR =
  () =>
  (error: any): never => {
    throw error;
  };
