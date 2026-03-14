import { TransitionHook } from "./transition-hook.js";
/**
 * This class defines a type of hook, such as `onBefore` or `onEnter`.
 * Plugins can define custom hook types, such as sticky states does for `onInactive`.
 */
export class TransitionEventType {
  /**
   * @param {string} name
   * @param {number} hookPhase
   * @param {number} hookOrder
   * @param {any} criteriaMatchPath
   */
  constructor(
    name,
    hookPhase,
    hookOrder,
    criteriaMatchPath,
    reverseSort = false,
    getResultHandler = TransitionHook.HANDLE_RESULT,
    getErrorHandler = TransitionHook.REJECT_ERROR,
    synchronous = false,
  ) {
    this.name = name;
    this.hookPhase = hookPhase;
    this.hookOrder = hookOrder;
    this.criteriaMatchPath = criteriaMatchPath;
    this.reverseSort = reverseSort;
    this.getResultHandler = getResultHandler;
    this.getErrorHandler = getErrorHandler;
    this.synchronous = synchronous;
  }
}
