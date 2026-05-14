import { TransitionHook } from './transition-hook.js';

/**
 * Immutable metadata describing one transition lifecycle event.
 */
/** @internal */
class TransitionEventType {
    /**
     * Creates one immutable transition event descriptor.
     */
    constructor(name, hookPhase, hookOrder, criteriaMatchPath, reverseSort = false, resultHandler = (hook, result) => TransitionHook._handleResult(hook, result), errorHandler = (hook, error) => TransitionHook._rejectError(hook, error), synchronous = false) {
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

export { TransitionEventType };
