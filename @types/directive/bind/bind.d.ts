/**
 * @returns {ng.Directive}
 */
export function ngBindDirective(): ng.Directive;
/**
 * @returns {import('../../interface.ts').Directive}
 */
export function ngBindTemplateDirective(): import("../../interface.ts").Directive;
/**
 * @param {import('../../core/parse/interface.ts').ParseService} $parse
 * @returns {import('../../interface.ts').Directive}
 */
export function ngBindHtmlDirective(
  $parse: import("../../core/parse/interface.ts").ParseService,
): import("../../interface.ts").Directive;
export namespace ngBindHtmlDirective {
  let $inject: string[];
}
