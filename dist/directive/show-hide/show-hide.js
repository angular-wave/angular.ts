import { _injector } from '../../injection-tokens.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';

const NG_HIDE_CLASS = "ng-hide";
const NG_HIDE_IN_PROGRESS_CLASS = "ng-hide-animate";
ngShowDirective.$inject = [_injector];
/**
 * Removes the `ng-hide` class when the watched expression becomes truthy.
 */
function ngShowDirective($injector) {
    const getAnimate = createLazyAnimate($injector);
    return {
        restrict: "A",
        link(scope, element, $attr) {
            const expression = $attr.ngShow;
            if (typeof expression !== "string") {
                return;
            }
            scope.$watch(expression, (value) => {
                // we're adding a temporary, animation-specific class for ng-hide since this way
                // we can control when the element is actually displayed on screen without having
                // to have a global/greedy CSS selector that breaks when other animations are run.
                // Read: https://github.com/angular/angular.ts/issues/9103#issuecomment-58335845
                const animate = getAnimateForNode(getAnimate, element);
                if (animate) {
                    animate[value ? "removeClass" : "addClass"](element, NG_HIDE_CLASS, {
                        tempClasses: NG_HIDE_IN_PROGRESS_CLASS,
                    });
                }
                else {
                    if (value) {
                        element.classList.remove(NG_HIDE_CLASS);
                    }
                    else {
                        element.classList.add(NG_HIDE_CLASS);
                    }
                }
            });
        },
    };
}
ngHideDirective.$inject = [_injector];
/**
 * Adds the `ng-hide` class when the watched expression becomes truthy.
 */
function ngHideDirective($injector) {
    const getAnimate = createLazyAnimate($injector);
    return {
        restrict: "A",
        link(scope, element, attr) {
            const expression = attr.ngHide;
            if (typeof expression !== "string") {
                return;
            }
            scope.$watch(expression, (value) => {
                // The comment inside of the ngShowDirective explains why we add and
                // remove a temporary class for the show/hide animation
                const animate = getAnimateForNode(getAnimate, element);
                if (animate) {
                    animate[value ? "addClass" : "removeClass"](element, NG_HIDE_CLASS, {
                        tempClasses: NG_HIDE_IN_PROGRESS_CLASS,
                    });
                }
                else {
                    if (value) {
                        element.classList.add(NG_HIDE_CLASS);
                    }
                    else {
                        element.classList.remove(NG_HIDE_CLASS);
                    }
                }
            });
        },
    };
}

export { ngHideDirective, ngShowDirective };
