/**
 * Injects named services from `$injector` onto the current scope.
 *
 * @param {ng.LogService} $log
 */
export declare function ngInjectDirective(
  $log: ng.LogService,
  $injector: ng.InjectorService,
): ng.Directive;
export declare namespace ngInjectDirective {
  var $inject: ("$log" | "$injector")[];
}
