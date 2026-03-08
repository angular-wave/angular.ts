/**
 * @returns {ng.Directive}
 */
export declare function ngBindDirective(): ng.Directive;
/**
 * @returns {ng.Directive}
 */
export declare function ngBindTemplateDirective(): ng.Directive;
/**
 * @param {ng.ParseService} $parse
 */
export declare function ngBindHtmlDirective(
  $parse: ng.ParseService,
): ng.Directive;
export declare namespace ngBindHtmlDirective {
  var $inject: "$parse"[];
}
