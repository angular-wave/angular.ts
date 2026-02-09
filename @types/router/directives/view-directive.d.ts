/**
 * @param {ng.ViewService} $view
 * @param {ng.AnimateService} $animate
 * @param {ng.AnchorScrollService} $anchorScroll
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export function ViewDirective(
  $view: ng.ViewService,
  $animate: ng.AnimateService,
  $anchorScroll: ng.AnchorScrollService,
  $interpolate: ng.InterpolateService,
): ng.Directive;
export namespace ViewDirective {
  let $inject: string[];
}
/**
 * @param {ng.CompileService} $compile
 * @param {ng.ControllerService} $controller
 * @param {ng.TransitionService} $transitions
 * @return {ng.Directive}
 */
export function ViewDirectiveFill(
  $compile: ng.CompileService,
  $controller: ng.ControllerService,
  $transitions: ng.TransitionService,
): ng.Directive;
export namespace ViewDirectiveFill {
  let $inject_1: string[];
  export { $inject_1 as $inject };
}
