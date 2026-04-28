import { isFunction, isInstanceOf, isString } from "../../shared/utils.ts";
import { TargetState } from "../state/target-state.ts";
import type { BuiltStateDeclaration } from "../state/interface.ts";
import type { StateProvider } from "../state/state-service.ts";
import type { TransitionService } from "../transition/transition-service.ts";
import type { Transition } from "../transition/transition.ts";

/**
 * Registers support for state-level `redirectTo` declarations and converts
 * their results into target states.
 */
export const registerRedirectToHook = (
  transitionService: TransitionService,
  stateService: StateProvider,
) => {
  const redirectToHook = (trans: Transition) => {
    const redirect = trans.to().redirectTo;

    if (!redirect) return undefined;
    const $state = stateService;

    function handleResult(result: any) {
      if (!result) return undefined;

      if (isInstanceOf(result, TargetState)) {
        return result;
      }

      if (isString(result)) {
        return $state.target(result, trans.params(), trans.options());
      }

      if ((result as any).state || result.params) {
        return $state.target(
          (result as any).state || trans.to(),
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

  return transitionService.onStart(
    {
      to: (state) => !!(state as BuiltStateDeclaration).redirectTo,
    },
    redirectToHook,
  );
};
