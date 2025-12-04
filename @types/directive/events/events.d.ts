/**
 *
 * @param {ng.ParseService} $parse
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @param {string} directiveName
 * @param {string} eventName
 * @returns {ng.Directive}
 */
export function createEventDirective(
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
export function createWindowEventDirective(
  $parse: ng.ParseService,
  $exceptionHandler: ng.ExceptionHandlerService,
  $window: ng.WindowService,
  directiveName: string,
  eventName: string,
): ng.Directive;
/**
 * @type {Record<string, ng.Injectable<any>>}
 */
export const ngEventDirectives: Record<string, ng.Injectable<any>>;
