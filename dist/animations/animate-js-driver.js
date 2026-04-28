import { _animateJsDriver, _animateJs } from '../injection-tokens.js';
import { AnimateRunner } from './runner/animate-runner.js';

AnimateJsDriverProvider.$inject = ["$$animationProvider"];
/** Registers the JS animation driver with the animation provider. */
function AnimateJsDriverProvider($$animationProvider) {
    const animationProvider = $$animationProvider;
    animationProvider._drivers.push(_animateJsDriver);
    this.$get = [
        _animateJs,
        /** Creates the runtime driver factory around `$$animateJs`. */
        function ($$animateJs) {
            function initDriverFn(animationDetails) {
                if (animationDetails.from && animationDetails.to) {
                    const fromAnimation = prepareAnimation(animationDetails.from);
                    const toAnimation = prepareAnimation(animationDetails.to);
                    if (!fromAnimation && !toAnimation)
                        return undefined;
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
            }
            function prepareAnimation(animationDetails) {
                // TODO(matsko): make sure to check for grouped animations and delegate down to normal animations
                const { element, event, options, classes } = animationDetails;
                return $$animateJs(element, event, classes, options);
            }
            return initDriverFn;
        },
    ];
}

export { AnimateJsDriverProvider };
