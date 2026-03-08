export declare const ngEventDirectives: Record<string, ng.Injectable<any>>;
/**
 *
 * @param {ng.ParseService} $parse
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @param {string} directiveName
 * @param {string} eventName
 * @returns {ng.Directive}
 */
export declare function createEventDirective(
  $parse: ng.ParseService,
  $exceptionHandler: ng.ExceptionHandlerService,
  directiveName: string,
  eventName: string,
): ng.Directive;
/**
 *
 * @param {ng.ParseService} $parse
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @param {ng.WindowService} $window
 * @param {string} directiveName
 * @param {string} eventName
 * @returns {ng.Directive}
 */
export declare function createWindowEventDirective(
  $parse: ng.ParseService,
  $exceptionHandler: ng.ExceptionHandlerService,
  $window: Window,
  directiveName: string,
  eventName: string,
): ng.Directive;
