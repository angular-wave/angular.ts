import { keys } from '../../shared/utils.js';

/**
 * Watches an expression and applies the resulting CSS properties to the element.
 */
function ngStyleDirective() {
    return {
        restrict: "A",
        link(scope, element, attr) {
            const attrMap = attr;
            let oldStyles = null;
            scope.$watch(attrMap.ngStyle, (newStyles) => {
                const target = newStyles?.$target || newStyles;
                if (oldStyles) {
                    keys(oldStyles).forEach((key) => {
                        element.style.removeProperty(key);
                    });
                }
                if (target) {
                    const nextStyles = {};
                    keys(target).forEach((key) => {
                        const value = target[key];
                        element.style.setProperty(key, value);
                        nextStyles[key] = value;
                    });
                    oldStyles = nextStyles;
                }
                else {
                    oldStyles = null;
                }
            });
        },
    };
}

export { ngStyleDirective };
