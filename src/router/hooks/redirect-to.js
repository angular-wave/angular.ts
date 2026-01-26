import { isFunction, isString } from "../../shared/utils.js";
import { TargetState } from "../state/target-state";

export const registerRedirectToHook = (
  /** @type {ng.TransitionService} */ transitionService,
  /** @type {ng.StateService} */ stateService,
) => {
  /**
   * A [[TransitionHookFn]] that redirects to a different state or params
   *
   * Registered using `transitionService.onStart({ to: (state) => !!state.redirectTo }, redirectHook);`
   *
   * See [[StateDeclaration.redirectTo]]
   */
  const redirectToHook = (/** @type {ng.Transition} */ trans) => {
    const redirect = trans.to().redirectTo;

    if (!redirect) return undefined;
    const $state = stateService;

    /**
     * @param {any} result
     */
    function handleResult(result) {
      if (!result) return undefined;

      if (result instanceof TargetState) {
        return result;
      }

      if (isString(result)) {
        return $state.target(result, trans.params(), trans.options());
      }

      if (/** @type {any} */ (result).state || result.params) {
        return $state.target(
          /** @type {any} */ (result).state || trans.to(),
          result.params || trans.params(),
          trans.options(),
        );
      }

      return undefined;
    }

    if (isFunction(redirect)) {
      return Promise.resolve(redirect(trans)).then(handleResult);
    }

    return handleResult(redirect);
  };

  transitionService.onStart(
    {
      to: (state) =>
        !!(/** @type {ng.BuiltStateDeclaration} */ (state).redirectTo),
    },
    redirectToHook,
  );
};
