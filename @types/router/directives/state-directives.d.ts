export function $StateRefDirective(
  $stateService: any,
  $stateRegistry: any,
  $transitions: any,
): {
  restrict: string;
  require: string[];
  link: (scope: any, element: any, attrs: any, ngSrefActive: any) => void;
};
export namespace $StateRefDirective {
  let $inject: string[];
}
/**
 * @param $state
 * @param $stateRegistry
 * @param $transitions
 * @returns {ng.Directive}
 */
export function $StateRefDynamicDirective(
  $state: any,
  $stateRegistry: any,
  $transitions: any,
): ng.Directive;
export namespace $StateRefDynamicDirective {
  let $inject_1: string[];
  export { $inject_1 as $inject };
}
/**
 * @param {*} $state
 * @param {import('../router.js').RouterProvider} $router
 * @param {ng.InterpolateService} $interpolate
 * @param {*} $stateRegistry
 * @param {*} $transitions
 * @returns {ng.Directive}
 */
export function $StateRefActiveDirective(
  $state: any,
  $router: import("../router.js").RouterProvider,
  $interpolate: ng.InterpolateService,
  $stateRegistry: any,
  $transitions: any,
): ng.Directive;
export namespace $StateRefActiveDirective {
  let $inject_2: string[];
  export { $inject_2 as $inject };
}
