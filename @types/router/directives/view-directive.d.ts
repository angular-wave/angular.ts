/**
 * @param {ng.ViewService} $view
 * @param {ng.AnimateService} $animate
 * @param {*} $viewScroll
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export function $ViewDirective(
  $view: ng.ViewService,
  $animate: ng.AnimateService,
  $viewScroll: any,
  $interpolate: ng.InterpolateService,
): ng.Directive;
export namespace $ViewDirective {
  let $inject: string[];
}
export function $ViewDirectiveFill(
  $compile: any,
  $controller: any,
  $transitions: any,
): {
  priority: number;
  compile(tElement: any): (scope: any, $element: any) => void;
};
export namespace $ViewDirectiveFill {
  let $inject_1: string[];
  export { $inject_1 as $inject };
}
