import { isFunction, isInstanceOf, isString } from '../../shared/utils.js';
import { TargetState } from '../state/target-state.js';

/**
 * Registers support for state-level `redirectTo` declarations and converts
 * their results into target states.
 */
const registerRedirectToHook = (transitionService, stateService) => {
    const redirectToHook = (trans) => {
        const redirect = trans.to().redirectTo;
        if (!redirect)
            return undefined;
        const $state = stateService;
        function handleResult(result) {
            if (!result)
                return undefined;
            if (isInstanceOf(result, TargetState)) {
                return result;
            }
            if (isString(result)) {
                return $state.target(result, trans.params(), trans.options());
            }
            if (result.state || result.params) {
                return $state.target(result.state || trans.to(), result.params || trans.params(), trans.options());
            }
            return undefined;
        }
        if (isFunction(redirect)) {
            return Promise.resolve(redirect(trans)).then(handleResult);
        }
        return handleResult(redirect);
    };
    return transitionService.onStart({
        to: (state) => !!state.redirectTo,
    }, redirectToHook);
};

export { registerRedirectToHook };
