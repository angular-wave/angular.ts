import type { TransitionService } from "../transition/interface.ts";
import type { Transition } from "../transition/transition.ts";
import type { ViewConfig } from "../state/views.ts";

const loadEnteringViews = (transition: Transition) => {
  const enteringViews = transition.views("entering");

  if (!enteringViews.length) return undefined;

  return Promise.all(
    enteringViews.map((view: ViewConfig) => Promise.resolve(view.load())),
  ).then(() => {
    /* empty */
  });
};

export const registerLoadEnteringViews = (
  transitionService: TransitionService,
) => transitionService.onFinish({}, loadEnteringViews);

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
