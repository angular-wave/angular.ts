import { $injectTokens as $t } from "../injection-tokens.js";

$IsStateFilter.$inject = [$t._state];

/**
 * `isState` Filter: truthy if the current state is the parameter
 *
 * Translates to [[StateService.is]] `$state.is("stateName")`.
 *
 * #### Example:
 * ```html
 * <div ng-if="'stateName' | isState">show if state is 'stateName'</div>
 * ```
 *
 * @param {import('./state/state-service.js').StateProvider} $state
 * @returns {ng.FilterFn}
 */
export function $IsStateFilter($state) {
  const isFilter = (state, params, options) =>
    $state.is(state, params, options);

  isFilter.$stateful = true;

  return isFilter;
}

$IncludedByStateFilter.$inject = [$t._state];

/**
 * `includedByState` Filter: truthy if the current state includes the parameter
 *
 * Translates to [[StateService.includes]]` $state.is("fullOrPartialStateName")`.
 *
 * #### Example:
 * ```html
 * <div ng-if="'fullOrPartialStateName' | includedByState">show if state includes 'fullOrPartialStateName'</div>
 * ```
 *
 * @param {import('./state/state-service.js').StateProvider} $state
 * @returns {ng.FilterFn}
 */
export function $IncludedByStateFilter($state) {
  const includesFilter = function (state, params, options) {
    return $state.includes(state, params, options);
  };

  includesFilter.$stateful = true;

  return includesFilter;
}
