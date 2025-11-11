/**
 * @param {ng.LogService} $log
 * @param {ng.InjectorService} $injector
 * @returns {ng.Directive}
 */
export function ngInjectDirective(
  $log: ng.LogService,
  $injector: ng.InjectorService,
): ng.Directive;
export namespace ngInjectDirective {
  let $inject: string[];
}
