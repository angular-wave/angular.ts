/**
 * Removes the `ng-hide` class when the watched expression becomes truthy.
 *
 * @param {ng.AnimateService} $animate
 */
export declare function ngShowDirective(
  $animate: ng.AnimateService,
): ng.Directive;
export declare namespace ngShowDirective {
  var $inject: "$animate"[];
}
/**
 * Adds the `ng-hide` class when the watched expression becomes truthy.
 *
 * @param {ng.AnimateService} $animate
 */
export declare function ngHideDirective(
  $animate: ng.AnimateService,
): ng.Directive;
export declare namespace ngHideDirective {
  var $inject: "$animate"[];
}
