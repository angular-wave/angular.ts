/**
 *
 * @param {ng.TemplateRequestService} $templateRequest
 * @param {import("../../services/anchor-scroll/anchor-scroll.js").AnchorScrollFunction} $anchorScroll
 * @param {ng.AnimateService} $animate
 * @param {import('../../services/exception/interface.ts').ErrorHandler} $exceptionHandler
 * @returns {import('../../interface.ts').Directive}
 */
export function ngIncludeDirective(
  $templateRequest: ng.TemplateRequestService,
  $anchorScroll: import("../../services/anchor-scroll/anchor-scroll.js").AnchorScrollFunction,
  $animate: ng.AnimateService,
  $exceptionHandler: import("../../services/exception/interface.ts").ErrorHandler,
): import("../../interface.ts").Directive;
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
