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
 *   .module('app')
 *   .factory('$exceptionHandler', function(myLogger) {
 *     return function handleError(error) {
 *       myLogger.capture(error);
 *       // Rethrow to preserve fail-fast behavior:
 *       throw error;
 *     };
 *   });
 * ```
 *
 * IMPORTANT: custom implementation should always rethrow the error as the framework assumes that `$exceptionHandler` always does the throwing.
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
