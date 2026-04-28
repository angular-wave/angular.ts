/**
 * Adapts `onEnter`, `onExit`, and `onRetain` state declaration callbacks
 * into transition hook functions.
 */
function makeEnterExitRetainHook(hookName) {
    return (transition, state) => {
        const _state = (state._state && state._state());
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
const registerOnExitHook = (transitionService) => transitionService.onExit({
    exiting: (state) => !!state?.onExit,
}, onExitHook);
/**
 * Registers state `onRetain` callbacks.
 */
const registerOnRetainHook = (transitionService) => transitionService.onRetain({
    retained: (state) => !!state?.onRetain,
}, onRetainHook);
/**
 * Registers state `onEnter` callbacks.
 */
const registerOnEnterHook = (transitionService) => transitionService.onEnter({
    entering: (state) => !!state?.onEnter,
}, onEnterHook);

export { registerOnEnterHook, registerOnExitHook, registerOnRetainHook };
