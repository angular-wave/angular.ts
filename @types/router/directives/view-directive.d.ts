/**
 * @param {ng.ViewService} $view
 * @param {ng.AnimateService} $animate
 * @param {ng.AnchorScrollService} $anchorScroll
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export declare function ViewDirective(
  $view: ng.ViewService,
  $animate: ng.AnimateService,
  $anchorScroll: ng.AnchorScrollService,
  $interpolate: ng.InterpolateService,
): ng.Directive;
export declare namespace ViewDirective {
  var $inject: ("$anchorScroll" | "$animate" | "$interpolate" | "$view")[];
}
/**
 * @param {ng.CompileService} $compile
 * @param {ng.ControllerService} $controller
 * @param {ng.TransitionService} $transitions
 * @return {ng.Directive}
 */
export declare function ViewDirectiveFill(
  $compile: ng.CompileService,
  $controller: ng.ControllerService,
  $transitions: ng.TransitionService,
): ng.Directive;
export declare namespace ViewDirectiveFill {
  var $inject: ("$compile" | "$controller" | "$transitions")[];
}
