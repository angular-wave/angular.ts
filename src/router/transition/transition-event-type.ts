import { TransitionHook } from "./transition-hook.ts";
import type { HookResult } from "./interface.ts";
import type { PathType } from "./transition-service.ts";

export type TransitionResultHandler = (
  hook: TransitionHook,
  result: HookResult,
) => unknown;

export type TransitionErrorHandler = (
  hook: TransitionHook | undefined,
  error: unknown,
) => unknown;

/**
 * Immutable metadata describing one transition lifecycle event.
 */
/** @internal */
export class TransitionEventType {
  name: string;
  hookPhase: number;
  hookOrder: number;
  /** @internal */
  _criteriaMatchPath: PathType;
  reverseSort: boolean;
  /** @internal */
  _handleResult: TransitionResultHandler;
  /** @internal */
  _handleError: TransitionErrorHandler;
  synchronous: boolean;

  /**
   * Creates one immutable transition event descriptor.
   */
  constructor(
    name: string,
    hookPhase: number,
    hookOrder: number,
    criteriaMatchPath: PathType,
    reverseSort = false,
    resultHandler: TransitionResultHandler = TransitionHook._handleResult,
    errorHandler: TransitionErrorHandler = TransitionHook._rejectError,
    synchronous = false,
  ) {
    this.name = name;
    this.hookPhase = hookPhase;
    this.hookOrder = hookOrder;
    this._criteriaMatchPath = criteriaMatchPath;
    this.reverseSort = reverseSort;
    this._handleResult = resultHandler;
    this._handleError = errorHandler;
    this.synchronous = synchronous;
  }
}
