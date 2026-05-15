import { getNormalizedAttr } from '../../shared/dom.js';
import { keys } from '../../shared/utils.js';

/**
 * Watches an expression and applies the resulting CSS properties to the element.
 */
function ngStyleDirective() {
    return {
        restrict: "A",
        link(scope, element) {
            const expression = getNormalizedAttr(element, "ngStyle");
            if (expression === undefined) {
                return;
            }
            let oldStyles = null;
            scope.$watch(expression, (newStyles) => {
                const target = newStyles?.$target ?? newStyles;
                if (oldStyles) {
                    keys(oldStyles).forEach((key) => {
                        element.style.removeProperty(key);
                    });
                }
                if (!target) {
                    oldStyles = null;
                    return;
                }
                const nextStyles = {};
                keys(target).forEach((key) => {
                    const value = target[key];
                    element.style.setProperty(key, value);
                    nextStyles[key] = value;
                });
                oldStyles = nextStyles;
            });
        },
    };
}

export { ngStyleDirective };
