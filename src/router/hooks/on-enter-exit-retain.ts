import type {
  TransitionStateHookFn,
  TransitionService,
} from "../transition/interface.ts";

/**
 * Adapts `onEnter`, `onExit`, and `onRetain` state declaration callbacks
 * into transition hook functions.
 */
function makeEnterExitRetainHook(
  hookName: "onEnter" | "onExit" | "onRetain",
): TransitionStateHookFn {
  return (transition, state) => {
    const _state = (state._state && state._state()) as Record<string, any>;
    const hookFn = _state[hookName];

    return hookFn(transition, state);
  };
}

const onExitHook = makeEnterExitRetainHook("onExit");
const onRetainHook = makeEnterExitRetainHook("onRetain");
const onEnterHook = makeEnterExitRetainHook("onEnter");

/**
 * Registers state `onExit` callbacks.
 */
export const registerOnExitHook = (transitionService: TransitionService) =>
  transitionService.onExit(
    {
      exiting: (state) => !!(state as ng.BuiltStateDeclaration).onExit,
    },
    onExitHook,
  );

/**
 * Registers state `onRetain` callbacks.
 */
export const registerOnRetainHook = (transitionService: TransitionService) =>
  transitionService.onRetain(
    {
      retained: (state) => !!(state as ng.BuiltStateDeclaration).onRetain,
    },
    onRetainHook,
  );

/**
 * Registers state `onEnter` callbacks.
 */
export const registerOnEnterHook = (transitionService: TransitionService) =>
  transitionService.onEnter(
    {
      entering: (state) => !!(state as ng.BuiltStateDeclaration).onEnter,
    },
    onEnterHook,
  );
