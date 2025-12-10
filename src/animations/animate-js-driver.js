import { $injectTokens, provider } from "../injection-tokens.js";
import { AnimateRunner } from "./runner/animate-runner.js";

AnimateJsDriverProvider.$inject = provider([$injectTokens._animation]);
export function AnimateJsDriverProvider($$animationProvider) {
  $$animationProvider.drivers.push($injectTokens._animateJsDriver);
  this.$get = [
    $injectTokens._animateJs,
    /**
     *
     * @param {*} $$animateJs
     */
    function ($$animateJs) {
      return function initDriverFn(animationDetails) {
        if (animationDetails.from && animationDetails.to) {
          const fromAnimation = prepareAnimation(animationDetails.from);

          const toAnimation = prepareAnimation(animationDetails.to);

          if (!fromAnimation && !toAnimation) return undefined;

          return {
            start() {
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

              function done(status) {
                runner.complete(status);
              }
            },
          };
        }

        return prepareAnimation(animationDetails);
      };

      function prepareAnimation(animationDetails) {
        // TODO(matsko): make sure to check for grouped animations and delegate down to normal animations
        const { element, event, options, classes } = animationDetails;

        return $$animateJs(element, event, classes, options);
      }
    },
  ];
}
