/**
 *
 * @param {ng.TemplateRequestService} $templateRequest
 * @param {import("../../services/anchor-scroll/anchor-scroll.js").AnchorScrollFunction} $anchorScroll
 * @param {ng.AnimateService} $animate
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @returns {ng.Directive}
 */
export function ngIncludeDirective(
  $templateRequest: ng.TemplateRequestService,
  $anchorScroll: import("../../services/anchor-scroll/anchor-scroll.js").AnchorScrollFunction,
  $animate: ng.AnimateService,
  $exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive;
export namespace ngIncludeDirective {
  let $inject: string[];
}
/**
 * @param {ng.CompileService} $compile
 * @returns {import("../../interface.ts").Directive}
 */
export function ngIncludeFillContentDirective(
  $compile: ng.CompileService,
): import("../../interface.ts").Directive;
export namespace ngIncludeFillContentDirective {
  let $inject_1: string[];
  export { $inject_1 as $inject };
}
