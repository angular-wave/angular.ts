/**
 * @returns {ng.Directive}
 */
export function ngBindDirective(): ng.Directive;
/**
 * @returns {ng.Directive}
 */
export function ngBindTemplateDirective(): ng.Directive;
/**
 * @param {ng.ParseService} $parse
 * @returns {ng.Directive}
 */
export function ngBindHtmlDirective($parse: ng.ParseService): ng.Directive;
export namespace ngBindHtmlDirective {
  let $inject: string[];
}
