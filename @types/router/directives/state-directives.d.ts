/**
 * @param {ng.StateService} $stateService
 * @param {ng.StateRegistryService} $stateRegistry
 * @param {ng.TransitionService} $transitions
 * @returns {ng.Directive}
 */
export declare function StateRefDirective(
  $stateService: ng.StateService,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
): ng.Directive;
export declare namespace StateRefDirective {
  var $inject: ("$state" | "$stateRegistry" | "$transitions")[];
}
/**
 * @param {ng.StateService} $state
 * @param {ng.StateRegistryService} $stateRegistry
 * @param {ng.TransitionService} $transitions
 * @returns {ng.Directive}
 */
export declare function StateRefDynamicDirective(
  $state: ng.StateService,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
): ng.Directive;
export declare namespace StateRefDynamicDirective {
  var $inject: ("$state" | "$stateRegistry" | "$transitions")[];
}
/**
 * @param {ng.StateService} $state
 * @param {ng.RouterService} $router
 * @param {ng.InterpolateService} $interpolate
 * @param {ng.StateRegistryService} $stateRegistry
 * @param {ng.TransitionService} $transitions
 * @returns {ng.Directive}
 */
export declare function StateRefActiveDirective(
  $state: ng.StateService,
  $router: ng.RouterService,
  $interpolate: ng.InterpolateService,
  $stateRegistry: ng.StateRegistryService,
  $transitions: ng.TransitionService,
): ng.Directive;
export declare namespace StateRefActiveDirective {
  var $inject: (
    | "$interpolate"
    | "$router"
    | "$state"
    | "$stateRegistry"
    | "$transitions"
  )[];
}
