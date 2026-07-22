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

/**
 * A callback type for handling errors.
 *
 * @param exception - The exception associated with the error.
 * @throws {unknown}
 */
export type ExceptionHandler = (exception: unknown) => never;

/**
 * Declarative configuration accepted by
 * `NgModule.config({ $exceptionHandler: ... })`.
 */
export interface ExceptionHandlerConfig {
  /**
   * Handler used by `$exceptionHandler`.
   *
   * Custom handlers should rethrow after reporting because AngularTS treats
   * `$exceptionHandler` as fail-fast.
   */
  handler?: ExceptionHandler;
}

/**
 * Runtime state shared by the public service and early-composed framework
 * consumers such as the router.
 */
/** @internal */
export interface ExceptionHandlerRuntimeState {
  handler: ng.ExceptionHandlerService;
  service: ng.ExceptionHandlerService;
  destroyed: boolean;
}

function rethrowException(exception: unknown): never {
  throw exception;
}

/** @internal */
export function createExceptionHandlerRuntimeState(): ExceptionHandlerRuntimeState {
  const state = {
    handler: rethrowException,
    service: undefined as unknown as ng.ExceptionHandlerService,
    destroyed: false,
  };

  state.service = (exception: unknown): never => {
    if (state.destroyed) {
      throw new Error("Exception handler runtime has already been disposed.");
    }

    return state.handler(exception);
  };

  return state;
}

/** @internal */
export function applyExceptionHandlerConfiguration(
  state: ExceptionHandlerRuntimeState,
  config: ExceptionHandlerConfig,
): void {
  if (state.destroyed) {
    throw new Error("Exception handler runtime has already been disposed.");
  }

  if (config.handler !== undefined) {
    state.handler = config.handler;
  }
}

/** @internal */
export function createExceptionHandlerService(
  state: ExceptionHandlerRuntimeState,
): ng.ExceptionHandlerService {
  if (state.destroyed) {
    throw new Error("Exception handler runtime has already been disposed.");
  }

  return state.service;
}

/** @internal */
export function destroyExceptionHandlerRuntimeState(
  state: ExceptionHandlerRuntimeState,
): void {
  if (state.destroyed) return;

  state.destroyed = true;
  state.handler = rethrowException;
}
