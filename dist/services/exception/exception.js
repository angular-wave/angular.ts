/**
 * Unified exception handler used throughout AngularTS.
 *
 * This service receives uncaught exceptions from both synchronous and asynchronous operations.
 * Its purpose is to provide a central point through which the framework
 * processes errors.
 *
 * By default, `$exceptionHandler` simply rethrows the exception. This ensures fail-fast
 * behavior, making errors visible immediately in development and in unit tests.
 * Applications may configure or decorate this service to introduce custom
 * error handling.
 *
 * ### Example: Custom `$exceptionHandler`
 *
 * ```js
 * angular
 *   .createModule('app')
 *   .factory('$exceptionHandler', ['myLogger', function(myLogger) {
 *     return function handleError(error) {
 *       myLogger.capture(error);
 *       // Rethrow to preserve fail-fast behavior:
 *       throw error;
 *     };
 *   }]);
 * ```
 *
 * IMPORTANT: custom implementation should always rethrow the error as the framework assumes that `$exceptionHandler` always does the throwing.
 *
 * AngularTS reports exceptions here when they escape framework-owned detached
 * work, including DOM events, browser transport events, timers, subscriptions,
 * and lifecycle callbacks. Synchronous public API validation throws directly,
 * and promise-returning operations reject their returned promise so callers can
 * handle the failure at the operation boundary.
 *
 * ### Manual Invocation
 *
 * You can invoke the exception handler directly when catching errors in your own code:
 *
 * ```js
 * try {
 *   riskyOperation();
 * } catch (err) {
 *   $exceptionHandler(err);
 * }
 * ```
 *
 * @see {@link ng.ExceptionHandlerService} ExceptionHandlerService
 */
function rethrowException(exception) {
    throw exception;
}
/** @internal */
function createExceptionHandlerRuntimeState() {
    const state = {
        handler: rethrowException,
        service: undefined,
        destroyed: false,
    };
    state.service = (exception) => {
        if (state.destroyed) {
            throw new Error("Exception handler runtime has already been disposed.");
        }
        return state.handler(exception);
    };
    return state;
}
/** @internal */
function applyExceptionHandlerConfiguration(state, config) {
    if (state.destroyed) {
        throw new Error("Exception handler runtime has already been disposed.");
    }
    if (config.handler !== undefined) {
        if (typeof config.handler !== "function") {
            throw new TypeError("$exceptionHandler handler must be a function.");
        }
        state.handler = config.handler;
    }
}
/** @internal */
function createExceptionHandlerService(state) {
    if (state.destroyed) {
        throw new Error("Exception handler runtime has already been disposed.");
    }
    return state.service;
}
/** @internal */
function destroyExceptionHandlerRuntimeState(state) {
    if (state.destroyed)
        return;
    state.destroyed = true;
    state.handler = rethrowException;
}

export { applyExceptionHandlerConfiguration, createExceptionHandlerRuntimeState, createExceptionHandlerService, destroyExceptionHandlerRuntimeState };
