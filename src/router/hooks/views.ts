import type { TransitionService } from "../transition/transition-service.ts";
import type { Transition } from "../transition/transition.js";
import type { ViewConfig } from "../state/views.ts";

/**
 * Loads all view configs for entering states before view activation.
 */
const loadEnteringViews = (transition: Transition) => {
  const enteringViews = transition.views("entering");

  if (!enteringViews.length) return undefined;

  return Promise.all(
    enteringViews.map((view: ViewConfig) => Promise.resolve(view.load())),
  ).then(() => {
    /* empty */
  });
};

/**
 * Registers the entering-view load hook.
 */
export const registerLoadEnteringViews = (
  transitionService: TransitionService,
) => transitionService.onFinish({}, loadEnteringViews);

/**
 * Registers the hook that swaps active view configs after a successful transition.
 */
export const registerActivateViews = (
  transitionService: TransitionService,
  viewService: ng.ViewService,
) => {
  const activateViews = (transition: Transition) => {
    const enteringViews = transition.views("entering");
    const exitingViews = transition.views("exiting");

    if (!enteringViews.length && !exitingViews.length) return;

    exitingViews.forEach((vc: ViewConfig) =>
      viewService.deactivateViewConfig(vc),
    );
    enteringViews.forEach((vc: ViewConfig) => {
      viewService.activateViewConfig(vc);
    });
    viewService.sync();
  };

  return transitionService.onSuccess({}, activateViews);
};
