/**
 * @returns {ng.Directive}
 */
export function selectDirective(): ng.Directive;
/**
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export function optionDirective(
  $interpolate: ng.InterpolateService,
): ng.Directive;
export namespace optionDirective {
  let $inject: string[];
}
