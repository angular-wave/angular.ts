import { TransitionHook } from "./transition-hook.ts";
import type { HookResult } from "./interface.ts";
import type { PathType } from "./path-types.ts";

/** @internal */
export type TransitionResultHandler = (
  hook: TransitionHook,
  result: HookResult,
) => unknown;

/** @internal */
export type TransitionErrorHandler = (
  hook: TransitionHook | undefined,
  error: unknown,
) => unknown;

/**
 * Immutable metadata describing one transition lifecycle event.
 */
/** @internal */
export class TransitionEventType {
  /** @internal */
  _name: string;
  /** @internal */
  _hookPhase: number;
  /** @internal */
  _hookOrder: number;
  /** @internal */
  _criteriaMatchPath: PathType;
  /** @internal */
  _reverseSort: boolean;
  /** @internal */
  _handleResult: TransitionResultHandler;
  /** @internal */
  _handleError: TransitionErrorHandler;
  /** @internal */
  _synchronous: boolean;

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
    this._name = name;
    this._hookPhase = hookPhase;
    this._hookOrder = hookOrder;
    this._criteriaMatchPath = criteriaMatchPath;
    this._reverseSort = reverseSort;
    this._handleResult = resultHandler;
    this._handleError = errorHandler;
    this._synchronous = synchronous;
  }
}
