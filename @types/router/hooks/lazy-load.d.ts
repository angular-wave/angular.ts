/**
 * A [[TransitionHookFn]] that performs lazy loading
 *
 * When entering a state "abc" which has a `lazyLoad` function defined:
 * - Invoke the `lazyLoad` function (unless it is already in process)
 *   - Flag the hook function as "in process"
 *   - The function should return a promise (that resolves when lazy loading is complete)
 * - Wait for the promise to settle
 *   - If the promise resolves to a [[LazyLoadResult]], then register those states
 *   - Flag the hook function as "not in process"
 * - If the hook was successful
 *   - Remove the `lazyLoad` function from the state declaration
 * - If all the hooks were successful
 *   - Retry the transition (by returning a TargetState)
 *
 * ```
 * .state('abc', {
 *   component: 'fooComponent',
 *   lazyLoad: () => import('./fooComponent')
 *   });
 * ```
 *
 * See [[StateDeclaration.lazyLoad]]
 * @param {ng.TransitionService} transitionService
 * @param {ng.StateService} stateService
 * @param {ng.UrlService} urlService
 * @param {ng.StateRegistryService | undefined} [stateRegistry]
 */
export function registerLazyLoadHook(
  transitionService: ng.TransitionService,
  stateService: ng.StateService,
  urlService: ng.UrlService,
  stateRegistry?: ng.StateRegistryService | undefined,
): import("../transition/interface.ts").DeregisterFn;
/**
 * Invokes a state's lazy load function
 * @param {ng.Transition} transition a Transition context
 * @param {import("../state/interface.ts").StateDeclaration} state the state to lazy load
 * @param {ng.StateRegistryService | undefined} [stateRegistry]
 * @return {Promise<import("../state/interface.ts").LazyLoadResult | undefined>} a promise for the lazy load result
 */
export function lazyLoadState(
  transition: ng.Transition,
  state: import("../state/interface.ts").StateDeclaration,
  stateRegistry?: ng.StateRegistryService | undefined,
): Promise<import("../state/interface.ts").LazyLoadResult | undefined>;
