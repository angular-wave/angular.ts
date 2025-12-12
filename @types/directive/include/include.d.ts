/**
 *
 * @param {ng.TemplateRequestService} $templateRequest
 * @param {ng.AnchorScrollService} $anchorScroll
 * @param {ng.AnimateService} $animate
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @returns {ng.Directive}
 */
export function ngIncludeDirective(
  $templateRequest: ng.TemplateRequestService,
  $anchorScroll: ng.AnchorScrollService,
  $animate: ng.AnimateService,
  $exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive;
export namespace ngIncludeDirective {
  let $inject: string[];
}
/**
 * @param {ng.CompileService} $compile
 * @returns {ng.Directive}
 */
export function ngIncludeFillContentDirective(
  $compile: ng.CompileService,
): ng.Directive;
export namespace ngIncludeFillContentDirective {
  let $inject_1: string[];
  export { $inject_1 as $inject };
}
