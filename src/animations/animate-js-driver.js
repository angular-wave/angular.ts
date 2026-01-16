import { $injectTokens, provider } from "../injection-tokens.js";
import { AnimateRunner } from "./runner/animate-runner.js";

AnimateJsDriverProvider.$inject = provider([$injectTokens._animation]);

/**
 * @param {import("./animation.js").AnimationProvider} $$animationProvider
 */
export function AnimateJsDriverProvider($$animationProvider) {
  $$animationProvider.drivers.push($injectTokens._animateJsDriver);
  this.$get = [
    $injectTokens._animateJs,
    /**
     *
     * @param {import("./interface.ts").AnimateJsFn} $$animateJs
     */
    function ($$animateJs) {
      /**
       * @param {import("./interface.ts").AnimationDetails} animationDetails
       */
      function initDriverFn(animationDetails) {
        if (animationDetails.from && animationDetails.to) {
          const fromAnimation = prepareAnimation(animationDetails.from);

          const toAnimation = prepareAnimation(animationDetails.to);

          if (!fromAnimation && !toAnimation) return undefined;

          return {
            start() {
              /** @type {Array<ng.AnimateRunner>} */
              const animationRunners = [];

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
              function done(status) {
                runner.complete(status);
              }
            },
          };
        }

        return prepareAnimation(animationDetails);
      }

      /**
       * @param {import("./interface.ts").AnimationDetails} animationDetails
       * @return {import("./interface.ts").Animator}
       */
      function prepareAnimation(animationDetails) {
        // TODO(matsko): make sure to check for grouped animations and delegate down to normal animations
        const { element, event, options, classes } = animationDetails;

        return $$animateJs(element, event, classes, options);
      }

      return initDriverFn;
    },
  ];
}
