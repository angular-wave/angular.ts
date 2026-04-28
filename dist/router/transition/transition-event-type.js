import { TransitionHook } from './transition-hook.js';

/**
 * Immutable metadata describing one transition lifecycle event.
 */
/** @internal */
class TransitionEventType {
    /**
     * Creates one immutable transition event descriptor.
     */
    constructor(name, hookPhase, hookOrder, criteriaMatchPath, reverseSort = false, getResultHandler = TransitionHook.HANDLE_RESULT, getErrorHandler = TransitionHook.REJECT_ERROR, synchronous = false) {
        this.name = name;
        this.hookPhase = hookPhase;
        this.hookOrder = hookOrder;
        this._criteriaMatchPath = criteriaMatchPath;
        this.reverseSort = reverseSort;
        this.getResultHandler = getResultHandler;
        this.getErrorHandler = getErrorHandler;
        this.synchronous = synchronous;
    }
}

export { TransitionEventType };
