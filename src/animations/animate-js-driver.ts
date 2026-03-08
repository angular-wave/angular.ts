import { $injectTokens } from "../injection-tokens.ts";
import { AnimateRunner } from "./runner/animate-runner.ts";
import type { AnimateJsFn, AnimationDetails, Animator } from "./interface.ts";

AnimateJsDriverProvider.$inject = ["$$animationProvider"];

/**
 * @param {import("./animation.ts").AnimationProvider} $$animationProvider
 */
export function AnimateJsDriverProvider(
  this: {
    $get: [
      string,
      (
        $$animateJs: AnimateJsFn,
      ) => (animationDetails: AnimationDetails) => Animator | undefined,
    ];
  },
  $$animationProvider: { _drivers: string[] },
): void {
  $$animationProvider._drivers.push($injectTokens._animateJsDriver);
  this.$get = [
    $injectTokens._animateJs,
    /**
     *
     * @param {import("./interface.ts").AnimateJsFn} $$animateJs
     */
    function ($$animateJs: AnimateJsFn) {
      /**
       * @param {import("./interface.ts").AnimationDetails} animationDetails
       */
      function initDriverFn(
        animationDetails: AnimationDetails,
      ): Animator | undefined {
        if (animationDetails.from && animationDetails.to) {
          const fromAnimation = prepareAnimation(animationDetails.from);

          const toAnimation = prepareAnimation(animationDetails.to);

          if (!fromAnimation && !toAnimation) return undefined;

          return {
            start() {
              const animationRunners: Array<AnimateRunner> = [];

              if (fromAnimation) {
                animationRunners.push(fromAnimation.start());
              }

              if (toAnimation) {
                animationRunners.push(toAnimation.start());
              }

              AnimateRunner._all(animationRunners, done);

              const runner = new AnimateRunner({
                end: endFnFactory(),
                cancel: endFnFactory(),
              });

              return runner;

              function endFnFactory() {
                return function () {
                  animationRunners.forEach((x) => {
                    // at this point we cannot cancel animations for groups just yet. 1.5+
                    x.end();
                  });
                };
              }

              /**
               * @param {boolean} status
               */
              function done(status: boolean) {
                runner.complete(status);
              }
            },
          } as unknown as Animator;
        }

        return prepareAnimation(animationDetails);
      }

      /**
       * @param {import("./interface.ts").AnimationDetails} animationDetails
       * @return {import("./interface.ts").Animator | undefined}
       */
      function prepareAnimation(
        animationDetails: AnimationDetails,
      ): Animator | undefined {
        // TODO(matsko): make sure to check for grouped animations and delegate down to normal animations
        const { element, event, options, classes } = animationDetails;

        return $$animateJs(element, event, classes, options);
      }

      return initDriverFn;
    },
  ];
}
