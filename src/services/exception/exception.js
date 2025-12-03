/**
 * Unified exception handler used throughout AngularTS.
 *
 * This service receives uncaught exceptions from both synchronous and asynchronous operations.
 * Its purpose is to provide a central point through which the framework
 * processes errors.
 *
 * By default, `$exceptionHandler` simply rethrows the exception. This ensures fail-fast
 * behavior, making errors visible immediately in development and in unit tests.
 * Applications may override this service to introduce custom error handling.
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

/**
 * Provider for the `$exceptionHandler` service.
 *
 * The default implementation rethrows exceptions, enabling strict fail-fast behavior.
 * Applications may replace the handler via by setting `errorHandler`property or by providing their own
 * `$exceptionHandler` factory.
 */
export class ExceptionHandlerProvider {
  constructor() {
    /** @type {ng.ExceptionHandlerService} */
    this.handler = (exception) => {
      throw exception;
    };
  }

  /**
   * @returns {ng.ExceptionHandlerService}
   */
  $get() {
    return (exception) => this.handler(exception);
  }
}
