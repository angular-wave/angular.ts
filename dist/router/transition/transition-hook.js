import { isPromise } from '../../shared/predicates.js';
import { fnToString, maxLength } from '../../shared/strings.js';
import { assign, isInstanceOf } from '../../shared/utils.js';
import { TargetState } from '../state/target-state.js';
import { Rejection } from './reject-factory.js';

/**
 * Transition lifecycle phases used to group and order hook execution.
 */
const TransitionHookPhase = {
    _CREATE: 0,
    _BEFORE: 1,
    _RUN: 2,
    _SUCCESS: 3,
    _ERROR: 4,
};
/**
 * Declares whether a hook operates on a whole transition or on individual states.
 */
const TransitionHookScope = {
    _TRANSITION: 0,
    _STATE: 1,
};
const defaultOptions = {
    current: () => undefined,
    transition: null,
    bind: null,
};
/**
 * Runtime wrapper around one registered transition hook invocation.
 */
class TransitionHook {
    /**
     * Runs hooks in sequence, waiting for each async hook before invoking the next.
     */
    static chain(hooks, waitFor) {
        let promise = waitFor || Promise.resolve();
        for (let i = 0; i < hooks.length; i++) {
            const hook = hooks[i];
            promise = promise.then(() => hook.invokeHook());
        }
        return promise;
    }
    static invokeHooks(hooks, doneCallback) {
        for (let idx = 0; idx < hooks.length; idx++) {
            const hookResult = hooks[idx].invokeHook();
            if (isPromise(hookResult)) {
                const remainingHooks = hooks.slice(idx + 1);
                return TransitionHook.chain(remainingHooks, hookResult).then(() => {
                    doneCallback();
                });
            }
        }
        return doneCallback();
    }
    static runAllHooks(hooks) {
        for (let i = 0; i < hooks.length; i++) {
            hooks[i].invokeHook();
        }
    }
    /**
     * Creates one executable hook wrapper bound to a transition and state context.
     */
    constructor(transition, stateContext, registeredHook, options, exceptionHandler) {
        this.transition = transition;
        this.stateContext = stateContext;
        this.registeredHook = registeredHook;
        this.options = assign({}, defaultOptions, options);
        this._type = registeredHook._eventType;
        this.isSuperseded = () => this._type.hookPhase === TransitionHookPhase._RUN &&
            !this.options.transition?.isActive();
        this._exceptionHandler = exceptionHandler;
    }
    /**
     * Sends hook execution errors to the configured exception handler.
     */
    logError(err) {
        this._exceptionHandler(err);
    }
    /**
     * Executes the underlying hook callback and normalizes its result into
     * the router's rejection / redirect model.
     */
    invokeHook() {
        const hook = this.registeredHook;
        if (hook._deregistered)
            return undefined;
        const notCurrent = this.getNotCurrentRejection();
        if (notCurrent)
            return notCurrent;
        const { options } = this;
        const invokeCallback = () => hook.callback.call(options.bind, this.transition, this.stateContext);
        const normalizeErr = (err) => Rejection.normalize(err)._toPromise();
        const handleError = (err) => hook._eventType.getErrorHandler()(err);
        const handleResult = (result) => hook._eventType.getResultHandler(this)(result);
        try {
            const result = invokeCallback();
            if (!this._type.synchronous && isPromise(result)) {
                return result
                    .catch(normalizeErr)
                    .then(handleResult, handleError);
            }
            return handleResult(result);
        }
        catch (err) {
            return handleError(Rejection.normalize(err));
        }
        finally {
            if (hook.invokeLimit && ++hook.invokeCount >= hook.invokeLimit) {
                hook.deregister();
            }
        }
    }
    /**
     * Converts raw hook return values into transition outcomes.
     */
    handleHookResult(result) {
        const notCurrent = this.getNotCurrentRejection();
        if (notCurrent)
            return notCurrent;
        if (isPromise(result)) {
            return result.then((val) => this.handleHookResult(val));
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
    getNotCurrentRejection() {
        if (this.transition._aborted) {
            return Rejection.aborted()._toPromise();
        }
        if (this.isSuperseded()) {
            return Rejection.superseded(this.options.current())._toPromise();
        }
        return undefined;
    }
    toString() {
        const { options, registeredHook } = this;
        const event = options.hookType || "internal";
        const target = options.target;
        const context = target?.state?.name || target?.name || "unknown";
        const name = fnToString(registeredHook.callback);
        return `${event} context: ${context}, ${maxLength(200, name)}`;
    }
}
TransitionHook.HANDLE_RESULT =
    (hook) => (result) => hook.handleHookResult(result);
TransitionHook.LOG_REJECTED_RESULT =
    (hook) => (result) => {
        if (isPromise(result)) {
            result.catch((err) => hook.logError(Rejection.normalize(err)));
        }
        return undefined;
    };
TransitionHook.LOG_ERROR =
    (hook) => (error) => hook?.logError(error);
TransitionHook.REJECT_ERROR =
    () => (error) => {
        const promise = Promise.reject(error);
        promise.catch(() => 0);
        return promise;
    };
TransitionHook.THROW_ERROR =
    () => (error) => {
        throw error;
    };

export { TransitionHook, TransitionHookPhase, TransitionHookScope };
