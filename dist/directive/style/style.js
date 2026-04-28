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
                    for (const key in oldStyles) {
                        element.style.removeProperty(key);
                    }
                }
                if (target) {
                    oldStyles = {};
                    for (const key in target) {
                        const value = target[key];
                        element.style.setProperty(key, value);
                        oldStyles[key] = value;
                    }
                }
                else {
                    oldStyles = null;
                }
            });
        },
    };
}

export { ngStyleDirective };
