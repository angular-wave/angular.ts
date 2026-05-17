import { _attributes } from '../../injection-tokens.js';
import { keys } from '../../shared/utils.js';

ngStyleDirective.$inject = [_attributes];
/**
 * Watches an expression and applies the resulting CSS properties to the element.
 */
function ngStyleDirective($attributes) {
    return {
        restrict: "A",
        link(scope, element) {
            const expression = $attributes.read(element, "ngStyle");
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
