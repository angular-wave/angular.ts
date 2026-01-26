/**
 * A factory which creates an onEnter, onExit or onRetain transition hook function
 *
 * The returned function invokes the (for instance) state.onEnter hook when the
 * state is being entered.
 * @param {string} hookName
 * @return {import("../transition/interface").TransitionStateHookFn}
 */
function makeEnterExitRetainHook(hookName) {
  return (transition, state) => {
    const _state = /** @type Record<string, any> */ (state._state());

    const hookFn = _state[hookName];

    return hookFn(transition, state);
  };
}
/**
 * The [[TransitionStateHookFn]] for onExit
 *
 * When the state is being exited, the state's .onExit function is invoked.
 *
 * Registered using `transitionService.onExit({ exiting: (state) => !!state.onExit }, onExitHook);`
 *
 * See: [[HookRegistry.onExit]]
 */
const onExitHook = makeEnterExitRetainHook("onExit");

export const registerOnExitHook = (
  /** @type {ng.TransitionService} */ transitionService,
) =>
  transitionService.onExit(
    {
      exiting: (state) =>
        !!(/** @type {ng.BuiltStateDeclaration} */ (state).onExit),
    },
    onExitHook,
  );
/**
 * The [[TransitionStateHookFn]] for onRetain
 *
 * When the state was already entered, and is not being exited or re-entered, the state's .onRetain function is invoked.
 *
 * Registered using `transitionService.onRetain({ retained: (state) => !!state.onRetain }, onRetainHook);`
 *
 * See: [[HookRegistry.onRetain]]
 */
const onRetainHook = makeEnterExitRetainHook("onRetain");

export const registerOnRetainHook = (
  /** @type {ng.TransitionService} */ transitionService,
) =>
  transitionService.onRetain(
    {
      retained: (state) =>
        !!(/** @type {ng.BuiltStateDeclaration} */ (state).onRetain),
    },
    onRetainHook,
  );
/**
 * The [[TransitionStateHookFn]] for onEnter
 *
 * When the state is being entered, the state's .onEnter function is invoked.
 *
 * Registered using `transitionService.onEnter({ entering: (state) => !!state.onEnter }, onEnterHook);`
 *
 * See: [[HookRegistry.onEnter]]
 */
const onEnterHook = makeEnterExitRetainHook("onEnter");

export const registerOnEnterHook = (
  /** @type {ng.TransitionService} */ transitionService,
) =>
  transitionService.onEnter(
    {
      entering: (state) =>
        !!(/** @type {ng.BuiltStateDeclaration} */ (state).onEnter),
    },
    onEnterHook,
  );
