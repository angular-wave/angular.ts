/**
 * @param {ng.StateService} $stateService
 * @param {ng.StateRegistryService} $stateRegistry
 * @param {ng.TransitionService} $transitions
 * @returns {ng.Directive}
 */
export function $StateRefDirective(
  $stateService: ng.StateService,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
): ng.Directive;
export namespace $StateRefDirective {
  let $inject: string[];
}
/**
 * @param {ng.StateService} $state
 * @param {ng.StateRegistryService} $stateRegistry
 * @param {ng.TransitionService} $transitions
 * @returns {ng.Directive}
 */
export function $StateRefDynamicDirective(
  $state: ng.StateService,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
): ng.Directive;
export namespace $StateRefDynamicDirective {
  let $inject_1: string[];
  export { $inject_1 as $inject };
}
/**
 * @param {ng.StateService} $state
 * @param {ng.RouterService} $router
 * @param {ng.InterpolateService} $interpolate
 * @param {ng.StateRegistryService} $stateRegistry
 * @param {ng.TransitionService} $transitions
 * @returns {ng.Directive}
 */
export function $StateRefActiveDirective(
  $state: ng.StateService,
  $router: ng.RouterService,
  $interpolate: ng.InterpolateService,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
): ng.Directive;
export namespace $StateRefActiveDirective {
  let $inject_2: string[];
  export { $inject_2 as $inject };
}
