/**
 * Loads all view configs for entering states before view activation.
 */
const loadEnteringViews = (transition) => {
    const enteringViews = transition.views("entering");
    if (!enteringViews.length)
        return undefined;
    return Promise.all(enteringViews.map((view) => Promise.resolve(view.load()))).then(() => {
        /* empty */
    });
};
/**
 * Registers the entering-view load hook.
 */
const registerLoadEnteringViews = (transitionService) => transitionService.onFinish({}, loadEnteringViews);
/**
 * Registers the hook that swaps active view configs after a successful transition.
 */
const registerActivateViews = (transitionService, viewService) => {
    const activateViews = (transition) => {
        const enteringViews = transition.views("entering");
        const exitingViews = transition.views("exiting");
        if (!enteringViews.length && !exitingViews.length)
            return;
        exitingViews.forEach((vc) => viewService._deactivateViewConfig(vc));
        enteringViews.forEach((vc) => {
            viewService._activateViewConfig(vc);
        });
        viewService._sync();
    };
    return transitionService.onSuccess({}, activateViews);
};

export { registerActivateViews, registerLoadEnteringViews };
