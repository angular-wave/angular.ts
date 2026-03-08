/**
 *
 * @param {ng.TemplateRequestService} $templateRequest
 * @param {ng.AnchorScrollService} $anchorScroll
 * @param {ng.AnimateService} $animate
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @returns {ng.Directive}
 */
export declare function ngIncludeDirective(
  $templateRequest: ng.TemplateRequestService,
  $anchorScroll: ng.AnchorScrollService,
  $animate: ng.AnimateService,
  $exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive;
export declare namespace ngIncludeDirective {
  var $inject: (
    | "$anchorScroll"
    | "$animate"
    | "$exceptionHandler"
    | "$templateRequest"
  )[];
}
/**
 * @param {ng.CompileService} $compile
 * @returns {ng.Directive}
 */
export declare function ngIncludeFillContentDirective(
  $compile: ng.CompileService,
): ng.Directive;
export declare namespace ngIncludeFillContentDirective {
  var $inject: "$compile"[];
}
