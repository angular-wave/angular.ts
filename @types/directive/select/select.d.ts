/**
 * @returns {import('../../interface.ts').Directive}
 */
export function selectDirective(): import("../../interface.ts").Directive;
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
