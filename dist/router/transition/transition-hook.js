import { isPromise } from '../../shared/predicates.js';
import { fnToString, maxLength } from '../../shared/strings.js';
import { assign, isInstanceOf } from '../../shared/utils.js';
import { TargetState } from '../state/target-state.js';
import { Rejection } from './reject-factory.js';

/**
 * Transition lifecycle phases used to group and order hook execution.
 *
 * @internal
 */
const TransitionHookPhase = {
    _CREATE: 0,
    _BEFORE: 1,
    _RUN: 2,
    _SUCCESS: 3,
    _ERROR: 4,
};
function isDoneTask(doneCallback) {
    return "_startTransition" in doneCallback;
}
const defaultOptions = {
    _current: () => undefined,
    _transition: null,
    _bind: null,
};
/**
 * Runtime wrapper around one registered transition hook invocation.
 *
 * @internal
 */
class TransitionHook {
    /**
     * Runs hooks in sequence, waiting for each async hook before invoking the next.
     */
    /** @internal */
    static _chain(hooks, waitFor) {
        return TransitionHook._chainFrom(hooks, 0, waitFor);
    }
    /** @internal */
    static async _chainFrom(hooks, start, waitFor) {
        if (waitFor)
            await waitFor;
        for (let i = start; i < hooks.length; i++) {
            await hooks[i]._invokeHook();
        }
    }
    /** @internal */
    static _invokeHooks(hooks, doneCallback) {
        for (let idx = 0; idx < hooks.length; idx++) {
            const hookResult = hooks[idx]._invokeHook();
            if (isPromise(hookResult)) {
                return TransitionHook._chainThenDone(hooks, idx + 1, Promise.resolve(hookResult), doneCallback);
            }
        }
        return TransitionHook._runDoneCallback(doneCallback);
    }
    /** @internal */
    static async _chainThenDone(hooks, start, waitFor, doneCallback) {
        await TransitionHook._chainFrom(hooks, start, waitFor);
        return TransitionHook._runDoneCallback(doneCallback);
    }
    /** @internal */
    static _runDoneCallback(doneCallback) {
        return isDoneTask(doneCallback)
            ? doneCallback._startTransition()
            : doneCallback();
    }
    /** @internal */
    static _handleResult(hook, result) {
        return hook._handleHookResult(result);
    }
    /** @internal */
    static _logRejectedResult(hook, result) {
        if (isPromise(result)) {
            Promise.resolve(result).catch((err) => {
                hook._logError(Rejection.normalize(err));
            });
        }
        return undefined;
    }
    /** @internal */
    static _logError(hook, error) {
        return hook?._logError(error);
    }
    /** @internal */
    static _rejectError(_hook, error) {
        const promise = Promise.reject(error);
        promise.catch(() => 0);
        return promise;
    }
    /** @internal */
    static _throwError(_hook, error) {
        throw error;
    }
    /** @internal */
    static _runAllHooks(hooks) {
        for (let i = 0; i < hooks.length; i++) {
            hooks[i]._invokeHook();
        }
    }
    /**
     * Creates one executable hook wrapper bound to a transition and state context.
     */
    constructor(transition, stateContext, registeredHook, options, exceptionHandler) {
        this._transition = transition;
        this._stateContext = stateContext;
        this._registeredHook = registeredHook;
        this._options = assign({}, defaultOptions, options);
        this._type = registeredHook._eventType;
        this._exceptionHandler = exceptionHandler;
    }
    /** @internal */
    _isSuperseded() {
        return (this._type._hookPhase === TransitionHookPhase._RUN &&
            !this._options._transition?.isActive());
    }
    /** @internal */
    _logError(err) {
        this._exceptionHandler(err);
    }
    /** @internal */
    _invokeCallback(hook) {
        const { _options } = this;
        return hook._callback.call(_options._bind, this._transition, this._stateContext);
    }
    /** @internal */
    _handleError(err) {
        return this._registeredHook._eventType._handleError(this, err);
    }
    /** @internal */
    _handleResult(result) {
        return this._registeredHook._eventType._handleResult(this, result);
    }
    /** @internal */
    async _handleAsyncResult(result) {
        try {
            return this._handleResult(await result);
        }
        catch (err) {
            return this._handleError(Rejection.normalize(err));
        }
    }
    /**
     * Executes the underlying hook callback and normalizes its result into
     * the router's rejection / redirect model.
     */
    _invokeHook() {
        const hook = this._registeredHook;
        if (hook._deregistered)
            return undefined;
        const notCurrent = this._getNotCurrentRejection();
        if (notCurrent)
            return notCurrent;
        try {
            const result = this._invokeCallback(hook);
            if (!this._type._synchronous && isPromise(result)) {
                return this._handleAsyncResult(result);
            }
            return this._handleResult(result);
        }
        catch (err) {
            return this._handleError(Rejection.normalize(err));
        }
        finally {
            if (hook._invokeLimit && ++hook._invokeCount >= hook._invokeLimit) {
                hook._deregister();
            }
        }
    }
    /**
     * Converts raw hook return values into transition outcomes.
     */
    _handleHookResult(result) {
        const notCurrent = this._getNotCurrentRejection();
        if (notCurrent)
            return notCurrent;
        if (isPromise(result)) {
            return this._handleAsyncHookResult(Promise.resolve(result));
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
    async _handleAsyncHookResult(result) {
        return this._handleHookResult(await result);
    }
    /** @internal */
    _getNotCurrentRejection() {
        if (this._transition._aborted) {
            return Rejection.aborted()._toPromise();
        }
        if (this._isSuperseded()) {
            return Rejection.superseded(this._options._current())._toPromise();
        }
        return undefined;
    }
    toString() {
        const { _options, _registeredHook } = this;
        const event = _options._hookType || "internal";
        const target = _options._target;
        const context = target?.state?.name || target?.name || "unknown";
        const name = fnToString(_registeredHook._callback);
        return `${event} context: ${context}, ${maxLength(200, name)}`;
    }
}

export { TransitionHook, TransitionHookPhase };
