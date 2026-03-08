/**
 * Mirrors an element's HTML content into an assignable scope expression.
 *
 * @param {ng.ParseService} $parse
 */
export declare function ngSetterDirective(
  $parse: ng.ParseService,
  $log: ng.LogService,
): ng.Directive;
export declare namespace ngSetterDirective {
  var $inject: ("$log" | "$parse")[];
}
