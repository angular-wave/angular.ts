import type {
  TransitionStateHookFn,
  TransitionService,
} from "../transition/interface.ts";

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

export const registerOnExitHook = (transitionService: TransitionService) =>
  transitionService.onExit(
    {
      exiting: (state) => !!(state as ng.BuiltStateDeclaration).onExit,
    },
    onExitHook,
  );

export const registerOnRetainHook = (transitionService: TransitionService) =>
  transitionService.onRetain(
    {
      retained: (state) => !!(state as ng.BuiltStateDeclaration).onRetain,
    },
    onRetainHook,
  );

export const registerOnEnterHook = (transitionService: TransitionService) =>
  transitionService.onEnter(
    {
      entering: (state) => !!(state as ng.BuiltStateDeclaration).onEnter,
    },
    onEnterHook,
  );
